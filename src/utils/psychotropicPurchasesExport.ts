import type ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PsychotropicPurchasesResponse, PsychotropicPurchasesRow } from '../types';
import { summarizePsychotropicPurchases } from './psychotropicPurchasesModel';
import { loadTrimmedLogoDataUrl } from './logoUtils';
import logoUrl from '../../assets/logotipo.png';

type Column = { key: keyof PsychotropicPurchasesRow; label: string; width: number; kind?: 'date' | 'number' };

export const psychotropicPurchasesColumns: Column[] = [
  { key: 'Principio', label: 'Principio activo', width: 24 },
  { key: 'Concentracion', label: 'Concentración', width: 18 },
  { key: 'Descripcion', label: 'Descripción', width: 34 },
  { key: 'FF', label: 'FF', width: 9 },
  { key: 'NroFactura', label: 'N.º factura', width: 21 },
  { key: 'Proveedor', label: 'Proveedor', width: 34 },
  { key: 'Fecha', label: 'Fecha', width: 14, kind: 'date' },
  { key: 'Cantidad', label: 'Cantidad reportada', width: 19, kind: 'number' },
  { key: 'Lote', label: 'Lote', width: 18 },
];

const decimal = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
const dateValue = (value: string | null) => value ? new Date(`${value}T12:00:00`) : null;
const dateText = (value: string | null) => dateValue(value)?.toLocaleDateString('es-PE') || '';
const generatedText = (value: string) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
const summaryText = (totals: ReturnType<typeof summarizePsychotropicPurchases>) => `${totals.registros} registros · ${totals.facturas} facturas · ${totals.proveedores} proveedores · Cantidad reportada: TAB ${decimal.format(totals.tab)} · GOT ${decimal.format(totals.got)} · Sin FF ${decimal.format(totals.sinFF)}`;
const filename = (report: PsychotropicPurchasesResponse) => `Compras_Psicotropicos_${report.period.desde}_al_${report.period.hasta}`;

