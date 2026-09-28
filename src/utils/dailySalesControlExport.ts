import type ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DailySalesControlResponse, DailySalesControlRow } from '../types';
import { summarizeDailySalesControl } from './dailySalesControlModel';
import { loadTrimmedLogoDataUrl } from './logoUtils';
import logoUrl from '../../assets/logotipo.png';

type Column = { key: keyof DailySalesControlRow; label: string; width: number; money?: boolean };

export const dailySalesControlColumns: Column[] = [
  { key: 'Nro', label: 'Nro. cliente', width: 16 },
  { key: 'NomComercial', label: 'Nombre comercial', width: 38 },
  { key: 'Distrito', label: 'Distrito', width: 22 },
  { key: 'RucDni', label: 'RUC / DNI', width: 17 },
  { key: 'NP', label: 'Nro. pedido', width: 18 },
  { key: 'Vendedor', label: 'Vendedor', width: 25 },
  { key: 'Representante', label: 'Representante', width: 25 },
  { key: 'Condicion', label: 'Condición', width: 22 },
  { key: 'Factura', label: 'Factura', width: 17 },
  { key: 'Monto', label: 'Subtotal', width: 17, money: true },
  { key: 'MasIgv', label: 'Total con IGV', width: 18, money: true },
  { key: 'Observacion', label: 'Observación', width: 44 }
];

const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 });
const dateText = (value: string) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('es-PE') : '';
const generatedText = (value: string) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
const filename = (report: DailySalesControlResponse) => `Control_Diario_${report.reportDate}`;

const downloadBuffer = (buffer: ExcelJS.Buffer, name: string) => {
  const blob = new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
};

