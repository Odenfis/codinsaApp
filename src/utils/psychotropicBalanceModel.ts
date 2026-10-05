import { PsychotropicBalanceRow, PsychotropicBalanceTotals } from '../types';

export const balanceQuantityKeys = ['SaldoAnterior', 'Ingresos', 'Egresos', 'SaldoActual'] as const;
export const balanceFormKeys = ['TAB', 'GOT', 'sinFF'] as const;
const searchable = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-PE');

export function balanceRowStatus(row: PsychotropicBalanceRow): 'correct' | 'discrepant' | 'incomplete' {
  if (balanceQuantityKeys.some(key => row[key] == null)) return 'incomplete';
  return row.SaldoAnterior! + row.Ingresos! - row.Egresos! === row.SaldoActual! ? 'correct' : 'discrepant';
}

export function filterPsychotropicBalance(rows: PsychotropicBalanceRow[], search: string) {
  const term = searchable(search.trim());
  return !term ? rows : rows.filter(row => searchable(Object.values(row).map(value => value ?? '').join(' ')).includes(term));
}

export function summarizePsychotropicBalance(rows: PsychotropicBalanceRow[]): PsychotropicBalanceTotals {
  const totals: PsychotropicBalanceTotals = {
    registros: rows.length,
    productos: new Set(rows.map(row => row.Codpro).filter(Boolean)).size,
    lotes: new Set(rows.filter(row => row.Codpro).map(row => JSON.stringify([row.Codpro, row.Lote]))).size,
    discrepantes: 0,
    incompletos: 0,
    porFF: {
      TAB: { SaldoAnterior: 0, Ingresos: 0, Egresos: 0, SaldoActual: 0 },
      GOT: { SaldoAnterior: 0, Ingresos: 0, Egresos: 0, SaldoActual: 0 },
      sinFF: { SaldoAnterior: 0, Ingresos: 0, Egresos: 0, SaldoActual: 0 }
    }
  };
  for (const row of rows) {
    const status = balanceRowStatus(row);
    if (status === 'discrepant') totals.discrepantes++;
    if (status === 'incomplete') totals.incompletos++;
    const form = row.FF === 'TAB' || row.FF === 'GOT' ? row.FF : 'sinFF';
    for (const key of balanceQuantityKeys) totals.porFF[form][key] += row[key] ?? 0;
  }
  return totals;
}

export const balanceWarningText = (totals: PsychotropicBalanceTotals) =>
  `${totals.discrepantes} filas no cumplen Saldo anterior + Ingresos − Egresos = Saldo actual; ${totals.incompletos} filas tienen cantidades incompletas. Se conservan los valores originales del procedimiento. Los resúmenes suman solo cantidades disponibles.`;

export const balancePeriodExplanation = 'Saldo anterior: al inicio de DEL. Saldo actual: al cierre de AL. Ingresos y egresos incluyen ambos días. El histórico se reconstruye desde el saldo actual del inventario.';
