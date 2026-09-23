SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
ALTER PROCEDURE [dbo].[sp_KardexDelMesD]
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
    DELETE FROM LibInvValorizadoD
    -- Inserta el saldo inicial
    INSERT INTO LibInvValorizadoD (Numero,FecIni,FecFin,codpro,Lote,ALmacen,codSunat,TipoPro,Descripcion,Unimed,fecha,StockIni, Ingresos,CosIng,CostoI,
    salidas,CosUnit,CostoS,saldo,ValorUni,Valorizado)
    SELECT
        0,@inicioMes,@findeMes,
       p.codpro,
        s.lote,s.almacen,
        codlab1,'MERCADERIA',
        p.nombre,
        left(t.c_describe,CHARINDEX(@simbolo,t.c_describe)-1),@mifeca,
        ISNULL(isnull(s.saldo,0) + isnull(t_salidaX.salida,0) - isnull(t_entradaX.entrada,0), 0) AS StockIni,
        0 AS Ingresos,0 as CosIng,0 as CostoI,
        0 AS salidas,0 as CosUnit,0 as CostoS,
        ISNULL(isnull(s.saldo,0) + isnull(t_salidaX.salida,0) - isnull(t_entradaX.entrada,0), 0) AS saldo,
        p.costo as ValorUni,
        Round(p.costo*(
        ISNULL(isnull(s.saldo,0) +  isnull(t_salidaX.salida,0) - isnull(t_entradaX.entrada,0), 0)) ,2) as Valor
    FROM productos p
    inner join tablas t on t.n_codtabla=610 and t.n_numero=p.UniMed
    inner JOIN (
        SELECT codpro,lote,vencimiento,almacen,saldo AS saldo
        FROM saldos
        where YEAR(vencimiento)>=YEAR(getdate())-1
    ) s ON p.codpro = s.codpro
    LEFT JOIN (
        SELECT codpro,lote,almacen,SUM(cantidad) AS entrada
        FROM transacciones
        WHERE tipo = 1
        AND Fecha BETWEEN @inicioMes and @finMes
        GROUP BY codpro,lote,almacen
    ) t_entradaX ON s.codpro = t_entradaX.codpro and s.lote=t_entradaX.lote and s.almacen=t_entradaX.almacen
    LEFT JOIN (
        SELECT codpro,lote,almacen, SUM(cantidad) AS salida
        FROM transacciones
        WHERE tipo = 2
        AND Fecha BETWEEN @inicioMes and @finMes
        GROUP BY codpro,lote,almacen
    ) t_salidax ON s.codpro = t_salidaX.codpro and s.lote=t_salidaX.lote and s.almacen=t_salidax.Almacen
    WHERE p.eliminado = 0 and p.codlab1<>'' and YEAR(s.vencimiento)>=YEAR(getdate())-1

    -- procesando los detalles
    declare @cod char(10),@lote char(15),@almacen int,@saldo int
    select codpro,Lote,almacen,saldo into #tempo1 from LibInvValorizadoD
    declare c_registro1 cursor for select * from #tempo1
    OPen c_registro1
    Fetch c_registro1 INTO @cod,@lote,@almacen,@saldo
    While @@Fetch_status=0
     begin
        exec sp_KardexDelMesD1 @cod,@lote,@almacen,@saldo,@inicioMes,@findeMes
        Fetch c_registro1 INTO @cod,@lote,@almacen,@saldo
     end
    close c_registro1
    deallocate c_registro1
end
GO
