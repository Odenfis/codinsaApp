import type ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CustomerHistoryResponse, CustomerHistoryRow } from '../types';
import { loadTrimmedLogoDataUrl } from './logoUtils';
import logoUrl from '../../assets/logotipo.png';

type Column = { key: keyof CustomerHistoryRow; label: string; width: number; kind?: 'date' | 'money' | 'number' };

const columns: Column[] = [
  { key: 'Nro', label: 'Nro.', width: 8, kind: 'number' },
  { key: 'Item', label: 'Ítem', width: 8, kind: 'number' },
  { key: 'Vendedor', label: 'Vendedor', width: 11, kind: 'number' },
  { key: 'Documento', label: 'Documento / movimiento', width: 27 },
  { key: 'Numero', label: 'Número', width: 19 },
  { key: 'Fecha', label: 'Fecha', width: 13, kind: 'date' },
  { key: 'Importe', label: 'Importe', width: 15, kind: 'money' },
  { key: 'Amortizado', label: 'Amortizado', width: 15, kind: 'money' },
  { key: 'FechaV', label: 'Vencimiento', width: 14, kind: 'date' },
  { key: 'Saldo', label: 'Saldo', width: 15, kind: 'money' },
  { key: 'Situacion', label: 'Situación', width: 16 }
];

const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 });
const dateValue = (value: string | null) => value ? new Date(`${value}T12:00:00`) : null;
const dateText = (value: string | null) => dateValue(value)?.toLocaleDateString('es-PE') || '';
const generatedText = (value: string) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
const filename = (report: CustomerHistoryResponse) => `Historial_Cliente_${report.client.Ruc}`;

const downloadBuffer = (buffer: ExcelJS.Buffer, name: string) => {
  const blob = new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
};

const displayValue = (row: CustomerHistoryRow, column: Column) => {
  const value = row[column.key];
  if (column.kind === 'money') return money.format(Number(value || 0));
  if (column.kind === 'date') return dateText(value == null ? null : String(value));
  return value == null ? '' : String(value);
};

