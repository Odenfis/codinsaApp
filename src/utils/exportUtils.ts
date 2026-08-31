/**
 * @license
 * Tool Kit Enterprise Export Utilities (Excel & PDF)
 * CODINSA S.A.C. Droguería / Tool Kit Enterprise Admin
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  CobranzaReporteRow, CobranzaReporteTotals, PlanillaCobranzaResponse
} from '../types';

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

export function exportCollectionSheetToExcel(report: PlanillaCobranzaResponse) {
  const { header, items, totals } = report;
  const summaryRows: any[][] = [
    ['COMPAÑIA DISTRIBUIDORA AMERICANA S.A.C.'],
    ['PLANILLA DE COBRANZA'],
    [],
    ['Serie', header.Serie, 'Número', header.Numero],
    ['Vendedor', `${header.Vendedor} - ${header.Nombre}`, 'Forma de pago', header.FormaPago || 'No especificada'],
    ['Fecha creación', excelDate(header.FechaCrea), 'Fecha ingreso', excelDate(header.FechaIng)],
    [],
    ['RESUMEN DE PAGOS', 'IMPORTE'],
    ['Valor documentos', totals.Valor], ['Descuento', totals.Descuento], ['Efectivo', totals.Efectivo],
    ['Depósito', totals.Deposito], ['Letra', totals.Letra], ['Transferencia', totals.Transferencia],
    ['Cheque', totals.Cheque], ['Total original SP', totals.Total], ['TOTAL GENERAL', totals.TotalGeneral]
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows, { cellDates: true });
  summarySheet['!cols'] = [{ wch: 24 }, { wch: 28 }, { wch: 20 }, { wch: 28 }];
  for (let row = 9; row <= 17; row += 1) {
    const cell = summarySheet[`B${row}`];
    if (cell) cell.z = '#,##0.00';
  }

  const detailHeaders = [
    'Código cliente', 'Razón social', 'Documento', 'Tipo doc.', 'Fecha factura', 'Valor',
    'Nota crédito', 'Descuento', 'Efectivo', 'Depósito', 'Letra', 'Nro. letra',
    'Transferencia', 'Cheque', 'Nro. cheque', 'Cuenta bancaria', 'Nro. operación',
    'Descuento + Efectivo', 'Total original SP', 'Total general'
  ];
  const detailRows = items.map(item => [
    item.CodClie, item.Razon, item.Documento, item.TipoDoc, excelDate(item.FechaFac), item.Valor,
    item.NotaCred, item.Descuento, item.Efectivo, item.Deposito, item.Letra, item.NroLetra,
    item.Transferencia, item.Cheque, item.NroCheque, item.CtaBanco, item.NroOperacion,
    item.DescuentoEfectivo, item.Total, item.TotalGeneral
  ]);
  detailRows.push([
    '', 'TOTAL', '', '', '', totals.Valor, '', totals.Descuento, totals.Efectivo,
    totals.Deposito, totals.Letra, '', totals.Transferencia, totals.Cheque, '', '', '',
    totals.Descuento + totals.Efectivo, totals.Total, totals.TotalGeneral
  ]);
  const detailSheet = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows], { cellDates: true });
  detailSheet['!cols'] = [12, 34, 18, 10, 14, 14, 18, 14, 14, 14, 14, 20, 16, 14, 20, 24, 20, 20, 18, 18].map(wch => ({ wch }));
  detailSheet['!autofilter'] = { ref: `A1:T${items.length + 1}` };
  detailSheet['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' };
  for (let row = 2; row <= items.length + 2; row += 1) {
    [6, 8, 9, 10, 11, 13, 14, 18, 19, 20].forEach(column => {
      const cell = detailSheet[XLSX.utils.encode_cell({ r: row - 1, c: column - 1 })];
      if (cell) cell.z = '#,##0.00';
    });
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Planilla');
  XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detalle');
  XLSX.writeFile(workbook, `${collectionSheetFilename(report)}.xlsx`);
}

const collectionSheetReferences = (item: PlanillaCobranzaResponse['items'][number]) => {
  const references = [
    item.NotaCred && `NC: ${item.NotaCred}`,
    item.NroOperacion && `Operación: ${item.NroOperacion}`,
    item.NroLetra && `Letra: ${item.NroLetra}`,
    item.NroCheque && `Cheque: ${item.NroCheque}`,
    item.CtaBanco && `Cuenta: ${item.CtaBanco}`
  ].filter(Boolean);
  return references.length ? references.join('  ·  ') : 'Sin referencias adicionales';
};

export function exportCollectionSheetToPdf(report: PlanillaCobranzaResponse) {
  const { header, items, totals } = report;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const generatedAt = new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date());
  const body = items.map(item => [
    `${item.CodClie}\n${item.Razon}`,
    `${item.Documento} · Tipo ${item.TipoDoc}\n${collectionSheetReferences(item)}`,
    new Date(item.FechaFac).toLocaleDateString('es-PE'),
    pdfMoney(item.Valor),
    pdfMoney(item.TotalGeneral)
  ]);

  autoTable(doc, {
    startY: 44,
    margin: { top: 44, right: 12, bottom: 18, left: 12 },
    head: [['Cliente', 'Documento y referencias', 'Fecha', 'Valor', 'Aplicado']],
    body,
    showHead: 'everyPage',
    theme: 'grid',
    headStyles: { fillColor: [0, 103, 103], textColor: 255, fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: [243, 244, 245] },
    styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak', valign: 'middle' },
    columnStyles: {
      0: { cellWidth: 42 }, 1: { cellWidth: 73 }, 2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 24, halign: 'right' }, 4: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }
    }
  });

  let summaryY = ((doc as any).lastAutoTable?.finalY || 44) + 8;
  if (summaryY > 205) {
    doc.addPage();
    summaryY = 48;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 103, 103);
  doc.text('RESUMEN DE MEDIOS DE PAGO', 12, summaryY);
  const paymentRows = [
    ['Descuento', totals.Descuento], ['Efectivo', totals.Efectivo], ['Depósito', totals.Deposito],
    ['Letra', totals.Letra], ['Transferencia', totals.Transferencia], ['Cheque', totals.Cheque]
  ] as const;
  paymentRows.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 12 + column * 72;
    const y = summaryY + 8 + row * 8;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(62, 73, 72);
    doc.setFontSize(8);
    doc.text(label, x, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`S/ ${pdfMoney(value)}`, x + 68, y, { align: 'right' });
  });
  const totalY = summaryY + 36;
  doc.setFillColor(0, 103, 103);
  doc.roundedRect(12, totalY, 186, 15, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text('TOTAL GENERAL COBRADO', 17, totalY + 9.5);
  doc.setFontSize(13);
  doc.text(`S/ ${pdfMoney(totals.TotalGeneral)}`, 193, totalY + 10, { align: 'right' });
  const signatureY = totalY + 35;
  doc.setDrawColor(111, 121, 121);
  doc.line(25, signatureY, 85, signatureY);
  doc.line(125, signatureY, 185, signatureY);
  doc.setTextColor(62, 73, 72);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Elaborado por', 55, signatureY + 5, { align: 'center' });
  doc.text('Recibido por', 155, signatureY + 5, { align: 'center' });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setTextColor(25, 28, 29);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('COMPAÑIA DISTRIBUIDORA AMERICANA S.A.C.', 12, 12);
    doc.setFontSize(14);
    doc.setTextColor(0, 103, 103);
    doc.text('PLANILLA DE COBRANZA', 12, 21);
    doc.setFontSize(9);
    doc.setTextColor(25, 28, 29);
    doc.text(`${header.Serie}-${header.Numero}`, 198, 13, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Vendedor: ${header.Vendedor} - ${header.Nombre}`, 12, 29);
    doc.text(`Forma de pago: ${header.FormaPago || 'No especificada'}`, 12, 35);
    doc.text(`Creación: ${new Date(header.FechaCrea).toLocaleDateString('es-PE')}  ·  Ingreso: ${new Date(header.FechaIng).toLocaleDateString('es-PE')}`, 198, 29, { align: 'right' });
    doc.setTextColor(111, 121, 121);
    doc.text(`Generado: ${generatedAt}`, 12, 289);
    doc.text(`Página ${page} de ${pageCount}`, 198, 289, { align: 'right' });
  }
  doc.save(`${collectionSheetFilename(report)}.pdf`);
}
