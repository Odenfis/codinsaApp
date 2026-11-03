import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePromotion, promotionRole } from './promotions';

const valid = { laboratorio:'01', descripcion:'Promoción', inicio:'2026-01-01', fin:'2026-12-31', monto:10.25, producto:'01001', cantidad:1, productos:['01001','01002'] };
test('valida promoción y conserva ceros en códigos', () => {
  assert.deepEqual(parsePromotion(valid), valid);
  assert.equal(promotionRole('Administrador'), 1);
  assert.equal(promotionRole('ana.auditora'), 2);
  assert.equal(promotionRole('usuario-desconocido'), undefined);
});
test('rechaza fechas, descripción y cantidades inválidas', () => {
  for (const change of [{inicio:'2026-02-30'}, {fin:'2025-01-01'}, {descripcion:' '.repeat(2)}, {descripcion:'a'.repeat(101)}, {cantidad:0}, {cantidad:1.5}, {monto:-1}, {monto:0.00001}]) assert.throws(() => parsePromotion({ ...valid, ...change }));
});
test('exige productos sin duplicados y un producto principal', () => {
  for (const change of [{ productos: [] }, { productos: ['01001','01001'] }, { producto: '' }, { laboratorio:'' }]) assert.throws(() => parsePromotion({ ...valid, ...change }));
});
