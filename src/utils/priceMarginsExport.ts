import autoTable from 'jspdf-autotable';
import { jsPDF } from 'jspdf';
import type ExcelJS from 'exceljs';
import { PriceMarginsResponse, PriceMarginsRow } from '../types';
import { summarizePriceMargins } from './priceMarginsModel';
import { loadTrimmedLogoDataUrl } from './logoUtils';
import logoUrl from '../../assets/logotipo.png';

const headers = ['Código', 'Producto', 'Stock', 'PVF', 'Costo con IGV', '+10%', '+15%', '+20%', '+25%'];
const quantity = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 });
const generatedText = (value: string) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
const baseFilename = (report: PriceMarginsResponse) => `Precios_Margenes_${report.laboratory.CodLab}`;

const downloadBuffer = (buffer: ExcelJS.Buffer, filename: string) => {
  const blob = new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export async function exportPriceMarginsToExcel(rows: PriceMarginsRow[], report: PriceMarginsResponse) {
  if (!rows.length) return;
  const { default: ExcelJSRuntime } = await import('exceljs');
  const workbook = new ExcelJSRuntime.Workbook();
  workbook.creator = 'CODINSA Tool Kit';
  workbook.created = new Date(report.generatedAt);
  const sheet = workbook.addWorksheet('Precios con Márgenes', {
    pageSetup: {
      orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.2, right: 0.2, top: 0.3, bottom: 0.3, header: 0, footer: 0 }
    },
    views: [{ state: 'frozen', ySplit: 8, xSplit: 2, activeCell: 'C9', showGridLines: false }]
  });
  sheet.columns = [18, 48, 14, 16, 18, 16, 16, 16, 16].map(width => ({ width }));
  const logo = await loadTrimmedLogoDataUrl(logoUrl);
  const logoHeight = 72;
  const logoId = workbook.addImage({ base64: logo.dataUrl, extension: 'png' });
  sheet.addImage(logoId, { tl: { col: 0.15, row: 0.15 }, ext: { width: logoHeight * logo.aspectRatio, height: logoHeight } });
  sheet.mergeCells('C2:I2');
  sheet.getCell('C2').value = 'PRECIOS CON MÁRGENES';
  sheet.getCell('C2').font = { bold: true, size: 18, color: { argb: 'FF006767' } };
  sheet.getCell('C2').alignment = { horizontal: 'center' };
  sheet.mergeCells('C3:I3');
  sheet.getCell('C3').value = `${report.laboratory.CodLab} · ${report.laboratory.Descripcion}`;
  sheet.getCell('C3').font = { size: 10, color: { argb: 'FF3E4948' } };
  sheet.getCell('C3').alignment = { horizontal: 'center' };
  const totals = summarizePriceMargins(rows);
  sheet.mergeCells('A6:I6');
  sheet.getCell('A6').value = `${totals.products.toLocaleString('es-PE')} productos · ${quantity.format(totals.stock)} unidades en stock`;
  sheet.getCell('A6').font = { bold: true, size: 9, color: { argb: 'FF006767' } };
  sheet.getCell('I5').value = `Generado: ${generatedText(report.generatedAt)}`;
  sheet.getCell('I5').font = { size: 8, color: { argb: 'FF6F7979' } };
  sheet.getCell('I5').alignment = { horizontal: 'right' };
  sheet.getRow(8).values = headers;
  sheet.getRow(8).height = 28;
  sheet.getRow(8).eachCell(cell => {
    cell.font = { bold: true, size: 8, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF006767' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  rows.forEach((item, index) => {
    const row = sheet.addRow([
      item.Codigo, item.Producto, item.Stock, item.PVF, item.CostoIgv,
      item.Mas10, item.Mas15, item.Mas20, item.Mas25
    ]);
    row.height = 19;
    row.eachCell((cell, column) => {
      cell.font = { size: 8 };
      cell.alignment = { vertical: 'middle', horizontal: column >= 3 ? 'right' : 'left' };
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFD5DEDE' } } };
      if (index % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F3F5' } };
    });
    row.getCell(3).numFmt = '#,##0.##';
    for (let column = 4; column <= 9; column += 1) row.getCell(column).numFmt = 'S/ #,##0.00';
  });
  const totalRow = sheet.addRow(['TOTAL STOCK', '', totals.stock, '', '', '', '', '', '']);
  sheet.mergeCells(totalRow.number, 1, totalRow.number, 2);
  totalRow.eachCell(cell => {
    cell.font = { bold: true, size: 9, color: { argb: 'FF006767' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCEEEE' } };
    cell.border = { top: { style: 'thin', color: { argb: 'FF006767' } } };
  });
  totalRow.getCell(1).alignment = { horizontal: 'right' };
  totalRow.getCell(3).numFmt = '#,##0.##';
  sheet.autoFilter = { from: 'A8', to: `I${8 + rows.length}` };
  sheet.pageSetup.printArea = `A1:I${totalRow.number}`;
  sheet.headerFooter.oddFooter = '&LPrecios con Márgenes&RPágina &P de &N';
  downloadBuffer(await workbook.xlsx.writeBuffer(), `${baseFilename(report)}.xlsx`);
}

export async function exportPriceMarginsToPdf(rows: PriceMarginsRow[], report: PriceMarginsResponse) {
  if (!rows.length) return;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const logo = await loadTrimmedLogoDataUrl(logoUrl);
  const logoHeight = 16;
  const logoWidth = logoHeight * logo.aspectRatio;
  const totalPagesToken = '{total_pages_count_string}';
  const totals = summarizePriceMargins(rows);
  const body: (string | number)[][] = rows.map(item => [
    item.Codigo, item.Producto, quantity.format(item.Stock), money.format(item.PVF), money.format(item.CostoIgv),
    money.format(item.Mas10), money.format(item.Mas15), money.format(item.Mas20), money.format(item.Mas25)
  ]);
  body.push(['TOTAL STOCK', '', quantity.format(totals.stock), '', '', '', '', '', '']);
  autoTable(doc, {
    startY: 29,
    margin: { top: 29, right: 6, bottom: 11, left: 6 },
    head: [headers], body, theme: 'grid', showHead: 'everyPage',
    headStyles: { fillColor: [0, 103, 103], textColor: 255, fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: [241, 243, 245] },
    styles: { fontSize: 7, cellPadding: 1.3, overflow: 'ellipsize', valign: 'middle', lineColor: [190, 203, 203], lineWidth: 0.08 },
    columnStyles: {
      0: { cellWidth: 22 }, 1: { cellWidth: 70 }, 2: { cellWidth: 20, halign: 'right' },
      3: { cellWidth: 27, halign: 'right' }, 4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 27, halign: 'right' }, 6: { cellWidth: 27, halign: 'right' },
      7: { cellWidth: 27, halign: 'right' }, 8: { cellWidth: 27, halign: 'right' }
    },
    didParseCell: hook => {
      if (hook.section === 'body' && hook.row.index === body.length - 1) {
        hook.cell.styles.fontStyle = 'bold';
        hook.cell.styles.fillColor = [220, 238, 238];
        hook.cell.styles.textColor = [0, 103, 103];
      }
    },
    didDrawPage: hook => {
      const width = doc.internal.pageSize.getWidth();
      doc.addImage(logo.dataUrl, 'PNG', 6, 3, logoWidth, logoHeight, undefined, 'FAST');
      doc.setTextColor(0, 103, 103); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
      doc.text('PRECIOS CON MÁRGENES', width / 2, 8, { align: 'center' });
      doc.setTextColor(62, 73, 72); doc.setFontSize(8);
      doc.text(`${report.laboratory.CodLab} · ${report.laboratory.Descripcion}`, width / 2, 14, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(111, 121, 121);
      doc.text(`${totals.products.toLocaleString('es-PE')} productos · ${quantity.format(totals.stock)} unidades en stock`, width / 2, 20, { align: 'center' });
      doc.text(`Generado: ${generatedText(report.generatedAt)}`, width - 6, 8, { align: 'right' });
      doc.text(`Página ${hook.pageNumber} de ${totalPagesToken}`, width - 6, 14, { align: 'right' });
    }
  });
  if (typeof doc.putTotalPages === 'function') doc.putTotalPages(totalPagesToken);
  doc.save(`${baseFilename(report)}.pdf`);
}
