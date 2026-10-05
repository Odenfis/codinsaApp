import { PsychotropicPurchasesResponse, PsychotropicPurchasesRow } from '../../types';
import { summarizePsychotropicPurchases } from '../../utils/psychotropicPurchasesModel';

export type PsychotropicPurchasesParametersResult =
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

export function parsePsychotropicPurchasesParameters(desdeValue: unknown, hastaValue: unknown): PsychotropicPurchasesParametersResult {
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

export function normalizePsychotropicPurchasesRow(record: Record<string, unknown>): PsychotropicPurchasesRow {
  return {
    Principio: cleanText(field(record, 'Principio')),
    Concentracion: cleanText(field(record, 'Concentracion')),
    Descripcion: cleanText(field(record, 'Descripcion')),
    FF: cleanText(field(record, 'FF')) || null,
    NroFactura: cleanText(field(record, 'NroFactura')),
    Proveedor: cleanText(field(record, 'Proveedor')),
    Fecha: isoDate(field(record, 'Fecha')),
    Cantidad: cleanNumber(field(record, 'Cantidad')),
    Lote: cleanText(field(record, 'Lote')),
  };
}

export function buildPsychotropicPurchasesReport(
  records: Record<string, unknown>[], desde: string, hasta: string
): PsychotropicPurchasesResponse {
  const data = records.map(normalizePsychotropicPurchasesRow).sort((left, right) =>
    (left.Fecha || '').localeCompare(right.Fecha || '') ||
    left.NroFactura.localeCompare(right.NroFactura, 'es', { numeric: true }) ||
    left.Descripcion.localeCompare(right.Descripcion, 'es') ||
    left.Lote.localeCompare(right.Lote, 'es', { numeric: true })
  );
  return {
    data,
    total: data.length,
    totals: summarizePsychotropicPurchases(data),
    period: { desde, hasta },
    generatedAt: new Date().toISOString()
  };
}

// Execute and read under the same SERIALIZABLE transaction; callers own commit/rollback.
export const psychotropicPurchasesQuery = `
  DECLARE @lockResult INT;
  EXEC @lockResult = sys.sp_getapplock
    @Resource = 'CODINSA_COMPRAS_PSICOTROPICOS',
    @LockMode = 'Exclusive',
    @LockOwner = 'Transaction',
    @LockTimeout = 30000;
  IF @lockResult < 0
    THROW 51007, 'No se pudo reservar la generación de Compras Psicotrópicos. Inténtelo nuevamente.', 1;

  SET NOCOUNT ON;
  SET DATEFORMAT dmy;
  EXEC [dbo].[sp_Compras_psicotropicos] @fec1 = @fec1, @fec2 = @fec2;

  SELECT Principio, Concentracion, Descripcion, FF, NroFactura, Proveedor,
    fecha AS Fecha, Cantidad, lote AS Lote
  FROM [dbo].[t_psicotropico1];
`;
