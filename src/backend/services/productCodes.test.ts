import assert from 'node:assert/strict';
import test from 'node:test';
import { parseProductCodeChanges, buildProductCodesUpdate } from './productCodes';

test('acepta cambios parciales y conserva ceros iniciales y texto literal', () => {
  assert.deepEqual(parseProductCodeChanges({ cambios: { CodLab1: '00120', CodLabo: ' A-01 ' } }), {
    CodLab1: '00120', CodLabo: ' A-01 ',
  });
});

test('el borrado explícito se convierte en null sin agregar campos omitidos', () => {
  assert.deepEqual(parseProductCodeChanges({ cambios: { CodLab: '', CodLab1: null } }), {
    CodLab: null, CodLab1: null,
  });
});

test('rechaza cuerpos vacíos y cambios sin campos', () => {
  for (const body of [null, [], {}, { cambios: null }, { cambios: [] }, { cambios: {} }, { cambios: 'CodLab' }]) {
    assert.throws(() => parseProductCodeChanges(body));
  }
});

test('rechaza campos ajenos y nombres SQL inyectados incluso junto a campos válidos', () => {
  for (const field of ['Costo', 'CodLab] = NULL;--', '__proto__', 'constructor']) {
    assert.throws(() => parseProductCodeChanges(JSON.parse(`{"cambios":{"CodLab":"ok","${field}":"x"}}`)));
  }
});

test('valida tipos y límite de 50 caracteres sin truncar', () => {
  assert.equal(parseProductCodeChanges({ cambios: { CodLab: '0'.repeat(50) } }).CodLab.length, 50);
  for (const value of ['0'.repeat(51), 123, false, {}, [], undefined]) {
    assert.throws(() => parseProductCodeChanges({ cambios: { CodLabo: value } }));
  }
});

test('genera una única actualización parcial con valores parametrizados', () => {
  const changes = parseProductCodeChanges({ cambios: { CodLab: "x'; DROP TABLE Productos;--", CodLabo: null } });
  const query = buildProductCodesUpdate(changes);
  assert.match(query, /SET \[CodLab\] = @CodLab, \[CodLabo\] = @CodLabo/);
  assert.doesNotMatch(query, /\[CodLab1\] =/);
  assert.doesNotMatch(query, /DROP TABLE/);
  assert.equal((query.match(/UPDATE /g) || []).length, 1);
  assert.match(query, /WHERE CodPro = @codpro/);
  assert.match(query, /OUTPUT INSERTED.CodLab, INSERTED.Codlab1 AS CodLab1, INSERTED.Codlabo AS CodLabo/);
});

test('guarda los tres campos juntos y rechaza una actualización vacía', () => {
  const query = buildProductCodesUpdate(parseProductCodeChanges({ cambios: { CodLab: 'a', CodLab1: 'b', CodLabo: 'c' } }));
  for (const field of ['CodLab', 'CodLab1', 'CodLabo']) assert.ok(query.includes(`[${field}] = @${field}`));
  assert.throws(() => buildProductCodesUpdate({}));
});
