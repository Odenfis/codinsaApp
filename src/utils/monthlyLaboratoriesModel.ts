import type { MonthlyLaboratoriesCell, MonthlyLaboratoriesColumn, MonthlyLaboratoriesResponse, MonthlyLaboratoriesSection } from '../types';

export const monthlyLaboratoriesMonths = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'] as const;

const col = (key: string, label: string, kind: MonthlyLaboratoriesColumn['kind'] = 'text', width = 18): MonthlyLaboratoriesColumn => ({ key, label, kind, width });
const prefix = [col('Distribuidor', 'Distribuidor', 'text', 22), col('Mes', 'Mes', 'text', 18), col('Ruc', 'RUC / DNI', 'text', 17), col('Descripcion', 'Cliente', 'text', 38), col('codpro', 'Código producto', 'text', 20), col('Producto', 'Producto', 'text', 40), col('Cantidad', 'Cantidad', 'number', 14), col('Total', 'Total reportado', 'money', 18)];
const prices = [col('PVendido', 'P. vendido', 'money'), col('PVF', 'PVF', 'money'), col('Diferencia', 'Diferencia', 'money')];
const geo = [col('Departamento', 'Departamento', 'text', 22), col('Provincia', 'Provincia', 'text', 22), col('Distrito', 'Distrito', 'text', 24)];
const document = [col('fecha', 'Fecha', 'date', 16), col('NroDoc', 'Nro. documento', 'text', 22)];
const columns = (extended = false, iq = false, qualis = false) => [...prefix, ...(extended ? prices : []), ...geo, ...(iq ? [col('Ubigeo', 'Ubigeo', 'text', 12)] : []), ...document, ...(qualis ? [col('Vendedor', 'Vendedor', 'text', 25), col('Representante', 'Representante', 'text', 32)] : [col('Codven', 'Cód. vendedor', 'text', 15)])];

// Fixed registry shared by the report, its exports and the SQL reader.
export const monthlyLaboratoriesRegistry = [
  { id: 'csp', name: 'CSP', table: 'tc_CSP', columns: columns(true) },
  { id: 'distoloza', name: 'Distoloza', table: 'tc_Distoloza', columns: columns() },
  { id: 'faes', name: 'Faes Farma', table: 'tc_Faes', columns: columns(true) },
  { id: 'iqfarma', name: 'IQFarma', table: 'tc_IQFarma', columns: columns(true, true) },
  { id: 'itf', name: 'ITF', table: 'tc_ITF', columns: columns() },
  { id: 'lafage', name: 'Lafage', table: 'tc_Lafage', columns: columns() },
  { id: 'msn', name: 'MSN', table: 'tc_MSN', columns: columns(true) },
  { id: 'palma', name: 'Palmagyar', table: 'tc_Palma', columns: columns() },
  { id: 'qualis', name: 'Qualis', table: 'tc_Qualis', columns: columns(true, false, true) },
  { id: 'seven', name: 'Seven', table: 'tc_Seven', columns: columns(true) },
  { id: 'gabblan', name: 'Gabblan', table: 'tc_Gabblan', columns: columns() },
  { id: 'intifarma', name: 'IntiFarma', table: 'tc_IntiFarma', columns: columns() },
  { id: 'intiperu', name: 'IntiPeru', table: 'tc_IntiPeru', columns: columns() },
  { id: 'apropo', name: 'Apropo', table: 'tc_Apropo', columns: columns() },
  { id: 'ipca', name: 'Ipca', table: 'tc_Ipca', columns: columns() },
];

export const monthlyLaboratoriesPeriod = (report: MonthlyLaboratoriesResponse) =>
  `${monthlyLaboratoriesMonths[report.period.mes - 1]} ${report.period.anio}`;

export const summarizeMonthlyLaboratory = (rows: Record<string, MonthlyLaboratoriesCell>[]) => ({
  registros: rows.length,
  cantidad: Math.round(rows.reduce((sum, row) => sum + Number(row.Cantidad ?? 0), 0) * 1e6) / 1e6,
  importe: Math.round(rows.reduce((sum, row) => sum + Number(row.Total ?? 0), 0) * 100) / 100,
});
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-PE');
export function filterMonthlyLaboratory(section: MonthlyLaboratoriesSection, search: string) {
  const term = normalize(search.trim());
  return term ? section.data.filter(row => section.columns.some(column => normalize(String(row[column.key] ?? '')).includes(term))) : section.data;
}
export const monthlyLaboratoryCellText = (value: MonthlyLaboratoriesCell, column: MonthlyLaboratoriesColumn) => {
  if (value == null) return '—';
  if (column.kind === 'date') return String(value).split('-').reverse().join('/');
  if (column.kind === 'money') return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(value));
  if (column.kind === 'number') return new Intl.NumberFormat('es-PE', { maximumFractionDigits: 6 }).format(Number(value));
  return String(value);
};
