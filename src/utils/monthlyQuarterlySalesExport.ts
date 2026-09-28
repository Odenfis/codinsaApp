import type ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MonthlyQuarterlySalesResponse, MonthlyQuarterlySalesRow } from '../types';
import { summarizeMonthlyQuarterlySales } from './monthlyQuarterlySalesModel';
import { loadTrimmedLogoDataUrl } from './logoUtils';
import logoUrl from '../../assets/logotipo.png';

type Column = { key: keyof MonthlyQuarterlySalesRow; label: string; width: number; kind?: 'date' | 'quantity' | 'money' };

export const monthlyQuarterlySalesColumns: Column[] = [
  { key: 'Fecha', label: 'Fecha', width: 14, kind: 'date' },
  { key: 'Tipo', label: 'Tipo', width: 10 },
  { key: 'TipoDoc', label: 'Tipo doc.', width: 11 },
  { key: 'Serie', label: 'Serie', width: 11 },
  { key: 'NroDoc', label: 'Nro. documento', width: 16 },
  { key: 'Codigo', label: 'Código producto', width: 17 },
  { key: 'Producto', label: 'Producto', width: 38 },
  { key: 'Cantidad', label: 'Cantidad', width: 14, kind: 'quantity' },
  { key: 'Precio', label: 'Precio', width: 15, kind: 'money' },
  { key: 'Total', label: 'Total', width: 16, kind: 'money' },
  { key: 'Lote', label: 'Lote', width: 15 },
  { key: 'Vencimiento', label: 'Vencimiento', width: 14, kind: 'date' },
  { key: 'Vendedor', label: 'Vendedor', width: 13 },
  { key: 'Zona', label: 'Zona', width: 11 },
  { key: 'Laboratorio', label: 'Laboratorio', width: 14 },
  { key: 'RucDni', label: 'RUC / DNI', width: 17 },
  { key: 'Empresa', label: 'Empresa', width: 36 },
  { key: 'Direccion', label: 'Dirección', width: 38 },
  { key: 'Lugar', label: 'Lugar', width: 22 },
  { key: 'Departamento', label: 'Departamento', width: 22 },
  { key: 'Provincia', label: 'Provincia', width: 22 },
  { key: 'Distrito', label: 'Distrito', width: 22 }
];

const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 });
const quantity = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const dateValue = (value: string | null) => value ? new Date(`${value}T12:00:00`) : null;
const dateText = (value: string | null) => dateValue(value)?.toLocaleDateString('es-PE') || '';
const generatedText = (value: string) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
const filename = (report: MonthlyQuarterlySalesResponse) => `Ventas_${report.period.desde}_al_${report.period.hasta}`;

const displayValue = (row: MonthlyQuarterlySalesRow, column: Column) => {
  const value = row[column.key];
  if (column.kind === 'money') return money.format(Number(value || 0));
  if (column.kind === 'quantity') return quantity.format(Number(value || 0));
  if (column.kind === 'date') return dateText(value == null ? null : String(value));
  return value == null ? '' : String(value);
};

const downloadBuffer = (buffer: ExcelJS.Buffer, name: string) => {
  const blob = new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
};

