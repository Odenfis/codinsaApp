import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMonthlyQuarterlySalesReport, normalizeMonthlyQuarterlySalesRow,
  parseMonthlyQuarterlySalesParameters
} from './monthlyQuarterlySalesReport';
import {
  filterMonthlyQuarterlySales, getSalesPeriodShortcut, summarizeMonthlyQuarterlySales
} from '../../utils/monthlyQuarterlySalesModel';

const records = [
  { Fecha: '02/09/2026', Tipo: 1, Tipodoc: '01', Serie: 'F001', Nro_doc: '000002', Codigo: '01002', Producto: 'Ácido ascórbico', Cantidad: '2', Precio: '10.50', Total: '21', Lote: 'L-2', Vencimiento: new Date(2027, 0, 15), Vendedor: 7, Zona: 2, Laboratorio: '01', Ruc_Dni: '20123456789', Empresa: 'Farmacia Norte', Direccion: 'Av. Norte', Lugar: 'TRUJILLO', Departamento: 'LA LIBERTAD', Provincia: 'TRUJILLO', Distrito: 'TRUJILLO' },
  { fecha: new Date(2026, 8, 1), tipo: '1', TIPODOC: '01', serie: 'F001', nro_DOC: '000001', codigo: '01001', producto: 'Acetaminofén', cantidad: 3, precio: 8, total: 24, lote: 'L-1', vencimiento: null, vendedor: '07', zona: '02', laboratorio: '01', ruc_dni: '20123456789', empresa: 'Farmacia Norte', direccion: 'Av. Norte', lugar: 'TRUJILLO', departamento: 'LA LIBERTAD', provincia: 'TRUJILLO', distrito: 'VICTOR LARCO' },
  { Fecha: '03/09/2026', Tipo: 8, Tipodoc: '07', Serie: 'FC01', Nro_doc: '000003', Codigo: '02001', Producto: 'Zinc', Cantidad: '-1', Precio: 12, Total: '-12', Lote: '', Vencimiento: '', Vendedor: 8, Zona: 3, Laboratorio: '02', Ruc_Dni: '20600000002', Empresa: 'Botica Sur', Direccion: '', Lugar: 'ICA', Departamento: 'ICA', Provincia: 'ICA', Distrito: 'ICA' }
];

test('valida fechas obligatorias, reales y ordenadas', () => {
  assert.match(parseMonthlyQuarterlySalesParameters(undefined, '2026-09-01').error || '', /obligatorias/);
  assert.match(parseMonthlyQuarterlySalesParameters('2026-02-30', '2026-03-01').error || '', /inválida/);
  assert.match(parseMonthlyQuarterlySalesParameters('2026-09-02', '2026-09-01').error || '', /posterior/);
  assert.equal(parseMonthlyQuarterlySalesParameters('2026-09-01', '2026-09-30').value?.hasta, '2026-09-30');
});

test('normaliza columnas sin depender de mayúsculas, fechas, códigos y números', () => {
  const row = normalizeMonthlyQuarterlySalesRow(records[1]);
  assert.equal(row.Fecha, '2026-09-01');
  assert.equal(row.NroDoc, '000001');
  assert.equal(row.Vendedor, '07');
  assert.equal(row.Cantidad, 3);
  assert.equal(row.Vencimiento, null);
});

test('ordena y calcula líneas, documentos, clientes, productos, unidades y venta', () => {
  const report = buildMonthlyQuarterlySalesReport(records, '2026-09-01', '2026-09-30');
  assert.equal(report.data[0].NroDoc, '000001');
  assert.deepEqual(report.totals, { lines: 3, documents: 3, clients: 2, products: 3, units: 4, sales: 33 });
});

test('filtra sin distinguir tildes y recalcula los indicadores visibles', () => {
  const rows = records.map(normalizeMonthlyQuarterlySalesRow);
  const filtered = filterMonthlyQuarterlySales(rows, 'acido');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].Codigo, '01002');
  assert.equal(summarizeMonthlyQuarterlySales(filtered).sales, 21);
});

test('calcula correctamente los tres atajos de periodo', () => {
  const today = new Date(2026, 8, 25, 12);
  assert.deepEqual(getSalesPeriodShortcut('current-month', today), { desde: '2026-09-01', hasta: '2026-09-25' });
  assert.deepEqual(getSalesPeriodShortcut('previous-month', today), { desde: '2026-08-01', hasta: '2026-08-31' });
  assert.deepEqual(getSalesPeriodShortcut('current-quarter', today), { desde: '2026-07-01', hasta: '2026-09-25' });
});

test('devuelve un reporte vacío con totales en cero', () => {
  const report = buildMonthlyQuarterlySalesReport([], '2026-09-01', '2026-09-30');
  assert.deepEqual(report.totals, { lines: 0, documents: 0, clients: 0, products: 0, units: 0, sales: 0 });
});
