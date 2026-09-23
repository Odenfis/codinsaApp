SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
ALTER PROCEDURE [dbo].[sp_Productos_SaldosStock]
AS
SELECT
    p.codpro AS Codigo,
    p.Codlab1 AS CodSunat,
    p.Nombre AS Producto,
    p.Principio AS PrincipioActivo,
    s.saldo AS stock,
    ROUND(p.PventaMa * (1 + (SELECT n_valor FROM valores WHERE c_valor = 'Igv') / 100), 2) AS PVF,
    s.lote AS Lotes,
    s.vencimiento
FROM productos p
INNER JOIN saldos s ON s.codpro = p.codpro
WHERE p.stock > 0
GO
