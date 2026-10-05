import type ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PsychotropicBalanceResponse, PsychotropicBalanceRow } from '../types';
import { summarizePsychotropicBalance, balanceRowStatus, balanceFormKeys, balanceQuantityKeys, balanceWarningText, balancePeriodExplanation } from './psychotropicBalanceModel';
import { loadTrimmedLogoDataUrl } from './logoUtils';
import logoUrl from '../../assets/logotipo.png';

type Column = { key: keyof PsychotropicBalanceRow; label: string; width: number; kind?: 'date' | 'number' };

export const psychotropicBalanceColumns: Column[] = [
  { key: 'Codpro', label: 'Código', width: 16 },
  { key: 'Principio', label: 'Principio activo', width: 24 },
  { key: 'Concentracion', label: 'Concentración', width: 18 },
  { key: 'Descripcion', label: 'Descripción', width: 34 },
  { key: 'FF', label: 'FF', width: 9 },
  { key: 'Laboratorio', label: 'Laboratorio', width: 30 },
  { key: 'Lote', label: 'Lote', width: 18 },
  { key: 'Vence', label: 'Vencimiento', width: 14, kind: 'date' },
  { key: 'SaldoAnterior', label: 'Saldo anterior', width: 18, kind: 'number' },
  { key: 'Ingresos', label: 'Ingresos', width: 16, kind: 'number' },
  { key: 'Egresos', label: 'Egresos', width: 16, kind: 'number' },
  { key: 'SaldoActual', label: 'Saldo actual', width: 18, kind: 'number' },
];

const decimal = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const dateValue = (value: string | null) => value ? new Date(`${value}T12:00:00`) : null;
const dateText = (value: string | null) => dateValue(value)?.toLocaleDateString('es-PE') || '';
const generatedText = (value: string) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
const summaryText = (totals: ReturnType<typeof summarizePsychotropicBalance>) => `${totals.registros} registros · ${totals.productos} productos · ${totals.lotes} producto–lote`;
const sourceText = balancePeriodExplanation;
const filename = (report: PsychotropicBalanceResponse) => `Balance_Psicotropico_${report.period.desde}_al_${report.period.hasta}`;

