import type ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import type { MonthlyLaboratoriesCell, MonthlyLaboratoriesResponse, MonthlyLaboratoriesSection } from '../types';
import { monthlyLaboratoriesPeriod, monthlyLaboratoryCellText, summarizeMonthlyLaboratory } from './monthlyLaboratoriesModel';
import { loadTrimmedLogoDataUrl } from './logoUtils';
import logoUrl from '../../assets/logotipo.png';

type Row = Record<string, MonthlyLaboratoriesCell>;
type Logo = { dataUrl: string; aspectRatio: number };
const generated = (report: MonthlyLaboratoriesResponse) => new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'short' }).format(new Date(report.generatedAt));
const filename = (report: MonthlyLaboratoriesResponse, lab?: MonthlyLaboratoriesSection) => `Reportes_Mes_Laboratorios_${report.period.anio}_${String(report.period.mes).padStart(2, '0')}${lab ? `_${lab.id}` : ''}`;
const logo = () => loadTrimmedLogoDataUrl(logoUrl).catch(() => undefined);

export async function buildMonthlyLaboratoriesWorkbook(report: MonthlyLaboratoriesResponse, selected?: MonthlyLaboratoriesSection, selectedRows?: Row[]) {
  const { default: ExcelJSRuntime } = await import('exceljs');
  const workbook = new ExcelJSRuntime.Workbook();
  workbook.creator = 'CODINSA Tool Kit';
  workbook.created = new Date(report.generatedAt);
  for (const lab of selected ? [selected] : report.laboratories) {
    const rows = selected ? selectedRows ?? lab.data : lab.data;
    const sheet = workbook.addWorksheet(lab.name, {
      views: [{ state: 'frozen', ySplit: 7, xSplit: 3 }],
      pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });
    sheet.columns = lab.columns.map(column => ({ width: column.width }));
    const last = lab.columns.length;
    const title = (row: number, text: string, size: number) => {
      sheet.mergeCells(row, 1, row, last);
      const cell = sheet.getCell(row, 1);
      cell.value = text;
      cell.font = { bold: true, size, color: { argb: 'FF006767' } };
      cell.alignment = { vertical: 'middle', wrapText: true };
      sheet.getRow(row).height = size + 12;
    };
    title(1, 'CODINSA S.A.C. - Reportes Mes Laboratorios', 16);
    title(2, `${lab.name} | ${monthlyLaboratoriesPeriod(report)}`, 12);
    title(3, `Generado: ${generated(report)} (Lima)`, 9);
    const totals = summarizeMonthlyLaboratory(rows);
    title(5, `${totals.registros} registros | Cantidad: ${totals.cantidad} | Total reportado: S/ ${totals.importe.toFixed(2)}`, 10);
    sheet.getRow(7).values = lab.columns.map(column => column.label);
    sheet.getRow(7).height = 28;
    sheet.getRow(7).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF006767' } };
      cell.alignment = { vertical: 'middle', wrapText: true };
    });
    rows.forEach((item, index) => {
      const row = sheet.addRow(lab.columns.map(column => item[column.key]));
      row.eachCell({ includeEmpty: true }, (cell, columnIndex) => {
        const column = lab.columns[columnIndex - 1];
        cell.font = { size: 10 };
        cell.alignment = { vertical: 'top', wrapText: true, horizontal: column.kind === 'number' || column.kind === 'money' ? 'right' : 'left' };
        if (column.kind === 'money') cell.numFmt = '"S/ "#,##0.00;[Red]-"S/ "#,##0.00';
        else if (column.kind === 'number') cell.numFmt = '#,##0.######';
        else cell.numFmt = '@';
        if (index % 2) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F3F5' } };
      });
    });
    if (!rows.length) title(8, 'Sin registros para este laboratorio en el período seleccionado.', 10);
    else {
      sheet.autoFilter = { from: { row: 7, column: 1 }, to: { row: 7 + rows.length, column: last } };
      const row = sheet.addRow(lab.columns.map((column, index) => index === 0 ? 'TOTALES' : column.key === 'Cantidad' ? totals.cantidad : column.key === 'Total' ? totals.importe : null));
      row.eachCell({ includeEmpty: true }, (cell, index) => {
        cell.font = { bold: true, color: { argb: 'FF006767' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCEEEE' } };
        if (lab.columns[index - 1].kind === 'money') cell.numFmt = '"S/ "#,##0.00';
      });
    }
    sheet.pageSetup.printTitlesRow = '1:7';
    sheet.headerFooter.oddFooter = `&L${lab.name} - ${monthlyLaboratoriesPeriod(report)}&RPágina &P de &N`;
  }
  return workbook;
}

