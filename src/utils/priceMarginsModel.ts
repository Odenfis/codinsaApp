import { PriceMarginsRow, PriceMarginsTotals } from '../types';

const searchable = (value: string) => value
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-PE');

export function filterPriceMargins(rows: PriceMarginsRow[], search: string) {
  const term = searchable(search.trim());
  if (!term) return rows;
  return rows.filter(row => searchable(`${row.Codigo} ${row.Producto}`).includes(term));
}

export function summarizePriceMargins(rows: PriceMarginsRow[]): PriceMarginsTotals {
  return {
    products: rows.length,
    stock: rows.reduce((sum, row) => sum + row.Stock, 0)
  };
}
