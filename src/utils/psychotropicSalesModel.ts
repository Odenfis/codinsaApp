import { PsychotropicSalesRow, PsychotropicSalesTotals } from '../types';
const searchable = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-PE');
export function filterPsychotropicSales(rows: PsychotropicSalesRow[], search: string) {
  const term = searchable(search.trim());
  return !term ? rows : rows.filter(row => searchable(Object.entries(row)
    .filter(([key]) => key !== 'Cantidad').map(([, value]) => value ?? '').join(' ')).includes(term));
}
export function summarizePsychotropicSales(rows: PsychotropicSalesRow[]): PsychotropicSalesTotals {
  return {
    registros: rows.length,
    establecimientos: new Set(rows.map(row => row.Ruc).filter(Boolean)).size,
    tab: rows.filter(row => row.FF === 'TAB').reduce((sum, row) => sum + row.Cantidad, 0),
    got: rows.filter(row => row.FF === 'GOT').reduce((sum, row) => sum + row.Cantidad, 0),
    sinFF: rows.filter(row => !row.FF).reduce((sum, row) => sum + row.Cantidad, 0)
  };
}
