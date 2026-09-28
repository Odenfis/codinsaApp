SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
ALTER PROCEDURE [dbo].[sp_Productos_PrecionMargenes]
  @labora char(2)
AS
SELECT
  p.codpro AS Codigo,
  p.Nombre AS Producto,
  p.stock,
  ROUND(p.PventaMa * (1 + (SELECT n_valor FROM valores WHERE c_valor = 'Igv') / 100), 2) AS PVF,
  ROUND(p.Costo * (1 + (SELECT n_valor FROM valores WHERE c_valor = 'Igv') / 100), 2) AS CostoIgv,
  ROUND(p.Costo * (1 + (SELECT n_valor FROM valores WHERE c_valor = 'Igv') / 100) * 1.10, 2) AS Mas10,
  ROUND(p.Costo * (1 + (SELECT n_valor FROM valores WHERE c_valor = 'Igv') / 100) * 1.15, 2) AS Mas15,
  ROUND(p.Costo * (1 + (SELECT n_valor FROM valores WHERE c_valor = 'Igv') / 100) * 1.20, 2) AS Mas20,
  ROUND(p.Costo * (1 + (SELECT n_valor FROM valores WHERE c_valor = 'Igv') / 100) * 1.25, 2) AS Mas25
FROM productos p
WHERE LEFT(codpro, 2) = @labora AND p.stock > 0
GO
