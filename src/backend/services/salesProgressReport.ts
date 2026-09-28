import { SalesProgressLaboratory, SalesProgressResponse, SalesProgressRow } from '../../types';
import { summarizeSalesProgress } from '../../utils/salesProgressModel';

export type SalesProgressParametersResult =
  | { value: { labora: string; mes: number; anio: number }; error?: never }
  | { value?: never; error: string };

export function parseSalesProgressParameters(laboraValue: unknown, mesValue: unknown, anioValue: unknown): SalesProgressParametersResult {
  const labora = typeof laboraValue === 'string' ? laboraValue.trim() : '';
  const mesText = typeof mesValue === 'string' ? mesValue : '';
  const anioText = typeof anioValue === 'string' ? anioValue : '';
  const mes = Number(mesText);
  const anio = Number(anioText);
  if (!/^\S{2}$/.test(labora)) return { error: 'Seleccione un laboratorio válido de dos caracteres.' };
  if (!/^\d{1,2}$/.test(mesText) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
    return { error: 'El mes debe ser un número entero entre 1 y 12.' };
  }
  if (!/^\d{4}$/.test(anioText) || !Number.isInteger(anio) || anio < 1900 || anio > 2100) {
    return { error: 'El año debe ser un número entero entre 1900 y 2100.' };
  }
  return { value: { labora, mes, anio } };
}

const cleanText = (value: unknown) => value == null ? '' : String(value).trim();
const cleanNumber = (value: unknown) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
};

const isoDate = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const text = cleanText(value);
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(text);
  return iso?.[1] || '';
};

export function normalizeSalesProgressRow(record: Record<string, unknown>): SalesProgressRow {
  return {
    Ruc: cleanText(record.Ruc),
    Cliente: cleanText(record.Cliente),
    codpro: cleanText(record.codpro),
    CodAnte: cleanText(record.CodAnte),
    Producto: cleanText(record.Producto),
    Cantidad: cleanNumber(record.Cantidad),
    Total: cleanNumber(record.Total),
    Departamento: cleanText(record.Departamento),
    Provincia: cleanText(record.Provincia),
    Distrito: cleanText(record.Distrito),
    Ubigeo: cleanText(record.Ubigeo),
    Fecha: isoDate(record.Fecha),
    Tipo_doc: cleanText(record.Tipo_doc),
    Serie: cleanText(record.Serie),
    nro_doc: cleanText(record.nro_doc),
    Vendedor: cleanText(record.Vendedor)
  };
}

export function buildSalesProgressReport(
  records: Record<string, unknown>[], laboratory: SalesProgressLaboratory, mes: number, anio: number
): SalesProgressResponse {
  const data = records.map(normalizeSalesProgressRow).sort((left, right) =>
    left.Fecha.localeCompare(right.Fecha) ||
    left.Tipo_doc.localeCompare(right.Tipo_doc, 'es') ||
    left.Serie.localeCompare(right.Serie, 'es', { numeric: true }) ||
    left.nro_doc.localeCompare(right.nro_doc, 'es', { numeric: true }) ||
    left.Producto.localeCompare(right.Producto, 'es') ||
    left.codpro.localeCompare(right.codpro, 'es', { numeric: true })
  );
  const desde = `${anio}-${String(mes).padStart(2, '0')}-01`;
  const hasta = new Date(anio, mes, 0);
  const hastaIso = `${hasta.getFullYear()}-${String(hasta.getMonth() + 1).padStart(2, '0')}-${String(hasta.getDate()).padStart(2, '0')}`;
  return {
    data,
    total: data.length,
    totals: summarizeSalesProgress(data),
    laboratory: { CodLab: laboratory.CodLab.trim(), Descripcion: laboratory.Descripcion.trim() },
    period: { mes, anio, desde, hasta: hastaIso },
    generatedAt: new Date().toISOString()
  };
}
