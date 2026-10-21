import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildMonthlyLaboratoriesReport, monthlyLaboratoriesPreflight, monthlyLaboratoriesQuery, parseMonthlyLaboratoriesParameters } from './monthlyLaboratoriesReport';
import { filterMonthlyLaboratory, monthlyLaboratoriesMonths, monthlyLaboratoriesPeriod, monthlyLaboratoryCellText, monthlyLaboratoriesRegistry, summarizeMonthlyLaboratory } from '../../utils/monthlyLaboratoriesModel';

const fixture = (mes = 10) => monthlyLaboratoriesRegistry.map(lab => [Object.fromEntries(lab.columns.map(col => [col.key,
  col.key === 'Mes' ? monthlyLaboratoriesMonths[mes - 1].toUpperCase().padEnd(15) : col.key === 'Cantidad' ? -1.5 : col.key === 'Total' ? -12.75 : col.kind === 'money' ? 10.5 : col.key === 'fecha' ? '2026-10-15' : col.key === 'Producto' ? 'Ácido ejemplo' : col.key === 'codpro' ? '00123' : null
]))]);

test('mes y año son enteros numéricos dentro de los límites', () => {
  assert.deepEqual(parseMonthlyLaboratoriesParameters({ mes: 1, anio: 1900 }), { mes: 1, anio: 1900 });
  assert.deepEqual(parseMonthlyLaboratoriesParameters({ mes: 12, anio: 2100 }), { mes: 12, anio: 2100 });
  for (const body of [null, {}, [], { mes: '10', anio: 2026 }, { mes: 0, anio: 2026 }, { mes: 13, anio: 2026 }, { mes: 1.5, anio: 2026 }, { mes: 1, anio: 2101 }, { mes: 1, anio: '2026' }]) assert.throws(() => parseMonthlyLaboratoriesParameters(body));
});

test('quince tablas fijas y columnas específicas de cada laboratorio', () => {
  assert.equal(monthlyLaboratoriesRegistry.length, 15);
  assert.equal(new Set(monthlyLaboratoriesRegistry.map(lab => lab.table)).size, 15);
  const report = buildMonthlyLaboratoriesReport(fixture(), 10, 2026);
  assert.equal(report.total, 15);
  assert(report.laboratories.find(l => l.id === 'iqfarma').columns.some(c => c.key === 'Ubigeo'));
  assert(!report.laboratories.find(l => l.id === 'itf').columns.some(c => c.key === 'PVF'));
  assert(report.laboratories.find(l => l.id === 'qualis').columns.some(c => c.key === 'Representante'));
  assert(!report.laboratories.find(l => l.id === 'qualis').columns.some(c => c.key === 'Codven'));
});

test('conserva duplicados, códigos, nulos, signos y decimales sin sumar precios unitarios', () => {
  const sets = fixture(); sets[0].push({ ...sets[0][0] });
  const lab = buildMonthlyLaboratoriesReport(sets, 10, 2026).laboratories[0];
  assert.equal(lab.total, 2); assert.equal(lab.data[0].codpro, '00123'); assert.equal(lab.data[0].Ruc, null);
  assert.equal(lab.data[0].fecha, '2026-10-15');
  assert.deepEqual(lab.totals, { registros: 2, cantidad: -3, importe: -25.5 });
});

test('ordena por fecha, documento, producto y código y busca sin tildes', () => {
  const sets = fixture(); sets[0].push({ ...sets[0][0], fecha: '2026-10-01', NroDoc: '0001' });
  const lab = buildMonthlyLaboratoriesReport(sets, 10, 2026).laboratories[0];
  assert.equal(lab.data[0].fecha, '2026-10-01');
  assert.equal(filterMonthlyLaboratory(lab, 'ACIDO').length, 2);
  assert.equal(filterMonthlyLaboratory(lab, '00123').length, 2);
  assert.deepEqual(summarizeMonthlyLaboratory(filterMonthlyLaboratory(lab, 'no existe')), { registros: 0, cantidad: 0, importe: 0 });
});

test('período vacío conserva las quince secciones, rechaza resultados incompletos y meses mezclados', () => {
  const report = buildMonthlyLaboratoriesReport(monthlyLaboratoriesRegistry.map(() => []), 10, 2026);
  assert.equal(report.total, 0); assert.equal(report.laboratories.length, 15);
  assert.throws(() => buildMonthlyLaboratoriesReport([], 10, 2026));
  const sets = fixture(); sets[0][0].Mes = 9; assert.throws(() => buildMonthlyLaboratoriesReport(sets, 10, 2026));
  sets[0][0].Mes = 'OCTUBRE'; delete sets[0][0].Producto; assert.throws(() => buildMonthlyLaboratoriesReport(sets, 10, 2026));
});

