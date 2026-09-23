import { ProductStockRow } from '../types';

export type StockFilter = 'all' | 'positive';
export type ExpiryFilter = 'all' | 'valid' | 'expired';

export interface ProductStockFilters {
  search: string;
  stock: StockFilter;
  expiry: ExpiryFilter;
}

const searchable = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-PE');

export function filterProductStock(
  rows: ProductStockRow[], filters: ProductStockFilters, today: string
): ProductStockRow[] {
  const search = searchable(filters.search.trim());
  return rows.filter(row => {
    if (filters.stock === 'positive' && row.stock <= 0) return false;
    if (filters.expiry === 'valid' && (!row.vencimiento || row.vencimiento < today)) return false;
    if (filters.expiry === 'expired' && (!row.vencimiento || row.vencimiento >= today)) return false;
    if (!search) return true;
    return [row.Codigo, row.CodSunat, row.Producto, row.PrincipioActivo, row.Lotes]
      .some(value => searchable(value).includes(search));
  });
}

export function summarizeProductStock(rows: ProductStockRow[], today: string) {
  return {
    products: new Set(rows.map(row => row.Codigo)).size,
    lots: rows.length,
    units: rows.reduce((sum, row) => sum + row.stock, 0),
    expired: rows.filter(row => row.vencimiento != null && row.vencimiento < today).length
  };
}
