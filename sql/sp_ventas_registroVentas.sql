SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

ALTER PROCEDURE [dbo].[sp_ventas_registroVentas]
  @fec1 smalldatetime,
  @fec2 smalldatetime
AS
DECLARE @vigv decimal(9,2)
SET @vigv = (SELECT n_valor FROM valores WHERE c_valor = 'Igv')

DELETE t_registroVentas

INSERT INTO t_registroVentas
SELECT dbo.Doccab.Fecha, dbo.Doccab.fechav,
  CASE doccab.tipo WHEN 1 THEN '01' WHEN 2 THEN '03' WHEN 8 THEN '07' WHEN 9 THEN '08' END AS TipoDoc,
  LEFT(doccab.numero, CHARINDEX('-', doccab.Numero) - 1) AS Serie,
  SUBSTRING(doccab.numero, CHARINDEX('-', doccab.Numero) + 1, LEN(doccab.numero)) AS numero,
  CASE WHEN Eliminado = 1 THEN 0 ELSE CASE Clientes.tipoDoc WHEN 'L' THEN 1 WHEN 'R' THEN 6 WHEN 'D' THEN 1 END END AS Tipo,
  clientes.Documento AS NumeroClie,
  CASE WHEN Eliminado = 0 THEN clientes.Razon ELSE 'ANULADO' END AS Razon,
  0 AS ValorExp,
  CASE WHEN Eliminado = 1 THEN 0 ELSE CASE WHEN doccab.igv > 0 THEN Doccab.Subtotal ELSE 0 END END AS Gravado,
  CASE WHEN Eliminado = 0 THEN 0 ELSE CASE WHEN doccab.igv = 0 THEN Doccab.Subtotal ELSE 0 END END AS Exonerado,
  0 AS Inafecta, 0 AS ISC, doccab.Igv AS IGV, 0 AS Otros, doccab.Total,
  NULL AS TipoCAmbio, NULL AS Feca, NULL AS TipoF, NULL AS SerieF, NULL AS NumDocF,
  '12131' AS Cta12D, '121132' AS Cta12H, '70121' AS Cta70, '' AS cuenta10, NULL AS FecPago, '' AS Sindato,
  CASE WHEN doccab.eliminado = 1 THEN 'VENTA DE MERCADERIA ANULADA' ELSE 'VENTAS DE MERCADERIA' END AS Glosa
FROM dbo.Doccab
INNER JOIN dbo.Clientes ON dbo.Clientes.Codclie = dbo.Doccab.CodClie
WHERE CONVERT(date, doccab.fecha) BETWEEN CONVERT(date, @fec1) AND CONVERT(date, @fec2)

UNION ALL

SELECT dbo.Notas_credito.Fecha, dbo.Notas_credito.fecha, '07' AS TipoDoc,
  LEFT(Notas_credito.numero, CHARINDEX('-', Notas_credito.Numero) - 1) AS Serie,
  SUBSTRING(Notas_credito.numero, CHARINDEX('-', Notas_credito.Numero) + 1, LEN(Notas_credito.numero)) AS numero,
  CASE WHEN Anulado = 1 THEN 0 ELSE CASE Clientes.tipoDoc WHEN 'L' THEN 1 WHEN 'R' THEN 6 WHEN 'D' THEN 1 END END AS Tipo,
  clientes.Documento AS NumeroClie,
  CASE WHEN Anulado = 0 THEN clientes.Razon ELSE 'ANULADO' END AS Razon,
  0 AS ValorExp,
  CASE WHEN Anulado = 1 THEN 0 ELSE CASE WHEN Notas_credito.igv > 0 THEN -Notas_credito.Monto ELSE 0 END END AS Gravado,
  CASE WHEN Anulado = 0 THEN 0 ELSE CASE WHEN Notas_credito.igv = 0 THEN -Notas_credito.Monto ELSE 0 END END AS Exonerado,
  0 AS Inafecta, 0 AS ISC, Notas_credito.Igv AS IGV, 0 AS Otros, -Notas_credito.Total,
  NULL AS TipoCAmbio, NULL AS Feca, NULL AS TipoF, NULL AS SerieF, NULL AS NumDocF,
  '12131' AS Cta12D, '121132' AS Cta12H, '70121' AS Cta70, '' AS cuenta10, NULL AS FecPago, '' AS Sindato,
  CASE WHEN Notas_credito.Anulado = 1 THEN 'NOTA DE CREDITO ANULADA' ELSE UPPER(tablas.c_describe) END AS Glosa
FROM dbo.Notas_credito
INNER JOIN dbo.Clientes ON dbo.Clientes.Codclie = dbo.Notas_credito.CodClie
INNER JOIN tablas ON tablas.n_codtabla = 52 AND n_numero = Notas_credito.TipoNota
WHERE CONVERT(date, Notas_credito.fecha) BETWEEN CONVERT(date, @fec1) AND CONVERT(date, @fec2)

UNION ALL

SELECT dbo.Notas_debito.Fecha, dbo.Notas_debito.fecha, '08' AS TipoDoc,
  LEFT(Notas_debito.numero, CHARINDEX('-', Notas_debito.Numero) - 1) AS Serie,
  SUBSTRING(Notas_debito.numero, CHARINDEX('-', Notas_debito.Numero) + 1, LEN(Notas_debito.numero)) AS numero,
  CASE WHEN Anulado = 1 THEN 0 ELSE CASE Clientes.tipoDoc WHEN 'L' THEN 1 WHEN 'R' THEN 6 WHEN 'D' THEN 1 END END AS Tipo,
  clientes.Documento AS NumeroClie,
  CASE WHEN Anulado = 0 THEN clientes.Razon ELSE 'ANULADO' END AS Razon,
  0 AS ValorExp,
  CASE WHEN Anulado = 1 THEN 0 ELSE CASE WHEN Notas_debito.igv > 0 THEN Notas_debito.Monto ELSE 0 END END AS Gravado,
  CASE WHEN Anulado = 0 THEN 0 ELSE CASE WHEN Notas_debito.igv = 0 THEN Notas_debito.Monto ELSE 0 END END AS Exonerado,
  0 AS Inafecta, 0 AS ISC, Notas_debito.Igv AS IGV, 0 AS Otros, Notas_debito.Total,
  NULL AS TipoCAmbio, NULL AS Feca, NULL AS TipoF, NULL AS SerieF, NULL AS NumDocF,
  '12131' AS Cta12D, '121132' AS Cta12H, '70121' AS Cta70, '' AS cuenta10, NULL AS FecPago, '' AS Sindato,
  CASE WHEN Notas_debito.Anulado = 1 THEN 'NOTA DE CREDITO ANULADA' ELSE UPPER(tablas.c_describe) END AS Glosa
FROM dbo.Notas_debito
INNER JOIN dbo.Clientes ON dbo.Clientes.Codclie = dbo.Notas_debito.CodClie
INNER JOIN tablas ON tablas.n_codtabla = 340 AND n_numero = Notas_debito.TipoDebito
WHERE CONVERT(date, Notas_debito.fecha) BETWEEN CONVERT(date, @fec1) AND CONVERT(date, @fec2)
GO
