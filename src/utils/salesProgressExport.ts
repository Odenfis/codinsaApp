import type ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SalesProgressResponse, SalesProgressRow } from '../types';
import { summarizeSalesProgress } from './salesProgressModel';
import { loadTrimmedLogoDataUrl } from './logoUtils';
import logoUrl from '../../assets/logotipo.png';

const headers = ['RUC', 'Cliente', 'Cód. producto', 'Cód. anterior', 'Producto', 'Cantidad', 'Total', 'Departamento', 'Provincia', 'Distrito', 'Ubigeo', 'Fecha', 'Tipo doc.', 'Serie', 'Nro. doc.', 'Vendedor'];
const quantity = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 });
const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const dateValue = (value: string) => value ? new Date(`${value}T12:00:00`) : null;
const dateText = (value: string) => dateValue(value)?.toLocaleDateString('es-PE') || '';
const generatedText = (value: string) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
const baseFilename = (report: SalesProgressResponse) => `Avance_Ventas_${report.laboratory.CodLab}_${String(report.period.mes).padStart(2, '0')}_${report.period.anio}`;

const downloadBuffer = (buffer: ExcelJS.Buffer, filename: string) => {
  const blob = new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export async function exportSalesProgressToExcel(rows: SalesProgressRow[], report: SalesProgressResponse) {
  if (!rows.length) return;
  const { default: ExcelJSRuntime } = await import('exceljs');
  const workbook = new ExcelJSRuntime.Workbook();
  workbook.creator = 'CODINSA Tool Kit';
  workbook.created = new Date(report.generatedAt);
  const sheet = workbook.addWorksheet('Avance de Ventas', {
    pageSetup: {
      orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.2, right: 0.2, top: 0.3, bottom: 0.3, header: 0, footer: 0 }
    },
    views: [{ state: 'frozen', ySplit: 8, xSplit: 2, activeCell: 'C9', showGridLines: false }]
  });
  sheet.columns = [16, 35, 17, 17, 38, 14, 16, 20, 20, 20, 14, 14, 12, 12, 16, 14].map(width => ({ width }));
  const logo = await loadTrimmedLogoDataUrl(logoUrl);
  const logoHeight = 72;
  const logoId = workbook.addImage({ base64: logo.dataUrl, extension: 'png' });
  sheet.addImage(logoId, { tl: { col: 0.15, row: 0.15 }, ext: { width: logoHeight * logo.aspectRatio, height: logoHeight } });
  sheet.mergeCells('D2:P2');
  sheet.getCell('D2').value = 'AVANCE DE VENTAS';
  sheet.getCell('D2').font = { bold: true, size: 18, color: { argb: 'FF006767' } };
  sheet.getCell('D2').alignment = { horizontal: 'center' };
  sheet.mergeCells('D3:P3');
  sheet.getCell('D3').value = `${report.laboratory.CodLab} · ${report.laboratory.Descripcion} · ${months[report.period.mes - 1]} ${report.period.anio}`;
  sheet.getCell('D3').font = { size: 10, color: { argb: 'FF3E4948' } };
  sheet.getCell('D3').alignment = { horizontal: 'center' };
  const totals = summarizeSalesProgress(rows);
  sheet.mergeCells('A6:P6');
  sheet.getCell('A6').value = `${totals.lines} líneas · ${totals.clients} clientes · ${totals.documents} documentos · ${quantity.format(totals.units)} unidades · ${money.format(totals.sales)}`;
  sheet.getCell('A6').font = { bold: true, size: 9, color: { argb: 'FF006767' } };
  sheet.getCell('A6').alignment = { horizontal: 'left' };
  sheet.getCell('P5').value = `Generado: ${generatedText(report.generatedAt)}`;
  sheet.getCell('P5').font = { size: 8, color: { argb: 'FF6F7979' } };
  sheet.getCell('P5').alignment = { horizontal: 'right' };
  sheet.getRow(8).values = headers;
  sheet.getRow(8).height = 28;
  sheet.getRow(8).eachCell(cell => {
    cell.font = { bold: true, size: 8, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF006767' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  rows.forEach((item, index) => {
    const row = sheet.addRow([
      item.Ruc, item.Cliente, item.codpro, item.CodAnte, item.Producto, item.Cantidad, item.Total,
      item.Departamento, item.Provincia, item.Distrito, item.Ubigeo, dateValue(item.Fecha), item.Tipo_doc,
      item.Serie, item.nro_doc, item.Vendedor
    ]);
    row.height = 19;
    row.eachCell((cell, column) => {
      cell.font = { size: 8 };
      cell.alignment = { vertical: 'middle', horizontal: column === 6 || column === 7 ? 'right' : 'left' };
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFD5DEDE' } } };
      if (index % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F3F5' } };
    });
    row.getCell(6).numFmt = '#,##0.##';
    row.getCell(7).numFmt = 'S/ #,##0.00';
    row.getCell(12).numFmt = 'dd/mm/yyyy';
  });
  const totalRow = sheet.addRow(['TOTALES', '', '', '', '', totals.units, totals.sales, '', '', '', '', '', '', '', '', '']);
  sheet.mergeCells(totalRow.number, 1, totalRow.number, 5);
  totalRow.eachCell(cell => {
    cell.font = { bold: true, size: 9, color: { argb: 'FF006767' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCEEEE' } };
    cell.border = { top: { style: 'thin', color: { argb: 'FF006767' } } };
  });
  totalRow.getCell(1).alignment = { horizontal: 'right' };
  totalRow.getCell(6).numFmt = '#,##0.##';
  totalRow.getCell(7).numFmt = 'S/ #,##0.00';
  sheet.autoFilter = { from: 'A8', to: `P${8 + rows.length}` };
  sheet.pageSetup.printArea = `A1:P${totalRow.number}`;
  sheet.headerFooter.oddFooter = '&LAvance de Ventas&RPágina &P de &N';
  downloadBuffer(await workbook.xlsx.writeBuffer(), `${baseFilename(report)}.xlsx`);
}

export async function exportSalesProgressToPdf(rows: SalesProgressRow[], report: SalesProgressResponse) {
  if (!rows.length) return;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  const logo = await loadTrimmedLogoDataUrl(logoUrl);
  const logoHeight = 18;
  const logoWidth = logoHeight * logo.aspectRatio;
  const totalPagesToken = '{total_pages_count_string}';
  const totals = summarizeSalesProgress(rows);
  const body: (string | number)[][] = rows.map(item => [
    item.Ruc, item.Cliente, item.codpro, item.CodAnte, item.Producto, quantity.format(item.Cantidad), money.format(item.Total),
    item.Departamento, item.Provincia, item.Distrito, item.Ubigeo, dateText(item.Fecha), item.Tipo_doc,
    item.Serie, item.nro_doc, item.Vendedor
  ]);
  body.push(['TOTALES', '', '', '', '', quantity.format(totals.units), money.format(totals.sales), '', '', '', '', '', '', '', '', '']);
  autoTable(doc, {
    startY: 32,
    margin: { top: 32, right: 6, bottom: 11, left: 6 },
    head: [headers], body, theme: 'grid', showHead: 'everyPage',
    headStyles: { fillColor: [0, 103, 103], textColor: 255, fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: [241, 243, 245] },
    styles: { fontSize: 5.7, cellPadding: 1, overflow: 'ellipsize', valign: 'middle', lineColor: [190, 203, 203], lineWidth: 0.08 },
    columnStyles: {
      0: { cellWidth: 23 }, 1: { cellWidth: 43 }, 2: { cellWidth: 22 }, 3: { cellWidth: 20 }, 4: { cellWidth: 48 },
      5: { cellWidth: 17, halign: 'right' }, 6: { cellWidth: 21, halign: 'right' }, 7: { cellWidth: 24 }, 8: { cellWidth: 24 },
      9: { cellWidth: 24 }, 10: { cellWidth: 17 }, 11: { cellWidth: 19 }, 12: { cellWidth: 15 }, 13: { cellWidth: 17 },
      14: { cellWidth: 22 }, 15: { cellWidth: 18 }
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
      doc.text('AVANCE DE VENTAS', width / 2, 9, { align: 'center' });
      doc.setTextColor(62, 73, 72); doc.setFontSize(8);
      doc.text(`${report.laboratory.CodLab} · ${report.laboratory.Descripcion} · ${months[report.period.mes - 1]} ${report.period.anio}`, width / 2, 15, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(111, 121, 121);
      doc.text(`${totals.clients} clientes · ${totals.documents} documentos · ${quantity.format(totals.units)} unidades · ${money.format(totals.sales)}`, width / 2, 21, { align: 'center' });
      doc.text(`Generado: ${generatedText(report.generatedAt)}`, width - 6, 9, { align: 'right' });
      doc.text(`Página ${hook.pageNumber} de ${totalPagesToken}`, width - 6, 15, { align: 'right' });
    }
  });
  if (typeof doc.putTotalPages === 'function') doc.putTotalPages(totalPagesToken);
  doc.save(`${baseFilename(report)}.pdf`);
}
