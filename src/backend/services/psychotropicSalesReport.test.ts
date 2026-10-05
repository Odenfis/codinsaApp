import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPsychotropicSalesReport, normalizePsychotropicSalesRow, parsePsychotropicSalesParameters } from './psychotropicSalesReport';
import { filterPsychotropicSales, summarizePsychotropicSales } from '../../utils/psychotropicSalesModel';

const records = [
  { Principo: ' Ácido ', Concentracion: '5 mg', Descripcion: 'Producto TAB', Registro: '00012 ', FF: 'TAB', Cantidad: '2.5', Ruc: '00123456789', Establecimiento: 'Áncash', Distrito: null, Direccion: null, Lote: '0001 ', Fecha: new Date('2026-09-02T00:00:00Z'), Documento: '00002' },
  { principio: 'Otro', descripcion: 'Producto GOT', ff: 'GOT', cantidad: -1.25, ruc: '00123456789', fecha: '01/09/2026', numfactura: '00001' },
  { descripcion: 'Producto sin FF', ff: null, cantidad: 3, ruc: '20600000001', fecha: '2026-09-02', numfactura: '00003' }
];

test('fechas reales, requeridas, ordenadas y dentro de SmallDateTime', () => {
  for (const pair of [[undefined, '2026-09-01'], ['2026-02-30', '2026-03-01'], ['2026-09-02', '2026-09-01'], ['1899-12-31', '2026-09-01'], ['2026-09-01', '2079-06-07'], ['2026-9-1', '2026-09-02'], [['2026-09-01'], '2026-09-02']]) {
    assert.ok(parsePsychotropicSalesParameters(pair[0], pair[1]).error);
  }
  assert.equal(parsePsychotropicSalesParameters('1900-01-01', '2079-06-06').error, undefined);
  assert.equal(parsePsychotropicSalesParameters('2026-09-01', '2026-09-01').error, undefined);
});
test('normalización case-insensitive, alias físicos, nulos, decimales y códigos', () => {
  const row = normalizePsychotropicSalesRow(records[0]);
  assert.equal(row.Principio, 'Ácido');
  assert.equal(row.RegistroSanitario, '00012');
  assert.equal(row.NumFactura, '00002');
  assert.equal(row.Lote, '0001');
  assert.equal(row.Ruc, '00123456789');
  assert.equal(row.Cantidad, 2.5);
  assert.equal(row.Fecha, '2026-09-02');
  assert.equal(row.Distrito, '');
  assert.equal(row.Direccion, '');
  const empty = normalizePsychotropicSalesRow({ cantidad: 'inválida', ff: null });
  assert.equal(empty.Cantidad, 0);
  assert.equal(empty.FF, null);
  assert.equal(empty.Fecha, null);
});
test('ordena sin eliminar duplicados y conserva los signos del SP', () => {
  const report = buildPsychotropicSalesReport([...records, records[0]], '2026-09-01', '2026-09-02');
  assert.equal(report.total, 4);
  assert.equal(report.data[0].NumFactura, '00001');
  assert.deepEqual(report.totals, { registros: 4, establecimientos: 2, tab: 5, got: -1.25, sinFF: 3 });
  assert.deepEqual(report.period, { desde: '2026-09-01', hasta: '2026-09-02' });
  assert.ok(report.generatedAt);
});
test('búsqueda sin tildes en textos y resúmenes sobre el conjunto filtrado', () => {
  const rows = records.map(normalizePsychotropicSalesRow);
  assert.equal(filterPsychotropicSales(rows, 'ACIDO').length, 1);
  assert.equal(filterPsychotropicSales(rows, '00012').length, 1);
  assert.equal(filterPsychotropicSales(rows, '00123456789').length, 2);
  assert.equal(filterPsychotropicSales(rows, 'no existe').length, 0);
  assert.deepEqual(summarizePsychotropicSales(filterPsychotropicSales(rows, 'ancash')), { registros: 1, establecimientos: 1, tab: 2.5, got: 0, sinFF: 0 });
  assert.equal(filterPsychotropicSales(rows, ' '), rows);
});
test('periodo vacío sin cantidades ni establecimientos ficticios', () => {
  assert.deepEqual(buildPsychotropicSalesReport([], '2026-09-01', '2026-09-01').totals,
    { registros: 0, establecimientos: 0, tab: 0, got: 0, sinFF: 0 });
});
