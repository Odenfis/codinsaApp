import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSalesRegisterReport, normalizeSalesRegisterRow, parseSalesRegisterParameters } from './salesRegisterReport';
import { filterSalesRegister, summarizeSalesRegister } from '../../utils/salesRegisterModel';

const records = [
  { Fecha: '02/09/2026', fechav: new Date(2026, 8, 20), TipoDoc: '07', Serie: 'FC01 ', Numero: '000002', Tipo: 6, NumeroClie: '20123456789 ', Razon: 'Farmacia Áncash', ValorExp: 0, Gravado: -100, Exonerado: 0, Inafecta: 0, ISC: 0, IGV: -18, Otros: 0, Total: -118, TipoCAmbio: null, Feca: null, TipoF: '', SerieF: '', NumDocF: '', Cta12D: '12131', Cta12H: '121132', Cta70: '70121', cuenta10: '', FecPago: null, Sindato: '', Glosa: 'NOTA DE CRÉDITO' },
  { Fecha: new Date(2026, 8, 1), FechaV: '15/09/2026', TipoDoc: '01', Serie: 'F001', Numero: '000001', Tipo: '6', NumeroClie: '20111111111', Razon: 'Cliente Uno', ValorExp: '10', Gravado: '100', Exonerado: '20', Inafecta: 5, ISC: 1, IGV: 18, Otros: 2, Total: '156', TipoCambio: '3.75', Glosa: 'VENTAS DE MERCADERIA' }
];

test('valida fechas obligatorias, reales y ordenadas', () => {
  assert.match(parseSalesRegisterParameters(undefined, '2026-09-01').error || '', /obligatorias/);
  assert.match(parseSalesRegisterParameters('2026-02-30', '2026-03-01').error || '', /inválida/);
  assert.match(parseSalesRegisterParameters('2026-09-02', '2026-09-01').error || '', /posterior/);
  assert.deepEqual(parseSalesRegisterParameters('2026-09-01', '2026-09-30').value?.desde, '2026-09-01');
});

test('normaliza fechas, importes, códigos y valores nulos', () => {
  const row = normalizeSalesRegisterRow(records[0]);
  assert.equal(row.Fecha, '2026-09-02');
  assert.equal(row.FechaV, '2026-09-20');
  assert.equal(row.Numero, '000002');
  assert.equal(row.Tipo, '6');
  assert.equal(row.Total, -118);
  assert.equal(row.TipoCambio, null);
});

test('ordena registros y conserva importes negativos en los totales', () => {
  const report = buildSalesRegisterReport(records, '2026-09-01', '2026-09-30');
  assert.equal(report.data[0].Numero, '000001');
  assert.equal(report.total, 2);
  assert.equal(report.totals.Gravado, 0);
  assert.equal(report.totals.IGV, 0);
  assert.equal(report.totals.Total, 38);
});

test('filtra sin distinguir tildes y recalcula el resumen visible', () => {
  const rows = records.map(normalizeSalesRegisterRow);
  const filtered = filterSalesRegister(rows, 'credito');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].Numero, '000002');
  assert.equal(summarizeSalesRegister(filtered).Total, -118);
});

test('devuelve un reporte vacío con totales en cero', () => {
  const report = buildSalesRegisterReport([], '2026-09-01', '2026-09-30');
  assert.equal(report.total, 0);
  assert.deepEqual(report.totals, { ValorExp: 0, Gravado: 0, Exonerado: 0, Inafecta: 0, ISC: 0, IGV: 0, Otros: 0, Total: 0 });
});
