import { SalesRegisterResponse, SalesRegisterRow } from '../../types';
import { summarizeSalesRegister } from '../../utils/salesRegisterModel';

export type SalesRegisterParametersResult =
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

export function parseSalesRegisterParameters(desdeValue: unknown, hastaValue: unknown): SalesRegisterParametersResult {
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
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  const text = cleanText(value);
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return /^(\d{4}-\d{2}-\d{2})/.exec(text)?.[1] || null;
};

export function normalizeSalesRegisterRow(record: Record<string, unknown>): SalesRegisterRow {
  return {
    Fecha: isoDate(field(record, 'Fecha')) || '',
    FechaV: isoDate(field(record, 'FechaV', 'fechav')) || '',
    TipoDoc: cleanText(field(record, 'TipoDoc')),
    Serie: cleanText(field(record, 'Serie')),
    Numero: cleanText(field(record, 'Numero')),
    Tipo: cleanText(field(record, 'Tipo')),
    NumeroClie: cleanText(field(record, 'NumeroClie')),
    Razon: cleanText(field(record, 'Razon')),
    ValorExp: cleanNumber(field(record, 'ValorExp')),
    Gravado: cleanNumber(field(record, 'Gravado')),
    Exonerado: cleanNumber(field(record, 'Exonerado')),
    Inafecta: cleanNumber(field(record, 'Inafecta')),
    ISC: cleanNumber(field(record, 'ISC')),
    IGV: cleanNumber(field(record, 'IGV')),
    Otros: cleanNumber(field(record, 'Otros')),
    Total: cleanNumber(field(record, 'Total')),
    TipoCambio: nullableNumber(field(record, 'TipoCambio', 'TipoCAmbio')),
    Feca: isoDate(field(record, 'Feca')),
    TipoF: cleanText(field(record, 'TipoF')),
    SerieF: cleanText(field(record, 'SerieF')),
    NumDocF: cleanText(field(record, 'NumDocF')),
    Cta12D: cleanText(field(record, 'Cta12D')),
    Cta12H: cleanText(field(record, 'Cta12H')),
    Cta70: cleanText(field(record, 'Cta70')),
    Cuenta10: cleanText(field(record, 'Cuenta10', 'cuenta10')),
    FecPago: isoDate(field(record, 'FecPago')),
    Sindato: cleanText(field(record, 'Sindato', 'SinDato')),
    Glosa: cleanText(field(record, 'Glosa'))
  };
}

export function buildSalesRegisterReport(
  records: Record<string, unknown>[], desde: string, hasta: string
): SalesRegisterResponse {
  const data = records.map(normalizeSalesRegisterRow).sort((left, right) =>
    left.Fecha.localeCompare(right.Fecha) ||
    left.TipoDoc.localeCompare(right.TipoDoc, 'es', { numeric: true }) ||
    left.Serie.localeCompare(right.Serie, 'es', { numeric: true }) ||
    left.Numero.localeCompare(right.Numero, 'es', { numeric: true })
  );
  return {
    data,
    total: data.length,
    totals: summarizeSalesRegister(data),
    period: { desde, hasta },
    generatedAt: new Date().toISOString()
  };
}
