import { DailySalesControlRow, DailySalesControlTotals } from '../types';

const searchable = (value: string) => value
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-PE');

export function filterDailySalesControl(rows: DailySalesControlRow[], search: string) {
  const term = searchable(search.trim());
  if (!term) return rows;
  return rows.filter(row => searchable([
    row.Nro, row.NomComercial, row.Distrito, row.RucDni, row.NP, row.Vendedor,
    row.Representante, row.Condicion, row.Factura, row.Observacion
  ].join(' ')).includes(term));
}

const uniqueCount = (values: string[]) => new Set(values.filter(Boolean)).size;

export function summarizeDailySalesControl(rows: DailySalesControlRow[]): DailySalesControlTotals {
  return {
    invoices: uniqueCount(rows.map(row => row.Factura)),
    clients: uniqueCount(rows.map(row => row.Nro || row.RucDni)),
    orders: uniqueCount(rows.map(row => row.NP)),
    salespeople: uniqueCount(rows.map(row => row.Vendedor)),
    subtotal: rows.reduce((sum, row) => sum + row.Monto, 0),
    totalWithTax: rows.reduce((sum, row) => sum + row.MasIgv, 0)
  };
}
