import {
  CustomerHistoryClient, CustomerHistoryResponse, CustomerHistoryRow, CustomerHistoryTotals
} from '../../types';

export type CustomerHistoryCustomerIdResult =
  | { value: number; error?: never }
  | { value?: never; error: string };

export function parseCustomerHistoryCustomerId(value: unknown): CustomerHistoryCustomerIdResult {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { error: 'Seleccione un cliente válido.' };
  }
  return { value: parsed };
}

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
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isoDate = (value: unknown): string | null => {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
  }
  const text = cleanText(value);
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return /^(\d{4}-\d{2}-\d{2})/.exec(text)?.[1] || null;
};

export function normalizeCustomerHistoryRow(record: Record<string, unknown>): CustomerHistoryRow {
  return {
    Nro: cleanNumber(field(record, 'Nro')),
    Item: cleanNumber(field(record, 'Item')),
    Vendedor: cleanNumber(field(record, 'Vendedor')),
    Documento: cleanText(field(record, 'Documento')),
    Numero: cleanText(field(record, 'Numero')),
    Fecha: isoDate(field(record, 'Fecha')),
    Importe: cleanNumber(field(record, 'Importe')),
    Amortizado: cleanNumber(field(record, 'Amortizado')),
    FechaV: isoDate(field(record, 'FechaV')),
    Saldo: cleanNumber(field(record, 'Saldo')),
    Situacion: cleanText(field(record, 'Situacion'))
  };
}

export function summarizeCustomerHistory(rows: CustomerHistoryRow[]): CustomerHistoryTotals {
  const documents = rows.filter(row => row.Item === 1);
  return {
    documents: documents.length,
    importe: documents.reduce((sum, row) => sum + row.Importe, 0),
    amortizado: documents.reduce((sum, row) => sum + row.Amortizado, 0),
    saldo: documents.reduce((sum, row) => sum + row.Saldo, 0)
  };
}

export function buildCustomerHistoryReport(
  records: Record<string, unknown>[], client: CustomerHistoryClient
): CustomerHistoryResponse {
  const data = records.map(normalizeCustomerHistoryRow).sort((left, right) =>
    left.Nro - right.Nro || left.Item - right.Item
  );
  return {
    client,
    data,
    totals: summarizeCustomerHistory(data),
    generatedAt: new Date().toISOString()
  };
}
