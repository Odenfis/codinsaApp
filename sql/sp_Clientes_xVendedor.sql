SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

ALTER PROCEDURE [dbo].[sp_Clientes_xVendedor]
  @vende int
AS
SELECT c.codclie, c.Documento AS Ruc, c.Razon, c.titular, c.Direccion, c.Telefono1, c.Telefono2, c.email,
  s.nom_dpto AS Departamento, z.Descripcion AS Localidad, e.Nombre AS Vendedor,
  s.ubigeo_6d, c.Limite,
  CASE c.tipoClie WHEN 1 THEN 'A' WHEN 2 THEN 'A' WHEN 3 THEN 'B' ELSE 'C' END AS TipoCliente,
  c.RegDigemid
FROM clientes c
INNER JOIN empleados e ON e.Codemp = c.Vendedor
LEFT JOIN t_Clientes_ubigeo u ON u.CODIGO = c.Codclie
LEFT JOIN Ubigeos_SUNAT s ON CONVERT(int, s.cod_dpto) = u.dpto
  AND CONVERT(int, s.Cod_prov) = u.provincia
  AND CONVERT(int, s.cod_dist) = u.distrito
LEFT JOIN zonas z ON z.Codzona = c.Zona
WHERE c.Vendedor = @vende
GO
