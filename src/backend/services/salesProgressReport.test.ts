import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSalesProgressReport, normalizeSalesProgressRow, parseSalesProgressParameters } from './salesProgressReport';
import { filterSalesProgress, summarizeSalesProgress } from '../../utils/salesProgressModel';

const records = [
  { Ruc: '20123456789   ', Cliente: 'Farmacia Norte', codpro: '01002', CodAnte: 'A-2', Producto: 'Producto B', Cantidad: 2, Total: 20.5, Departamento: 'LA LIBERTAD', Provincia: 'TRUJILLO', Distrito: 'TRUJILLO', Ubigeo: '130101', Fecha: '02/09/2026', Tipo_doc: '01', Serie: 'F001', nro_doc: '0002', Vendedor: 7 },
  { Ruc: '20123456789', Cliente: 'Farmacia Norte', codpro: '01001', CodAnte: 'A-1', Producto: 'Producto A', Cantidad: '3', Total: '30', Departamento: 'LA LIBERTAD', Provincia: 'TRUJILLO', Distrito: 'VICTOR LARCO', Ubigeo: '130111', Fecha: '01/09/2026', Tipo_doc: '01', Serie: 'F001', nro_doc: '0001', Vendedor: '07' },
  { Ruc: '', Cliente: 'Botica Sur', codpro: '01003', Producto: 'Producto C', Cantidad: null, Total: 'inválido', Departamento: 'LIMA', Fecha: '02/09/2026', Tipo_doc: '03', Serie: 'B001', nro_doc: '0001' }
];

test('normaliza fechas, números y códigos de texto sin perder ceros iniciales', () => {
  const row = normalizeSalesProgressRow(records[1]);
  assert.equal(row.Fecha, '2026-09-01');
  assert.equal(row.Cantidad, 3);
  assert.equal(row.Total, 30);
  assert.equal(row.Vendedor, '07');
  assert.equal(row.Ruc, '20123456789');
});

test('calcula clientes y documentos únicos y ordena el reporte', () => {
  const report = buildSalesProgressReport(records, { CodLab: '01 ', Descripcion: ' Laboratorio Uno ' }, 9, 2026);
  assert.equal(report.data[0].nro_doc, '0001');
  assert.deepEqual(report.totals, { lines: 3, clients: 2, documents: 3, units: 5, sales: 50.5 });
  assert.equal(report.laboratory.CodLab, '01');
  assert.equal(report.period.hasta, '2026-09-30');
});

test('devuelve totales en cero cuando el procedimiento no encuentra ventas', () => {
  const report = buildSalesProgressReport([], { CodLab: '01', Descripcion: 'Laboratorio Uno' }, 2, 2024);
  assert.equal(report.total, 0);
  assert.deepEqual(report.totals, { lines: 0, clients: 0, documents: 0, units: 0, sales: 0 });
  assert.equal(report.period.hasta, '2024-02-29');
});

test('filtra sin distinguir mayúsculas ni tildes y resume el resultado visible', () => {
  const rows = records.map(normalizeSalesProgressRow);
  const filtered = filterSalesProgress(rows, 'victor larco');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].nro_doc, '0001');
  assert.deepEqual(summarizeSalesProgress(filtered), { lines: 1, clients: 1, documents: 1, units: 3, sales: 30 });
});

test('valida parámetros faltantes y límites de laboratorio, mes y año', () => {
  assert.match(parseSalesProgressParameters(undefined, '9', '2026').error || '', /laboratorio/);
  assert.match(parseSalesProgressParameters('001', '9', '2026').error || '', /dos caracteres/);
  assert.match(parseSalesProgressParameters('01', '0', '2026').error || '', /mes/);
  assert.match(parseSalesProgressParameters('01', '9', '2101').error || '', /año/);
  assert.deepEqual(parseSalesProgressParameters(' 01 ', '09', '2026').value, { labora: '01', mes: 9, anio: 2026 });
});
