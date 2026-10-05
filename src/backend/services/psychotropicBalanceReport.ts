import { PsychotropicBalanceResponse, PsychotropicBalanceRow } from '../../types';
import { summarizePsychotropicBalance } from '../../utils/psychotropicBalanceModel';

export function parsePsychotropicBalanceParameters(desdeValue: unknown, hastaValue: unknown):
  | { value: { desde: string; hasta: string; fromDate: Date; toDate: Date }; error?: never }
  | { value?: never; error: string } {
  const parse = (value: unknown) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
  };
  const fromDate = parse(desdeValue);
  const toDate = parse(hastaValue);
  if (!fromDate || !toDate) return { error: 'Las fechas Del y Al son obligatorias y deben ser fechas reales en formato YYYY-MM-DD.' };
  const desde = desdeValue as string;
  const hasta = hastaValue as string;
  if (desde < '1900-01-01' || hasta > '2079-06-05') return { error: 'Las fechas deben estar entre 1900-01-01 y 2079-06-05; el procedimiento necesita calcular el día siguiente.' };
  if (desde > hasta) return { error: 'La fecha Del no puede ser posterior a la fecha Al.' };
  return { value: { desde, hasta, fromDate, toDate } };
}

export function validatePsychotropicBalanceOperationalDate(hasta: string, operationalDate: string): string | null {
  return hasta > operationalDate ? `La fecha Al no puede superar la fecha actual de SQL Server (${operationalDate}).` : null;
}

const text = (value: unknown) => value == null ? '' : String(value).trim();
const quantity = (value: unknown): number | null => {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
};
const isoDate = (value: unknown): string | null => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  if (value == null || value === '') return null;
  const source = text(value);
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(source);
  return dmy ? `${dmy[3]}-${dmy[2]}-${dmy[1]}` : /^(\d{4}-\d{2}-\d{2})/.exec(source)?.[1] || null;
};

export function normalizePsychotropicBalanceRow(record: Record<string, unknown>): PsychotropicBalanceRow {
  const fields = Object.fromEntries(Object.entries(record).map(([key, value]) => [key.toLowerCase(), value]));
  return {
    Codpro: text(fields.codpro), Principio: text(fields.principio), Concentracion: text(fields.concentracion),
    Descripcion: text(fields.descripcion), FF: text(fields.ff) || null, Laboratorio: text(fields.laboratorio),
    Lote: text(fields.lote), Vence: isoDate(fields.vence),
    SaldoAnterior: quantity(fields.saldoanterior), Ingresos: quantity(fields.ingresos),
    Egresos: quantity(fields.egresos), SaldoActual: quantity(fields.saldoactual)
  };
}

export function buildPsychotropicBalanceReport(records: Record<string, unknown>[], desde: string, hasta: string, operationalDate: string): PsychotropicBalanceResponse {
  const data = records.map(normalizePsychotropicBalanceRow).sort((left, right) =>
    left.Descripcion.localeCompare(right.Descripcion, 'es') ||
    left.Codpro.localeCompare(right.Codpro, 'es', { numeric: true }) ||
    left.Lote.localeCompare(right.Lote, 'es', { numeric: true })
  );
  return { data, total: data.length, totals: summarizePsychotropicBalance(data), period: { desde, hasta }, operationalDate, generatedAt: new Date().toISOString() };
}

// Caller owns the SERIALIZABLE transaction and validates SQL Server's date before this batch.
export const psychotropicBalanceQuery = `
  SET NOCOUNT ON;
  DECLARE @lockResult int;
  EXEC @lockResult = sys.sp_getapplock
    @Resource = 'CODINSA_BALANCE_PSICOTROPICO', @LockMode = 'Exclusive',
    @LockOwner = 'Transaction', @LockTimeout = 30000;
  IF @lockResult < 0
    THROW 51010, 'No se pudo reservar la generación de Balance Psicotrópico. Inténtelo nuevamente.', 1;
  SET DATEFORMAT dmy;
  EXEC dbo.sp_KardexPsicotropico @fechaIni = @fechaIni, @fechaFin = @fechaFin;
  SELECT Codpro, Principio, Concentracion, Descripcion, FF, Laboratorio, Lote, Vence,
    SaldoAnterior, Ingresos, Egresos, SaldoActual
  FROM dbo.LibBalPsicotropico;
`;