const displayValue = (row: PsychotropicBalanceRow, column: Column) => {
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

export async function exportPsychotropicBalanceToExcel(rows: PsychotropicBalanceRow[], report: PsychotropicBalanceResponse) {
  if (!rows.length) return;
  const { default: ExcelJSRuntime } = await import('exceljs');
  const workbook = new ExcelJSRuntime.Workbook();
  workbook.creator = 'CODINSA Tool Kit';
  workbook.created = new Date(report.generatedAt);
  const sheet = workbook.addWorksheet('Balance Psicotrópico', {
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.15, right: 0.15, top: 0.3, bottom: 0.3, header: 0, footer: 0 } },
    views: [{ state: 'frozen', ySplit: 8, xSplit: 4, activeCell: 'E9', showGridLines: false }]
  });
  sheet.columns = psychotropicBalanceColumns.map(column => ({ width: column.width }));
  const logo = await loadTrimmedLogoDataUrl(logoUrl);
  const logoHeight = 72;
  const logoId = workbook.addImage({ base64: logo.dataUrl, extension: 'png' });
  sheet.addImage(logoId, { tl: { col: 0.15, row: 0.15 }, ext: { width: logoHeight * logo.aspectRatio, height: logoHeight } });
  sheet.mergeCells('E2:L2');
  sheet.getCell('E2').value = 'BALANCE PSICOTRÓPICO';
  sheet.getCell('E2').font = { bold: true, size: 18, color: { argb: 'FF006767' } };
  sheet.getCell('E2').alignment = { horizontal: 'center' };
  sheet.mergeCells('E3:L3');
  sheet.getCell('E3').value = `Del ${dateText(report.period.desde)} al ${dateText(report.period.hasta)}`;
  sheet.getCell('E3').font = { size: 10, color: { argb: 'FF3E4948' } };
  sheet.getCell('E3').alignment = { horizontal: 'center' };
  const totals = summarizePsychotropicBalance(rows);
  sheet.mergeCells('A6:L6');
  sheet.getCell('A6').value = summaryText(totals);
  sheet.getCell('A6').font = { bold: true, size: 9, color: { argb: 'FF006767' } };
  sheet.getCell('L5').value = `Generado: ${generatedText(report.generatedAt)}`;
  sheet.getCell('L5').font = { size: 8, color: { argb: 'FF6F7979' } };
  sheet.getCell('L5').alignment = { horizontal: 'right' };
  sheet.mergeCells('A7:L7');
  sheet.getCell('A7').value = `${sourceText} Fecha SQL Server: ${dateText(report.operationalDate)}. ${balanceWarningText(totals)}`;
  sheet.getCell('A7').alignment = { wrapText: true, vertical: 'middle' };
  sheet.getCell('A7').font = { size: 9, color: { argb: totals.discrepantes || totals.incompletos ? 'FFB3261E' : 'FF6F7979' } };
  sheet.getRow(7).height = 44;
  sheet.getRow(8).values = psychotropicBalanceColumns.map(column => column.label);
  sheet.getRow(8).height = 29;
  sheet.getRow(8).eachCell(cell => {
    cell.font = { bold: true, size: 8, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF006767' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  rows.forEach((item, index) => {
    const row = sheet.addRow(psychotropicBalanceColumns.map(column => {
      const value = item[column.key];
      return column.kind === 'date' ? dateValue(value == null ? null : String(value)) : value;
    }));
    row.height = 19;
    row.eachCell((cell, columnIndex) => {
      const definition = psychotropicBalanceColumns[columnIndex - 1];
      cell.font = { size: 8 };
      cell.alignment = { vertical: 'middle', horizontal: definition.kind === 'number' ? 'right' : 'left' };
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFD5DEDE' } } };
      if (index % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F3F5' } };
      if (balanceRowStatus(item) !== 'correct') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCEEEE' } };
        cell.font = { size: 8, color: { argb: 'FFB3261E' } };
      }
      if (definition.kind === 'number') cell.numFmt = '#,##0';
      if (definition.kind === 'date') cell.numFmt = 'dd/mm/yyyy';
    });
  });
  const summaryHeader = sheet.addRow(['Resumen por FF', '', '', '', '', '', '', '', 'Saldo anterior', 'Ingresos', 'Egresos', 'Saldo actual']);
  summaryHeader.font = { bold: true, size: 9, color: { argb: 'FF006767' } };
  for (const form of balanceFormKeys) {
    const row = sheet.addRow([form === 'sinFF' ? 'Sin FF' : form, '', '', '', '', '', '', '', ...balanceQuantityKeys.map(key => totals.porFF[form][key])]);
    row.font = { bold: true, size: 9, color: { argb: 'FF006767' } };
    [9, 10, 11, 12].forEach(index => { row.getCell(index).numFmt = '#,##0'; });
  }
  sheet.autoFilter = { from: 'A8', to: `L${8 + rows.length}` };
  sheet.pageSetup.printArea = `A1:L${sheet.rowCount}`;
  sheet.headerFooter.oddFooter = '&LBalance Psicotrópico&RPágina &P de &N';
  downloadBuffer(await workbook.xlsx.writeBuffer(), `${filename(report)}.xlsx`);
}