test('preflight exige versión compatible y esquema antes del único EXEC; lectura explícita sin DDL', () => {
  assert.match(monthlyLaboratoriesPreflight, /CODINSA_LABORATORIOS_REPORTES_V3/);
  assert.match(monthlyLaboratoriesPreflight, /CODINSA_LABORATORIOS_REPORTES/);
  assert.match(monthlyLaboratoriesPreflight, /@LockOwner = 'Transaction', @LockTimeout = 30000/);
  assert.equal((monthlyLaboratoriesQuery.match(/EXEC dbo.sp_Laboratorios_reportes/g) || []).length, 1);
  assert.equal((monthlyLaboratoriesQuery.match(/FROM dbo\.\[tc_/g) || []).length, 15);
  assert.doesNotMatch(monthlyLaboratoriesQuery, /SELECT \*|CREATE |ALTER |DELETE /i);
});

test('SP corregido conserva expresiones y filtros del original; solo cambia las asignaciones declaradas', () => {
  const original = fs.readFileSync('sql/backups/sp_Laboratorios_reportes_original.sql', 'utf8').replace(/\r\n/g, '\n');
  const corrected = fs.readFileSync('sql/sp_Laboratorios_reportes.sql', 'utf8');
  assert.equal((corrected.match(/@nmes AS Mes/g) || []).length, 30);
  assert.equal((corrected.match(/INSERT INTO dbo\.tc_\w+\s*\([^)]*\)/g) || []).length, 30);
  assert.match(corrected, /INSERT INTO dbo.tc_IQFarma\s*\([^)]*Distrito, Ubigeo, fecha, NroDoc, Codven\)/);
  const clean = (text: string) => text.replace(/^--.*$/gm, '').replace(/(?:CREATE OR ALTER|ALTER)\s+Procedure/gi, 'PROCEDURE').replace(/SET NOCOUNT ON;/i, '').replace(/INSERT INTO (?:dbo\.)?(tc_\w+)(?:\s*\([^)]*\))?/gi, 'INSERT INTO $1').replace(/NOCIEMBRE/g, 'NOVIEMBRE').replace(/\s+/g, '').toLowerCase();
  assert.equal(clean(corrected), clean(original));
});


test('doce meses en las quince tablas: texto limpio, período y formato compartidos', () => {
  const expected = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SETIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  for (const [index, name] of expected.entries()) {
    const report = buildMonthlyLaboratoriesReport(fixture(index + 1), index + 1, 2026);
    assert.deepEqual(report.period, { mes: index + 1, anio: 2026 });
    assert.equal(monthlyLaboratoriesPeriod(report), `${name[0]}${name.slice(1).toLowerCase()} 2026`);
    for (const lab of report.laboratories) {
      const column = lab.columns.find(c => c.key === 'Mes')!;
      assert.equal(column.kind, 'text');
      assert.equal(lab.data[0].Mes, name);
      assert.equal(monthlyLaboratoryCellText(lab.data[0].Mes, column), name);
    }
    assert.equal(buildMonthlyLaboratoriesReport(monthlyLaboratoriesRegistry.map(() => []), index + 1, 2026).total, 0);
  }
});

test('rechaza meses nulos, numéricos, mal escritos o de otro período en cada tabla', () => {
  for (let i = 0; i < 15; i++) for (const value of [null, 10, '10', '', 'NOVIEMBRE', 'NOCIEMBRE', 'octubre']) {
    const sets = fixture(); sets[i][0].Mes = value;
    assert.throws(() => buildMonthlyLaboratoriesReport(sets, 10, 2026), /mes de las tablas/);
  }
});

test('preflight exige CHAR suficiente y CASE SQL coincide con los doce nombres', () => {
  assert.equal((monthlyLaboratoriesPreflight.match(/TYPE_NAME\(user_type_id\) = N'char' AND max_length >= 10/g) || []).length, 15);
  assert.doesNotMatch(monthlyLaboratoriesPreflight, /V2|debe ser INT/);
  const sql = fs.readFileSync('sql/sp_Laboratorios_reportes.sql', 'utf8');
  assert.match(sql, /CODINSA_LABORATORIOS_REPORTES_V3/);
  for (const [index, month] of monthlyLaboratoriesMonths.entries()) assert(sql.includes(`when ${index + 1} then '${month.toUpperCase()}'`));
  assert.doesNotMatch(sql, /NOCIEMBRE|@mes AS Mes/);
});
