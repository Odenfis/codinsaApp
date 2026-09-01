/**
 * @license
 * Tool Kit Enterprise Export Utilities (Excel & PDF)
 * CODINSA S.A.C. Droguería / Tool Kit Enterprise Admin
 */

import * as XLSX from 'xlsx';
import type ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  CobranzaReporteRow, CobranzaReporteTotals, PlanillaCobranzaResponse
} from '../types';
import {
  buildCollectionSheetPresentation, collectionSheetDeposit, documentCode
} from './collectionSheetModel';
import { loadTrimmedLogoDataUrl } from './logoUtils';
import logoUrl from '../../assets/logotipo.png';

export function exportToExcel(data: any[], filename: string, sheetName: string = 'Reporte') {
  if (!data || data.length === 0) {
    alert('No hay datos disponibles para exportar a Excel.');
    return;
  }
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().substring(0,10)}.xlsx`);
}

export function exportToPdf(title: string, headers: string[], rows: any[][], filename: string) {
  if (!rows || rows.length === 0) {
    alert('No hay datos disponibles para exportar a PDF.');
    return;
  }
  const doc = new jsPDF();

  // Membrete Oficial
  doc.setFontSize(18);
  doc.setTextColor(0, 103, 103); // #006767 Petrol Blue
  doc.text('CODINSA S.A.C. Droguería - Tool Kit Enterprise', 14, 20);

  doc.setFontSize(14);
  doc.setTextColor(62, 73, 72);
  doc.text(title, 14, 30);

  doc.setFontSize(10);
  doc.setTextColor(111, 121, 121);
  doc.text(`Fecha de generación: ${new Date().toLocaleString()}`, 14, 36);

  autoTable(doc, {
    startY: 42,
    head: [headers],
    body: rows,
    headStyles: { fillColor: [0, 103, 103], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [241, 243, 245] },
    styles: { fontSize: 9, cellPadding: 3, textColor: [25, 28, 29] }
  });

  doc.save(`${filename}_${new Date().toISOString().substring(0,10)}.pdf`);
}

const collectionHeaders = [
  'Documento', 'Razón social', 'Importe', 'Pago anterior', 'Planilla', 'Fecha ingreso',
  'Vendedor', 'Nota crédito', 'Descuento', 'Efectivo', 'Depósito', 'Letra',
  'Transferencia', 'Cheque', 'Nro. operación', 'Total', 'Saldo'
];

const excelDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date;
};

export function exportCollectionsToExcel(
  data: CobranzaReporteRow[], totals: CobranzaReporteTotals, desde: string, hasta: string
) {
  if (!data.length) return;
  const rows = data.map(row => [
    row.Documento, row.Razon, row.Importe, row.pAnterior, row.Planilla, excelDate(row.FechaIng),
    row.Vendedor, row.NotaCred, row.Descuento, row.efectivo, row.deposito, row.letra,
    row.Transferencia, row.cheque, row.NroOperacion ?? '', row.Total, row.saldo
  ]);
  rows.push([
    'TOTAL', '', totals.Importe, totals.pAnterior, '', '', '', totals.NotaCred,
    totals.Descuento, totals.efectivo, totals.deposito, totals.letra, totals.Transferencia,
    totals.cheque, '', totals.Total, totals.saldo
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([collectionHeaders, ...rows], { cellDates: true });
  worksheet['!cols'] = [12, 34, 14, 14, 15, 14, 20, 14, 14, 14, 14, 14, 16, 14, 18, 14, 14].map(wch => ({ wch }));
  worksheet['!autofilter'] = { ref: `A1:Q${data.length + 1}` };
  worksheet['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' };
  for (let row = 2; row <= data.length + 2; row += 1) {
    [3, 4, 8, 9, 10, 11, 12, 13, 14, 16, 17].forEach(column => {
      const cell = worksheet[XLSX.utils.encode_cell({ r: row - 1, c: column - 1 })];
      if (cell) cell.z = '#,##0.00';
    });
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte de Cobranzas');
  XLSX.writeFile(workbook, `Reporte_Cobranzas_${desde}_al_${hasta}.xlsx`);
}

const pdfMoney = (value: number) => new Intl.NumberFormat('es-PE', {
  minimumFractionDigits: 2, maximumFractionDigits: 2
}).format(value || 0);

export function exportCollectionsToPdf(
  data: CobranzaReporteRow[], totals: CobranzaReporteTotals, desde: string, hasta: string
) {
  if (!data.length) return;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  const generatedAt = new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date());
  const totalPagesToken = '{total_pages_count_string}';
  const body: (string | number)[][] = data.map(row => [
    row.Documento, row.Razon, pdfMoney(row.Importe), pdfMoney(row.pAnterior), row.Planilla,
    new Date(row.FechaIng).toLocaleDateString('es-PE'), row.Vendedor, pdfMoney(row.NotaCred),
    pdfMoney(row.Descuento), pdfMoney(row.efectivo), pdfMoney(row.deposito), pdfMoney(row.letra),
    pdfMoney(row.Transferencia), pdfMoney(row.cheque), String(row.NroOperacion ?? ''),
    pdfMoney(row.Total), pdfMoney(row.saldo)
  ]);
  body.push([
    'TOTAL', '', pdfMoney(totals.Importe), pdfMoney(totals.pAnterior), '', '', '',
    pdfMoney(totals.NotaCred), pdfMoney(totals.Descuento), pdfMoney(totals.efectivo),
    pdfMoney(totals.deposito), pdfMoney(totals.letra), pdfMoney(totals.Transferencia),
    pdfMoney(totals.cheque), '', pdfMoney(totals.Total), pdfMoney(totals.saldo)
  ]);

  autoTable(doc, {
    startY: 34,
    margin: { top: 34, right: 10, bottom: 12, left: 10 },
    head: [collectionHeaders],
    body,
    theme: 'grid',
    showHead: 'everyPage',
    headStyles: { fillColor: [0, 103, 103], textColor: 255, fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: [241, 243, 245] },
    styles: { fontSize: 6.5, cellPadding: 1.4, overflow: 'linebreak', valign: 'middle' },
    columnStyles: {
      1: { cellWidth: 38 }, 5: { cellWidth: 17 }, 6: { cellWidth: 22 },
      2: { halign: 'right' }, 3: { halign: 'right' }, 7: { halign: 'right' },
      8: { halign: 'right' }, 9: { halign: 'right' }, 10: { halign: 'right' },
      11: { halign: 'right' }, 12: { halign: 'right' }, 13: { halign: 'right' },
      15: { halign: 'right' }, 16: { halign: 'right' }
    },
    didParseCell: hook => {
      if (hook.section === 'body' && hook.row.index === body.length - 1) {
        hook.cell.styles.fontStyle = 'bold';
        hook.cell.styles.fillColor = [220, 238, 238];
      }
    },
    didDrawPage: hook => {
      const width = doc.internal.pageSize.getWidth();
      doc.setTextColor(25, 28, 29);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('COMPAÑIA DISTRIBUIDORA AMERICANA S.A.C.', 10, 12);
      doc.setFontSize(10);
      doc.text('Reporte de Cobranzas', 10, 20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Rango: ${desde} al ${hasta}`, 10, 26);
      doc.text(`Fecha: ${generatedAt}`, width - 10, 12, { align: 'right' });
      doc.text(`Página ${hook.pageNumber} de ${totalPagesToken}`, width - 10, 20, { align: 'right' });
    }
  });
  if (typeof doc.putTotalPages === 'function') doc.putTotalPages(totalPagesToken);
  doc.save(`Reporte_Cobranzas_${desde}_al_${hasta}.pdf`);
}

