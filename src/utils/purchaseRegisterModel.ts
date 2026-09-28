import { PurchaseRegisterRow, PurchaseRegisterTotals } from '../types';

export const purchaseRegisterMoneyFields = [
  'ValorExp', 'BaseImponibleM', 'IGVm', 'BaseImponibleG', 'IGVg',
  'BaseImponible3', 'Igv3', 'Total'
] as const;

const searchable = (value: string) => value
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-PE');

export function filterPurchaseRegister(rows: PurchaseRegisterRow[], search: string) {
  const term = searchable(search.trim());
  if (!term) return rows;
  return rows.filter(row => searchable([
    row.TipoDoc, row.Serie, row.Numero, row.Tipo, row.NumeroProv, row.Razon,
    row.NumEmitido, row.NumDetraccion, row.TipoRef, row.SerieRef, row.NroComprobante
  ].join(' ')).includes(term));
}

export function summarizePurchaseRegister(rows: PurchaseRegisterRow[]): PurchaseRegisterTotals {
  return Object.fromEntries(purchaseRegisterMoneyFields.map(field => [
    field, rows.reduce((sum, row) => sum + row[field], 0)
  ])) as PurchaseRegisterTotals;
}
