import { PurchaseRegisterResponse, PurchaseRegisterRow } from '../../types';
import { summarizePurchaseRegister } from '../../utils/purchaseRegisterModel';

export type PurchaseRegisterParametersResult =
  | { value: { desde: string; hasta: string; fromDate: Date; toDate: Date }; error?: never }
  | { value?: never; error: string };

const parseIsoDate = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
};

export function parsePurchaseRegisterParameters(desdeValue: unknown, hastaValue: unknown): PurchaseRegisterParametersResult {
  const desde = typeof desdeValue === 'string' ? desdeValue : '';
  const hasta = typeof hastaValue === 'string' ? hastaValue : '';
  if (!desde || !hasta) return { error: 'Las fechas Del y Al son obligatorias y deben usar el formato YYYY-MM-DD.' };
  const fromDate = parseIsoDate(desde);
  const toDate = parseIsoDate(hasta);
  if (!fromDate || !toDate) return { error: 'El rango contiene una fecha inválida; use el formato YYYY-MM-DD.' };
  if (fromDate > toDate) return { error: 'La fecha Del no puede ser posterior a la fecha Al.' };
  return { value: { desde, hasta, fromDate, toDate } };
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
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
};
const nullableNumber = (value: unknown) => value == null || value === '' ? null : cleanNumber(value);
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

export function normalizePurchaseRegisterRow(record: Record<string, unknown>): PurchaseRegisterRow {
  return {
    Fecha: isoDate(field(record, 'Fecha')) || '',
    FechaV: isoDate(field(record, 'FechaV')) || '',
    TipoDoc: cleanText(field(record, 'TipoDoc')),
    Serie: cleanText(field(record, 'Serie')),
    Numero: cleanText(field(record, 'Numero')),
    Tipo: cleanText(field(record, 'Tipo')),
    NumeroProv: cleanText(field(record, 'NumeroProv')),
    Razon: cleanText(field(record, 'Razon')),
    ValorExp: cleanNumber(field(record, 'ValorExp')),
    BaseImponibleM: cleanNumber(field(record, 'BaseImponibleM')),
    IGVm: cleanNumber(field(record, 'IGVm')),
    BaseImponibleG: cleanNumber(field(record, 'BaseImponibleG')),
    IGVg: cleanNumber(field(record, 'IGVg')),
    BaseImponible3: cleanNumber(field(record, 'BaseImponible3')),
    Igv3: cleanNumber(field(record, 'Igv3')),
    Total: cleanNumber(field(record, 'Total')),
    NumEmitido: cleanText(field(record, 'NumEmitido')),
    NumDetraccion: cleanText(field(record, 'NumDetraccion')),
    FechaDetraccion: isoDate(field(record, 'FechaDetraccion')),
    TipoCambio: nullableNumber(field(record, 'TipoCambio', 'tipoCambio')),
    FecRefer: isoDate(field(record, 'FecRefer')),
    TipoRef: cleanText(field(record, 'TipoRef')),
    SerieRef: cleanText(field(record, 'SerieRef')),
    NroComprobante: cleanText(field(record, 'NroComprobante'))
  };
}

export function buildPurchaseRegisterReport(
  records: Record<string, unknown>[], desde: string, hasta: string
): PurchaseRegisterResponse {
  const data = records.map(normalizePurchaseRegisterRow).sort((left, right) =>
    left.Fecha.localeCompare(right.Fecha) ||
    left.TipoDoc.localeCompare(right.TipoDoc, 'es', { numeric: true }) ||
    left.Serie.localeCompare(right.Serie, 'es', { numeric: true }) ||
    left.Numero.localeCompare(right.Numero, 'es', { numeric: true })
  );
  return {
    data,
    total: data.length,
    totals: summarizePurchaseRegister(data),
    period: { desde, hasta },
    generatedAt: new Date().toISOString()
  };
}