const safeFilePart = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '_');
const collectionSheetFilename = (report: PlanillaCobranzaResponse) =>
  `Planilla_Cobranza_${safeFilePart(report.header.Serie)}_${safeFilePart(report.header.Numero)}`;

const downloadBuffer = (buffer: ExcelJS.Buffer, filename: string) => {
  const blob = new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const excelDateValue = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const forEachExcelCell = (
  sheet: ExcelJS.Worksheet, startRow: number, startColumn: number, endRow: number, endColumn: number,
  callback: (cell: ExcelJS.Cell, row: number, column: number) => void
) => {
  for (let row = startRow; row <= endRow; row += 1) {
    for (let column = startColumn; column <= endColumn; column += 1) callback(sheet.getCell(row, column), row, column);
  }
};

export async function exportCollectionSheetToExcel(report: PlanillaCobranzaResponse) {
  const presentation = buildCollectionSheetPresentation(report);
  const { default: ExcelJSRuntime } = await import('exceljs');
  const workbook = new ExcelJSRuntime.Workbook();
  workbook.creator = 'CODINSA Tool Kit';
  const sheet = workbook.addWorksheet('Planilla', {
    pageSetup: {
      orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.2, right: 0.2, top: 0.25, bottom: 0.25, header: 0, footer: 0 }
    },
    properties: { defaultRowHeight: 14 },
    views: [{ showGridLines: false, zoomScale: 70 }]
  });
  sheet.columns = [7, 14, 10.5, 10.5, 10.5, 16, 7, 11, 11, 12, 11, 9, 10, 10, 10, 10].map(width => ({ width }));
  const logo = await loadTrimmedLogoDataUrl(logoUrl);
  const logoHeight = 90;
  const logoWidth = logoHeight * logo.aspectRatio;
  const logoId = workbook.addImage({ base64: logo.dataUrl, extension: 'png' });
  const thin: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF607878' } }, bottom: { style: 'thin', color: { argb: 'FF607878' } },
    left: { style: 'thin', color: { argb: 'FF607878' } }, right: { style: 'thin', color: { argb: 'FF607878' } }
  };
  const teal = 'FF006767';
  const pale = 'FFDCEEEE';
  const moneyFormat = '#,##0.00';

  presentation.pages.forEach((items, pageIndex) => {
    const base = pageIndex * 43;
    const row = (relative: number) => base + relative;
    sheet.addImage(logoId, { tl: { col: 0.1, row: base + 0.05 }, ext: { width: logoWidth, height: logoHeight } });
    sheet.mergeCells(`M${row(2)}:N${row(2)}`); sheet.mergeCells(`O${row(2)}:P${row(2)}`);
    sheet.mergeCells(`N${row(3)}:P${row(3)}`); sheet.mergeCells(`N${row(4)}:P${row(4)}`);
    sheet.getCell(`M${row(2)}`).value = 'Fecha de Liquidación:';
    sheet.getCell(`O${row(2)}`).value = excelDateValue(report.header.FechaIng);
    sheet.getCell(`M${row(3)}`).value = 'Vendedor:'; sheet.getCell(`N${row(3)}`).value = report.header.Nombre;
    sheet.getCell(`M${row(4)}`).value = 'Localidad:'; sheet.getCell(`N${row(4)}`).value = presentation.location;
    sheet.getCell(`O${row(2)}`).numFmt = 'dd/mm/yyyy';
    sheet.getCell(`M${row(2)}`).font = sheet.getCell(`M${row(3)}`).font = sheet.getCell(`M${row(4)}`).font = { bold: true, size: 9 };
    for (const targetRow of [row(2), row(3), row(4)]) forEachExcelCell(sheet, targetRow, 13, targetRow, 16, cell => { cell.border = thin; cell.alignment = { vertical: 'middle', horizontal: 'center' }; cell.font = { ...cell.font, size: 9 }; });
    sheet.mergeCells(`E${row(6)}:N${row(6)}`);
    sheet.getCell(`E${row(6)}`).value = 'P L A N I L L A   D E   C O B R A N Z A';
    sheet.getCell(`E${row(6)}`).font = { bold: true, size: 15, color: { argb: teal } };
    sheet.getCell(`E${row(6)}`).alignment = { horizontal: 'center' };
    sheet.mergeCells(`O${row(6)}:P${row(6)}`); sheet.getCell(`O${row(6)}`).value = `Nº ${report.header.Numero}`;
    sheet.getCell(`O${row(6)}`).font = { bold: true, size: 12 }; sheet.getCell(`O${row(6)}`).alignment = { horizontal: 'center' };

    sheet.mergeCells(`A${row(7)}:A${row(8)}`); sheet.mergeCells(`B${row(7)}:B${row(8)}`); sheet.mergeCells(`C${row(7)}:E${row(8)}`);
    sheet.mergeCells(`F${row(7)}:F${row(8)}`); sheet.mergeCells(`G${row(7)}:I${row(7)}`); sheet.mergeCells(`J${row(7)}:J${row(8)}`);
    sheet.mergeCells(`K${row(7)}:K${row(8)}`); sheet.mergeCells(`L${row(7)}:P${row(7)}`);
    [['A', 'Código\nCliente'], ['B', 'R.U.C.'], ['C', 'Nombre del cliente'], ['F', 'Lugar'], ['G', 'Documento'], ['J', 'Importe\nAmortizado'], ['K', 'Descuento\nNC'], ['L', 'Forma de Pago']].forEach(([column, label]) => { sheet.getCell(`${column}${row(7)}`).value = label; });
    ['Tipo', 'Número', 'F. Emisión'].forEach((label, index) => { sheet.getCell(row(8), 7 + index).value = label; });
    ['Efectivo', 'Depósito', 'Letras', 'Transferencia', 'Cheque'].forEach((label, index) => { sheet.getCell(row(8), 12 + index).value = label; });
    forEachExcelCell(sheet, row(7), 1, row(8), 16, cell => {
      cell.border = thin; cell.font = { bold: true, size: 8, color: { argb: teal } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });

    for (let index = 0; index < 15; index += 1) {
      const targetRow = row(9 + index);
      const item = items[index];
      sheet.mergeCells(`C${targetRow}:E${targetRow}`);
      if (item) {
        [item.CodClie, item.RUC, item.Razon, item.Lugar, documentCode(item.TipoDoc), item.Documento,
          excelDateValue(item.FechaFac), item.Valor, item.Descuento || item.NotaCred, item.Efectivo,
          collectionSheetDeposit(item), item.Letra, item.Transferencia, item.Cheque].forEach((value, indexValue) => {
            const columns = [1, 2, 3, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
            sheet.getCell(targetRow, columns[indexValue]).value = value;
          });
        sheet.getCell(targetRow, 9).numFmt = 'dd/mm/yyyy';
        [10, 11, 12, 13, 14, 15, 16].forEach(column => { if (typeof sheet.getCell(targetRow, column).value === 'number') sheet.getCell(targetRow, column).numFmt = moneyFormat; });
      }
      sheet.getRow(targetRow).height = 22;
      forEachExcelCell(sheet, targetRow, 1, targetRow, 16, (cell, _row, column) => {
        cell.border = thin; cell.font = { size: 8 }; cell.alignment = { horizontal: column >= 10 ? 'right' : 'center', vertical: 'middle', shrinkToFit: true };
      });
    }
    if (pageIndex < presentation.pages.length - 1) sheet.getRow(row(43)).addPageBreak();
  });

  const finalBase = (presentation.pages.length - 1) * 43;
  const finalRow = (relative: number) => finalBase + relative;
  sheet.mergeCells(`A${finalRow(24)}:J${finalRow(24)}`); sheet.getCell(`A${finalRow(24)}`).value = 'TOTALES';
  const totalColumns = [11, 12, 13, 14, 15, 16];
  const totalResults = [presentation.totals.descuento, presentation.totals.efectivo, presentation.totals.deposito, presentation.totals.letra, presentation.totals.transferencia, presentation.totals.cheque];
  totalColumns.forEach((column, index) => {
    const ranges = presentation.pages.map((_, pageIndex) => `${String.fromCharCode(64 + column)}${pageIndex * 43 + 9}:${String.fromCharCode(64 + column)}${pageIndex * 43 + 23}`);
    sheet.getCell(finalRow(24), column).value = { formula: `SUM(${ranges.join(',')})`, result: totalResults[index] };
    sheet.getCell(finalRow(24), column).numFmt = moneyFormat;
  });
  forEachExcelCell(sheet, finalRow(24), 1, finalRow(24), 16, cell => { cell.border = thin; cell.font = { bold: true, size: 8 }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: pale } }; });

  sheet.mergeCells(`A${finalRow(26)}:H${finalRow(31)}`);
  sheet.getCell(`A${finalRow(26)}`).value = 'CÓDIGOS DE DOCUMENTO PARA SER USADOS EN LA LIQUIDACIÓN DE PLANILLA DE COBRANZA\n1 = FACTURA     2 = LETRA     3 = NOTA DE DÉBITO     4 = NOTA DE CRÉDITO\n5 = PAGO A CUENTA     6 = CHEQUE DEVUELTO     7 = LETRA PROTESTADA     8 = OTROS';
  sheet.getCell(`A${finalRow(26)}`).alignment = { wrapText: true, vertical: 'middle' }; sheet.getCell(`A${finalRow(26)}`).font = { bold: true, size: 7, color: { argb: teal } };
  forEachExcelCell(sheet, finalRow(26), 1, finalRow(31), 8, cell => { cell.border = thin; });

  const summaryLabels = ['TOTAL EFECTIVO', 'TOTAL DEPÓSITO BCO.', 'TOTAL LETRAS', 'TOTAL TRANSFERENCIA', 'TOTAL CHEQUE AL DÍA', 'TOTAL COBRADO'];
  const summaryValues = [presentation.totals.efectivo, presentation.totals.deposito, presentation.totals.letra, presentation.totals.transferencia, presentation.totals.cheque, presentation.totals.cobrado];
  summaryLabels.forEach((label, index) => {
    const target = finalRow(26) + index;
    sheet.mergeCells(target, 9, target, 14); sheet.getCell(target, 9).value = label; sheet.getCell(target, 15).value = summaryValues[index];
    sheet.mergeCells(target, 15, target, 16); sheet.getCell(target, 15).numFmt = moneyFormat;
    forEachExcelCell(sheet, target, 9, target, 16, cell => { cell.border = thin; cell.font = { bold: true, size: 7 }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: index === 5 ? pale : 'FF9FD7E2' } }; });
  });

  const blockStart = finalRow(33);
  const paymentRows = Math.max(4, presentation.deposits.length, presentation.transfers.length, presentation.checks.length);
  const renderPaymentBlock = (startColumn: number, title: string, referenceTitle: string, rows: typeof presentation.deposits) => {
    sheet.mergeCells(blockStart, startColumn, blockStart, startColumn + 3);
    sheet.getCell(blockStart, startColumn).value = title;
    sheet.getCell(blockStart, startColumn).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: pale } };
    ['MONTO', referenceTitle, 'FECHA', 'BANCO'].forEach((label, index) => { sheet.getCell(blockStart + 1, startColumn + index).value = label; });
    for (let index = 0; index < paymentRows; index += 1) {
      const payment = rows[index];
      if (payment) {
        sheet.getCell(blockStart + 2 + index, startColumn).value = payment.amount;
        sheet.getCell(blockStart + 2 + index, startColumn).numFmt = moneyFormat;
        sheet.getCell(blockStart + 2 + index, startColumn + 1).value = payment.reference;
        sheet.getCell(blockStart + 2 + index, startColumn + 2).value = excelDateValue(payment.date);
        sheet.getCell(blockStart + 2 + index, startColumn + 2).numFmt = 'dd/mm/yyyy';
        sheet.getCell(blockStart + 2 + index, startColumn + 3).value = payment.bank;
      }
    }
    forEachExcelCell(sheet, blockStart, startColumn, blockStart + paymentRows + 1, startColumn + 3, cell => { cell.border = thin; cell.font = { bold: Number(cell.row) <= blockStart + 1, size: 7 }; cell.alignment = { horizontal: 'center', vertical: 'middle', shrinkToFit: true }; });
  };
  renderPaymentBlock(1, 'DEPÓSITOS', 'Nº OPERACIÓN', presentation.deposits);
  renderPaymentBlock(7, 'TRANSFERENCIAS', 'Nº OPERACIÓN', presentation.transfers);
  renderPaymentBlock(13, 'CHEQUE', 'NÚMERO', presentation.checks);
  const signatureRow = blockStart + paymentRows + 4;
  [['D', 'VENDEDOR'], ['H', 'CAJERO'], ['L', 'VºBº']].forEach(([column, label]) => { sheet.getCell(`${column}${signatureRow}`).value = label; sheet.getCell(`${column}${signatureRow}`).border = { top: thin.top }; sheet.getCell(`${column}${signatureRow}`).alignment = { horizontal: 'center' }; sheet.getCell(`${column}${signatureRow}`).font = { bold: true, size: 7 }; });
  sheet.mergeCells(`A${signatureRow + 2}:P${signatureRow + 3}`); sheet.getCell(`A${signatureRow + 2}`).value = 'OBSERVACIONES:'; sheet.getCell(`A${signatureRow + 2}`).border = thin; sheet.getCell(`A${signatureRow + 2}`).font = { bold: true, size: 8 };
  sheet.pageSetup.printArea = `A1:P${signatureRow + 3}`;
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer, `${collectionSheetFilename(report)}.xlsx`);
}

