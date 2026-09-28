import { MonthlyQuarterlySalesResponse, MonthlyQuarterlySalesRow } from '../../types';
import { summarizeMonthlyQuarterlySales } from '../../utils/monthlyQuarterlySalesModel';

export type MonthlyQuarterlySalesParametersResult =
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

export function parseMonthlyQuarterlySalesParameters(desdeValue: unknown, hastaValue: unknown): MonthlyQuarterlySalesParametersResult {
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

export function normalizeMonthlyQuarterlySalesRow(record: Record<string, unknown>): MonthlyQuarterlySalesRow {
  return {
    Fecha: isoDate(field(record, 'Fecha')) || '',
    Tipo: cleanText(field(record, 'Tipo')),
    TipoDoc: cleanText(field(record, 'TipoDoc', 'Tipodoc')),
    Serie: cleanText(field(record, 'Serie')),
    NroDoc: cleanText(field(record, 'NroDoc', 'Nro_doc')),
    Codigo: cleanText(field(record, 'Codigo')),
    Producto: cleanText(field(record, 'Producto')),
    Cantidad: cleanNumber(field(record, 'Cantidad')),
    Precio: cleanNumber(field(record, 'Precio')),
    Total: cleanNumber(field(record, 'Total')),
    Lote: cleanText(field(record, 'Lote')),
    Vencimiento: isoDate(field(record, 'Vencimiento')),
    Vendedor: cleanText(field(record, 'Vendedor')),
    Zona: cleanText(field(record, 'Zona')),
    Laboratorio: cleanText(field(record, 'Laboratorio')),
    RucDni: cleanText(field(record, 'RucDni', 'Ruc_Dni')),
    Empresa: cleanText(field(record, 'Empresa')),
    Direccion: cleanText(field(record, 'Direccion')),
    Lugar: cleanText(field(record, 'Lugar')),
    Departamento: cleanText(field(record, 'Departamento')),
    Provincia: cleanText(field(record, 'Provincia')),
    Distrito: cleanText(field(record, 'Distrito'))
  };
}

export function buildMonthlyQuarterlySalesReport(
  records: Record<string, unknown>[], desde: string, hasta: string
): MonthlyQuarterlySalesResponse {
  const data = records.map(normalizeMonthlyQuarterlySalesRow).sort((left, right) =>
    left.Fecha.localeCompare(right.Fecha) ||
    left.TipoDoc.localeCompare(right.TipoDoc, 'es', { numeric: true }) ||
    left.Serie.localeCompare(right.Serie, 'es', { numeric: true }) ||
    left.NroDoc.localeCompare(right.NroDoc, 'es', { numeric: true }) ||
    left.Producto.localeCompare(right.Producto, 'es') ||
    left.Codigo.localeCompare(right.Codigo, 'es', { numeric: true })
  );
  return {
    data,
    total: data.length,
    totals: summarizeMonthlyQuarterlySales(data),
    period: { desde, hasta },
    generatedAt: new Date().toISOString()
  };
}
