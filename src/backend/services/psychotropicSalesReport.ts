import { PsychotropicSalesResponse, PsychotropicSalesRow } from '../../types';
import { summarizePsychotropicSales } from '../../utils/psychotropicSalesModel';

export type PsychotropicSalesParametersResult =
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

export function parsePsychotropicSalesParameters(desdeValue: unknown, hastaValue: unknown): PsychotropicSalesParametersResult {
  const desde = typeof desdeValue === 'string' ? desdeValue : '';
  const hasta = typeof hastaValue === 'string' ? hastaValue : '';
  if (!desde || !hasta) return { error: 'Las fechas Del y Al son obligatorias y deben usar el formato YYYY-MM-DD.' };
  const fromDate = parseIsoDate(desde);
  const toDate = parseIsoDate(hasta);
  if (!fromDate || !toDate) return { error: 'El rango contiene una fecha inválida; use el formato YYYY-MM-DD.' };
  if (desde < '1900-01-01' || hasta > '2079-06-06') return { error: 'Las fechas deben estar entre 1900-01-01 y 2079-06-06 (SmallDateTime).' };
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
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
  }
  const text = cleanText(value);
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return /^(\d{4}-\d{2}-\d{2})/.exec(text)?.[1] || null;
};

export function normalizePsychotropicSalesRow(record: Record<string, unknown>): PsychotropicSalesRow {
  return {
    Principio: cleanText(field(record, 'Principio', 'Principo')),
    Concentracion: cleanText(field(record, 'Concentracion')),
    Descripcion: cleanText(field(record, 'Descripcion')),
    RegistroSanitario: cleanText(field(record, 'RegistroSanitario', 'Registro', 'regSanit')),
    FF: cleanText(field(record, 'FF')) || null,
    Cantidad: cleanNumber(field(record, 'Cantidad')),
    Ruc: cleanText(field(record, 'Ruc')),
    Establecimiento: cleanText(field(record, 'Establecimiento')),
    Distrito: cleanText(field(record, 'Distrito')),
    Direccion: cleanText(field(record, 'Direccion')),
    Lote: cleanText(field(record, 'Lote')),
    Fecha: isoDate(field(record, 'Fecha')),
    NumFactura: cleanText(field(record, 'NumFactura', 'Documento')),
  };
}

export function buildPsychotropicSalesReport(
  records: Record<string, unknown>[], desde: string, hasta: string
): PsychotropicSalesResponse {
  const data = records.map(normalizePsychotropicSalesRow).sort((left, right) =>
    (left.Fecha || '').localeCompare(right.Fecha || '') ||
    left.NumFactura.localeCompare(right.NumFactura, 'es', { numeric: true }) ||
    left.Descripcion.localeCompare(right.Descripcion, 'es') ||
    left.Lote.localeCompare(right.Lote, 'es', { numeric: true })
  );
  return {
    data,
    total: data.length,
    totals: summarizePsychotropicSales(data),
    period: { desde, hasta },
    generatedAt: new Date().toISOString()
  };
}

// Execute and read under the same SERIALIZABLE transaction; callers own commit/rollback.
export const psychotropicSalesQuery = `
  DECLARE @lockResult INT;
  EXEC @lockResult = sys.sp_getapplock
    @Resource = 'CODINSA_VENTAS_PSICOTROPICOS',
    @LockMode = 'Exclusive',
    @LockOwner = 'Transaction',
    @LockTimeout = 30000;
  IF @lockResult < 0
    THROW 51005, 'No se pudo reservar la generación del Ventas Psicotrópicos. Inténtelo nuevamente.', 1;

  SET NOCOUNT ON;
  SET DATEFORMAT dmy;
  EXEC [dbo].[sp_Ventas_psicotropicos] @fec1 = @fec1, @fec2 = @fec2;

  SELECT Principo AS Principio, Concentracion, Descripcion, Registro AS RegistroSanitario,
    FF, Cantidad, Ruc, Establecimiento, Distrito, Direccion, Lote, Fecha,
    Documento AS NumFactura
  FROM [dbo].[t_psicotropico];
`;
