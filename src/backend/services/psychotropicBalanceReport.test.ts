import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPsychotropicBalanceReport, normalizePsychotropicBalanceRow, parsePsychotropicBalanceParameters, validatePsychotropicBalanceOperationalDate } from './psychotropicBalanceReport';
import { balanceRowStatus, filterPsychotropicBalance, summarizePsychotropicBalance } from '../../utils/psychotropicBalanceModel';

const records = [
  { Codpro: '00001 ', Principio: ' Ácido ', Concentracion: '5 mg', Descripcion: 'Producto TAB', FF: 'TAB', Laboratorio: 'Áncash', Lote: '0001 ', Vence: new Date('2027-01-02T00:00:00Z'), SaldoAnterior: 120, Ingresos: 30, Egresos: 20, SaldoActual: -5 },
  { codpro: '00002', descripcion: 'Producto GOT', ff: 'GOT', lote: '0002', vence: null, saldoanterior: '2', ingresos: 3, egresos: 1, saldoactual: 4 },
  { codpro: '00001', descripcion: 'Producto sin FF', ff: null, lote: '0003', vence: '02/01/2027', saldoanterior: null, ingresos: 2, egresos: -1, saldoactual: null }
];

test('balance: fechas ISO reales, límites con día siguiente y rango ordenado', () => {
  for (const pair of [[undefined, '2026-10-01'], ['2026-10-01', undefined], ['2026-02-30', '2026-03-01'], ['2025-02-29', '2025-03-01'], ['2026-10-02', '2026-10-01'], ['1899-12-31', '2026-10-01'], ['2026-10-01', '2079-06-06'], ['2026-1-01', '2026-10-01'], [['2026-10-01'], '2026-10-02']]) {
    assert.ok(parsePsychotropicBalanceParameters(pair[0], pair[1]).error);
  }
  const valid = parsePsychotropicBalanceParameters('1900-01-01', '2079-06-05');
  assert.equal(valid.error, undefined);
  assert.equal(valid.value?.fromDate.toISOString(), '1900-01-01T00:00:00.000Z');
  assert.equal(parsePsychotropicBalanceParameters('2024-02-29', '2024-02-29').error, undefined);
});
test('balance: fecha futura se compara con fecha SQL, permite hoy y pasado', () => {
  assert.ok(validatePsychotropicBalanceOperationalDate('2026-10-03', '2026-10-02'));
  assert.equal(validatePsychotropicBalanceOperationalDate('2026-10-02', '2026-10-02'), null);
  assert.equal(validatePsychotropicBalanceOperationalDate('2026-09-30', '2026-10-02'), null);
});
test('balance: normalización case-insensitive, códigos, enteros y vencimiento UTC', () => {
  const row = normalizePsychotropicBalanceRow(records[0]);
  assert.equal(row.Codpro, '00001'); assert.equal(row.Lote, '0001');
  assert.equal(row.Principio, 'Ácido'); assert.equal(row.Vence, '2027-01-02');
  assert.equal(row.SaldoActual, -5);
  assert.equal(normalizePsychotropicBalanceRow(records[1]).SaldoAnterior, 2);
  assert.equal(normalizePsychotropicBalanceRow(records[1]).Vence, null);
  assert.equal(normalizePsychotropicBalanceRow(records[2]).Vence, '2027-01-02');
});
test('balance: cantidades nulas o inválidas permanecen incompletas, cero es válido', () => {
  const row = normalizePsychotropicBalanceRow({ SaldoAnterior: null, Ingresos: '', Egresos: 'incorrecto', SaldoActual: 1.5 });
  assert.deepEqual([row.SaldoAnterior, row.Ingresos, row.Egresos, row.SaldoActual], [null, null, null, null]);
  assert.equal(balanceRowStatus(row), 'incomplete');
  assert.equal(balanceRowStatus(normalizePsychotropicBalanceRow({ SaldoAnterior: 0, Ingresos: 0, Egresos: 0, SaldoActual: 0 })), 'correct');
});
test('balance: detecta fórmula con conversión distinta de uno sin corregir el SP', () => {
  // Saldo base 12, entrada 3, salida 2, conversión 10: el SP produce 12+3-2*10=-5.
  const row = normalizePsychotropicBalanceRow(records[0]);
  const copy = structuredClone(row);
  assert.equal(balanceRowStatus(row), 'discrepant');
  assert.equal(row.SaldoAnterior + row.Ingresos! - row.Egresos!, 130);
  assert.equal(row.SaldoActual, -5); assert.deepEqual(row, copy);
  assert.equal(balanceRowStatus(normalizePsychotropicBalanceRow(records[1])), 'correct');
});
test('balance: resúmenes por FF conservan signos y duplicados sin mezclar formas', () => {
  const source = [...records, records[0]];
  const copy = structuredClone(source);
  const report = buildPsychotropicBalanceReport(source, '2026-09-01', '2026-09-30', '2026-10-02');
  assert.equal(report.total, 4); assert.equal(report.totals.productos, 2); assert.equal(report.totals.lotes, 3);
  assert.equal(report.totals.discrepantes, 2); assert.equal(report.totals.incompletos, 1);
  assert.deepEqual(report.totals.porFF.TAB, { SaldoAnterior: 240, Ingresos: 60, Egresos: 40, SaldoActual: -10 });
  assert.deepEqual(report.totals.porFF.GOT, { SaldoAnterior: 2, Ingresos: 3, Egresos: 1, SaldoActual: 4 });
  assert.deepEqual(report.totals.porFF.sinFF, { SaldoAnterior: 0, Ingresos: 2, Egresos: -1, SaldoActual: 0 });
  assert.deepEqual(report.period, { desde: '2026-09-01', hasta: '2026-09-30' });
  assert.equal(report.operationalDate, '2026-10-02'); assert.ok(report.generatedAt); assert.deepEqual(source, copy);
});
test('balance: búsqueda sin tildes y advertencias sobre todas las filas filtradas', () => {
  const rows = records.map(normalizePsychotropicBalanceRow);
  assert.equal(filterPsychotropicBalance(rows, 'ACIDO').length, 1);
  assert.equal(filterPsychotropicBalance(rows, 'ancash').length, 1);
  assert.equal(filterPsychotropicBalance(rows, '00001').length, 2);
  assert.equal(filterPsychotropicBalance(rows, ' '), rows);
  const filtered = summarizePsychotropicBalance(filterPsychotropicBalance(rows, 'GOT'));
  assert.equal(filtered.registros, 1); assert.equal(filtered.discrepantes, 0); assert.equal(filtered.incompletos, 0);
  assert.equal(filterPsychotropicBalance(rows, 'no existe').length, 0);
});
test('balance: orden por descripción, código y lote; vacío con resúmenes en cero', () => {
  const report = buildPsychotropicBalanceReport([{ descripcion: 'Z', codpro: '1' }, { descripcion: 'A', codpro: '2', lote: '10' }, { descripcion: 'A', codpro: '2', lote: '2' }, { descripcion: 'A', codpro: '1' }], '2026-09-01', '2026-09-30', '2026-10-02');
  assert.deepEqual(report.data.map(row => [row.Codpro, row.Lote]), [['1', ''], ['2', '2'], ['2', '10'], ['1', '']]);
  const empty = buildPsychotropicBalanceReport([], '2026-09-01', '2026-09-30', '2026-10-02');
  assert.equal(empty.total, 0); assert.equal(empty.totals.productos, 0); assert.equal(empty.totals.lotes, 0);
  assert.equal(empty.totals.discrepantes, 0); assert.equal(empty.totals.incompletos, 0);
  for (const summary of Object.values(empty.totals.porFF)) assert.deepEqual(summary, { SaldoAnterior: 0, Ingresos: 0, Egresos: 0, SaldoActual: 0 });
});

