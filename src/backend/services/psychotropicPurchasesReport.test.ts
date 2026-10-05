import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPsychotropicPurchasesReport, normalizePsychotropicPurchasesRow, parsePsychotropicPurchasesParameters } from './psychotropicPurchasesReport';
import { filterPsychotropicPurchases, summarizePsychotropicPurchases } from '../../utils/psychotropicPurchasesModel';

const records = [
  { Principio: ' Ácido ', Concentracion: '5 mg', Descripcion: 'Producto TAB', FF: 'TAB', Cantidad: '2.5', Proveedor: 'Áncash', Lote: '0001 ', Fecha: new Date('2026-09-02T00:00:00Z'), NroFactura: '00002' },
  { principio: 'Otro', descripcion: 'Producto GOT', ff: 'GOT', cantidad: -1.25, proveedor: ' ÁNCASH ', fecha: '01/09/2026', nrofactura: '00001' },
  { descripcion: 'Producto sin FF', ff: null, cantidad: 3, proveedor: 'Otro proveedor', fecha: '2026-09-02', nrofactura: '00003' }
];

test('fechas reales, requeridas, ordenadas y dentro de SmallDateTime', () => {
  for (const pair of [[undefined, '2026-09-01'], ['2026-02-30', '2026-03-01'], ['2026-09-02', '2026-09-01'], ['1899-12-31', '2026-09-01'], ['2026-09-01', '2079-06-07'], ['2026-9-1', '2026-09-02'], [['2026-09-01'], '2026-09-02']]) {
    assert.ok(parsePsychotropicPurchasesParameters(pair[0], pair[1]).error);
  }
  assert.equal(parsePsychotropicPurchasesParameters('1900-01-01', '2079-06-06').error, undefined);
  assert.equal(parsePsychotropicPurchasesParameters('2026-09-01', '2026-09-01').error, undefined);
});
test('normalización case-insensitive, alias físicos, nulos, decimales y códigos', () => {
  const row = normalizePsychotropicPurchasesRow(records[0]);
  assert.equal(row.Principio, 'Ácido');
  assert.equal(row.NroFactura, '00002');
  assert.equal(row.Lote, '0001');
  assert.equal(row.Proveedor, 'Áncash');
  assert.equal(row.Cantidad, 2.5);
  assert.equal(row.Fecha, '2026-09-02');
  const empty = normalizePsychotropicPurchasesRow({ cantidad: 'inválida', ff: null });
  assert.equal(empty.Cantidad, 0);
  assert.equal(empty.FF, null);
  assert.equal(empty.Fecha, null);
});
test('ordena sin eliminar duplicados y conserva los signos del SP', () => {
  const report = buildPsychotropicPurchasesReport([...records, records[0]], '2026-09-01', '2026-09-02');
  assert.equal(report.total, 4);
  assert.equal(report.data[0].NroFactura, '00001');
  assert.deepEqual(report.totals, { registros: 4, facturas: 3, proveedores: 2, tab: 5, got: -1.25, sinFF: 3 });
  assert.deepEqual(report.period, { desde: '2026-09-01', hasta: '2026-09-02' });
  assert.ok(report.generatedAt);
});
test('búsqueda sin tildes en textos y resúmenes sobre el conjunto filtrado', () => {
  const rows = records.map(normalizePsychotropicPurchasesRow);
  assert.equal(filterPsychotropicPurchases(rows, 'ACIDO').length, 1);
  assert.equal(filterPsychotropicPurchases(rows, 'ANCASH').length, 2);
  assert.equal(filterPsychotropicPurchases(rows, 'no existe').length, 0);
  assert.deepEqual(summarizePsychotropicPurchases(filterPsychotropicPurchases(rows, 'ancash')), { registros: 2, facturas: 2, proveedores: 1, tab: 2.5, got: -1.25, sinFF: 0 });
  assert.equal(filterPsychotropicPurchases(rows, ' '), rows);
});
test('periodo vacío sin cantidades ni proveedores ficticios', () => {
  assert.deepEqual(buildPsychotropicPurchasesReport([], '2026-09-01', '2026-09-01').totals,
    { registros: 0, facturas: 0, proveedores: 0, tab: 0, got: 0, sinFF: 0 });
});


test('desempata por factura, descripción y lote conservando todas las filas', () => {
  const report = buildPsychotropicPurchasesReport([
    { fecha: '2026-10-01', nrofactura: '02', descripcion: 'Z', lote: '2' },
    { fecha: '2026-10-01', nrofactura: '01', descripcion: 'A', lote: '10' },
    { fecha: '2026-10-01', nrofactura: '01', descripcion: 'A', lote: '2' },
  ], '2026-10-01', '2026-10-01');
  assert.deepEqual(report.data.map(row => row.Lote), ['2', '10', '2']);
});
