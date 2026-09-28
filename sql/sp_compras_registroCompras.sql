SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

ALTER PROCEDURE [dbo].[sp_compras_registroCompras]
  @fec1 smalldatetime,
  @fec2 smalldatetime
AS
DECLARE @vigv decimal(9,2)
SET @vigv = (SELECT n_valor FROM valores WHERE c_valor = 'Igv')

DELETE dbo.t_RegistroCompras

INSERT INTO dbo.t_RegistroCompras
  (Fecha, FechaV, TipoDoc, Serie, Numero, Tipo, NumeroProv, Razon, ValorExp,
   BaseImponibleM, IGVm, BaseImponibleG, IGVg, BaseImponible3, Igv3,
   Total, NumEmitido, NumDetraccion, FechaDetraccion, tipoCambio,
   FecRefer, TipoRef, SerieRef, NroComprobante)
SELECT dbo.Doccom.Fecha, dbo.CtaProveedor.FechaV,
  CASE Doccom.tipo WHEN 1 THEN '01' WHEN 2 THEN '03' WHEN 8 THEN '07' WHEN 9 THEN '08' END AS TipoDoc,
  LEFT(Doccom.numero, CHARINDEX('-', Doccom.Numero) - 1) AS Serie,
  SUBSTRING(doccom.numero, CHARINDEX('-', doccom.Numero) + 1, LEN(doccom.numero)) AS Numero,
  CASE WHEN doccom.Eliminado = 1 THEN 0
    ELSE CASE Proveedores.tipoDoc WHEN 'L' THEN 1 WHEN 'R' THEN 6 WHEN 'D' THEN 1 END
  END AS Tipo,
  Proveedores.Documento AS NumeroProv,
  CASE WHEN doccom.Eliminado = 0 THEN Proveedores.Razon ELSE 'ANULADO' END AS Razon,
  0 AS ValorExp,
  CASE WHEN doccom.Eliminado = 1 THEN 0 ELSE doccom.Subtotal END AS BaseImponibleM,
  CASE WHEN doccom.Eliminado = 1 THEN 0 ELSE doccom.igv END AS IGVm,
  0 AS BaseImponibleG, 0 AS IGVg,
  0 AS BaseImponible3, 0 AS Igv3,
  Doccom.Total, ' ' AS NumEmitido, '' AS NumDetraccion, NULL AS FechaDetraccion,
  0 AS tipoCambio, NULL AS FecRefer, NULL AS TipoRef, NULL AS SerieRef, NULL AS NroComprobante
FROM dbo.Doccom
INNER JOIN dbo.Proveedores ON dbo.Proveedores.codprov = dbo.Doccom.Codprov
INNER JOIN dbo.CtaProveedor ON CtaProveedor.codprov = doccom.codprov
  AND CtaProveedor.documento = doccom.numero AND CtaProveedor.tipo = doccom.tipo
WHERE CONVERT(date, Doccom.fecha) BETWEEN CONVERT(date, @fec1) AND CONVERT(date, @fec2)

UNION ALL

SELECT dbo.Notas_CreditoG.Fecha, dbo.CtaProveedor.FechaV, '07' AS TipoDoc,
  LEFT(Notas_CreditoG.numero, CHARINDEX('-', Notas_CreditoG.Numero) - 1) AS Serie,
  SUBSTRING(Notas_CreditoG.numero, CHARINDEX('-', Notas_CreditoG.Numero) + 1, LEN(Notas_CreditoG.numero)) AS Numero,
  CASE WHEN Notas_CreditoG.Anulado = 1 THEN 0
    ELSE CASE Proveedores.tipoDoc WHEN 'L' THEN 1 WHEN 'R' THEN 6 WHEN 'D' THEN 1 END
  END AS Tipo,
  Proveedores.Documento AS NumeroProv,
  CASE WHEN Notas_CreditoG.Anulado = 0 THEN Proveedores.Razon ELSE 'ANULADO' END AS Razon,
  0 AS ValorExp,
  CASE WHEN Notas_CreditoG.Anulado = 1 THEN 0 ELSE Notas_CreditoG.Monto END AS BaseImponibleM,
  CASE WHEN Notas_CreditoG.Anulado = 1 THEN 0 ELSE Notas_CreditoG.igv END AS IGVm,
  0 AS BaseImponibleG, 0 AS IGVg,
  0 AS BaseImponible3, 0 AS Igv3,
  Notas_CreditoG.Total, ' ' AS NumEmitido, '' AS NumDetraccion, NULL AS FechaDetraccion,
  0 AS tipoCambio, doccom.fecha AS FecRefer,
  CASE Doccom.tipo WHEN 1 THEN '01' WHEN 2 THEN '03' WHEN 8 THEN '07' WHEN 9 THEN '08' END AS TipoRef,
  LEFT(Doccom.numero, CHARINDEX('-', Doccom.Numero) - 1) AS SerieRef,
  SUBSTRING(doccom.numero, CHARINDEX('-', doccom.Numero) + 1, LEN(doccom.numero)) AS NroComprobante
FROM dbo.Notas_CreditoG
INNER JOIN dbo.Proveedores ON dbo.Proveedores.codprov = dbo.Notas_CreditoG.Codprov
INNER JOIN dbo.CtaProveedor ON CtaProveedor.codprov = Notas_CreditoG.codprov
  AND CtaProveedor.documento = Notas_CreditoG.numero AND CtaProveedor.tipo = 8
LEFT JOIN dbo.doccom ON doccom.numero = Notas_CreditoG.Documento
WHERE CONVERT(date, Notas_CreditoG.fecha) BETWEEN CONVERT(date, @fec1) AND CONVERT(date, @fec2)
GO