export function buildMonthlyLaboratoryPdf(rows: Row[], report: MonthlyLaboratoriesResponse, lab: MonthlyLaboratoriesSection, documentLogo?: Logo) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  const totals = summarizeMonthlyLaboratory(rows);
  const width = doc.internal.pageSize.getWidth();
  const available = width - 12;
  const sumWidths = lab.columns.reduce((sum, column) => sum + column.width, 0);
  const body = rows.map(row => lab.columns.map(column => monthlyLaboratoryCellText(row[column.key], column)));
  if (!rows.length) body.push(lab.columns.map((_, i) => i === 0 ? 'Sin registros' : ''));
  body.push(lab.columns.map((column, index) => index === 0 ? 'TOTALES' : column.key === 'Cantidad' ? String(totals.cantidad) : column.key === 'Total' ? `S/ ${totals.importe.toFixed(2)}` : ''));
  autoTable(doc, {
    head: [lab.columns.map(column => column.label)], body,
    startY: 37, margin: { top: 37, bottom: 12, left: 6, right: 6 }, showHead: 'everyPage', theme: 'grid',
    styles: { fontSize: 6, cellPadding: 1.2, overflow: 'linebreak', valign: 'middle', lineWidth: 0.05, lineColor: [190, 203, 203] },
    headStyles: { fillColor: [0, 103, 103], textColor: 255 }, alternateRowStyles: { fillColor: [241, 243, 245] },
    columnStyles: Object.fromEntries(lab.columns.map((column, i) => [i, { cellWidth: column.width / sumWidths * available, halign: column.kind === 'money' || column.kind === 'number' ? 'right' : 'left' }])),
    didParseCell: hook => { if (hook.section === 'body' && hook.row.index === body.length - 1) { hook.cell.styles.fontStyle = 'bold'; hook.cell.styles.fillColor = [220, 238, 238]; } },
    didDrawPage: hook => {
      if (documentLogo) doc.addImage(documentLogo.dataUrl, 'PNG', 6, 4, documentLogo.aspectRatio * 15, 15);
      doc.setTextColor(0, 103, 103); doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
      doc.text('REPORTES MES LABORATORIOS', width / 2, 10, { align: 'center' });
      doc.setFontSize(10); doc.text(`${lab.name} | ${monthlyLaboratoriesPeriod(report)}`, width / 2, 17, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setTextColor(62, 73, 72); doc.setFontSize(8);
      doc.text(`${totals.registros} registros | Cantidad: ${totals.cantidad} | Total reportado: S/ ${totals.importe.toFixed(2)}`, width / 2, 24, { align: 'center' });
      doc.setFontSize(7); doc.text(`Generado: ${generated(report)} (Lima)`, width - 6, 31, { align: 'right' });
      doc.text(`CODINSA S.A.C. | Página ${hook.pageNumber} de {total_pages_count_string}`, 6, doc.internal.pageSize.getHeight() - 5);
    },
  });
  doc.putTotalPages('{total_pages_count_string}');
  return doc;
}

export async function exportMonthlyLaboratoriesExcel(report: MonthlyLaboratoriesResponse, lab?: MonthlyLaboratoriesSection, rows?: Row[]) {
  const workbook = await buildMonthlyLaboratoriesWorkbook(report, lab, rows);
  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${filename(report, lab)}.xlsx`; anchor.click(); URL.revokeObjectURL(url);
}
export async function exportMonthlyLaboratoryPdf(report: MonthlyLaboratoriesResponse, lab: MonthlyLaboratoriesSection, rows: Row[]) {
  buildMonthlyLaboratoryPdf(rows, report, lab, await logo()).save(`${filename(report, lab)}.pdf`);
}
