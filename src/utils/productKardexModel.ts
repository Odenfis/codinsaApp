import { KardexProductoRow, KardexProductoTotals, KardexProductoResponse } from '../types';

export const kardexTitle = 'LIBRO DE INVENTARIO PERMANENTE VALORIZADO';
export const kardexCompany = 'COMPAÑÍA DISTRIBUIDORA AMERICANA S.A.C.';
export const kardexRuc = '20439505924';
export const kardexAddress = 'LAS CASUARINAS 532 STA EDELMIRA - VÍCTOR LARCO';
export const kardexColumns = [
  { key: 'codpro', label: 'Código' }, { key: 'Producto', label: 'Producto' },
  { key: 'Unimed', label: 'Unidad de medida' },
  { key: 'Saldoini', label: 'Saldo inicial', numeric: true },
  { key: 'Ingresos', label: 'Ingresos', numeric: true },
  { key: 'salidas', label: 'Salidas', numeric: true },
  { key: 'saldoFin', label: 'Saldo final', numeric: true },
  { key: 'Valor', label: 'Valor', numeric: true, money: true }
] as const;
export const kardexTotalFields = ['Saldoini', 'Ingresos', 'salidas', 'saldoFin', 'Valor'] as const;
export function sumKardex(rows: KardexProductoRow[]): KardexProductoTotals {
  return Object.fromEntries(kardexTotalFields.map(key => [key, rows.reduce((sum, row) => sum + row[key], 0)])) as unknown as KardexProductoTotals;
}
export interface KardexGroup { code: string; name: string; rows: KardexProductoRow[]; totals: KardexProductoTotals }
export function groupKardex(rows: KardexProductoRow[]): KardexGroup[] {
  const groups = new Map<string, KardexGroup>();
  for (const row of rows) {
    const code = row.LaboratorioCodigo?.trim() || '';
    if (!groups.has(code)) groups.set(code, { code, name: row.Laboratorio?.trim() || 'Sin laboratorio', rows: [], totals: sumKardex([]) });
    groups.get(code)!.rows.push(row);
  }
  return [...groups.values()].map(group => ({ ...group,
    rows: [...group.rows].sort((a,b) => a.Producto.localeCompare(b.Producto, 'es') || a.codpro.localeCompare(b.codpro, 'es')),
    totals: sumKardex(group.rows)
  })).sort((a,b) => a.name.localeCompare(b.name, 'es') || a.code.localeCompare(b.code));
}
export type KardexLine = { kind: 'laboratory'; name: string; continued: boolean } |
  { kind: 'product'; row: KardexProductoRow } | { kind: 'subtotal' | 'total'; totals: KardexProductoTotals };
export function kardexPage(groups: KardexGroup[], page: number, size = 20): KardexLine[] {
  const start = (page - 1) * size, end = start + size;
  const lines: KardexLine[] = [];
  let offset = 0;
  for (const group of groups) {
    const groupEnd = offset + group.rows.length;
    const rows = group.rows.slice(Math.max(0, start-offset), Math.max(0, end-offset));
    if (rows.length) {
      lines.push({ kind: 'laboratory', name: group.name, continued: start > offset });
      rows.forEach(row => lines.push({ kind: 'product', row }));
      if (groupEnd <= end) lines.push({ kind: 'subtotal', totals: group.totals });
    }
    offset = groupEnd;
  }
  if (offset && end >= offset) lines.push({ kind: 'total', totals: sumKardex(groups.flatMap(g => g.rows)) });
  return lines;
}
export function kardexPeriod(report: KardexProductoResponse) {
  const date = (s: string) => s.slice(0,10).split('-').reverse().join('/');
  return `Del ${date(report.period.desde)} al ${date(report.period.hasta)}`;
}
