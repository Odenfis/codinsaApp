import jsPDF from 'jspdf';
import { KardexProductoResponse } from '../types';
import { groupKardex, kardexPage, kardexColumns, kardexTitle, kardexCompany, kardexRuc, kardexAddress, kardexPeriod } from './productKardexModel';
import { loadTrimmedLogoDataUrl } from './logoUtils';
import logoUrl from '../../assets/logotipo.png';

const filename = (report: KardexProductoResponse) => `Kardex_Productos_${String(report.period.mes).padStart(2, '0')}_${report.period.anio}`;
const values = (line: ReturnType<typeof kardexPage>[number]): (string | number)[] => {
  if (line.kind === 'product') return kardexColumns.map(c => line.row[c.key]);
  if (line.kind === 'laboratory') return [`LABORATORIO: ${line.name}`];
  return [line.kind === 'total' ? 'Total general' : 'Total por laboratorio', '', '', line.totals.Saldoini, line.totals.Ingresos, line.totals.salidas, line.totals.saldoFin, line.totals.Valor];
};
export async function exportProductKardexToExcel(report: KardexProductoResponse) {
  if (!report.data.length) return;
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CODINSA Tool Kit';
  const sheet = workbook.addWorksheet('Kardex de Productos', {
    pageSetup: { orientation: 'portrait', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '1:8', margins: { left: .25, right: .25, top: .3, bottom: .3, header: 0, footer: .2 } },
    views: [{ state: 'frozen', ySplit: 8, showGridLines: false }]
  });
  sheet.columns = [14, 50, 12, 14, 14, 14, 14, 17].map(width => ({ width }));
  const logo = await loadTrimmedLogoDataUrl(logoUrl);
  const id = workbook.addImage({ base64: logo.dataUrl, extension: 'png' });
  sheet.addImage(id, { tl: { col: 0, row: 0 }, ext: { width: 48 * logo.aspectRatio, height: 48 } });
  sheet.mergeCells('C1:H2'); sheet.getCell('C1').value = kardexTitle;
  sheet.getCell('C1').font = { size: 14, bold: true, color: { argb: 'FF006767' } };
  sheet.getCell('C1').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  const metadata = [`PERIODO: ${kardexPeriod(report)}    R.U.C.: ${kardexRuc}`, `RAZÓN SOCIAL: ${kardexCompany}`, `ESTABLECIMIENTO: ${kardexAddress}`];
  metadata.forEach((text,i) => { sheet.mergeCells(i+4,1,i+4,8); sheet.getCell(i+4,1).value = text; sheet.getCell(i+4,1).font = { size: 10, bold: true }; });
  const head = sheet.getRow(8); head.values = kardexColumns.map(c => c.label); head.height = 30;
  head.eachCell(cell => { cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF006767' } }; cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; });
  for (const line of kardexPage(groupKardex(report.data),1,report.data.length)) {
    const row = sheet.addRow(values(line));
    row.height = line.kind === 'product' ? Math.max(22, Math.ceil(line.row.Producto.length/48)*14) : 24;
    if (line.kind === 'laboratory') sheet.mergeCells(row.number,1,row.number,8);
    else if (line.kind !== 'product') sheet.mergeCells(row.number,1,row.number,3);
    row.eachCell(cell => { cell.font = { size: 10, bold: line.kind !== 'product' }; cell.alignment = { vertical: 'middle', wrapText: true }; if (line.kind !== 'product') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCEEEE' } }; });
    if (line.kind !== 'laboratory') {
      for (let col=4;col<=8;col++) { row.getCell(col).numFmt = col === 8 ? '"S/ "#,##0.00' : '#,##0.00'; row.getCell(col).alignment = { horizontal: 'right', vertical: 'middle' }; }
      if (line.kind === 'product') row.getCell(1).numFmt = '@';
    }
  }
  sheet.pageSetup.printArea = `A1:H${sheet.rowCount}`;
  sheet.headerFooter.oddFooter = '&RPágina &P de &N';
  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const link = document.createElement('a'); link.href = url; link.download = `${filename(report)}.xlsx`; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
}
export async function exportProductKardexToPdf(report: KardexProductoResponse) {
  if (!report.data.length) return;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logo = await loadTrimmedLogoDataUrl(logoUrl);
  const widths = [20,68,14,18,17,17,18,22];
  const left=8, bottom=282;
  let y=0, currentLab='';
  const header = () => {
    doc.addImage(logo.dataUrl,'PNG',left,5,15*logo.aspectRatio,15,'codinsa-logo','FAST');
    doc.setTextColor(0,103,103); doc.setFont('helvetica','bold'); doc.setFontSize(9);
    doc.text(['LIBRO DE INVENTARIO','PERMANENTE VALORIZADO'],135,11,{align:'center'});
    doc.setTextColor(30); doc.setFontSize(7);
    doc.text(`PERIODO: ${kardexPeriod(report)}     R.U.C.: ${kardexRuc}`,left,25);
    doc.text(`RAZÓN SOCIAL: ${kardexCompany}`,left,30);
    doc.text(`ESTABLECIMIENTO: ${kardexAddress}`,left,35);
    y=39; doc.setFillColor(0,103,103);doc.rect(left,y,194,10,'F');doc.setTextColor(255);doc.setFontSize(6.5);
    let x=left;
    kardexColumns.forEach((c,i) => { const lines=doc.splitTextToSize(c.label,widths[i]-2);doc.text(lines,x+widths[i]/2,y+3.5,{align:'center'});x+=widths[i]; });
    doc.setTextColor(30);y+=13;
  };
  const laboratory = (name: string, continued=false) => {
    doc.setFont('helvetica','bold');doc.setFontSize(7);
    const lines=doc.splitTextToSize(`LABORATORIO: ${name}${continued ? ' (continuación)' : ''}`,190);
    doc.text(lines,left,y+3);y+=lines.length*3+3;
  };
  const nextPage = () => { doc.addPage();header();if(currentLab) laboratory(currentLab,true); };
  header();
  const groups = groupKardex(report.data);
  for (const line of kardexPage(groups,1,report.data.length)) {
    if (line.kind === 'laboratory') {
      currentLab='';
      const labHeight=doc.splitTextToSize(`LABORATORIO: ${line.name}`,190).length*3+3;
      // Reserve space for the complete first product, so the group heading is never isolated.
      const first=groups.find(g => g.name === line.name)?.rows[0];
      doc.setFontSize(6.5);
      const firstHeight=first ? Math.max(5,doc.splitTextToSize(first.Producto,widths[1]-2).length*3+2) : 5;
      if(y+labHeight+firstHeight>bottom) nextPage();
      currentLab=line.name;laboratory(line.name);continue;
    }
    const cells=values(line);doc.setFont('helvetica',line.kind === 'product' ? 'normal' : 'bold');doc.setFontSize(6.5);
    const wrapped=cells.map((v,i) => doc.splitTextToSize(typeof v === 'number' ? v.toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2}) : v,line.kind !== 'product' && i === 0 ? widths[0]+widths[1]+widths[2]-2 : widths[i]-2));
    const height=Math.max(5,...wrapped.map(lines => lines.length*3+2));
    if(y+height>bottom) nextPage();
    doc.setFont('helvetica',line.kind === 'product' ? 'normal' : 'bold');doc.setFontSize(6.5);
    if(line.kind !== 'product') {doc.setDrawColor(100);doc.line(left,y,left+194,y);}
    let x=left;
    wrapped.forEach((lines,i) => {doc.text(lines,i>=3 ? x+widths[i]-1 : x+1,y+3,{align:i>=3?'right':'left'});x+=widths[i];});y+=height;
    if(line.kind === 'subtotal') currentLab='';
  }
  const count=doc.getNumberOfPages();
  for(let page=1;page<=count;page++){doc.setPage(page);doc.setFont('helvetica','normal');doc.setFontSize(7);doc.text(`Página ${page} de ${count}`,202,290,{align:'right'});}
  doc.save(`${filename(report)}.pdf`);
}
