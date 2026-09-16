import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

const MONEY_FMT = '"S/." #,##0.00';
const DATE_FMT = 'dd/mm/yyyy hh:mm';
const HEADER_FILL = 'FF111111';

@Injectable()
export class ExcelService {
  async buildReportesWorkbook(params: { ventas: any[]; ingresos: any[]; egresos: any[] }): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Dream Life';
    wb.created = new Date();

    this.sheetVentas(wb, params.ventas);
    this.sheetIngresos(wb, params.ingresos);
    this.sheetEgresos(wb, params.egresos);

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer as ArrayBuffer);
  }

  private styleHeader(sheet: ExcelJS.Worksheet) {
    const row = sheet.getRow(1);
    row.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
      cell.alignment = { vertical: 'middle' };
    });
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  private addTotal(sheet: ExcelJS.Worksheet, total: number) {
    sheet.addRow([]);
    const colCount = sheet.columns?.length ?? 1;
    const row = sheet.addRow([]);
    row.getCell(1).value = 'TOTAL';
    row.getCell(1).font = { bold: true };
    const cell = row.getCell(colCount);
    cell.value = total;
    cell.font = { bold: true };
    cell.numFmt = MONEY_FMT;
  }

  private sheetVentas(wb: ExcelJS.Workbook, ventas: any[]) {
    const sheet = wb.addWorksheet('Ventas');
    sheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Fecha', key: 'fecha', width: 18 },
      { header: 'Cliente', key: 'cliente', width: 28 },
      { header: 'Canal', key: 'canal', width: 14 },
      { header: 'Ubicación', key: 'ubicacion', width: 20 },
      { header: 'Estado', key: 'estado', width: 14 },
      { header: 'Productos', key: 'productos', width: 55 },
      { header: 'Total', key: 'total', width: 16 },
    ];
    let suma = 0;
    ventas.forEach((v) => {
      const total = Number(v.total ?? 0);
      suma += total;
      sheet.addRow({
        id: v.id,
        fecha: new Date(v.createdAt),
        cliente: v.cliente ? `${v.cliente.nombre} ${v.cliente.apellido ?? ''}`.trim() : 'Invitado',
        canal: v.canal,
        ubicacion: v.ubicacion?.nombre ?? 'Online',
        estado: v.estado,
        productos: (v.detalles ?? []).map((d: any) => `${d.item?.producto?.nombre ?? 'Producto'} x${d.cantidad}`).join(', '),
        total,
      });
    });
    sheet.getColumn('fecha').numFmt = DATE_FMT;
    sheet.getColumn('total').numFmt = MONEY_FMT;
    this.styleHeader(sheet);
    this.addTotal(sheet, suma);
  }

  private sheetIngresos(wb: ExcelJS.Workbook, ingresos: any[]) {
    const sheet = wb.addWorksheet('Ingresos');
    sheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 18 },
      { header: 'Tipo', key: 'tipo', width: 12 },
      { header: 'Descripción', key: 'descripcion', width: 45 },
      { header: 'Categoría', key: 'categoria', width: 16 },
      { header: 'Ubicación', key: 'ubicacion', width: 20 },
      { header: 'Usuario', key: 'usuario', width: 20 },
      { header: 'Monto', key: 'monto', width: 16 },
    ];
    let suma = 0;
    ingresos.forEach((i) => {
      const monto = Number(i.monto ?? 0);
      suma += monto;
      sheet.addRow({
        fecha: new Date(i.fecha),
        tipo: i.tipo === 'venta' ? 'Venta' : 'Manual',
        descripcion: i.descripcion,
        categoria: i.categoria,
        ubicacion: i.ubicacion ?? '—',
        usuario: i.usuario ?? '—',
        monto,
      });
    });
    sheet.getColumn('fecha').numFmt = DATE_FMT;
    sheet.getColumn('monto').numFmt = MONEY_FMT;
    this.styleHeader(sheet);
    this.addTotal(sheet, suma);
  }

  private sheetEgresos(wb: ExcelJS.Workbook, egresos: any[]) {
    const sheet = wb.addWorksheet('Egresos');
    sheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 18 },
      { header: 'Descripción', key: 'descripcion', width: 45 },
      { header: 'Categoría', key: 'categoria', width: 16 },
      { header: 'Ubicación', key: 'ubicacion', width: 20 },
      { header: 'Usuario', key: 'usuario', width: 20 },
      { header: 'Monto', key: 'monto', width: 16 },
    ];
    let suma = 0;
    egresos.forEach((g) => {
      const monto = Number(g.monto ?? 0);
      suma += monto;
      sheet.addRow({
        fecha: new Date(g.fecha),
        descripcion: g.descripcion,
        categoria: g.categoria,
        ubicacion: g.ubicacion?.nombre ?? '—',
        usuario: g.usuario?.nombre ?? '—',
        monto,
      });
    });
    sheet.getColumn('fecha').numFmt = DATE_FMT;
    sheet.getColumn('monto').numFmt = MONEY_FMT;
    this.styleHeader(sheet);
    this.addTotal(sheet, suma);
  }
}
