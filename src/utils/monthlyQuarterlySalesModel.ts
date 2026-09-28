import { MonthlyQuarterlySalesRow, MonthlyQuarterlySalesTotals } from '../types';

export type SalesPeriodShortcut = 'current-month' | 'previous-month' | 'current-quarter';

const searchable = (value: string) => value
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-PE');

const localIsoDate = (date: Date) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
};

export function getSalesPeriodShortcut(shortcut: SalesPeriodShortcut, today = new Date()) {
  if (shortcut === 'previous-month') {
    return {
      desde: localIsoDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      hasta: localIsoDate(new Date(today.getFullYear(), today.getMonth(), 0))
    };
  }
  if (shortcut === 'current-quarter') {
    const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
    return { desde: localIsoDate(new Date(today.getFullYear(), quarterStartMonth, 1)), hasta: localIsoDate(today) };
  }
  return { desde: localIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)), hasta: localIsoDate(today) };
}

export function filterMonthlyQuarterlySales(rows: MonthlyQuarterlySalesRow[], search: string) {
  const term = searchable(search.trim());
  if (!term) return rows;
  return rows.filter(row => searchable([
    row.TipoDoc, row.Serie, row.NroDoc, row.Codigo, row.Producto, row.Lote,
    row.Vendedor, row.Zona, row.Laboratorio, row.RucDni, row.Empresa,
    row.Direccion, row.Lugar, row.Departamento, row.Provincia, row.Distrito
  ].join(' ')).includes(term));
}

const uniqueCount = (values: string[]) => new Set(values.filter(Boolean)).size;

export function summarizeMonthlyQuarterlySales(rows: MonthlyQuarterlySalesRow[]): MonthlyQuarterlySalesTotals {
  return {
    lines: rows.length,
    documents: uniqueCount(rows.map(row => `${row.TipoDoc}|${row.Serie}|${row.NroDoc}`)),
    clients: uniqueCount(rows.map(row => row.RucDni || row.Empresa)),
    products: uniqueCount(rows.map(row => row.Codigo)),
    units: rows.reduce((sum, row) => sum + row.Cantidad, 0),
    sales: rows.reduce((sum, row) => sum + row.Total, 0)
  };
}