export async function exportCollectionSheetToPdf(report: PlanillaCobranzaResponse) {
  const presentation = buildCollectionSheetPresentation(report);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const logo = await loadTrimmedLogoDataUrl(logoUrl);
  const logoHeight = 22;
  const logoWidth = logoHeight * logo.aspectRatio;
  const widths = [14, 22, 48, 28, 10, 20, 20, 22, 18, 16, 18, 16, 16, 16];
  presentation.pages.forEach((items, pageIndex) => {
    if (pageIndex > 0) doc.addPage();
    doc.addImage(logo.dataUrl, 'PNG', 10, 5, logoWidth, logoHeight, undefined, 'FAST');
    doc.setDrawColor(96, 120, 120); doc.setTextColor(35, 50, 50);
    doc.setFontSize(7); doc.setFont('helvetica', 'bold');
    doc.text('Fecha de Liquidación:', 220, 10); doc.text('Vendedor:', 220, 16); doc.text('Localidad:', 220, 22);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(report.header.FechaIng).toLocaleDateString('es-PE'), 255, 10); doc.text(report.header.Nombre, 255, 16); doc.text(presentation.location, 255, 22);
    doc.rect(216, 6, 71, 20);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(0, 103, 103);
    doc.text('P L A N I L L A   D E   C O B R A N Z A', 148.5, 33, { align: 'center' });
    doc.setTextColor(35, 50, 50); doc.setFontSize(9); doc.text(`Nº ${report.header.Numero}`, 284, 33, { align: 'right' });
    const body = Array.from({ length: 15 }, (_, index) => {
      const item = items[index];
      if (!item) return Array(14).fill('');
      return [item.CodClie, item.RUC, item.Razon, item.Lugar, documentCode(item.TipoDoc), item.Documento,
        new Date(item.FechaFac).toLocaleDateString('es-PE'), pdfMoney(item.Valor), item.Descuento ? pdfMoney(item.Descuento) : item.NotaCred,
        item.Efectivo ? pdfMoney(item.Efectivo) : '', collectionSheetDeposit(item) ? pdfMoney(collectionSheetDeposit(item)) : '',
        item.Letra ? pdfMoney(item.Letra) : '', item.Transferencia ? pdfMoney(item.Transferencia) : '', item.Cheque ? pdfMoney(item.Cheque) : ''];
    });
    autoTable(doc, {
      startY: 37, margin: { left: 6, right: 6 }, theme: 'grid',
      head: [['Código Cliente', 'R.U.C.', 'Nombre del cliente', 'Lugar', 'Tipo', 'Número', 'F. Emisión', 'Importe Amortizado', 'Descuento NC', 'Efectivo', 'Depósito', 'Letras', 'Transferencia', 'Cheque']],
      body, styles: { fontSize: 5.6, cellPadding: 0.8, minCellHeight: 4.1, valign: 'middle', overflow: 'ellipsize', lineColor: [96, 120, 120], lineWidth: 0.15 },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 103, 103], fontStyle: 'bold', halign: 'center' },
      columnStyles: Object.fromEntries(widths.map((cellWidth, index) => [index, { cellWidth, halign: index >= 7 ? 'right' : 'center' }]))
    });
    const isLast = pageIndex === presentation.pages.length - 1;
    if (isLast) {
      const y = 116;
      doc.setFontSize(5.5); doc.setTextColor(0, 103, 103); doc.setFont('helvetica', 'bold');
      doc.rect(6, y, 168, 17); doc.text('CÓDIGOS DE DOCUMENTO PARA SER USADOS EN LA LIQUIDACIÓN DE PLANILLA DE COBRANZA', 8, y + 4);
      doc.setTextColor(35, 50, 50); doc.text('1 = FACTURA     2 = LETRA     3 = NOTA DE DÉBITO     4 = NOTA DE CRÉDITO', 8, y + 9);
      doc.text('5 = PAGO A CUENTA     6 = CHEQUE DEVUELTO     7 = LETRA PROTESTADA     8 = OTROS', 8, y + 14);
      const summary = [
        ['TOTAL EFECTIVO', presentation.totals.efectivo], ['TOTAL DEPÓSITO BCO.', presentation.totals.deposito],
        ['TOTAL LETRAS', presentation.totals.letra], ['TOTAL TRANSFERENCIA', presentation.totals.transferencia],
        ['TOTAL CHEQUE AL DÍA', presentation.totals.cheque], ['TOTAL COBRADO', presentation.totals.cobrado]
      ] as const;
      autoTable(doc, {
        startY: y, margin: { left: 218, right: 10 }, tableWidth: 69, theme: 'grid',
        body: summary.map(([label, value]) => [label, pdfMoney(value)]),
        styles: { fontSize: 5.5, cellPadding: 1.05, minCellHeight: 5, lineColor: [96, 120, 120], lineWidth: 0.15, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 48 }, 1: { cellWidth: 21, halign: 'right' } },
        didParseCell: hook => { hook.cell.styles.fillColor = hook.row.index === summary.length - 1 ? [220, 238, 238] : [159, 215, 226]; }
      });
      const summaryEndY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
      const paymentCount = Math.max(1, presentation.deposits.length, presentation.transfers.length, presentation.checks.length);
      const paymentBody = Array.from({ length: paymentCount }, (_, index) => {
        const deposit = presentation.deposits[index];
        const transfer = presentation.transfers[index];
        const check = presentation.checks[index];
        return [
          deposit?.amount ? pdfMoney(deposit.amount) : '', deposit?.reference || '', deposit?.date ? new Date(deposit.date).toLocaleDateString('es-PE') : '', deposit?.bank || '',
          transfer?.amount ? pdfMoney(transfer.amount) : '', transfer?.reference || '', transfer?.date ? new Date(transfer.date).toLocaleDateString('es-PE') : '', transfer?.bank || '',
          check?.amount ? pdfMoney(check.amount) : '', check?.reference || '', check?.date ? new Date(check.date).toLocaleDateString('es-PE') : '', check?.bank || ''
        ];
      });
      autoTable(doc, {
        startY: Math.max(y + 17, summaryEndY) + 4, margin: { left: 6, right: 6, bottom: 28 }, theme: 'grid',
        head: [['DEPÓSITOS', 'Nº OPERACIÓN', 'FECHA', 'BANCO', 'TRANSFERENCIAS', 'Nº OPERACIÓN', 'FECHA', 'BANCO', 'CHEQUE', 'NÚMERO', 'FECHA', 'BANCO']], body: paymentBody,
        styles: { fontSize: 5.5, cellPadding: 0.7, minCellHeight: 5, lineColor: [96, 120, 120], lineWidth: 0.15, overflow: 'ellipsize' },
        headStyles: { fillColor: [220, 238, 238], textColor: [0, 103, 103], fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 18, halign: 'right' }, 1: { cellWidth: 25 }, 2: { cellWidth: 18 }, 3: { cellWidth: 34 },
          4: { cellWidth: 18, halign: 'right' }, 5: { cellWidth: 25 }, 6: { cellWidth: 18 }, 7: { cellWidth: 34 },
          8: { cellWidth: 18, halign: 'right' }, 9: { cellWidth: 25 }, 10: { cellWidth: 18 }, 11: { cellWidth: 34 }
        }
      });
      let paymentEndY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
      if (paymentEndY > 177) { doc.addPage(); paymentEndY = 12; }
      const signaturesY = Math.max(184, paymentEndY + 12); doc.setDrawColor(96, 120, 120); doc.line(40, signaturesY, 90, signaturesY); doc.line(123, signaturesY, 173, signaturesY); doc.line(207, signaturesY, 257, signaturesY);
      doc.setFontSize(6); doc.text('VENDEDOR', 65, signaturesY + 4, { align: 'center' }); doc.text('CAJERO', 148, signaturesY + 4, { align: 'center' }); doc.text('VºBº', 232, signaturesY + 4, { align: 'center' });
      const observationsY = signaturesY + 12; doc.text('OBSERVACIONES:', 8, observationsY); doc.line(34, observationsY, 287, observationsY);
    }
  });
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page); doc.setFontSize(5.5); doc.setTextColor(111, 121, 121);
    doc.text(`Página ${page} de ${pageCount}`, 287, 207, { align: 'right' });
  }
  doc.save(`${collectionSheetFilename(report)}.pdf`);
}
