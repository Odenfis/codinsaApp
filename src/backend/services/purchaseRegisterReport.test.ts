import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPurchaseRegisterReport, normalizePurchaseRegisterRow, parsePurchaseRegisterParameters
} from './purchaseRegisterReport';
import { filterPurchaseRegister, summarizePurchaseRegister } from '../../utils/purchaseRegisterModel';

const records = [
  {
    Fecha: '02/09/2026', FechaV: new Date(2026, 8, 20), TipoDoc: '07', Serie: 'FC01 ',
    Numero: '000002', Tipo: 6, NumeroProv: '20123456789 ', Razon: 'Proveedor Áncash',
    ValorExp: 0, BaseImponibleM: -100, IGVm: -18, BaseImponibleG: 10, IGVg: 1.8,
    BaseImponible3: 2, Igv3: 0.36, Total: -103.84, NumEmitido: '0007',
    NumDetraccion: '000045', FechaDetraccion: null, tipoCambio: '3.75',
    FecRefer: '01/09/2026', TipoRef: '01', SerieRef: 'F001', NroComprobante: '000001'
  },
  {
    fecha: new Date(2026, 8, 1), fechav: '15/09/2026', tipodoc: '01', serie: 'F001',
    numero: '000001', tipo: '6', numeroprov: '20600000001', razon: 'Proveedor Uno',
    valorexp: '5', baseimponiblem: '100', igvm: '18', baseimponibleg: '0', igvg: 'x',
    baseimponible3: 0, igv3: 0, total: '123', numemitido: null, numdetraccion: null,
    fechadetraccion: null, tipocambio: null, fecrefer: null, tiporef: null, serieref: null,
    nrocomprobante: null
  }
];

test('valida fechas obligatorias, reales y ordenadas para Registro de Compras', () => {
  assert.match(parsePurchaseRegisterParameters(undefined, '2026-09-01').error || '', /obligatorias/);
  assert.match(parsePurchaseRegisterParameters('2026-02-30', '2026-03-01').error || '', /inválida/);
  assert.match(parsePurchaseRegisterParameters('2026-09-02', '2026-09-01').error || '', /posterior/);
  assert.equal(parsePurchaseRegisterParameters('2026-09-01', '2026-09-30').value?.hasta, '2026-09-30');
});

test('normaliza columnas, fechas, códigos, nulos e importes inválidos', () => {
  const first = normalizePurchaseRegisterRow(records[0]);
  const second = normalizePurchaseRegisterRow(records[1]);
  assert.equal(first.Fecha, '2026-09-02');
  assert.equal(first.Numero, '000002');
  assert.equal(first.NumDetraccion, '000045');
  assert.equal(first.FecRefer, '2026-09-01');
  assert.equal(first.TipoCambio, 3.75);
  assert.equal(second.IGVg, 0);
  assert.equal(second.FechaDetraccion, null);
  assert.equal(second.NroComprobante, '');
  assert.equal(normalizePurchaseRegisterRow({ Fecha: new Date('2026-07-20T00:00:00.000Z') }).Fecha, '2026-07-20');
});

test('ordena comprobantes y conserva los signos en los ocho totales', () => {
  const report = buildPurchaseRegisterReport(records, '2026-09-01', '2026-09-30');
  assert.equal(report.data[0].Numero, '000001');
  assert.equal(report.total, 2);
  assert.deepEqual({ ...report.totals, Total: 0 }, {
    ValorExp: 5, BaseImponibleM: 0, IGVm: 0, BaseImponibleG: 10, IGVg: 1.8,
    BaseImponible3: 2, Igv3: 0.36, Total: 0
  });
  assert.ok(Math.abs(report.totals.Total - 19.16) < 0.000001);
});

test('filtra sin distinguir tildes y recalcula los totales visibles', () => {
  const rows = records.map(normalizePurchaseRegisterRow);
  const filtered = filterPurchaseRegister(rows, 'ancash');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].Numero, '000002');
  assert.equal(summarizePurchaseRegister(filtered).Total, -103.84);
});

test('devuelve un reporte vacío con los ocho totales en cero', () => {
  const report = buildPurchaseRegisterReport([], '2026-09-01', '2026-09-30');
  assert.equal(report.total, 0);
  assert.deepEqual(report.totals, {
    ValorExp: 0, BaseImponibleM: 0, IGVm: 0, BaseImponibleG: 0, IGVg: 0,
    BaseImponible3: 0, Igv3: 0, Total: 0
  });
});
