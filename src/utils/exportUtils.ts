/**
 * @license
 * Tool Kit Enterprise Export Utilities (Excel & PDF)
 * CODINSA S.A.C. Droguería / Tool Kit Enterprise Admin
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
