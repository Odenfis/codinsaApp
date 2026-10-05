-- Esquema real comprobado: FF varchar(5) NOT NULL, pero el CASE puede devolver NULL.
-- Ejecutar explícitamente antes de usar Compras Psicotrópicos. Conserva los datos.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID(N'dbo.t_psicotropico1', N'U') IS NULL
    THROW 51008, 'No existe dbo.t_psicotropico1. Verifique el esquema del reporte.', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.t_psicotropico1')
    AND name = N'FF' AND TYPE_NAME(user_type_id) = N'varchar' AND max_length = 5)
    THROW 51008, 'FF no tiene el tipo varchar(5) esperado. Revise el esquema antes de modificarlo.', 1;
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.t_psicotropico1')
    AND name = N'FF' AND is_nullable = 0)
BEGIN
    ALTER TABLE dbo.t_psicotropico1 ALTER COLUMN FF varchar(5) NULL;
END;
COMMIT TRANSACTION;
