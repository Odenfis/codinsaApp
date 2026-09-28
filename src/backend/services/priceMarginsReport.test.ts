import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPriceMarginsReport, normalizePriceMarginsRow, parsePriceMarginsParameters } from './priceMarginsReport';
import { filterPriceMargins, summarizePriceMargins } from '../../utils/priceMarginsModel';

const records = [
  { Codigo: '01002 ', Producto: 'Ácido ascórbico', stock: '4.5', PVF: '20.25', CostoIgv: 10, Mas10: 11, Mas15: 11.5, Mas20: 12, Mas25: 12.5 },
  { Codigo: '01001', Producto: 'Acetaminofén', stock: 3, PVF: 8, CostoIgv: '5.90', Mas10: '6.49', Mas15: 6.785, Mas20: 7.08, Mas25: 7.375 },
  { Codigo: '01003', Producto: 'Zinc', stock: null, PVF: 'inválido', CostoIgv: null, Mas10: null, Mas15: null, Mas20: null, Mas25: null }
];

test('normaliza códigos, textos y valores numéricos sin perder ceros iniciales', () => {
  const row = normalizePriceMarginsRow(records[0]);
  assert.equal(row.Codigo, '01002');
  assert.equal(row.Producto, 'Ácido ascórbico');
  assert.equal(row.Stock, 4.5);
  assert.equal(row.PVF, 20.25);
});

test('convierte valores nulos o no numéricos a cero', () => {
  const row = normalizePriceMarginsRow(records[2]);
  assert.equal(row.Stock, 0);
  assert.equal(row.PVF, 0);
  assert.equal(row.Mas25, 0);
});

test('ordena el reporte por producto y calcula productos y stock', () => {
  const report = buildPriceMarginsReport(records, { CodLab: '01 ', Descripcion: ' Laboratorio Uno ' });
  assert.equal(report.data[0].Codigo, '01001');
  assert.equal(report.laboratory.CodLab, '01');
  assert.deepEqual(report.totals, { products: 3, stock: 7.5 });
});

test('devuelve un reporte válido sin resultados', () => {
  const report = buildPriceMarginsReport([], { CodLab: '01', Descripcion: 'Laboratorio Uno' });
  assert.equal(report.total, 0);
  assert.deepEqual(report.totals, { products: 0, stock: 0 });
});

test('filtra por código o producto sin distinguir mayúsculas ni tildes', () => {
  const rows = records.map(normalizePriceMarginsRow);
  assert.equal(filterPriceMargins(rows, 'acido').length, 1);
  assert.equal(filterPriceMargins(rows, '01001')[0].Producto, 'Acetaminofén');
  assert.deepEqual(summarizePriceMargins(filterPriceMargins(rows, 'acido')), { products: 1, stock: 4.5 });
});

test('valida que el laboratorio tenga exactamente dos caracteres', () => {
  assert.match(parsePriceMarginsParameters(undefined).error || '', /laboratorio/);
  assert.match(parsePriceMarginsParameters('001').error || '', /dos caracteres/);
  assert.deepEqual(parsePriceMarginsParameters(' 01 ').value, { labora: '01' });
});