export async function exportDailySalesControlToExcel(rows: DailySalesControlRow[], report: DailySalesControlResponse) {
  if (!rows.length) return;
  const { default: ExcelJSRuntime } = await import('exceljs');
  const workbook = new ExcelJSRuntime.Workbook();
  workbook.creator = 'CODINSA Tool Kit';
  workbook.created = new Date(report.generatedAt);
  const sheet = workbook.addWorksheet('Control Diario', {
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.2, right: 0.2, top: 0.3, bottom: 0.3, header: 0, footer: 0 } },
    views: [{ state: 'frozen', ySplit: 8, xSplit: 2, activeCell: 'C9', showGridLines: false }]
  });
  sheet.columns = dailySalesControlColumns.map(column => ({ width: column.width }));
  const logo = await loadTrimmedLogoDataUrl(logoUrl);
  const logoHeight = 72;
  const logoId = workbook.addImage({ base64: logo.dataUrl, extension: 'png' });
  sheet.addImage(logoId, { tl: { col: 0.15, row: 0.15 }, ext: { width: logoHeight * logo.aspectRatio, height: logoHeight } });
  sheet.mergeCells('D2:L2');
  sheet.getCell('D2').value = 'CONTROL DIARIO';
  sheet.getCell('D2').font = { bold: true, size: 18, color: { argb: 'FF006767' } };
  sheet.getCell('D2').alignment = { horizontal: 'center' };
  sheet.mergeCells('D3:L3');
  sheet.getCell('D3').value = `Fecha operativa: ${dateText(report.reportDate)}`;
  sheet.getCell('D3').font = { size: 10, color: { argb: 'FF3E4948' } };
  sheet.getCell('D3').alignment = { horizontal: 'center' };
  const totals = summarizeDailySalesControl(rows);
  sheet.mergeCells('A6:L6');
  sheet.getCell('A6').value = `${totals.invoices} facturas · ${totals.clients} clientes · ${totals.orders} pedidos · ${totals.salespeople} vendedores · Subtotal ${money.format(totals.subtotal)} · Total ${money.format(totals.totalWithTax)}`;
  sheet.getCell('A6').font = { bold: true, size: 9, color: { argb: 'FF006767' } };
  sheet.getCell('L5').value = `Generado: ${generatedText(report.generatedAt)}`;
  sheet.getCell('L5').font = { size: 8, color: { argb: 'FF6F7979' } };
  sheet.getCell('L5').alignment = { horizontal: 'right' };
  sheet.getRow(8).values = dailySalesControlColumns.map(column => column.label);
  sheet.getRow(8).height = 28;
  sheet.getRow(8).eachCell(cell => {
    cell.font = { bold: true, size: 8, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF006767' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  rows.forEach((item, index) => {
    const row = sheet.addRow(dailySalesControlColumns.map(column => item[column.key]));
    row.height = 19;
    row.eachCell((cell, columnIndex) => {
      const definition = dailySalesControlColumns[columnIndex - 1];
      cell.font = { size: 8 };
      cell.alignment = { vertical: 'middle', horizontal: definition.money ? 'right' : 'left' };
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFD5DEDE' } } };
      if (index % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F3F5' } };
      if (definition.money) cell.numFmt = 'S/ #,##0.00;[Red]-S/ #,##0.00';
    });
  });
  const totalValues: Array<string | number> = dailySalesControlColumns.map(column =>
    column.key === 'Monto' ? totals.subtotal : column.key === 'MasIgv' ? totals.totalWithTax : ''
  );
  totalValues[0] = 'TOTALES';
  const totalRow = sheet.addRow(totalValues);
  totalRow.eachCell((cell, columnIndex) => {
    cell.font = { bold: true, size: 9, color: { argb: 'FF006767' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCEEEE' } };
    cell.border = { top: { style: 'thin', color: { argb: 'FF006767' } } };
    if (dailySalesControlColumns[columnIndex - 1]?.money) cell.numFmt = 'S/ #,##0.00;[Red]-S/ #,##0.00';
  });
  sheet.autoFilter = { from: 'A8', to: `L${8 + rows.length}` };
  sheet.pageSetup.printArea = `A1:L${totalRow.number}`;
  sheet.headerFooter.oddFooter = '&LControl Diario&RPágina &P de &N';
  downloadBuffer(await workbook.xlsx.writeBuffer(), `${filename(report)}.xlsx`);
}

export async function exportDailySalesControlToPdf(rows: DailySalesControlRow[], report: DailySalesControlResponse) {
  if (!rows.length) return;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  const logo = await loadTrimmedLogoDataUrl(logoUrl);
  const logoHeight = 16;
  const totalPagesToken = '{total_pages_count_string}';
  const totals = summarizeDailySalesControl(rows);
  const body: (string | number)[][] = rows.map(row => dailySalesControlColumns.map(column =>
    column.money ? money.format(Number(row[column.key] || 0)) : String(row[column.key] || '')
  ));
  body.push(['TOTALES', '', '', '', '', '', '', '', '', money.format(totals.subtotal), money.format(totals.totalWithTax), '']);
  const widths = [18, 45, 25, 23, 23, 30, 30, 28, 22, 24, 26, 65];
  autoTable(doc, {
    startY: 30,
    margin: { top: 30, right: 5, bottom: 11, left: 5 },
    head: [dailySalesControlColumns.map(column => column.label)], body, theme: 'grid', showHead: 'everyPage',
    headStyles: { fillColor: [0, 103, 103], textColor: 255, fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: [241, 243, 245] },
    styles: { fontSize: 6, cellPadding: 1, overflow: 'ellipsize', valign: 'middle', lineColor: [190, 203, 203], lineWidth: 0.06 },
    columnStyles: Object.fromEntries(widths.map((cellWidth, index) => [index, { cellWidth, halign: index === 9 || index === 10 ? 'right' : 'left' }])),
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
      doc.text('CONTROL DIARIO', width / 2, 8, { align: 'center' });
      doc.setTextColor(62, 73, 72); doc.setFontSize(8);
      doc.text(`Fecha operativa: ${dateText(report.reportDate)}`, width / 2, 14, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(111, 121, 121);
      doc.text(`${totals.invoices} facturas · ${totals.clients} clientes · ${totals.orders} pedidos · Subtotal ${money.format(totals.subtotal)} · Total ${money.format(totals.totalWithTax)}`, width / 2, 20, { align: 'center' });
      doc.text(`Generado: ${generatedText(report.generatedAt)}`, width - 5, 8, { align: 'right' });
      doc.text(`Página ${hook.pageNumber} de ${totalPagesToken}`, width - 5, 14, { align: 'right' });
    }
  });
  if (typeof doc.putTotalPages === 'function') doc.putTotalPages(totalPagesToken);
  doc.save(`${filename(report)}.pdf`);
}
