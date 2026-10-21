export const productCodeFields = ['CodLab', 'CodLab1', 'CodLabo'] as const;
export type ProductCodeField = typeof productCodeFields[number];
export type ProductCodes = Record<ProductCodeField, string | null>;
export type ProductCodeChanges = Partial<ProductCodes>;

export function parseProductCodeChanges(body: unknown): ProductCodeChanges {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Envía los códigos que deseas modificar.');
  }
  const changes = (body as { cambios?: unknown }).cambios;
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
    throw new Error('El campo cambios debe ser un objeto con los códigos modificados.');
  }
  const entries = Object.entries(changes);
  if (!entries.length) throw new Error('Debes modificar al menos un código.');
  const parsed: ProductCodeChanges = {};
  for (const [field, value] of entries) {
    if (!productCodeFields.includes(field as ProductCodeField)) {
      throw new Error('Solo se permite modificar CodLab, CodLab1 y CodLabo.');
    }
    if (value !== null && (typeof value !== 'string' || value.length > 50)) {
      throw new Error(`${field} debe ser texto de hasta 50 caracteres o null.`);
    }
    parsed[field as ProductCodeField] = value === '' ? null : value as string | null;
  }
  return parsed;
}

// Column identifiers come only from this allowlist; values are bound parameters.
export function buildProductCodesUpdate(changes: ProductCodeChanges): string {
  const fields = productCodeFields.filter(field => Object.hasOwn(changes, field));
  if (!fields.length) throw new Error('Debes modificar al menos un código.');
  return `UPDATE dbo.Productos SET ${fields.map(field => `[${field}] = @${field}`).join(', ')}
    OUTPUT INSERTED.CodLab, INSERTED.Codlab1 AS CodLab1, INSERTED.Codlabo AS CodLabo
    WHERE CodPro = @codpro`;
}
