SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

ALTER PROCEDURE [dbo].[sp_Ventas_ControlDia]
AS
DECLARE @f1 smalldatetime
SET @f1 = GETDATE()
SET DATEFORMAT dmy

SELECT doccab.codclie AS Nro, clientes.razon AS NomComercial, s.nom_dist AS Distrito,
  clientes.documento AS Ruc_Dni, doccabped.numero AS NP, empleados.nombre AS Vendedor,
  r.Nombre AS Representante, tablas.c_describe AS Condicion,
  SUBSTRING(doccab.numero, CHARINDEX('-', doccab.Numero) + 1, LEN(doccab.numero)) AS Factura,
  doccab.subtotal AS Monto, doccab.total AS MasIgv, doccabped.Observacion
FROM Doccab
INNER JOIN doccabped ON doccabped.numero = doccab.NroPedido
INNER JOIN clientes ON dbo.Clientes.Codclie = dbo.Doccab.CodClie
INNER JOIN empleados ON empleados.Codemp = doccab.Vendedor
INNER JOIN tablas ON tablas.n_codtabla = 22 AND tablas.n_numero = doccabped.condicion
LEFT JOIN t_Clientes_ubigeo u ON u.CODIGO = clientes.Codclie
LEFT JOIN Ubigeos_SUNAT s ON CONVERT(int, s.cod_dpto) = u.dpto
  AND CONVERT(int, s.Cod_prov) = u.provincia
  AND CONVERT(int, s.cod_dist) = u.distrito
LEFT JOIN representantes r ON r.codigo = doccabped.Representante
WHERE CONVERT(date, doccab.fecha) = CONVERT(date, @f1)
GO
