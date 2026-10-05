-- Dirección Técnica / Ventas Psicotrópicos.
-- Conserva cantidades y signos, incluidas las notas de crédito.
-- La aplicación ejecuta el SP y lee t_psicotropico bajo una misma transacción y applock.
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_Ventas_psicotropicos]
    @fec1 smalldatetime, @fec2 smalldatetime
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM dbo.t_psicotropico;

    INSERT INTO dbo.t_psicotropico
        (Principo, Concentracion, Descripcion, Registro, FF, Cantidad, Ruc, Establecimiento,
         Distrito, Direccion, Lote, Fecha, Documento)
    SELECT Productos.Principio, Productos.Concentracion, Productos.Nombre AS Descripcion,
        Productos.regSanit,
        CASE WHEN CHARINDEX('TAB', Productos.Nombre) > 0 THEN 'TAB'
             WHEN CHARINDEX('GOT', Productos.Nombre) > 0 THEN 'GOT'
             ELSE NULL END AS FF,
        docdet.cantidad * tablas.conversion AS Cantidad,
        clientes.documento AS Ruc, clientes.razon AS Establecimiento,
        s.nom_dist AS Distrito, clientes.Direccion, docdet.lote,
        doccab.fecha, docdet.Numero AS NumFactura
    FROM docdet
    INNER JOIN doccab ON doccab.numero = docdet.numero
    INNER JOIN clientes ON clientes.Codclie = doccab.Codclie
    INNER JOIN productos ON productos.codpro = docdet.codpro
    INNER JOIN tablas ON tablas.n_codtabla = 350 AND RTRIM(c_describe) = docdet.codpro
    LEFT JOIN t_Clientes_ubigeo u ON u.CODIGO = doccab.Codclie
    LEFT JOIN Ubigeos_SUNAT s ON CONVERT(int, s.cod_dpto) = u.dpto
        AND CONVERT(int, s.Cod_prov) = u.provincia AND CONVERT(int, s.cod_dist) = u.distrito
    WHERE CONVERT(date, doccab.fecha) BETWEEN CONVERT(date, @fec1) AND CONVERT(date, @fec2)
        AND doccab.Eliminado = 0
    ORDER BY doccab.fecha;

    INSERT INTO dbo.t_psicotropico
        (Principo, Concentracion, Descripcion, Registro, FF, Cantidad, Ruc, Establecimiento,
         Distrito, Direccion, Lote, Fecha, Documento)
    SELECT Productos.Principio, Productos.Concentracion, Productos.Nombre AS Descripcion,
        Productos.regSanit,
        CASE WHEN CHARINDEX('TAB', Productos.Nombre) > 0 THEN 'TAB'
             WHEN CHARINDEX('GOT', Productos.Nombre) > 0 THEN 'GOT'
             ELSE NULL END AS FF,
        Notas_credito_deta.cantidad * tablas.conversion AS Cantidad,
        clientes.documento AS Ruc, clientes.razon AS Establecimiento,
        s.nom_dist AS Distrito, clientes.Direccion, Notas_credito_deta.lote,
        Notas_credito.fecha, Notas_credito_deta.Numero AS NumFactura
    FROM Notas_credito_deta
    INNER JOIN Notas_credito ON Notas_credito.numero = Notas_credito_deta.numero
    INNER JOIN clientes ON clientes.Codclie = Notas_credito.Codclie
    INNER JOIN productos ON productos.codpro = Notas_credito_deta.codpro
    INNER JOIN tablas ON tablas.n_codtabla = 350 AND RTRIM(c_describe) = Notas_credito_deta.codpro
    LEFT JOIN t_Clientes_ubigeo u ON u.CODIGO = Notas_credito.Codclie
    LEFT JOIN Ubigeos_SUNAT s ON CONVERT(int, s.cod_dpto) = u.dpto
        AND CONVERT(int, s.Cod_prov) = u.provincia AND CONVERT(int, s.cod_dist) = u.distrito
    WHERE CONVERT(date, Notas_credito.fecha) BETWEEN CONVERT(date, @fec1) AND CONVERT(date, @fec2)
        AND Notas_credito.Anulado = 0
    ORDER BY Notas_credito.fecha;
END
GO
