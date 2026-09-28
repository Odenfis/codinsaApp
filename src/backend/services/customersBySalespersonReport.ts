import { CustomersBySalespersonResponse, CustomersBySalespersonRow, Salesperson } from '../../types';
import { summarizeCustomersBySalesperson } from '../../utils/customersBySalespersonModel';

export type CustomersBySalespersonParametersResult =
  | { value: { vende: number }; error?: never }
  | { value?: never; error: string };

export function parseCustomersBySalespersonParameters(value: unknown): CustomersBySalespersonParametersResult {
  const text = typeof value === 'string' ? value.trim() : '';
  const vende = Number(text);
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(vende) || vende <= 0) {
    return { error: 'Seleccione un vendedor válido.' };
  }
  return { value: { vende } };
}

const cleanText = (value: unknown) => value == null ? '' : String(value).trim();
const cleanNumber = (value: unknown) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
};
const field = (record: Record<string, unknown>, name: string) => {
  const key = Object.keys(record).find(candidate => candidate.toLocaleLowerCase('es-PE') === name.toLocaleLowerCase('es-PE'));
  return key ? record[key] : undefined;
};

export function normalizeCustomerBySalespersonRow(record: Record<string, unknown>): CustomersBySalespersonRow {
  return {
    codclie: cleanText(field(record, 'codclie')),
    Ruc: cleanText(field(record, 'Ruc')),
    Razon: cleanText(field(record, 'Razon')),
    titular: cleanText(field(record, 'titular')),
    Direccion: cleanText(field(record, 'Direccion')),
    Telefono1: cleanText(field(record, 'Telefono1')),
    Telefono2: cleanText(field(record, 'Telefono2')),
    email: cleanText(field(record, 'email')),
    Departamento: cleanText(field(record, 'Departamento')),
    Localidad: cleanText(field(record, 'Localidad')),
    Vendedor: cleanText(field(record, 'Vendedor')),
    ubigeo_6d: cleanText(field(record, 'ubigeo_6d')),
    Limite: cleanNumber(field(record, 'Limite')),
    TipoCliente: cleanText(field(record, 'TipoCliente')).toUpperCase(),
    RegDigemid: cleanText(field(record, 'RegDigemid'))
  };
}

export function buildCustomersBySalespersonReport(
  records: Record<string, unknown>[], salesperson: Salesperson
): CustomersBySalespersonResponse {
  const data = records.map(normalizeCustomerBySalespersonRow).sort((left, right) =>
    left.Razon.localeCompare(right.Razon, 'es') ||
    left.codclie.localeCompare(right.codclie, 'es', { numeric: true })
  );
  return {
    data,
    total: data.length,
    totals: summarizeCustomersBySalesperson(data),
    salesperson: { Codemp: salesperson.Codemp, Nombre: salesperson.Nombre.trim() },
    generatedAt: new Date().toISOString()
  };
}
