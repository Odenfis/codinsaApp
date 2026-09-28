import type ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SalesRegisterResponse, SalesRegisterRow } from '../types';
import { summarizeSalesRegister } from './salesRegisterModel';
import { loadTrimmedLogoDataUrl } from './logoUtils';
import logoUrl from '../../assets/logotipo.png';

type Column = { key: keyof SalesRegisterRow; label: string; width: number; kind?: 'date' | 'money' | 'number' };

export const salesRegisterColumns: Column[] = [
  { key: 'Fecha', label: 'Fecha emisión', width: 14, kind: 'date' },
  { key: 'FechaV', label: 'Fecha venc.', width: 14, kind: 'date' },
  { key: 'TipoDoc', label: 'Tipo doc.', width: 11 },
  { key: 'Serie', label: 'Serie', width: 12 },
  { key: 'Numero', label: 'Número', width: 15 },
  { key: 'Tipo', label: 'Tipo ID', width: 10 },
  { key: 'NumeroClie', label: 'Nro. cliente', width: 17 },
  { key: 'Razon', label: 'Razón social', width: 34 },
  { key: 'ValorExp', label: 'Valor export.', width: 15, kind: 'money' },
  { key: 'Gravado', label: 'Gravado', width: 15, kind: 'money' },
  { key: 'Exonerado', label: 'Exonerado', width: 15, kind: 'money' },
  { key: 'Inafecta', label: 'Inafecta', width: 15, kind: 'money' },
  { key: 'ISC', label: 'ISC', width: 13, kind: 'money' },
  { key: 'IGV', label: 'IGV', width: 13, kind: 'money' },
  { key: 'Otros', label: 'Otros', width: 13, kind: 'money' },
  { key: 'Total', label: 'Total', width: 16, kind: 'money' },
  { key: 'TipoCambio', label: 'Tipo cambio', width: 14, kind: 'number' },
  { key: 'Feca', label: 'Fecha ref.', width: 14, kind: 'date' },
  { key: 'TipoF', label: 'Tipo ref.', width: 12 },
  { key: 'SerieF', label: 'Serie ref.', width: 13 },
  { key: 'NumDocF', label: 'Número ref.', width: 16 },
  { key: 'Cta12D', label: 'Cta. 12 debe', width: 15 },
  { key: 'Cta12H', label: 'Cta. 12 haber', width: 15 },
  { key: 'Cta70', label: 'Cta. 70', width: 13 },
  { key: 'Cuenta10', label: 'Cta. 10', width: 13 },
  { key: 'FecPago', label: 'Fecha pago', width: 14, kind: 'date' },
  { key: 'Sindato', label: 'Sin dato', width: 13 },
  { key: 'Glosa', label: 'Glosa', width: 34 }
];

const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 });
const decimal = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
const dateValue = (value: string | null) => value ? new Date(`${value}T12:00:00`) : null;
const dateText = (value: string | null) => dateValue(value)?.toLocaleDateString('es-PE') || '';
const generatedText = (value: string) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
const filename = (report: SalesRegisterResponse) => `Registro_Ventas_${report.period.desde}_al_${report.period.hasta}`;

