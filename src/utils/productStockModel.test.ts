import assert from 'node:assert/strict';
import test from 'node:test';
import { ProductStockRow } from '../types';
import { filterProductStock, summarizeProductStock } from './productStockModel';

const rows: ProductStockRow[] = [
  { Codigo: 'A01', CodSunat: '111', Producto: 'Ácido ascórbico', PrincipioActivo: 'Vitamina C', stock: 0, PVF: 10, Lotes: 'L1', vencimiento: '2026-08-31' },
  { Codigo: 'A01', CodSunat: '111', Producto: 'Ácido ascórbico', PrincipioActivo: 'Vitamina C', stock: 5, PVF: 10, Lotes: 'L2', vencimiento: '2026-10-31' },
  { Codigo: 'B02', CodSunat: '222', Producto: 'Producto B', PrincipioActivo: '', stock: 3, PVF: null, Lotes: 'L3', vencimiento: null }
];
const today = '2026-09-22';

test('conserva todas las filas y calcula unidades sin sumar el PVF', () => {
  const all = filterProductStock(rows, { search: '', stock: 'all', expiry: 'all' }, today);
  assert.equal(all.length, 3);
  assert.deepEqual(summarizeProductStock(all, today), { products: 2, lots: 3, units: 8, expired: 1 });
});

test('combina búsqueda, stock positivo y vencimiento', () => {
  const selected = filterProductStock(rows, { search: 'acido', stock: 'positive', expiry: 'valid' }, today);
  assert.deepEqual(selected.map(row => row.Lotes), ['L2']);
  const expired = filterProductStock(rows, { search: '', stock: 'all', expiry: 'expired' }, today);
  assert.deepEqual(expired.map(row => row.Lotes), ['L1']);
  assert.equal(filterProductStock(rows, { search: '', stock: 'positive', expiry: 'expired' }, today).length, 0);
});