test('balance: lote agotado con movimientos permanece visible aunque no tenga vencimiento', () => {
  const report = buildPsychotropicBalanceReport([{ Codpro: '00001', Lote: '0001', Vence: null, FF: 'TAB', SaldoAnterior: 2, Ingresos: 3, Egresos: 5, SaldoActual: 0 }], '2026-09-01', '2026-09-30', '2026-10-02');
  assert.equal(report.total, 1); assert.equal(report.data[0].Vence, null);
  assert.equal(balanceRowStatus(report.data[0]), 'correct');
  assert.deepEqual(report.totals.porFF.TAB, { SaldoAnterior: 2, Ingresos: 3, Egresos: 5, SaldoActual: 0 });
});

test('balance: respuesta corregida conserva saldos al inicio Del y cierre Al en sus resúmenes', () => {
  // SQL: saldo actual 12, entrada posterior 5, salida posterior 1, conversión 10.
  // Cierre Al = 80; con ingresos 30 y egresos 20, apertura Del = 70.
  const report = buildPsychotropicBalanceReport([
    { Codpro: '00001', Lote: 'ACTIVO', FF: 'TAB', SaldoAnterior: 70, Ingresos: 30, Egresos: 20, SaldoActual: 80 },
    { Codpro: '00001', Lote: 'AGOTADO', FF: 'TAB', Vence: null, SaldoAnterior: 40, Ingresos: 0, Egresos: 40, SaldoActual: 0 },
    { Codpro: '00001', Lote: 'NEGATIVO', FF: 'TAB', SaldoAnterior: -20, Ingresos: 0, Egresos: 0, SaldoActual: -20 }
  ], '2026-09-30', '2026-10-02', '2026-10-03');
  assert.equal(report.totals.discrepantes, 0);
  assert.equal(report.totals.incompletos, 0);
  assert.equal(report.total, 3);
  assert.deepEqual(report.totals.porFF.TAB, { SaldoAnterior: 90, Ingresos: 30, Egresos: 60, SaldoActual: 60 });
  assert.deepEqual(report.period, { desde: '2026-09-30', hasta: '2026-10-02' });
});
