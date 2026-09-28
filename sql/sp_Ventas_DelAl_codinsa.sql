SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

ALTER PROCEDURE [dbo].[sp_Ventas_DelAl_codinsa]
  @fec1 smalldatetime,
  @fec2 smalldatetime
AS
SET DATEFORMAT dmy

SELECT doccab.fecha, dbo.Doccab.Tipo, LEFT(Tablas.c_describe, 2) AS Tipodoc,
  LEFT(doccab.numero, CHARINDEX('-', doccab.Numero) - 1) AS Serie,
  SUBSTRING(doccab.numero, CHARINDEX('-', doccab.Numero) + 1, LEN(doccab.numero)) AS Nro_doc,
  docdet.codpro AS Codigo, Productos.nombre AS Producto, docdet.cantidad, docdet.precio,
  ROUND(docdet.cantidad * docdet.precio * (1 - docdet.descuento1 / 100) * (1 - docdet.descuento2 / 100) * (1 - docdet.descuento3 / 100), 2) AS Total,
  docdet.lote, docdet.Vencimiento, doccab.vendedor, clientes.Zona,
  LEFT(docdet.codpro, 2) AS Laboratorio, clientes.documento AS Ruc_Dni,
  clientes.razon AS Empresa, clientes.Direccion, z.Descripcion AS Lugar,
  s.nom_dpto AS Departamento, s.nom_prov AS Provincia, s.nom_dist AS Distrito
FROM Doccab
INNER JOIN docdet ON docdet.numero = doccab.numero AND docdet.tipo = doccab.tipo
INNER JOIN clientes ON dbo.Clientes.Codclie = dbo.Doccab.CodClie
INNER JOIN tablas ON tablas.n_codtabla = 3 AND tablas.n_numero = doccab.tipo
INNER JOIN productos ON productos.codpro = docdet.codpro
LEFT JOIN t_Clientes_ubigeo u ON u.CODIGO = clientes.Codclie
LEFT JOIN Ubigeos_SUNAT s ON CONVERT(int, s.cod_dpto) = u.dpto
  AND CONVERT(int, s.Cod_prov) = u.provincia
  AND CONVERT(int, s.cod_dist) = u.distrito
LEFT JOIN zonas z ON z.Codzona = clientes.Zona
WHERE CONVERT(date, doccab.fecha) BETWEEN CONVERT(date, @fec1) AND CONVERT(date, @fec2)
GO
