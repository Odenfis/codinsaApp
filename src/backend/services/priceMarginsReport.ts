import { PriceMarginsResponse, PriceMarginsRow, SalesProgressLaboratory } from '../../types';
import { summarizePriceMargins } from '../../utils/priceMarginsModel';

export type PriceMarginsParametersResult =
  | { value: { labora: string }; error?: never }
  | { value?: never; error: string };

export function parsePriceMarginsParameters(laboraValue: unknown): PriceMarginsParametersResult {
  const labora = typeof laboraValue === 'string' ? laboraValue.trim() : '';
  if (!/^\S{2}$/.test(labora)) return { error: 'Seleccione un laboratorio válido de dos caracteres.' };
  return { value: { labora } };
}

const cleanText = (value: unknown) => value == null ? '' : String(value).trim();
const cleanNumber = (value: unknown) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
};

export function normalizePriceMarginsRow(record: Record<string, unknown>): PriceMarginsRow {
  return {
    Codigo: cleanText(record.Codigo),
    Producto: cleanText(record.Producto),
    Stock: cleanNumber(record.Stock ?? record.stock),
    PVF: cleanNumber(record.PVF),
    CostoIgv: cleanNumber(record.CostoIgv),
    Mas10: cleanNumber(record.Mas10),
    Mas15: cleanNumber(record.Mas15),
    Mas20: cleanNumber(record.Mas20),
    Mas25: cleanNumber(record.Mas25)
  };
}

export function buildPriceMarginsReport(
  records: Record<string, unknown>[], laboratory: SalesProgressLaboratory
): PriceMarginsResponse {
  const data = records.map(normalizePriceMarginsRow).sort((left, right) =>
    left.Producto.localeCompare(right.Producto, 'es') ||
    left.Codigo.localeCompare(right.Codigo, 'es', { numeric: true })
  );
  return {
    data,
    total: data.length,
    totals: summarizePriceMargins(data),
    laboratory: { CodLab: laboratory.CodLab.trim(), Descripcion: laboratory.Descripcion.trim() },
    generatedAt: new Date().toISOString()
  };
}
