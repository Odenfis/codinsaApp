/** Opt-in SQL Server verification. Every business-table/SP change is rolled back. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getDbPool, sql } from '../src/db';
import { buildMonthlyLaboratoriesReport, monthlyLaboratoriesPreflight, monthlyLaboratoriesQuery } from '../src/backend/services/monthlyLaboratoriesReport';
import { monthlyLaboratoriesMonths, monthlyLaboratoriesRegistry as labs } from '../src/utils/monthlyLaboratoriesModel';

const source = fs.readFileSync('sql/sp_Laboratorios_reportes.sql', 'utf8');
const definition = source.split(/^GO\s*$/mi).find(batch => /CREATE OR ALTER PROCEDURE/i.test(batch))!;
const body = definition.slice(definition.indexOf('SET NOCOUNT ON;'));
const reads = monthlyLaboratoriesQuery.slice(monthlyLaboratoriesQuery.indexOf('SELECT '));
const lock = `DECLARE @rc int; EXEC @rc = sys.sp_getapplock @Resource='CODINSA_LABORATORIOS_REPORTES', @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=30000; IF @rc<0 THROW 51020, 'Lock unavailable', 1;`;
const pool = await getDbPool();
const request = (tx: sql.Transaction) => { const r = new sql.Request(tx); (r as sql.Request & {timeout: number}).timeout = 300000; return r; };
const canonical = (rows: unknown[]) => rows.map(row => JSON.stringify(row)).sort();
const snapshot = async (tx?: sql.Transaction) => {
  const r = tx ? request(tx) : pool.request();
  const result = await r.query(`SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.sp_Laboratorios_reportes')) AS Definition; ${labs.map(lab => `SELECT * FROM dbo.[${lab.table}];`).join('\n')}`);
  return (result.recordsets as unknown as unknown[][]).map(canonical);
};

const sourceTables = ['Notas_credito_deta', 'Notas_credito', 't_Clientes_ubigeo', 'Ubigeos_SUNAT', 'doccabped', 'doccab', 'docdet', 'clientes', 'productos', 'empleados', 'representantes', 'valores'];
const temporary = (text: string) => {
  for (const name of [...labs.map(l => l.table), ...sourceTables]) text = text.replace(new RegExp(`(?:dbo\\.)?\\b${name}\\b`, 'gi'), `#${name}`);
  return text;
};
const setup = `SET NOCOUNT ON;
${labs.map(l => `SELECT TOP (0) * INTO #${l.table} FROM dbo.[${l.table}];`).join('\n')}
CREATE TABLE #valores (c_valor varchar(10), n_valor decimal(9,2)); INSERT #valores VALUES ('Igv',18);
CREATE TABLE #clientes (Codclie int, documento varchar(12), Razon varchar(80)); INSERT #clientes VALUES (1,'00123456789','Cliente fixture');
CREATE TABLE #productos (Codpro char(10), Codlabo varchar(50), Nombre varchar(70), PventaMa decimal(18,6));
CREATE TABLE #doccab (numero varchar(20), tipo char(2), CodClie int, fecha smalldatetime, Vendedor int, Eliminado bit, NroPedido varchar(20));
CREATE TABLE #docdet (numero varchar(20), tipo char(2), codpro char(10), Cantidad decimal(18,6), Precio decimal(18,6), Descuento1 decimal(9,2), Descuento2 decimal(9,2), Descuento3 decimal(9,2), subtotal decimal(18,6));
CREATE TABLE #Notas_credito (numero varchar(20), CodClie int, fecha smalldatetime, Documento varchar(20), TipoDoc char(2), anulado bit);
CREATE TABLE #Notas_credito_deta (numero varchar(20), codpro char(10), Cantidad decimal(18,6), Precio decimal(18,6), Descuento1 decimal(9,2), Descuento2 decimal(9,2), Descuento3 decimal(9,2), subtotal decimal(18,6));
CREATE TABLE #t_Clientes_ubigeo (CODIGO int, dpto int, provincia int, distrito int); INSERT #t_Clientes_ubigeo VALUES (1,15,1,1);
CREATE TABLE #Ubigeos_SUNAT (cod_dpto char(2), Cod_prov char(2), cod_dist char(2), nom_dpto varchar(60), nom_prov varchar(60), nom_dist varchar(60), Ubigeo_6D char(6)); INSERT #Ubigeos_SUNAT VALUES ('15','01','01','LIMA','LIMA','LIMA','150101');
CREATE TABLE #empleados (Codemp int, Nombre varchar(80)); INSERT #empleados VALUES (7,'Vendedor fixture');
CREATE TABLE #doccabped (numero varchar(20), Representante int); INSERT #doccabped VALUES ('P1',1);
CREATE TABLE #representantes (Codigo int, Nombre varchar(80)); INSERT #representantes VALUES (1,'Representante fixture');
${['37','42','59','R1','89','B2','F2','F7','H2','T9','65','84','83','10','85'].map(prefix => `
INSERT #productos VALUES ('${prefix}0001','00123','Producto ${prefix}',10);
${Array.from({length:12}, (_, i) => { const m=String(i+1).padStart(2,'0');return `
INSERT #doccab VALUES ('F${m}-0001','FA',1,'2026${m}15',7,0,'P1');
INSERT #docdet VALUES ('F${m}-0001','FA','${prefix}0001',2,10,10,0,0,18);
INSERT #Notas_credito VALUES ('N${m}-0002',1,'2026${m}16','F${m}-0001','FA',0);
INSERT #Notas_credito_deta VALUES ('N${m}-0002','${prefix}0001',-1,10,10,0,0,-9);`;}).join('\n')}`).join('\n')}
-- One header per month, shared by all fifteen products.
;WITH d AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY numero ORDER BY numero) n FROM #doccab) DELETE FROM d WHERE n>1;
;WITH d AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY numero ORDER BY numero) n FROM #Notas_credito) DELETE FROM d WHERE n>1;
`;
const runFixture = async (tx: sql.Transaction, mes: number, failure = false) => {
  const text = temporary(body + '\n' + reads);
  const result = await request(tx).batch(`DECLARE @mes int=${mes}, @anio int=2026;\n${failure ? text.replace('delete #tc_ITF', ";THROW 51099, 'Fixture failure', 1;\ndelete #tc_ITF") : text}`);
  return buildMonthlyLaboratoriesReport(result.recordsets as unknown as Record<string, unknown>[][], mes, 2026);
};

try {
  const before = await snapshot();
  const tx = new sql.Transaction(pool);
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    await request(tx).batch(lock);
    const installed = await request(tx).query("SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.sp_Laboratorios_reportes')) AS Definition");
    if (!String(installed.recordset[0].Definition).includes('CODINSA_LABORATORIOS_REPORTES_V3')) await assert.rejects(request(tx).query(monthlyLaboratoriesPreflight), (e: any) => e.number === 51021);
    await request(tx).batch(definition);
    await request(tx).query(monthlyLaboratoriesPreflight);
    for (const type of ['int','char(9)']) {
      await request(tx).batch(`SAVE TRANSACTION SchemaCheck; DELETE dbo.tc_CSP; ALTER TABLE dbo.tc_CSP ALTER COLUMN Mes ${type} NULL;`);
      await assert.rejects(request(tx).query(monthlyLaboratoriesPreflight), (e: any) => e.number === 51021);
      await request(tx).batch('ROLLBACK TRANSACTION SchemaCheck;');
    }
    const result = await request(tx).input('mes', sql.Int, 10).input('anio', sql.Int, 2026).query(monthlyLaboratoriesQuery);
    const report = buildMonthlyLaboratoriesReport(result.recordsets as unknown as Record<string, unknown>[][], 10, 2026);
    console.log('Real V3 generation:', report.total, 'rows;', report.laboratories.length, 'sections');
  } finally { await tx.rollback(); }
  assert.deepEqual(await snapshot(), before);
  console.log('Restored installed definition and all fifteen tables exactly. INT/CHAR(9)/old version rejected.');

  const fixtures = new sql.Transaction(pool);
  await fixtures.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    await request(fixtures).batch(setup);
    for (let mes=1;mes<=12;mes++) {
      const report=await runFixture(fixtures,mes);
      assert.equal(report.total,30);
      for (const lab of report.laboratories) {
        assert.deepEqual(lab.totals,{registros:2,cantidad:1,importe:9});
        assert.equal(lab.data[0].Mes,monthlyLaboratoriesMonths[mes-1].toUpperCase());
        assert.equal(lab.data[0].codpro, ['iqfarma','msn','qualis'].includes(lab.id) ? '00123' : ['37','42','59','R1','89','B2','F2','F7','H2','T9','65','84','83','10','85'][labs.findIndex(l => l.id === lab.id)] + '0001');
        if (lab.columns.some(c=>c.key==='PVF')) { assert.equal(lab.data[0].PVF,11.8); assert.equal(lab.data[0].PVendido,9); assert.equal(lab.data[0].Diferencia,2.8); }
      }
      const iq=report.laboratories.find(l=>l.id==='iqfarma')!;
      for (const [index,row] of iq.data.entries()) {
        assert.equal(row.Ubigeo,'150101'); assert.equal(row.fecha,`2026-${String(mes).padStart(2,'0')}-${index===0?'15':'16'}`);
        assert.equal(row.NroDoc,index===0?'0001':'0002'); assert.equal(row.Codven,'7');
      }
      assert.equal(report.laboratories.find(l=>l.id==='qualis')!.data[0].Representante,'Representante fixture');
    }
    const previous = await request(fixtures).batch(temporary(reads));
    await request(fixtures).batch('SAVE TRANSACTION FailureCheck;');
    await assert.rejects(runFixture(fixtures,9,true), (e: any)=>e.number===51099);
    await request(fixtures).batch('ROLLBACK TRANSACTION FailureCheck;');
    const restored = await request(fixtures).batch(temporary(reads));
    assert.deepEqual(restored.recordsets,previous.recordsets);
    await request(fixtures).batch('DELETE #t_Clientes_ubigeo;');
    const noLocation=await runFixture(fixtures,10);
    assert.equal(noLocation.laboratories[3].data[0].Ubigeo,null);
    console.log('Fixtures: twelve months × fifteen labs × sales/credit; IQFarma fields, codes, prices, Qualis, NULL location and rollback passed.');
  } finally { await fixtures.rollback(); }

  const first = new sql.Transaction(pool), second = new sql.Transaction(pool);
  await first.begin(sql.ISOLATION_LEVEL.SERIALIZABLE); await second.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  let firstOpen=true;
  try {
    await request(first).batch(setup); await request(second).batch(setup);
    await request(first).batch(lock);
    let acquired=false;
    const waiting=request(second).batch(lock).then(()=>{acquired=true;});
    const a=await runFixture(first,10); assert.equal(acquired,false);
    await first.rollback(); firstOpen=false;
    await waiting;
    const b=await runFixture(second,9);
    assert.equal(a.laboratories[0].data[0].Mes,'OCTUBRE'); assert.equal(b.laboratories[0].data[0].Mes,'SETIEMBRE');
    console.log('Concurrent October/Setiembre generation serialized by shared application lock.');
  } finally {if(firstOpen) await first.rollback(); await second.rollback();}
  assert.deepEqual(await snapshot(), before);
  console.log('PASS: all checks; no permanent SQL changes.');
} finally { await pool.close(); }