export async function exportMonthlyQuarterlySalesToExcel(
  rows: MonthlyQuarterlySalesRow[], report: MonthlyQuarterlySalesResponse
) {
  if (!rows.length) return;
  const { default: ExcelJSRuntime } = await import('exceljs');
  const workbook = new ExcelJSRuntime.Workbook();
  workbook.creator = 'CODINSA Tool Kit';
  workbook.created = new Date(report.generatedAt);
  const sheet = workbook.addWorksheet('Ventas Del Al', {
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.15, right: 0.15, top: 0.3, bottom: 0.3, header: 0, footer: 0 } },
    views: [{ state: 'frozen', ySplit: 8, xSplit: 7, activeCell: 'H9', showGridLines: false }]
  });
  sheet.columns = monthlyQuarterlySalesColumns.map(column => ({ width: column.width }));
  const logo = await loadTrimmedLogoDataUrl(logoUrl);
  const logoHeight = 72;
  const logoId = workbook.addImage({ base64: logo.dataUrl, extension: 'png' });
  sheet.addImage(logoId, { tl: { col: 0.15, row: 0.15 }, ext: { width: logoHeight * logo.aspectRatio, height: logoHeight } });
  sheet.mergeCells('D2:V2');
  sheet.getCell('D2').value = 'VENTAS MENSUALES O TRIMESTRALES';
  sheet.getCell('D2').font = { bold: true, size: 18, color: { argb: 'FF006767' } };
  sheet.getCell('D2').alignment = { horizontal: 'center' };
  sheet.mergeCells('D3:V3');
  sheet.getCell('D3').value = `Del ${dateText(report.period.desde)} al ${dateText(report.period.hasta)}`;
  sheet.getCell('D3').font = { size: 10, color: { argb: 'FF3E4948' } };
  sheet.getCell('D3').alignment = { horizontal: 'center' };
  const totals = summarizeMonthlyQuarterlySales(rows);
  sheet.mergeCells('A6:V6');
  sheet.getCell('A6').value = `${totals.lines} líneas · ${totals.documents} documentos · ${totals.clients} clientes · ${totals.products} productos · ${quantity.format(totals.units)} unidades · ${money.format(totals.sales)}`;
  sheet.getCell('A6').font = { bold: true, size: 9, color: { argb: 'FF006767' } };
  sheet.getCell('V5').value = `Generado: ${generatedText(report.generatedAt)}`;
  sheet.getCell('V5').font = { size: 8, color: { argb: 'FF6F7979' } };
  sheet.getCell('V5').alignment = { horizontal: 'right' };
  sheet.getRow(8).values = monthlyQuarterlySalesColumns.map(column => column.label);
  sheet.getRow(8).height = 28;
  sheet.getRow(8).eachCell(cell => {
    cell.font = { bold: true, size: 8, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF006767' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  rows.forEach((item, index) => {
    const row = sheet.addRow(monthlyQuarterlySalesColumns.map(column => {
      const value = item[column.key];
      return column.kind === 'date' ? dateValue(value == null ? null : String(value)) : value;
    }));
    row.height = 19;
    row.eachCell((cell, columnIndex) => {
      const definition = monthlyQuarterlySalesColumns[columnIndex - 1];
      cell.font = { size: 8 };
      cell.alignment = { vertical: 'middle', horizontal: definition.kind === 'money' || definition.kind === 'quantity' ? 'right' : 'left' };
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFD5DEDE' } } };
      if (index % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F3F5' } };
      if (definition.kind === 'money') cell.numFmt = 'S/ #,##0.00;[Red]-S/ #,##0.00';
      if (definition.kind === 'quantity') cell.numFmt = '#,##0.##';
      if (definition.kind === 'date') cell.numFmt = 'dd/mm/yyyy';
    });
  });
  const totalValues: Array<string | number> = monthlyQuarterlySalesColumns.map(column =>
    column.key === 'Cantidad' ? totals.units : column.key === 'Total' ? totals.sales : ''
  );
  totalValues[0] = 'TOTALES';
  const totalRow = sheet.addRow(totalValues);
  totalRow.eachCell((cell, columnIndex) => {
    const definition = monthlyQuarterlySalesColumns[columnIndex - 1];
    cell.font = { bold: true, size: 8, color: { argb: 'FF006767' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCEEEE' } };
    cell.border = { top: { style: 'thin', color: { argb: 'FF006767' } } };
    if (definition?.kind === 'money') cell.numFmt = 'S/ #,##0.00;[Red]-S/ #,##0.00';
    if (definition?.kind === 'quantity') cell.numFmt = '#,##0.##';
  });
  sheet.autoFilter = { from: 'A8', to: `V${8 + rows.length}` };
  sheet.pageSetup.printArea = `A1:V${totalRow.number}`;
  sheet.headerFooter.oddFooter = '&LVentas Mensuales o Trimestrales&RPágina &P de &N';
  downloadBuffer(await workbook.xlsx.writeBuffer(), `${filename(report)}.xlsx`);
}

export async function exportMonthlyQuarterlySalesToPdf(
  rows: MonthlyQuarterlySalesRow[], report: MonthlyQuarterlySalesResponse
) {
  if (!rows.length) return;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  const logo = await loadTrimmedLogoDataUrl(logoUrl);
  const logoHeight = 16;
  const totalPagesToken = '{total_pages_count_string}';
  const totals = summarizeMonthlyQuarterlySales(rows);
  const body = rows.map(row => monthlyQuarterlySalesColumns.map(column => displayValue(row, column)));
  const totalRow = monthlyQuarterlySalesColumns.map(column =>
    column.key === 'Cantidad' ? quantity.format(totals.units) : column.key === 'Total' ? money.format(totals.sales) : ''
  );
  totalRow[0] = 'TOTALES';
  body.push(totalRow);
  autoTable(doc, {
    startY: 30,
    margin: { top: 30, right: 5, bottom: 11, left: 5 },
    head: [monthlyQuarterlySalesColumns.map(column => column.label)], body, theme: 'grid', showHead: 'everyPage',
    horizontalPageBreak: true,
    horizontalPageBreakRepeat: [0, 2, 3, 4, 6],
    headStyles: { fillColor: [0, 103, 103], textColor: 255, fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: [241, 243, 245] },
    styles: { fontSize: 5.3, cellPadding: 0.9, overflow: 'ellipsize', valign: 'middle', lineColor: [190, 203, 203], lineWidth: 0.06 },
    columnStyles: Object.fromEntries(monthlyQuarterlySalesColumns.map((column, index) => [index, {
      cellWidth: column.width * 1.45,
      halign: column.kind === 'money' || column.kind === 'quantity' ? 'right' : 'left'
    }])),
    didParseCell: hook => {
      if (hook.section === 'body' && hook.row.index === body.length - 1) {
        hook.cell.styles.fontStyle = 'bold';
        hook.cell.styles.fillColor = [220, 238, 238];
        hook.cell.styles.textColor = [0, 103, 103];
      }
    },
    didDrawPage: hook => {
      const width = doc.internal.pageSize.getWidth();
      doc.addImage(logo.dataUrl, 'PNG', 5, 3, logoHeight * logo.aspectRatio, logoHeight, undefined, 'FAST');
      doc.setTextColor(0, 103, 103); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
      doc.text('VENTAS MENSUALES O TRIMESTRALES', width / 2, 8, { align: 'center' });
      doc.setTextColor(62, 73, 72); doc.setFontSize(8);
      doc.text(`Del ${dateText(report.period.desde)} al ${dateText(report.period.hasta)}`, width / 2, 14, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(111, 121, 121);
      doc.text(`${totals.documents} documentos · ${totals.clients} clientes · ${quantity.format(totals.units)} unidades · ${money.format(totals.sales)}`, width / 2, 20, { align: 'center' });
      doc.text(`Generado: ${generatedText(report.generatedAt)}`, width - 5, 8, { align: 'right' });
      doc.text(`Página ${hook.pageNumber} de ${totalPagesToken}`, width - 5, 14, { align: 'right' });
    }
  });
  if (typeof doc.putTotalPages === 'function') doc.putTotalPages(totalPagesToken);
  doc.save(`${filename(report)}.pdf`);
}
