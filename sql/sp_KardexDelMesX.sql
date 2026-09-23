SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
ALTER PROCEDURE [dbo].[sp_KardexDelMesX]
@mes INT,
@anio INT
AS
BEGIN
    SET DATEFORMAT dmy;
	-- Calcula el inicio y fin del mes en base a los parámetros
    DECLARE @inicioMes SMALLDATETIME = DATEFROMPARTS(@anio, @mes, 1);
	DECLARE @findeMes SMALLDATETIME = EOMONTH(@inicioMes);
   	DECLARE @mifeca SMALLDATETIME = CONVERT(SMALLDATETIME,GETDATE());
    DECLARE @finMes SMALLDATETIME = EOMONTH(@mifeca);
    DECLARE @simbolo char(1) ='(';

    -- Elimina el contenido de la tabla antes de insertar nuevos registros
    DELETE FROM LibInvValorizado

    -- Inserta los registros de una sola vez
    INSERT INTO LibInvValorizado (FecIni,FecFin,codpro,codSunat,Producto,Unimed,Saldoini, Ingresos, salidas, saldoFin,Costo,Valor)
    SELECT
        @inicioMes,
        @findeMes,
        p.codpro,p.codlab1,
        p.nombre,
        left(t.c_describe,CHARINDEX(@simbolo,t.c_describe)-1),
        ISNULL(isnull(s.saldo,0) + isnull(t_salida.salida,0) - isnull(t_entrada.entrada,0) + isnull(t_salidaX.salida,0) - isnull(t_entradaX.entrada,0), 0) AS Saldoini,
        ISNULL(t_entrada.entrada, 0) AS Ingresos,
        ISNULL(t_salida.salida, 0) AS salidas,
        ISNULL(isnull(s.saldo,0) + isnull(t_salida.salida,0) - isnull(t_entrada.entrada,0)+ isnull(t_salidaX.salida,0) - isnull(t_entradaX.entrada,0), 0) +
        ISNULL(t_entrada.entrada, 0) - ISNULL(t_salida.salida, 0) AS saldoFin,
        p.costo,
        Round(p.costo*(
        ISNULL(isnull(s.saldo,0) + isnull(t_salida.salida,0) - isnull(t_entrada.entrada,0)+ isnull(t_salidaX.salida,0) - isnull(t_entradaX.entrada,0), 0)
        + ISNULL(t_entrada.entrada, 0) - ISNULL(t_salida.salida, 0)),2) as Valor
    FROM productos p
     inner join tablas t on t.n_codtabla=610 and t.n_numero=p.UniMed
    LEFT JOIN (
        SELECT codpro, SUM(saldo) AS saldo
        FROM saldos
        GROUP BY codpro
    ) s ON p.codpro = s.codpro
    LEFT JOIN (
        SELECT codpro, SUM(cantidad) AS entrada
        FROM transacciones
        WHERE tipo = 1
        AND Fecha BETWEEN @inicioMes AND @findeMes
        GROUP BY codpro
    ) t_entrada ON p.codpro = t_entrada.codpro
    LEFT JOIN (
        SELECT codpro, SUM(cantidad) AS salida
        FROM transacciones
        WHERE tipo = 2
        AND Fecha BETWEEN @inicioMes AND @findeMes
        GROUP BY codpro
    ) t_salida ON p.codpro = t_salida.codpro
	LEFT JOIN (
        SELECT codpro, SUM(cantidad) AS entrada
        FROM transacciones
        WHERE tipo = 1
        AND Fecha BETWEEN @findeMes+1 and @finMes
        GROUP BY codpro
    ) t_entradaX ON p.codpro = t_entradaX.codpro
	LEFT JOIN (
        SELECT codpro, SUM(cantidad) AS salida
        FROM transacciones
        WHERE tipo = 2
        AND Fecha BETWEEN @findeMes+1 and @finMes
        GROUP BY codpro
    ) t_salidax ON p.codpro = t_salidaX.codpro
    WHERE p.eliminado = 0 and p.codlab1<>''
END
GO
