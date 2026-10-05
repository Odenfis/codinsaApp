-- Dirección Técnica / Compras Psicotrópicos. No incluye notas de crédito.
-- Instalar explícitamente después de t_psicotropico1_compatibility.sql.
-- Las ejecuciones externas deben coordinarse con CODINSA_COMPRAS_PSICOTROPICOS.
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_Compras_psicotropicos]
    @fec1 smalldatetime, @fec2 smalldatetime
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM dbo.t_psicotropico1;
    INSERT INTO dbo.t_psicotropico1
        (Principio, Concentracion, Descripcion, FF, NroFactura, Proveedor, fecha, Cantidad, lote)
    SELECT Productos.Principio, Productos.Concentracion, Productos.Nombre AS Descripcion,
        CASE WHEN CHARINDEX('TAB', Productos.Nombre) > 0 THEN 'TAB'
             WHEN CHARINDEX('GOT', Productos.Nombre) > 0 THEN 'GOT'
             ELSE NULL END AS FF,
        Doccom.Numero AS NroFactura, Proveedores.Razon AS Proveedor,
        Doccom.fecha, DetCom.cantidad * tablas.conversion AS Cantidad, DetCom.lote
    FROM DetCom
    INNER JOIN Doccom ON Doccom.numero = DetCom.numero
    INNER JOIN productos ON productos.codpro = DetCom.codpro
    INNER JOIN tablas ON tablas.n_codtabla = 350 AND RTRIM(c_describe) = DetCom.codpro
    INNER JOIN proveedores ON proveedores.CodProv = Doccom.codprov
    WHERE CONVERT(date, Doccom.fecha) BETWEEN CONVERT(date, @fec1) AND CONVERT(date, @fec2)
        AND Doccom.Eliminado = 0
    ORDER BY Doccom.fecha;
END
GO
