import type ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CustomersBySalespersonResponse, CustomersBySalespersonRow } from '../types';
import { summarizeCustomersBySalesperson } from './customersBySalespersonModel';
import { loadTrimmedLogoDataUrl } from './logoUtils';
import logoUrl from '../../assets/logotipo.png';

type Column = { key: keyof CustomersBySalespersonRow; label: string; width: number; money?: boolean };

export const customersBySalespersonColumns: Column[] = [
  { key: 'codclie', label: 'Código cliente', width: 16 },
  { key: 'Ruc', label: 'RUC', width: 17 },
  { key: 'Razon', label: 'Razón social', width: 38 },
  { key: 'titular', label: 'Titular', width: 28 },
  { key: 'Direccion', label: 'Dirección', width: 42 },
  { key: 'Telefono1', label: 'Teléfono 1', width: 16 },
  { key: 'Telefono2', label: 'Teléfono 2', width: 16 },
  { key: 'email', label: 'Correo', width: 34 },
  { key: 'Departamento', label: 'Departamento', width: 22 },
  { key: 'Localidad', label: 'Localidad', width: 22 },
  { key: 'Vendedor', label: 'Vendedor', width: 28 },
  { key: 'ubigeo_6d', label: 'UBIGEO', width: 14 },
  { key: 'Limite', label: 'Límite crédito', width: 17, money: true },
  { key: 'TipoCliente', label: 'Tipo cliente', width: 13 },
  { key: 'RegDigemid', label: 'Reg. Digemid', width: 18 }
];

const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 });
const generatedText = (value: string) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
const safeName = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
const filename = (report: CustomersBySalespersonResponse) => `Clientes_Vendedor_${report.salesperson.Codemp}_${safeName(report.salesperson.Nombre)}`;

const downloadBuffer = (buffer: ExcelJS.Buffer, name: string) => {
  const blob = new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
};

