-- Diagnóstico de solo lectura. Ejecutar en la base utilizada por la aplicación:
-- primero con un administrador y después con la cuenta SQL de la aplicación.
-- Los resultados pueden contener metadatos internos; compartirlos de forma segura.
SET NOCOUNT ON;

SELECT @@SERVERNAME AS Servidor, DB_NAME() AS BaseActual,
       ORIGINAL_LOGIN() AS LoginOriginal, SUSER_SNAME() AS LoginActual,
       USER_NAME() AS UsuarioBase;

DECLARE @id INT = OBJECT_ID(N'dbo.sp_Laboratorios_reportes', N'P');
DECLARE @def NVARCHAR(MAX) = OBJECT_DEFINITION(@id);
SELECT @id AS IdProcedimientoVisible,
       HAS_PERMS_BY_NAME(N'dbo.sp_Laboratorios_reportes', N'OBJECT', N'VIEW DEFINITION') AS PuedeVerDefinicion,
       HAS_PERMS_BY_NAME(N'dbo.sp_Laboratorios_reportes', N'OBJECT', N'EXECUTE') AS PuedeEjecutar,
       CASE WHEN @def IS NULL THEN NULL
            WHEN CHARINDEX(N'CODINSA_LABORATORIOS_REPORTES_V3', @def) > 0 THEN 1 ELSE 0 END AS ContieneMarcaV3,
       @def AS DefinicionVisible;

-- La ausencia de objetos en los resultados puede deberse a permisos de metadatos.
SELECT t.name AS Tabla, c.column_id AS Posicion, c.name AS Columna,
       ty.name AS Tipo, c.max_length AS LongitudBytes,
       c.precision AS Precision, c.scale AS Escala, c.is_nullable AS AdmiteNull
FROM sys.tables t
JOIN sys.columns c ON c.object_id = t.object_id
JOIN sys.types ty ON ty.user_type_id = c.user_type_id
WHERE t.schema_id = SCHEMA_ID(N'dbo')
  AND t.name IN (N'tc_CSP',N'tc_Distoloza',N'tc_Faes',N'tc_IQFarma',N'tc_ITF',
                 N'tc_Lafage',N'tc_MSN',N'tc_Palma',N'tc_Qualis',N'tc_Seven',
                 N'tc_Gabblan',N'tc_IntiFarma',N'tc_IntiPeru',N'tc_Apropo',N'tc_Ipca',N'Productos')
  AND (t.name <> N'Productos' OR c.name IN (N'Codpro', N'Codlabo'))
ORDER BY t.name, c.column_id;

-- Productos con prefijos usados por IQFarma; no presupone que hayan tenido ventas.
-- LEN excluye espacios finales; DATALENGTH informa bytes, no caracteres.
SELECT COUNT_BIG(*) AS ProductosIQFarma,
       SUM(CASE WHEN LEN(Codlabo) > 10 THEN CONVERT(bigint, 1) ELSE CONVERT(bigint, 0) END) AS CodigosMayoresDiezCaracteres,
       MAX(LEN(Codlabo)) AS LongitudMaximaCaracteres,
       MAX(DATALENGTH(Codlabo)) AS LongitudMaximaBytes
FROM dbo.Productos
WHERE LEFT(Codpro, 2) IN ('R1', '87', 'R2', '88');