const displayValue = (row: PsychotropicPurchasesRow, column: Column) => {
  const value = row[column.key];
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

export async function exportPsychotropicPurchasesToExcel(rows: PsychotropicPurchasesRow[], report: PsychotropicPurchasesResponse) {
  if (!rows.length) return;
  const { default: ExcelJSRuntime } = await import('exceljs');
  const workbook = new ExcelJSRuntime.Workbook();
  workbook.creator = 'CODINSA Tool Kit';
  workbook.created = new Date(report.generatedAt);
  const sheet = workbook.addWorksheet('Compras Psicotrópicos', {
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.15, right: 0.15, top: 0.3, bottom: 0.3, header: 0, footer: 0 } },
    views: [{ state: 'frozen', ySplit: 8, xSplit: 3, activeCell: 'D9', showGridLines: false }]
  });
  sheet.columns = psychotropicPurchasesColumns.map(column => ({ width: column.width }));
  const logo = await loadTrimmedLogoDataUrl(logoUrl);
  const logoHeight = 72;
  const logoId = workbook.addImage({ base64: logo.dataUrl, extension: 'png' });
  sheet.addImage(logoId, { tl: { col: 0.15, row: 0.15 }, ext: { width: logoHeight * logo.aspectRatio, height: logoHeight } });
  sheet.mergeCells('D2:I2');
  sheet.getCell('D2').value = 'COMPRAS PSICOTRÓPICOS';
  sheet.getCell('D2').font = { bold: true, size: 18, color: { argb: 'FF006767' } };
  sheet.getCell('D2').alignment = { horizontal: 'center' };
  sheet.mergeCells('D3:I3');
  sheet.getCell('D3').value = `Del ${dateText(report.period.desde)} al ${dateText(report.period.hasta)}`;
  sheet.getCell('D3').font = { size: 10, color: { argb: 'FF3E4948' } };
  sheet.getCell('D3').alignment = { horizontal: 'center' };
  const totals = summarizePsychotropicPurchases(rows);
  sheet.mergeCells('A6:I6');
  sheet.getCell('A6').value = summaryText(totals);
  sheet.getCell('A6').font = { bold: true, size: 9, color: { argb: 'FF006767' } };
  sheet.getCell('I5').value = `Generado: ${generatedText(report.generatedAt)}`;
  sheet.getCell('I5').font = { size: 8, color: { argb: 'FF6F7979' } };
  sheet.getCell('I5').alignment = { horizontal: 'right' };
  sheet.getRow(8).values = psychotropicPurchasesColumns.map(column => column.label);
  sheet.getRow(8).height = 29;
  sheet.getRow(8).eachCell(cell => {
    cell.font = { bold: true, size: 8, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF006767' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  rows.forEach((item, index) => {
    const row = sheet.addRow(psychotropicPurchasesColumns.map(column => {
      const value = item[column.key];
      return column.kind === 'date' ? dateValue(value == null ? null : String(value)) : value;
    }));
    row.height = 19;
    row.eachCell((cell, columnIndex) => {
      const definition = psychotropicPurchasesColumns[columnIndex - 1];
      cell.font = { size: 8 };
      cell.alignment = { vertical: 'middle', horizontal: definition.kind === 'number' ? 'right' : 'left' };
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFD5DEDE' } } };
      if (index % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F3F5' } };
      if (definition.kind === 'number') cell.numFmt = '#,##0.0000';
      if (definition.kind === 'date') cell.numFmt = 'dd/mm/yyyy';
    });
  });
  const totalRow = sheet.addRow(['Cantidad reportada TAB', totals.tab, 'GOT', totals.got, 'Sin FF', totals.sinFF]);
  totalRow.font = { bold: true, size: 9, color: { argb: 'FF006767' } };
  [2, 4, 6].forEach(index => { totalRow.getCell(index).numFmt = '#,##0.0000'; });
  sheet.autoFilter = { from: 'A8', to: `I${8 + rows.length}` };
  sheet.pageSetup.printArea = `A1:I${totalRow.number}`;
  sheet.headerFooter.oddFooter = '&LCompras Psicotrópicos&RPágina &P de &N';
  downloadBuffer(await workbook.xlsx.writeBuffer(), `${filename(report)}.xlsx`);
}

export async function exportPsychotropicPurchasesToPdf(rows: PsychotropicPurchasesRow[], report: PsychotropicPurchasesResponse) {
  if (!rows.length) return;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  const logo = await loadTrimmedLogoDataUrl(logoUrl);
  const logoHeight = 16;
  const totalPagesToken = '{total_pages_count_string}';
  const totals = summarizePsychotropicPurchases(rows);
  const body = rows.map(row => psychotropicPurchasesColumns.map(column => displayValue(row, column)));
  autoTable(doc, {
    startY: 30,
    tableWidth: doc.internal.pageSize.getWidth() - 10,
    margin: { top: 30, right: 5, bottom: 11, left: 5 },
    head: [psychotropicPurchasesColumns.map(column => column.label)], body, theme: 'grid', showHead: 'everyPage',
    headStyles: { fillColor: [0, 103, 103], textColor: 255, fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: [241, 243, 245] },
    styles: { fontSize: 7, cellPadding: 1.2, overflow: 'linebreak', valign: 'middle', lineColor: [190, 203, 203], lineWidth: 0.06 },
    columnStyles: Object.fromEntries(psychotropicPurchasesColumns.map((column, index) => [index, {
      cellWidth: column.width * (doc.internal.pageSize.getWidth() - 10) / psychotropicPurchasesColumns.reduce((sum, item) => sum + item.width, 0),
      halign: column.kind === 'number' ? 'right' : 'left'
    }])),
    didDrawPage: hook => {
      const width = doc.internal.pageSize.getWidth();
      doc.addImage(logo.dataUrl, 'PNG', 5, 3, logoHeight * logo.aspectRatio, logoHeight, undefined, 'FAST');
      doc.setTextColor(0, 103, 103); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
      doc.text('COMPRAS PSICOTRÓPICOS', width / 2, 8, { align: 'center' });
      doc.setTextColor(62, 73, 72); doc.setFontSize(8);
      doc.text(`Del ${dateText(report.period.desde)} al ${dateText(report.period.hasta)}`, width / 2, 14, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(111, 121, 121);
      doc.text(summaryText(totals), width / 2, 20, { align: 'center' });
      doc.text(`Generado: ${generatedText(report.generatedAt)}`, width - 5, 8, { align: 'right' });
      doc.text(`Página ${hook.pageNumber} de ${totalPagesToken}`, width - 5, 14, { align: 'right' });
    }
  });
  if (typeof doc.putTotalPages === 'function') doc.putTotalPages(totalPagesToken);
  doc.save(`${filename(report)}.pdf`);
}