export async function exportCustomersBySalespersonToExcel(
  rows: CustomersBySalespersonRow[], report: CustomersBySalespersonResponse
) {
  if (!rows.length) return;
  const { default: ExcelJSRuntime } = await import('exceljs');
  const workbook = new ExcelJSRuntime.Workbook();
  workbook.creator = 'CODINSA Tool Kit';
  workbook.created = new Date(report.generatedAt);
  const sheet = workbook.addWorksheet('Clientes por Vendedor', {
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.2, right: 0.2, top: 0.3, bottom: 0.3, header: 0, footer: 0 } },
    views: [{ state: 'frozen', ySplit: 8, xSplit: 3, activeCell: 'D9', showGridLines: false }]
  });
  sheet.columns = customersBySalespersonColumns.map(column => ({ width: column.width }));
  const logo = await loadTrimmedLogoDataUrl(logoUrl);
  const logoHeight = 72;
  const logoId = workbook.addImage({ base64: logo.dataUrl, extension: 'png' });
  sheet.addImage(logoId, { tl: { col: 0.15, row: 0.15 }, ext: { width: logoHeight * logo.aspectRatio, height: logoHeight } });
  sheet.mergeCells('D2:O2');
  sheet.getCell('D2').value = 'CLIENTES POR VENDEDOR';
  sheet.getCell('D2').font = { bold: true, size: 18, color: { argb: 'FF006767' } };
  sheet.getCell('D2').alignment = { horizontal: 'center' };
  sheet.mergeCells('D3:O3');
  sheet.getCell('D3').value = `${report.salesperson.Codemp} · ${report.salesperson.Nombre}`;
  sheet.getCell('D3').font = { size: 10, color: { argb: 'FF3E4948' } };
  sheet.getCell('D3').alignment = { horizontal: 'center' };
  const totals = summarizeCustomersBySalesperson(rows);
  sheet.mergeCells('A6:O6');
  sheet.getCell('A6').value = `${totals.clients} clientes · ${totals.located} con UBIGEO · A: ${totals.typeA} · B: ${totals.typeB} · C: ${totals.typeC} · Límite ${money.format(totals.creditLimit)}`;
  sheet.getCell('A6').font = { bold: true, size: 9, color: { argb: 'FF006767' } };
  sheet.getCell('O5').value = `Generado: ${generatedText(report.generatedAt)}`;
  sheet.getCell('O5').font = { size: 8, color: { argb: 'FF6F7979' } };
  sheet.getCell('O5').alignment = { horizontal: 'right' };
  sheet.getRow(8).values = customersBySalespersonColumns.map(column => column.label);
  sheet.getRow(8).height = 28;
  sheet.getRow(8).eachCell(cell => {
    cell.font = { bold: true, size: 8, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF006767' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  rows.forEach((item, index) => {
    const row = sheet.addRow(customersBySalespersonColumns.map(column => item[column.key]));
    row.height = 19;
    row.eachCell((cell, columnIndex) => {
      const definition = customersBySalespersonColumns[columnIndex - 1];
      cell.font = { size: 8 };
      cell.alignment = { vertical: 'middle', horizontal: definition.money ? 'right' : 'left' };
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFD5DEDE' } } };
      if (index % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F3F5' } };
      if (definition.money) cell.numFmt = 'S/ #,##0.00;[Red]-S/ #,##0.00';
    });
  });
  const totalValues: Array<string | number> = customersBySalespersonColumns.map(column => column.key === 'Limite' ? totals.creditLimit : '');
  totalValues[0] = 'TOTAL LÍMITE DE CRÉDITO';
  const totalRow = sheet.addRow(totalValues);
  totalRow.eachCell((cell, columnIndex) => {
    cell.font = { bold: true, size: 9, color: { argb: 'FF006767' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCEEEE' } };
    cell.border = { top: { style: 'thin', color: { argb: 'FF006767' } } };
    if (customersBySalespersonColumns[columnIndex - 1]?.money) cell.numFmt = 'S/ #,##0.00;[Red]-S/ #,##0.00';
  });
  sheet.autoFilter = { from: 'A8', to: `O${8 + rows.length}` };
  sheet.pageSetup.printArea = `A1:O${totalRow.number}`;
  sheet.headerFooter.oddFooter = '&LClientes por Vendedor&RPágina &P de &N';
  downloadBuffer(await workbook.xlsx.writeBuffer(), `${filename(report)}.xlsx`);
}

export async function exportCustomersBySalespersonToPdf(
  rows: CustomersBySalespersonRow[], report: CustomersBySalespersonResponse
) {
  if (!rows.length) return;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  const logo = await loadTrimmedLogoDataUrl(logoUrl);
  const logoHeight = 16;
  const totalPagesToken = '{total_pages_count_string}';
  const totals = summarizeCustomersBySalesperson(rows);
  const body: (string | number)[][] = rows.map(row => customersBySalespersonColumns.map(column =>
    column.money ? money.format(Number(row[column.key] || 0)) : String(row[column.key] || '')
  ));
  body.push(['TOTAL LÍMITE', '', '', '', '', '', '', '', '', '', '', '', money.format(totals.creditLimit), '', '']);
  const widths = [17, 25, 42, 28, 50, 18, 18, 38, 25, 25, 28, 18, 20, 14, 23];
  autoTable(doc, {
    startY: 30,
    margin: { top: 30, right: 5, bottom: 11, left: 5 },
    head: [customersBySalespersonColumns.map(column => column.label)], body, theme: 'grid', showHead: 'everyPage',
    headStyles: { fillColor: [0, 103, 103], textColor: 255, fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: [241, 243, 245] },
    styles: { fontSize: 5.2, cellPadding: 0.8, overflow: 'ellipsize', valign: 'middle', lineColor: [190, 203, 203], lineWidth: 0.06 },
    columnStyles: Object.fromEntries(widths.map((cellWidth, index) => [index, { cellWidth, halign: index === 12 ? 'right' : 'left' }])),
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
      doc.text('CLIENTES POR VENDEDOR', width / 2, 8, { align: 'center' });
      doc.setTextColor(62, 73, 72); doc.setFontSize(8);
      doc.text(`${report.salesperson.Codemp} · ${report.salesperson.Nombre}`, width / 2, 14, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(111, 121, 121);
      doc.text(`${totals.clients} clientes · ${totals.located} con UBIGEO · Límite ${money.format(totals.creditLimit)}`, width / 2, 20, { align: 'center' });
      doc.text(`Generado: ${generatedText(report.generatedAt)}`, width - 5, 8, { align: 'right' });
      doc.text(`Página ${hook.pageNumber} de ${totalPagesToken}`, width - 5, 14, { align: 'right' });
    }
  });
  if (typeof doc.putTotalPages === 'function') doc.putTotalPages(totalPagesToken);
  doc.save(`${filename(report)}.pdf`);
}
