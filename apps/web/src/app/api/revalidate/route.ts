import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

// Revalidación on-demand para páginas con ISR (ej. /sobre-nosotros).
// La API llama a este endpoint solo cuando cambian los datos (nuevo cliente,
// nuevo producto), no en cada visita — así la página sigue sirviendo desde
// caché sin tocar la base de datos, sin importar cuántos clientes/productos haya.
export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ message: 'Secret inválido' }, { status: 401 });
  }

  const path = request.nextUrl.searchParams.get('path') || '/sobre-nosotros';
  revalidatePath(path);

  return NextResponse.json({ revalidated: true, path, now: Date.now() });
}