const displayValue = (row: SalesRegisterRow, column: Column) => {
  const value = row[column.key];
  if (column.kind === 'money') return money.format(Number(value || 0));
  if (column.kind === 'number') return value == null ? '' : decimal.format(Number(value));
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

export async function exportSalesRegisterToExcel(rows: SalesRegisterRow[], report: SalesRegisterResponse) {
  if (!rows.length) return;
  const { default: ExcelJSRuntime } = await import('exceljs');
  const workbook = new ExcelJSRuntime.Workbook();
  workbook.creator = 'CODINSA Tool Kit';
  workbook.created = new Date(report.generatedAt);
  const sheet = workbook.addWorksheet('Registro de Ventas', {
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.15, right: 0.15, top: 0.3, bottom: 0.3, header: 0, footer: 0 } },
    views: [{ state: 'frozen', ySplit: 8, xSplit: 8, activeCell: 'I9', showGridLines: false }]
  });
  sheet.columns = salesRegisterColumns.map(column => ({ width: column.width }));
  const logo = await loadTrimmedLogoDataUrl(logoUrl);
  const logoHeight = 72;
  const logoId = workbook.addImage({ base64: logo.dataUrl, extension: 'png' });
  sheet.addImage(logoId, { tl: { col: 0.15, row: 0.15 }, ext: { width: logoHeight * logo.aspectRatio, height: logoHeight } });
  sheet.mergeCells('D2:AB2');
  sheet.getCell('D2').value = 'REGISTRO DE VENTAS';
  sheet.getCell('D2').font = { bold: true, size: 18, color: { argb: 'FF006767' } };
  sheet.getCell('D2').alignment = { horizontal: 'center' };
  sheet.mergeCells('D3:AB3');
  sheet.getCell('D3').value = `Del ${dateText(report.period.desde)} al ${dateText(report.period.hasta)}`;
  sheet.getCell('D3').font = { size: 10, color: { argb: 'FF3E4948' } };
  sheet.getCell('D3').alignment = { horizontal: 'center' };
  const totals = summarizeSalesRegister(rows);
  sheet.mergeCells('A6:AB6');
  sheet.getCell('A6').value = `${rows.length.toLocaleString('es-PE')} registros · Gravado ${money.format(totals.Gravado)} · Exonerado ${money.format(totals.Exonerado)} · IGV ${money.format(totals.IGV)} · Total ${money.format(totals.Total)}`;
  sheet.getCell('A6').font = { bold: true, size: 9, color: { argb: 'FF006767' } };
  sheet.getCell('AB5').value = `Generado: ${generatedText(report.generatedAt)}`;
  sheet.getCell('AB5').font = { size: 8, color: { argb: 'FF6F7979' } };
  sheet.getCell('AB5').alignment = { horizontal: 'right' };
  sheet.getRow(8).values = salesRegisterColumns.map(column => column.label);
  sheet.getRow(8).height = 29;
  sheet.getRow(8).eachCell(cell => {
    cell.font = { bold: true, size: 8, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF006767' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  rows.forEach((item, index) => {
    const row = sheet.addRow(salesRegisterColumns.map(column => {
      const value = item[column.key];
      return column.kind === 'date' ? dateValue(value == null ? null : String(value)) : value;
    }));
    row.height = 19;
    row.eachCell((cell, columnIndex) => {
      const definition = salesRegisterColumns[columnIndex - 1];
      cell.font = { size: 8 };
      cell.alignment = { vertical: 'middle', horizontal: definition.kind === 'money' || definition.kind === 'number' ? 'right' : 'left' };
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFD5DEDE' } } };
      if (index % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F3F5' } };
      if (definition.kind === 'money') cell.numFmt = 'S/ #,##0.00;[Red]-S/ #,##0.00';
      if (definition.kind === 'number') cell.numFmt = '#,##0.0000';
      if (definition.kind === 'date') cell.numFmt = 'dd/mm/yyyy';
    });
  });
  const totalValues: Array<string | number> = salesRegisterColumns.map(column => column.key in totals ? totals[column.key as keyof typeof totals] : '');
  totalValues[0] = 'TOTALES';
  const totalRow = sheet.addRow(totalValues);
  totalRow.eachCell((cell, columnIndex) => {
    cell.font = { bold: true, size: 8, color: { argb: 'FF006767' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCEEEE' } };
    cell.border = { top: { style: 'thin', color: { argb: 'FF006767' } } };
    if (salesRegisterColumns[columnIndex - 1]?.kind === 'money') cell.numFmt = 'S/ #,##0.00;[Red]-S/ #,##0.00';
  });
  sheet.autoFilter = { from: 'A8', to: `AB${8 + rows.length}` };
  sheet.pageSetup.printArea = `A1:AB${totalRow.number}`;
  sheet.headerFooter.oddFooter = '&LRegistro de Ventas&RPágina &P de &N';
  downloadBuffer(await workbook.xlsx.writeBuffer(), `${filename(report)}.xlsx`);
}

export async function exportSalesRegisterToPdf(rows: SalesRegisterRow[], report: SalesRegisterResponse) {
  if (!rows.length) return;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  const logo = await loadTrimmedLogoDataUrl(logoUrl);
  const logoHeight = 16;
  const totalPagesToken = '{total_pages_count_string}';
  const totals = summarizeSalesRegister(rows);
  const body = rows.map(row => salesRegisterColumns.map(column => displayValue(row, column)));
  const totalRow = salesRegisterColumns.map(column => column.key in totals ? money.format(totals[column.key as keyof typeof totals]) : '');
  totalRow[0] = 'TOTALES';
  body.push(totalRow);
  autoTable(doc, {
    startY: 30,
    margin: { top: 30, right: 5, bottom: 11, left: 5 },
    head: [salesRegisterColumns.map(column => column.label)], body, theme: 'grid', showHead: 'everyPage',
    horizontalPageBreak: true,
    horizontalPageBreakRepeat: [0, 2, 3, 4],
    headStyles: { fillColor: [0, 103, 103], textColor: 255, fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: [241, 243, 245] },
    styles: { fontSize: 5.2, cellPadding: 0.9, overflow: 'ellipsize', valign: 'middle', lineColor: [190, 203, 203], lineWidth: 0.06 },
    columnStyles: Object.fromEntries(salesRegisterColumns.map((column, index) => [index, {
      cellWidth: column.width * 1.55,
      halign: column.kind === 'money' || column.kind === 'number' ? 'right' : 'left'
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
      doc.text('REGISTRO DE VENTAS', width / 2, 8, { align: 'center' });
      doc.setTextColor(62, 73, 72); doc.setFontSize(8);
      doc.text(`Del ${dateText(report.period.desde)} al ${dateText(report.period.hasta)}`, width / 2, 14, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(111, 121, 121);
      doc.text(`${rows.length.toLocaleString('es-PE')} registros · Gravado ${money.format(totals.Gravado)} · IGV ${money.format(totals.IGV)} · Total ${money.format(totals.Total)}`, width / 2, 20, { align: 'center' });
      doc.text(`Generado: ${generatedText(report.generatedAt)}`, width - 5, 8, { align: 'right' });
      doc.text(`Página ${hook.pageNumber} de ${totalPagesToken}`, width - 5, 14, { align: 'right' });
    }
  });
  if (typeof doc.putTotalPages === 'function') doc.putTotalPages(totalPagesToken);
  doc.save(`${filename(report)}.pdf`);
}
