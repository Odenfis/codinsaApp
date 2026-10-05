-- Aplicar una vez antes de usar Ventas Psicotrópicos.
-- Esquema comprobado: Principo, Registro y Documento son los nombres físicos.
-- No se reemplaza la tabla ni se eliminan sus datos.
-- Clientes.Documento es VARCHAR(12); el destino original CHAR(2) no admite RUC completos.
-- El CASE de FF y los LEFT JOIN de Distrito pueden devolver NULL.
-- Clientes.Direccion también admite NULL.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID(N'dbo.t_psicotropico', N'U') IS NULL
    THROW 51006, 'No existe dbo.t_psicotropico. Verifique el esquema antes de instalar el reporte.', 1;
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.t_psicotropico')
    AND name = N'Ruc' AND max_length < 12)
    ALTER TABLE dbo.t_psicotropico ALTER COLUMN Ruc varchar(12) NULL;
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.t_psicotropico')
    AND name = N'FF' AND is_nullable = 0)
    ALTER TABLE dbo.t_psicotropico ALTER COLUMN FF varchar(5) NULL;
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.t_psicotropico')
    AND name = N'Distrito' AND is_nullable = 0)
    ALTER TABLE dbo.t_psicotropico ALTER COLUMN Distrito varchar(60) NULL;
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.t_psicotropico')
    AND name = N'Direccion' AND is_nullable = 0)
    ALTER TABLE dbo.t_psicotropico ALTER COLUMN Direccion varchar(60) NULL;
COMMIT TRANSACTION;
