import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDailySalesControlReport, normalizeDailySalesControlRow } from './dailySalesControlReport';
import { filterDailySalesControl, summarizeDailySalesControl } from '../../utils/dailySalesControlModel';

const records = [
  { Nro: '0002 ', NomComercial: 'Óptica Norte', Distrito: 'LOS OLIVOS', Ruc_Dni: '20123456789 ', NP: 'P-002', Vendedor: '07', Representante: 'María López', Condicion: 'CRÉDITO', Factura: '000002', Monto: '100.50', MasIgv: '118.59', Observacion: 'Entregar por la tarde' },
  { nro: '0001', nomcomercial: 'Botica Central', distrito: null, ruc_dni: '20600000001', np: 'P-001', vendedor: '07', representante: null, condicion: 'CONTADO', factura: '000001', monto: 50, masigv: 59, observacion: null },
  { Nro: '0002', NomComercial: 'Óptica Norte', Distrito: 'LOS OLIVOS', Ruc_Dni: '20123456789', NP: 'P-003', Vendedor: '08', Representante: 'María López', Condicion: 'CRÉDITO', Factura: '000003', Monto: '-10', MasIgv: '-11.8', Observacion: 'Nota asociada' }
];

test('normaliza columnas sin depender de mayúsculas, nulos, códigos e importes', () => {
  const row = normalizeDailySalesControlRow(records[1]);
  assert.equal(row.Nro, '0001');
  assert.equal(row.RucDni, '20600000001');
  assert.equal(row.Distrito, '');
  assert.equal(row.Monto, 50);
  assert.equal(row.Observacion, '');
});

test('ordena y calcula facturas, clientes, pedidos, vendedores e importes', () => {
  const report = buildDailySalesControlReport(records, '2026-09-25');
  assert.equal(report.data[0].Factura, '000001');
  assert.deepEqual(report.totals, { invoices: 3, clients: 2, orders: 3, salespeople: 2, subtotal: 140.5, totalWithTax: 165.79 });
  assert.equal(report.reportDate, '2026-09-25');
});

test('filtra sin distinguir tildes y recalcula el resumen visible', () => {
  const rows = records.map(normalizeDailySalesControlRow);
  const filtered = filterDailySalesControl(rows, 'optica');
  assert.equal(filtered.length, 2);
  assert.equal(summarizeDailySalesControl(filtered).subtotal, 90.5);
});

test('devuelve vacío con fecha operativa y totales en cero', () => {
  const report = buildDailySalesControlReport([], new Date(2026, 8, 25, 12));
  assert.equal(report.total, 0);
  assert.equal(report.reportDate, '2026-09-25');
  assert.deepEqual(report.totals, { invoices: 0, clients: 0, orders: 0, salespeople: 0, subtotal: 0, totalWithTax: 0 });
});
