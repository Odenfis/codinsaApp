import { SalesProgressRow, SalesProgressTotals } from '../types';

const searchable = (value: string) => value
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-PE');

export function filterSalesProgress(rows: SalesProgressRow[], search: string) {
  const term = searchable(search.trim());
  if (!term) return rows;
  return rows.filter(row => [
    row.Ruc, row.Cliente, row.codpro, row.CodAnte, row.Producto,
    row.Tipo_doc, row.Serie, row.nro_doc, row.Vendedor,
    row.Departamento, row.Provincia, row.Distrito, row.Ubigeo
  ].some(value => searchable(value).includes(term)));
}

export function summarizeSalesProgress(rows: SalesProgressRow[]): SalesProgressTotals {
  const clients = new Set(rows.map(row => row.Ruc || row.Cliente).filter(Boolean));
  const documents = new Set(rows.map(row => `${row.Tipo_doc}|${row.Serie}|${row.nro_doc}`));
  return {
    lines: rows.length,
    clients: clients.size,
    documents: documents.size,
    units: rows.reduce((sum, row) => sum + row.Cantidad, 0),
    sales: rows.reduce((sum, row) => sum + row.Total, 0)
  };
}
