import { SalesRegisterRow, SalesRegisterTotals } from '../types';

export const salesRegisterMoneyFields = [
  'ValorExp', 'Gravado', 'Exonerado', 'Inafecta', 'ISC', 'IGV', 'Otros', 'Total'
] as const;

const searchable = (value: string) => value
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-PE');

export function filterSalesRegister(rows: SalesRegisterRow[], search: string) {
  const term = searchable(search.trim());
  if (!term) return rows;
  return rows.filter(row => searchable([
    row.TipoDoc, row.Serie, row.Numero, row.Tipo, row.NumeroClie, row.Razon,
    row.TipoF, row.SerieF, row.NumDocF, row.Glosa
  ].join(' ')).includes(term));
}

export function summarizeSalesRegister(rows: SalesRegisterRow[]): SalesRegisterTotals {
  return Object.fromEntries(salesRegisterMoneyFields.map(field => [
    field, rows.reduce((sum, row) => sum + row[field], 0)
  ])) as SalesRegisterTotals;
}
