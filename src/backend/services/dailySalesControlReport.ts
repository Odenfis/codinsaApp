import { DailySalesControlResponse, DailySalesControlRow } from '../../types';
import { summarizeDailySalesControl } from '../../utils/dailySalesControlModel';

const field = (record: Record<string, unknown>, ...names: string[]) => {
  const entries = Object.entries(record);
  for (const name of names) {
    const found = entries.find(([key]) => key.toLocaleLowerCase('es-PE') === name.toLocaleLowerCase('es-PE'));
    if (found) return found[1];
  }
  return undefined;
};
const cleanText = (value: unknown) => value == null ? '' : String(value).trim();
const cleanNumber = (value: unknown) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
};
const normalizeReportDate = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  const text = cleanText(value);
  return /^(\d{4}-\d{2}-\d{2})/.exec(text)?.[1] || '';
};

export function normalizeDailySalesControlRow(record: Record<string, unknown>): DailySalesControlRow {
  return {
    Nro: cleanText(field(record, 'Nro')),
    NomComercial: cleanText(field(record, 'NomComercial')),
    Distrito: cleanText(field(record, 'Distrito')),
    RucDni: cleanText(field(record, 'RucDni', 'Ruc_Dni')),
    NP: cleanText(field(record, 'NP')),
    Vendedor: cleanText(field(record, 'Vendedor')),
    Representante: cleanText(field(record, 'Representante')),
    Condicion: cleanText(field(record, 'Condicion')),
    Factura: cleanText(field(record, 'Factura')),
    Monto: cleanNumber(field(record, 'Monto')),
    MasIgv: cleanNumber(field(record, 'MasIgv')),
    Observacion: cleanText(field(record, 'Observacion'))
  };
}

export function buildDailySalesControlReport(
  records: Record<string, unknown>[], reportDateValue: unknown
): DailySalesControlResponse {
  const data = records.map(normalizeDailySalesControlRow).sort((left, right) =>
    left.Vendedor.localeCompare(right.Vendedor, 'es', { numeric: true }) ||
    left.Representante.localeCompare(right.Representante, 'es') ||
    left.NomComercial.localeCompare(right.NomComercial, 'es') ||
    left.Factura.localeCompare(right.Factura, 'es', { numeric: true })
  );
  return {
    data,
    total: data.length,
    totals: summarizeDailySalesControl(data),
    reportDate: normalizeReportDate(reportDateValue),
    generatedAt: new Date().toISOString()
  };
}
