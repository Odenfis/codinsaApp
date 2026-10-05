-- Balance Psicotrópico DEL / AL. Conversión aplicada al saldo final completo; cantidades INT.
-- La aplicación coordina ejecución y lectura con CODINSA_BALANCE_PSICOTROPICO.
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_KardexPsicotropico]
@fechaIni DATE,
@fechaFin DATE
AS
BEGIN
    SET DATEFORMAT dmy;
	-- Rango de fechas indicado por el usuario (antes se calculaba a partir de @mes/@anio)
    DECLARE @inicioMes SMALLDATETIME = @fechaIni;
	DECLARE @findeMes SMALLDATETIME = @fechaFin;
   	DECLARE @hoy SMALLDATETIME = CONVERT(SMALLDATETIME, CAST(GETDATE() AS DATE));
    DECLARE @simbolo char(1) ='(';

    -- Elimina el contenido de la tabla antes de insertar nuevos registros
    DELETE FROM LibBalPsicotropico

    ;WITH SaldoLote AS (
        -- Saldo actual y vencimiento por producto+lote (vencimiento solo existe aqui)
        SELECT codpro, ISNULL(Lote,'') AS Lote, MAX(Vencimiento) AS Vencimiento, SUM(saldo) AS saldo
        FROM saldos
        GROUP BY codpro, ISNULL(Lote,'')
    ),
    EntradaLote AS (
        SELECT codpro, ISNULL(Lote,'') AS Lote, SUM(cantidad) AS entrada
        FROM transacciones
        WHERE tipo = 1
        AND Fecha >= @inicioMes AND Fecha < DATEADD(DAY,1,@findeMes)
        GROUP BY codpro, ISNULL(Lote,'')
    ),
    SalidaLote AS (
        SELECT codpro, ISNULL(Lote,'') AS Lote, SUM(cantidad) AS salida
        FROM transacciones
        WHERE tipo = 2
        AND Fecha >= @inicioMes AND Fecha < DATEADD(DAY,1,@findeMes)
        GROUP BY codpro, ISNULL(Lote,'')
    ),
    EntradaLoteX AS (
        -- Movimientos posteriores al rango, hasta hoy (para reconstruir el saldo inicial del rango)
        SELECT codpro, ISNULL(Lote,'') AS Lote, SUM(cantidad) AS entrada
        FROM transacciones
        WHERE tipo = 1
        AND Fecha >= DATEADD(DAY,1,@findeMes) AND Fecha < DATEADD(DAY,1,@hoy)
        GROUP BY codpro, ISNULL(Lote,'')
    ),
    SalidaLoteX AS (
        SELECT codpro, ISNULL(Lote,'') AS Lote, SUM(cantidad) AS salida
        FROM transacciones
        WHERE tipo = 2
        AND Fecha >= DATEADD(DAY,1,@findeMes) AND Fecha < DATEADD(DAY,1,@hoy)
        GROUP BY codpro, ISNULL(Lote,'')
    ),
    Lotes AS (
        -- Todos los productos+lote que tuvieron saldo o movimiento (para no perder lotes ya agotados)
        SELECT codpro, Lote FROM SaldoLote
        UNION
        SELECT codpro, Lote FROM EntradaLote
        UNION
        SELECT codpro, Lote FROM SalidaLote
        UNION
        SELECT codpro, Lote FROM EntradaLoteX
        UNION
        SELECT codpro, Lote FROM SalidaLoteX
    )

    -- Inserta los registros de una sola vez
    INSERT INTO LibBalPsicotropico (Codpro,Principio,Concentracion,Descripcion,FF,Laboratorio,Lote,Vence,SaldoAnterior,Ingresos,Egresos,SaldoActual)
    SELECT
        p.codpro,p.Principio,p.Concentracion,p.nombre as Descripcion,
        CASE
        WHEN CHARINDEX('TAB', p.Nombre) > 0 THEN 'TAB'
        WHEN CHARINDEX('GOT', p.Nombre) > 0 THEN 'GOT'
        ELSE NULL
    END AS FF,laboratorios.Descripcion as Laboratorio, l.Lote,sl.Vencimiento,
        ISNULL(isnull(sl.saldo,0) + isnull(sal.salida,0) - isnull(ent.entrada,0) + isnull(salX.salida,0) - isnull(entX.entrada,0), 0)*Tablas.conversion AS SaldoAnterior,
        ISNULL(ent.entrada, 0) *Tablas.conversion AS Ingresos,
        ISNULL(sal.salida, 0)*Tablas.conversion AS Egresos,
        (ISNULL(isnull(sl.saldo,0) + isnull(sal.salida,0) - isnull(ent.entrada,0) + isnull(salX.salida,0) - isnull(entX.entrada,0), 0) +
        ISNULL(ent.entrada, 0) - ISNULL(sal.salida, 0)) *Tablas.conversion AS saldoActual
 FROM Lotes l
    INNER JOIN productos p ON p.codpro = l.codpro
    inner join tablas on tablas.n_codtabla=350 and rtrim(c_describe)=p.codpro
    inner join Laboratorios on laboratorios.codlab=Left(p.codpro,2)
    LEFT JOIN SaldoLote sl ON sl.codpro = l.codpro AND sl.Lote = l.Lote
    LEFT JOIN EntradaLote ent ON ent.codpro = l.codpro AND ent.Lote = l.Lote
    LEFT JOIN SalidaLote sal ON sal.codpro = l.codpro AND sal.Lote = l.Lote
    LEFT JOIN EntradaLoteX entX ON entX.codpro = l.codpro AND entX.Lote = l.Lote
    LEFT JOIN SalidaLoteX salX ON salX.codpro = l.codpro AND salX.Lote = l.Lote
    WHERE p.eliminado = 0 and p.codlab1<>''

  delete LibBalPsicotropico where saldoAnterior=0 and Ingresos=0 and Egresos=0 and SaldoActual=0
END
GO
