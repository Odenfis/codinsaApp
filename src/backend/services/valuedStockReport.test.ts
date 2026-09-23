import assert from 'node:assert/strict';
import test from 'node:test';
import { buildValuedStockReport } from './valuedStockReport';

const base = {
  Codpro: 'P001   ', Lote: 'LOTE-A   ', Almacen: 1,
  CodSunat: 'SUNAT-1', TipoPro: 'MERCADERIA', Descripcion: 'Producto A', UniMed: 'UND',
  Fecha: new Date('2026-08-01T00:00:00Z'), TipoDoc: '', Documento: '',
  StockIni: 10, Ingresos: 0, CosIng: 0, CostoI: 0, Salidas: 0,
  CosUnit: 0, CostoS: 0, Saldo: 10, ValorUni: 5, Valorizado: 50
};

test('usa la última transacción por número y valoriza cada lote una sola vez', () => {
  const report = buildValuedStockReport([
    { ...base, Numero: 3, StockIni: 10, Ingresos: 4, Saldo: 14, ValorUni: 6, Valorizado: 84 },
    { ...base, Numero: 0 },
    { ...base, Numero: 8, StockIni: 14, Salidas: 2, Saldo: 12, ValorUni: 6, Valorizado: 72 },
    { ...base, Codpro: 'P002', Lote: 'LOTE-B', Numero: 0, StockIni: 3, Saldo: 3, Valorizado: 15 }
  ], 8, 2026);

  assert.equal(report.total, 2);
  assert.equal(report.movementTotal, 2);
  assert.equal(report.data[0].Codpro, 'P001');
  assert.deepEqual(report.data[0].movements.map(item => item.Numero), [3, 8]);
  assert.deepEqual(report.totals, { StockIni: 13, Ingresos: 4, Salidas: 2, Saldo: 15, Valorizado: 87 });
  assert.equal(report.data[1].Valorizado, 15);
  assert.equal(report.period.hasta, '2026-08-31');
});

test('devuelve un periodo sin lotes y rechaza saldos iniciales duplicados', () => {
  const empty = buildValuedStockReport([], 2, 2024);
  assert.equal(empty.total, 0);
  assert.equal(empty.totals.Valorizado, 0);
  assert.equal(empty.period.hasta, '2024-02-29');
  assert.throws(() => buildValuedStockReport([{ ...base, Numero: 0 }, { ...base, Numero: 0 }], 8, 2026), /duplicados/);
});
