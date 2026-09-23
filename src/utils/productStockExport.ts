import type ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProductStockRow } from '../types';
import { loadTrimmedLogoDataUrl } from './logoUtils';
import { summarizeProductStock } from './productStockModel';
import logoUrl from '../../assets/logotipo.png';

const headers = ['Código', 'Cód. SUNAT', 'Producto', 'Principio activo', 'Stock', 'PVF', 'Lote', 'Vencimiento'];
const quantity = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 });
const generatedText = (value: string) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
const fileName = (generatedAt: string) => `Stock_Productos_${generatedAt.slice(0, 10)}`;
const dateText = (value: string | null) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('es-PE') : '';

const downloadBuffer = (buffer: ExcelJS.Buffer, filename: string) => {
  const blob = new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export async function exportProductStockToExcel(rows: ProductStockRow[], generatedAt: string, today: string) {
  if (!rows.length) return;
  const { default: ExcelJSRuntime } = await import('exceljs');
  const workbook = new ExcelJSRuntime.Workbook();
  workbook.creator = 'CODINSA Tool Kit';
  workbook.created = new Date(generatedAt);
  const sheet = workbook.addWorksheet('Stock de Productos', {
    pageSetup: {
      orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.25, right: 0.25, top: 0.3, bottom: 0.3, header: 0, footer: 0 }
    },
    views: [{ state: 'frozen', ySplit: 7, activeCell: 'A8', showGridLines: false }]
  });
  sheet.columns = [16, 20, 48, 42, 16, 18, 23, 18].map(width => ({ width }));
  const logo = await loadTrimmedLogoDataUrl(logoUrl);
  const logoHeight = 72;
  const logoId = workbook.addImage({ base64: logo.dataUrl, extension: 'png' });
  sheet.addImage(logoId, { tl: { col: 0.15, row: 0.15 }, ext: { width: logoHeight * logo.aspectRatio, height: logoHeight } });
  sheet.mergeCells('C2:H2');
  sheet.getCell('C2').value = 'STOCK DE PRODUCTOS';
  sheet.getCell('C2').font = { bold: true, size: 18, color: { argb: 'FF006767' } };
  sheet.getCell('C2').alignment = { horizontal: 'center' };
  sheet.mergeCells('C3:H3');
  sheet.getCell('C3').value = `Consultado: ${generatedText(generatedAt)}`;
  sheet.getCell('C3').font = { size: 10, color: { argb: 'FF3E4948' } };
  sheet.getCell('C3').alignment = { horizontal: 'center' };
  const summary = summarizeProductStock(rows, today);
  sheet.mergeCells('A5:H5');
  sheet.getCell('A5').value = `${summary.products} producto(s) · ${summary.lots} lote(s) · ${quantity.format(summary.units)} unidades · ${summary.expired} lote(s) vencido(s)`;
  sheet.getCell('A5').font = { bold: true, size: 9, color: { argb: 'FF006767' } };

  sheet.getRow(7).values = headers;
  sheet.getRow(7).height = 25;
  sheet.getRow(7).eachCell(cell => {
    cell.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF006767' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  rows.forEach((item, index) => {
    const expiry = item.vencimiento ? new Date(`${item.vencimiento}T12:00:00`) : null;
    const row = sheet.addRow([
      item.Codigo, item.CodSunat, item.Producto, item.PrincipioActivo,
      item.stock, item.PVF, item.Lotes, expiry
    ]);
    row.height = 20;
    row.eachCell((cell, column) => {
      cell.font = { size: 9 };
      cell.alignment = { vertical: 'middle', horizontal: column === 5 || column === 6 ? 'right' : 'left' };
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFD5DEDE' } } };
      if (index % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F3F5' } };
    });
    row.getCell(5).numFmt = '#,##0.##';
    row.getCell(6).numFmt = 'S/ #,##0.00';
    row.getCell(8).numFmt = 'dd/mm/yyyy';
    if (item.vencimiento && item.vencimiento < today) {
      row.getCell(8).font = { size: 9, bold: true, color: { argb: 'FFBA1A1A' } };
    }
  });
  const totalRow = sheet.addRow(['TOTAL UNIDADES', '', '', '', summary.units, '', '', '']);
  sheet.mergeCells(totalRow.number, 1, totalRow.number, 4);
  totalRow.eachCell(cell => {
    cell.font = { bold: true, size: 9, color: { argb: 'FF006767' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCEEEE' } };
    cell.border = { top: { style: 'thin', color: { argb: 'FF006767' } } };
  });
  totalRow.getCell(1).alignment = { horizontal: 'right' };
  totalRow.getCell(5).numFmt = '#,##0.##';
  sheet.autoFilter = { from: 'A7', to: `H${7 + rows.length}` };
  sheet.pageSetup.printArea = `A1:H${totalRow.number}`;
  sheet.headerFooter.oddFooter = '&LStock de Productos&RPágina &P de &N';
  downloadBuffer(await workbook.xlsx.writeBuffer(), `${fileName(generatedAt)}.xlsx`);
}

export async function exportProductStockToPdf(rows: ProductStockRow[], generatedAt: string, today: string) {
  if (!rows.length) return;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const logo = await loadTrimmedLogoDataUrl(logoUrl);
  const logoHeight = 19;
  const logoWidth = logoHeight * logo.aspectRatio;
  const totalPagesToken = '{total_pages_count_string}';
  const summary = summarizeProductStock(rows, today);
  const body = rows.map(item => [
    item.Codigo, item.CodSunat, item.Producto, item.PrincipioActivo,
    quantity.format(item.stock), item.PVF == null ? '' : money.format(item.PVF),
    item.Lotes, dateText(item.vencimiento)
  ]);
  body.push(['TOTAL UNIDADES', '', '', '', quantity.format(summary.units), '', '', '']);
  autoTable(doc, {
    startY: 34,
    margin: { top: 34, right: 7, bottom: 12, left: 7 },
    head: [headers], body, theme: 'grid', showHead: 'everyPage',
    headStyles: { fillColor: [0, 103, 103], textColor: 255, fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: [241, 243, 245] },
    styles: { fontSize: 7, cellPadding: 1.3, overflow: 'ellipsize', valign: 'middle', lineColor: [190, 203, 203], lineWidth: 0.1 },
    columnStyles: {
      0: { cellWidth: 18 }, 1: { cellWidth: 21 }, 2: { cellWidth: 75 },
      3: { cellWidth: 65 }, 4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' }, 6: { cellWidth: 28 }, 7: { cellWidth: 25 }
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
      doc.addImage(logo.dataUrl, 'PNG', 7, 4, logoWidth, logoHeight, undefined, 'FAST');
      doc.setTextColor(0, 103, 103); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
      doc.text('STOCK DE PRODUCTOS', width / 2, 11, { align: 'center' });
      doc.setTextColor(62, 73, 72); doc.setFontSize(8);
      doc.text(`${summary.products} productos · ${summary.lots} lotes · ${quantity.format(summary.units)} unidades`, width / 2, 18, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(111, 121, 121);
      doc.text(`Consultado: ${generatedText(generatedAt)}`, width - 7, 10, { align: 'right' });
      doc.text(`Página ${hook.pageNumber} de ${totalPagesToken}`, width - 7, 17, { align: 'right' });
    }
  });
  if (typeof doc.putTotalPages === 'function') doc.putTotalPages(totalPagesToken);
  doc.save(`${fileName(generatedAt)}.pdf`);
}
