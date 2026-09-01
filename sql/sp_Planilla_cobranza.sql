SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

ALTER PROCEDURE [dbo].[sp_Planilla_cobranza]
  @serie CHAR(4),
  @numero CHAR(8)
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    pc.Serie,
    pc.Numero,
    pc.Vendedor,
    e.Nombre,
    pc.FechaCrea,
    pc.FechaIng,
    m.descripcion AS FormaPago,
    pd.CodClie,
    c.Documento AS RUC,
    c.Razon,
    pd.documento,
    pd.tipodoc,
    ISNULL(z.Descripcion, '') AS Lugar,
    pd.fechaFac,
    pd.Valor,
    pd.NotaCred,
    pd.Descuento,
    pd.Efectivo,
    pd.Deposito,
    pd.Letra,
    pd.NroLetra,
    pd.Transferencia,
    pd.Cheque,
    pd.NroCheque,
    pd.Banco AS CtaBanco,
    ISNULL(RTRIM(bancos.Banco), '') AS Banco,
    pd.Descuento + pd.Efectivo AS DescuentoEfectivo,
    pd.Deposito + pd.Letra + pd.Transferencia + pd.Cheque AS Total,
    pd.NroOperacion
  FROM planc_cobranza pc
  INNER JOIN PlanD_cobranza pd ON pd.serie = pc.serie AND pc.numero = pd.numero
  INNER JOIN empleados e ON e.Codemp = pc.Vendedor
  LEFT JOIN medioPagoSunat m ON m.id = pc.FormaPago
  INNER JOIN clientes c ON c.codclie = pd.CodClie
  LEFT JOIN zonas z ON z.codzona = c.Zona
  LEFT JOIN Bancos ON Bancos.Cuenta = pd.Banco
  WHERE pc.Serie = @serie AND pc.Numero = @numero;

  SELECT * FROM bancos;
END
GO