export async function exportCustomerHistoryToExcel(report: CustomerHistoryResponse) {
  if (!report.data.length) return;
  const { default: ExcelJSRuntime } = await import('exceljs');
  const workbook = new ExcelJSRuntime.Workbook();
  workbook.creator = 'CODINSA Tool Kit';
  workbook.created = new Date(report.generatedAt);
  const sheet = workbook.addWorksheet('Historial del Cliente', {
    pageSetup: {
      orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.2, right: 0.2, top: 0.35, bottom: 0.35, header: 0, footer: 0 }
    },
    views: [{ state: 'frozen', ySplit: 8, xSplit: 5, activeCell: 'F9', showGridLines: false }]
  });
  sheet.columns = columns.map(column => ({ width: column.width }));

  const logo = await loadTrimmedLogoDataUrl(logoUrl);
  const logoHeight = 68;
  const logoId = workbook.addImage({ base64: logo.dataUrl, extension: 'png' });
  sheet.addImage(logoId, { tl: { col: 0.15, row: 0.15 }, ext: { width: logoHeight * logo.aspectRatio, height: logoHeight } });
  sheet.mergeCells('D2:K2');
  sheet.getCell('D2').value = 'HISTORIAL DEL CLIENTE';
  sheet.getCell('D2').font = { bold: true, size: 18, color: { argb: 'FF006767' } };
  sheet.getCell('D2').alignment = { horizontal: 'center' };
  sheet.mergeCells('D3:K3');
  sheet.getCell('D3').value = `${report.client.Razon} · RUC ${report.client.Ruc}${report.client.Activo ? '' : ' · INACTIVO'}`;
  sheet.getCell('D3').font = { bold: true, size: 10, color: { argb: report.client.Activo ? 'FF3E4948' : 'FFB3261E' } };
  sheet.getCell('D3').alignment = { horizontal: 'center' };
  sheet.mergeCells('A6:K6');
  sheet.getCell('A6').value = `${report.totals.documents} documentos · Importe ${money.format(report.totals.importe)} · Amortizado ${money.format(report.totals.amortizado)} · Saldo ${money.format(report.totals.saldo)}`;
  sheet.getCell('A6').font = { bold: true, size: 9, color: { argb: 'FF006767' } };
  sheet.getCell('K5').value = `Generado: ${generatedText(report.generatedAt)}`;
  sheet.getCell('K5').font = { size: 8, color: { argb: 'FF6F7979' } };
  sheet.getCell('K5').alignment = { horizontal: 'right' };

  sheet.getRow(8).values = columns.map(column => column.label);
  sheet.getRow(8).height = 28;
  sheet.getRow(8).eachCell(cell => {
    cell.font = { bold: true, size: 8, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF006767' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  report.data.forEach(item => {
    const row = sheet.addRow(columns.map(column => {
      const value = item[column.key];
      return column.kind === 'date' ? dateValue(value == null ? null : String(value)) : value;
    }));
    const mainDocument = item.Item === 1;
    row.height = 19;
    row.eachCell((cell, columnIndex) => {
      const definition = columns[columnIndex - 1];
      cell.font = { bold: mainDocument, size: 8, color: { argb: mainDocument ? 'FF1B1F1F' : 'FF52605F' } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: definition.kind === 'money' || definition.kind === 'number' ? 'right' : 'left',
        indent: !mainDocument && definition.key === 'Documento' ? 1 : 0
      };
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFD5DEDE' } } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: mainDocument ? 'FFF3F8F7' : 'FFFFFFFF' } };
      if (definition.kind === 'money') cell.numFmt = 'S/ #,##0.00;[Red]-S/ #,##0.00';
      if (definition.kind === 'date') cell.numFmt = 'dd/mm/yyyy';
    });
  });

  const totalRow = sheet.addRow([
    'TOTALES', '', '', '', '', '', report.totals.importe, report.totals.amortizado, '', report.totals.saldo, ''
  ]);
  totalRow.eachCell((cell, columnIndex) => {
    cell.font = { bold: true, size: 8, color: { argb: 'FF006767' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCEEEE' } };
    cell.border = { top: { style: 'thin', color: { argb: 'FF006767' } } };
    if ([7, 8, 10].includes(columnIndex)) cell.numFmt = 'S/ #,##0.00;[Red]-S/ #,##0.00';
  });
  sheet.autoFilter = { from: 'A8', to: `K${8 + report.data.length}` };
  sheet.pageSetup.printArea = `A1:K${totalRow.number}`;
  sheet.headerFooter.oddFooter = '&LHistorial del Cliente&RPágina &P de &N';
  downloadBuffer(await workbook.xlsx.writeBuffer(), `${filename(report)}.xlsx`);
}

export async function exportCustomerHistoryToPdf(report: CustomerHistoryResponse) {
  if (!report.data.length) return;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const logo = await loadTrimmedLogoDataUrl(logoUrl);
  const totalPagesToken = '{total_pages_count_string}';
  const body = report.data.map(row => columns.map(column => displayValue(row, column)));
  body.push(['TOTALES', '', '', '', '', '', money.format(report.totals.importe), money.format(report.totals.amortizado), '', money.format(report.totals.saldo), '']);
  autoTable(doc, {
    startY: 31,
    margin: { top: 31, right: 5, bottom: 11, left: 5 },
    head: [columns.map(column => column.label)], body, theme: 'grid', showHead: 'everyPage',
    headStyles: { fillColor: [0, 103, 103], textColor: 255, fontStyle: 'bold', halign: 'center' },
    styles: { fontSize: 6.2, cellPadding: 1.1, overflow: 'ellipsize', valign: 'middle', lineColor: [190, 203, 203], lineWidth: 0.06 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'right' }, 1: { cellWidth: 10, halign: 'right' },
      2: { cellWidth: 14, halign: 'right' }, 3: { cellWidth: 42 }, 4: { cellWidth: 29 },
      5: { cellWidth: 20 }, 6: { cellWidth: 25, halign: 'right' }, 7: { cellWidth: 25, halign: 'right' },
      8: { cellWidth: 20 }, 9: { cellWidth: 25, halign: 'right' }, 10: { cellWidth: 22 }
    },
    didParseCell: hook => {
      if (hook.section !== 'body') return;
      if (hook.row.index === body.length - 1) {
        hook.cell.styles.fontStyle = 'bold';
        hook.cell.styles.fillColor = [220, 238, 238];
        hook.cell.styles.textColor = [0, 103, 103];
        return;
      }
      const row = report.data[hook.row.index];
      if (row?.Item === 1) {
        hook.cell.styles.fontStyle = 'bold';
        hook.cell.styles.fillColor = [243, 248, 247];
      } else if (hook.column.index === 3) {
        hook.cell.text = [`  ${hook.cell.text.join(' ')}`];
      }
    },
    didDrawPage: hook => {
      const width = doc.internal.pageSize.getWidth();
      const logoHeight = 15;
      doc.addImage(logo.dataUrl, 'PNG', 5, 3, logoHeight * logo.aspectRatio, logoHeight, undefined, 'FAST');
      doc.setTextColor(0, 103, 103); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
      doc.text('HISTORIAL DEL CLIENTE', width / 2, 8, { align: 'center' });
      doc.setTextColor(62, 73, 72); doc.setFontSize(8);
      doc.text(`${report.client.Razon} · RUC ${report.client.Ruc}${report.client.Activo ? '' : ' · INACTIVO'}`, width / 2, 14, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(111, 121, 121);
      doc.text(`${report.totals.documents} documentos · Importe ${money.format(report.totals.importe)} · Amortizado ${money.format(report.totals.amortizado)} · Saldo ${money.format(report.totals.saldo)}`, width / 2, 20, { align: 'center' });
      doc.text(`Generado: ${generatedText(report.generatedAt)}`, width - 5, 8, { align: 'right' });
      doc.text(`Página ${hook.pageNumber} de ${totalPagesToken}`, width - 5, 14, { align: 'right' });
    }
  });
  if (typeof doc.putTotalPages === 'function') doc.putTotalPages(totalPagesToken);
  doc.save(`${filename(report)}.pdf`);
}