export async function exportPsychotropicBalanceToPdf(rows: PsychotropicBalanceRow[], report: PsychotropicBalanceResponse) {
  if (!rows.length) return;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  const logo = await loadTrimmedLogoDataUrl(logoUrl);
  const logoHeight = 16;
  const totalPagesToken = '{total_pages_count_string}';
  const totals = summarizePsychotropicBalance(rows);
  const body = rows.map(row => psychotropicBalanceColumns.map(column => displayValue(row, column)));
  const drawnPages = new Set<number>();
  const drawHeader = () => {
    const page = doc.getCurrentPageInfo().pageNumber;
    if (drawnPages.has(page)) return;
    drawnPages.add(page);
    const width = doc.internal.pageSize.getWidth();
    doc.addImage(logo.dataUrl, 'PNG', 5, 3, logoHeight * logo.aspectRatio, logoHeight, undefined, 'FAST');
    doc.setTextColor(0, 103, 103); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text('BALANCE PSICOTRÓPICO', width / 2, 8, { align: 'center' });
    doc.setTextColor(62, 73, 72); doc.setFontSize(8);
    doc.text(`Del ${dateText(report.period.desde)} al ${dateText(report.period.hasta)}`, width / 2, 14, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(111, 121, 121);
    doc.text(summaryText(totals).replace('–', '-'), width / 2, 20, { align: 'center' });
    doc.text(sourceText, width / 2, 25, { align: 'center' });
    doc.setTextColor(totals.discrepantes || totals.incompletos ? 179 : 111, totals.discrepantes || totals.incompletos ? 38 : 121, totals.discrepantes || totals.incompletos ? 30 : 121);
    doc.text(balanceWarningText(totals).replace('−', '-'), width / 2, 30, { align: 'center', maxWidth: width - 20 });
    doc.setTextColor(111, 121, 121); doc.setFontSize(6.5);
    doc.text(`Generado: ${generatedText(report.generatedAt)}`, width - 5, 8, { align: 'right' });
    doc.text(`Página ${doc.getCurrentPageInfo().pageNumber} de ${totalPagesToken}`, width - 5, 14, { align: 'right' });
    doc.text(`Fecha SQL Server: ${dateText(report.operationalDate)}`, width - 5, 19, { align: 'right' });
  };
  autoTable(doc, {
    startY: 42,
    tableWidth: doc.internal.pageSize.getWidth() - 10,
    margin: { top: 42, right: 5, bottom: 11, left: 5 },
    head: [psychotropicBalanceColumns.map(column => column.label)], body, theme: 'grid', showHead: 'everyPage',
    headStyles: { fillColor: [0, 103, 103], textColor: 255, fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: [241, 243, 245] },
    styles: { fontSize: 7, cellPadding: 1.2, overflow: 'linebreak', valign: 'middle', lineColor: [190, 203, 203], lineWidth: 0.06 },
    columnStyles: Object.fromEntries(psychotropicBalanceColumns.map((column, index) => [index, {
      cellWidth: column.width * (doc.internal.pageSize.getWidth() - 10) / psychotropicBalanceColumns.reduce((sum, item) => sum + item.width, 0),
      halign: column.kind === 'number' ? 'right' : 'left'
    }])),
    didParseCell: hook => {
      if (hook.section === 'body' && balanceRowStatus(rows[hook.row.index]) !== 'correct') {
        hook.cell.styles.fillColor = [252, 238, 238];
        hook.cell.styles.textColor = [179, 38, 30];
      }
    },
    didDrawPage: drawHeader
  });
  const tableEnd = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 42;
  autoTable(doc, {
    startY: tableEnd + 6, margin: { top: 42, right: 5, bottom: 11, left: 5 },
    head: [['Resumen por FF', 'Saldo anterior', 'Ingresos', 'Egresos', 'Saldo actual']],
    body: balanceFormKeys.map(form => [form === 'sinFF' ? 'Sin FF' : form, ...balanceQuantityKeys.map(key => decimal.format(totals.porFF[form][key]))]),
    theme: 'grid', showHead: 'everyPage', styles: { fontSize: 8, cellPadding: 2, halign: 'right' },
    headStyles: { fillColor: [0, 103, 103], textColor: 255 }, columnStyles: { 0: { halign: 'left' } },
    didDrawPage: drawHeader
  });
  if (typeof doc.putTotalPages === 'function') doc.putTotalPages(totalPagesToken);
  doc.save(`${filename(report)}.pdf`);
}
