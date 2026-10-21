import type { MonthlyLaboratoriesCell, MonthlyLaboratoriesResponse } from '../../types';
import { monthlyLaboratoriesMonths, monthlyLaboratoriesRegistry, summarizeMonthlyLaboratory } from '../../utils/monthlyLaboratoriesModel';

export const monthlyLaboratoriesVersion = 'CODINSA_LABORATORIOS_REPORTES_V3';
export function parseMonthlyLaboratoriesParameters(body: unknown): { mes: number; anio: number } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Seleccione mes y año.');
  const { mes, anio } = body as { mes?: unknown; anio?: unknown };
  if (typeof mes !== 'number' || !Number.isInteger(mes) || mes < 1 || mes > 12) throw new Error('El mes debe ser un entero entre 1 y 12.');
  if (typeof anio !== 'number' || !Number.isInteger(anio) || anio < 1900 || anio > 2100) throw new Error('El año debe ser un entero entre 1900 y 2100.');
  return { mes, anio };
}

// Execute once and read all fifteen sections under the caller's SERIALIZABLE transaction.
export const monthlyLaboratoriesPreflight = `
SET NOCOUNT ON;
DECLARE @lockResult INT;
EXEC @lockResult = sys.sp_getapplock
  @Resource = 'CODINSA_LABORATORIOS_REPORTES', @LockMode = 'Exclusive',
  @LockOwner = 'Transaction', @LockTimeout = 30000;
IF @lockResult < 0
  THROW 51020, 'Otro usuario está generando Reportes Mes Laboratorios. Intente nuevamente.', 1;
IF OBJECT_DEFINITION(OBJECT_ID(N'dbo.sp_Laboratorios_reportes')) IS NULL
  OR CHARINDEX('${monthlyLaboratoriesVersion}', OBJECT_DEFINITION(OBJECT_ID(N'dbo.sp_Laboratorios_reportes'))) = 0
  THROW 51021, 'Debe instalar manualmente sql/sp_Laboratorios_reportes.sql (versión compatible V3). La API no modifica procedimientos. Verifique también el permiso VIEW DEFINITION.', 1;
${monthlyLaboratoriesRegistry.map(lab => `
IF OBJECT_ID(N'dbo.${lab.table}', N'U') IS NULL
  THROW 51021, 'Falta la tabla dbo.${lab.table}. Revise el esquema del reporte.', 1;
${lab.columns.map(column => `IF COL_LENGTH(N'dbo.${lab.table}', N'${column.key}') IS NULL
  THROW 51021, 'Falta ${lab.table}.${column.key}. Revise el esquema del reporte.', 1;`).join('\n')}
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.${lab.table}') AND name = N'Mes' AND TYPE_NAME(user_type_id) = N'char' AND max_length >= 10)
  THROW 51021, '${lab.table}.Mes debe ser CHAR de al menos 10 caracteres para esta versión del reporte.', 1;
`).join('\n')}
`;

export const monthlyLaboratoriesQuery = `
SET NOCOUNT ON;
SET DATEFORMAT dmy;
EXEC dbo.sp_Laboratorios_reportes @mes = @mes, @anio = @anio;
${monthlyLaboratoriesRegistry.map(lab => `SELECT ${lab.columns.map(column => column.kind === 'date' ? `CONVERT(char(10), [${column.key}], 23) AS [${column.key}]` : `[${column.key}]`).join(', ')} FROM dbo.[${lab.table}];`).join('\n')}
`;

export function buildMonthlyLaboratoriesReport(recordsets: Record<string, unknown>[][], mes: number, anio: number): MonthlyLaboratoriesResponse {
  if (recordsets.length !== monthlyLaboratoriesRegistry.length) throw new Error('El procedimiento no devolvió las quince tablas esperadas.');
  const laboratories = monthlyLaboratoriesRegistry.map((lab, index) => {
    const data = recordsets[index].map(record => {
      const entries = Object.entries(record);
      const row: Record<string, MonthlyLaboratoriesCell> = {};
      for (const column of lab.columns) {
        const entry = entries.find(([key]) => key.toLowerCase() === column.key.toLowerCase());
        if (!entry) throw new Error(`Falta la columna ${lab.table}.${column.key} en el resultado.`);
        const value = entry[1];
        if (value == null) row[column.key] = null;
        else if (column.kind === 'number' || column.kind === 'money') {
          const number = Number(value);
          if (!Number.isFinite(number)) throw new Error(`Valor numérico inválido en ${lab.table}.${column.key}.`);
          row[column.key] = number;
        } else if (column.kind === 'date') {
          row[column.key] = value instanceof Date ? value.toISOString().substring(0, 10) : String(value).substring(0, 10);
        } else row[column.key] = String(value).trim();
      }
      if (row.Mes !== monthlyLaboratoriesMonths[mes - 1]?.toUpperCase()) throw new Error('El mes de las tablas no coincide con el período solicitado.');
      return row;
    }).sort((a, b) => {
      for (const key of ['fecha', 'NroDoc', 'Producto', 'codpro']) {
        const comparison = String(a[key] ?? '').localeCompare(String(b[key] ?? ''), 'es', { numeric: true });
        if (comparison) return comparison;
      }
      return 0;
    });
    return { id: lab.id, name: lab.name, columns: lab.columns, data, total: data.length, totals: summarizeMonthlyLaboratory(data) };
  });
  return { period: { mes, anio }, generatedAt: new Date().toISOString(), laboratories, total: laboratories.reduce((sum, lab) => sum + lab.total, 0) };
}
