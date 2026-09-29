import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCustomerHistoryReport, normalizeCustomerHistoryRow, parseCustomerHistoryCustomerId,
  summarizeCustomerHistory
} from './customerHistoryReport';

test('valida que Codclie sea un entero positivo', () => {
  for (const invalid of [undefined, '', 0, -1, 1.5, 'abc']) {
    assert.match(parseCustomerHistoryCustomerId(invalid).error || '', /cliente válido/);
  }
  assert.deepEqual(parseCustomerHistoryCustomerId('42').value, 42);
});

test('normaliza columnas sin distinguir mayúsculas, espacios ni nulos', () => {
  const row = normalizeCustomerHistoryRow({
    nro: '2', ITEM: '1', vendedor: null, documento: ' FACTURA ', NUMERO: ' F001-8 ',
    fecha: '28/09/2026', importe: '120.50', AMORTIZADO: null,
    fechav: new Date('2026-09-30T00:00:00.000Z'), SALDO: '20.5', situacion: ' **Vencida '
  });
  assert.deepEqual(row, {
    Nro: 2, Item: 1, Vendedor: 0, Documento: 'FACTURA', Numero: 'F001-8',
    Fecha: '2026-09-28', Importe: 120.5, Amortizado: 0, FechaV: '2026-09-30',
    Saldo: 20.5, Situacion: '**Vencida'
  });
});

test('calcula totales solamente con documentos principales Item 1', () => {
  const rows = [
    normalizeCustomerHistoryRow({ Nro: 1, Item: 2, Importe: 50, Amortizado: 50, Saldo: 0 }),
    normalizeCustomerHistoryRow({ Nro: 2, Item: 1, Importe: 200, Amortizado: 150, Saldo: 50 }),
    normalizeCustomerHistoryRow({ Nro: 1, Item: 1, Importe: 100, Amortizado: 100, Saldo: 0 })
  ];
  assert.deepEqual(summarizeCustomerHistory(rows), { documents: 2, importe: 300, amortizado: 250, saldo: 50 });
});

test('ordena el historial por Nro e Item y conserva el cliente', () => {
  const client = { Codclie: 8, Ruc: '20123456789', Razon: 'Cliente Prueba', Activo: false };
  const report = buildCustomerHistoryReport([
    { Nro: 2, Item: 1 }, { Nro: 1, Item: 2 }, { Nro: 1, Item: 1 }
  ], client);
  assert.deepEqual(report.data.map(row => [row.Nro, row.Item]), [[1, 1], [1, 2], [2, 1]]);
  assert.deepEqual(report.client, client);
});
