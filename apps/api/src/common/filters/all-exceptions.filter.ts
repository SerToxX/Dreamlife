import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

// Traduce los errores más comunes de Prisma/MySQL a mensajes que tienen
// sentido para quien está usando la app, en vez de un genérico "Error
// interno del servidor" que no dice qué pasó realmente.
function mensajePrisma(exception: Prisma.PrismaClientKnownRequestError): { status: number; message: string } {
  switch (exception.code) {
    case 'P2000':
      return { status: HttpStatus.BAD_REQUEST, message: 'Uno de los datos enviados es demasiado largo para guardarse' };
    case 'P2002': {
      // meta.target viene como string[] en algunos motores/versiones de
      // Prisma y como string plano (nombre del índice) en otros — con MySQL
      // y Prisma 5.22 acá llega como string. Sin este chequeo, `.join` sobre
      // un string tira TypeError *dentro del propio exception filter*, lo
      // que no lo atrapa nadie y tumba el proceso entero de Node (502/503
      // para todos los usuarios hasta que el contenedor reinicia solo).
      const target = exception.meta?.target;
      const campos = Array.isArray(target) ? target.join(', ') : (target as string | undefined) ?? 'valor';
      return { status: HttpStatus.CONFLICT, message: `Ya existe un registro con ese ${campos}` };
    }
    case 'P2025':
      return { status: HttpStatus.NOT_FOUND, message: 'El registro no existe o ya fue eliminado' };
    case 'P2003':
      return { status: HttpStatus.BAD_REQUEST, message: 'La operación hace referencia a un registro que no existe' };
    default:
      return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Error al procesar la solicitud en la base de datos' };
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'Error interno del servidor';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'object' ? (res as any).message : res;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const traducido = mensajePrisma(exception);
      status = traducido.status;
      message = traducido.message;
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Faltan datos obligatorios o tienen un formato inválido';
    }

    const stack = exception instanceof Error ? exception.stack : String(exception);
    this.logger.error(`${request.method} ${request.url} → ${status}`, stack);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
