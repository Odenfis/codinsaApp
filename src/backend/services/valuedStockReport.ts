import { ValuedStockMovement, ValuedStockResponse, ValuedStockRow, ValuedStockTotals } from '../../types';

const textValue = (value: unknown) => value == null ? '' : String(value).trim();
const numericValue = (value: unknown) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
};
const dateValue = (value: unknown) => value instanceof Date ? value.toISOString() : textValue(value);

export function buildValuedStockReport(
  records: Record<string, unknown>[], mes: number, anio: number
): ValuedStockResponse {
  const groups = new Map<string, { row: ValuedStockRow; initialCount: number }>();

  for (const record of records) {
    const codpro = textValue(record.Codpro);
    const lote = textValue(record.Lote);
    const almacen = numericValue(record.Almacen);
    const key = JSON.stringify([codpro, lote, almacen]);
    let group = groups.get(key);
    if (!group) {
      group = {
        initialCount: 0,
        row: {
          Codpro: codpro,
          Lote: lote,
          Almacen: almacen,
          CodSunat: textValue(record.CodSunat),
          TipoPro: textValue(record.TipoPro),
          Descripcion: textValue(record.Descripcion),
          UniMed: textValue(record.UniMed),
          StockIni: 0, InitialValorUni: 0, InitialValorizado: 0, Ingresos: 0, Salidas: 0, Saldo: 0, ValorUni: 0, Valorizado: 0,
          movements: []
        }
      };
      groups.set(key, group);
    }

    const movement: ValuedStockMovement = {
      Numero: numericValue(record.Numero),
      Fecha: dateValue(record.Fecha),
      TipoDoc: textValue(record.TipoDoc),
      Documento: textValue(record.Documento),
      StockIni: numericValue(record.StockIni),
      Ingresos: numericValue(record.Ingresos),
      CosIng: numericValue(record.CosIng),
      CostoI: numericValue(record.CostoI),
      Salidas: numericValue(record.Salidas),
      CosUnit: numericValue(record.CosUnit),
      CostoS: numericValue(record.CostoS),
      Saldo: numericValue(record.Saldo),
      ValorUni: numericValue(record.ValorUni),
      Valorizado: numericValue(record.Valorizado)
    };

    if (movement.Numero === 0) {
      group.initialCount += 1;
      if (group.initialCount > 1) {
        throw new Error(`Hay saldos iniciales duplicados para el producto ${codpro}, lote ${lote}, almacén ${almacen}.`);
      }
      group.row.StockIni = movement.StockIni;
      group.row.InitialValorUni = movement.ValorUni;
      group.row.InitialValorizado = movement.Valorizado;
      group.row.Saldo = movement.Saldo;
      group.row.ValorUni = movement.ValorUni;
      group.row.Valorizado = movement.Valorizado;
    } else {
      group.row.movements.push(movement);
      group.row.Ingresos += movement.Ingresos;
      group.row.Salidas += movement.Salidas;
    }
  }

  const data = Array.from(groups.values()).map(({ row, initialCount }) => {
    if (initialCount !== 1) throw new Error(`Falta el saldo inicial del producto ${row.Codpro}, lote ${row.Lote}.`);
    row.movements.sort((a, b) => a.Numero - b.Numero);
    const finalMovement = row.movements.at(-1);
    if (finalMovement) {
      row.Saldo = finalMovement.Saldo;
      row.ValorUni = finalMovement.ValorUni;
      row.Valorizado = finalMovement.Valorizado;
    }
    return row;
  }).sort((a, b) => a.Descripcion.localeCompare(b.Descripcion, 'es') || a.Codpro.localeCompare(b.Codpro) || a.Lote.localeCompare(b.Lote) || a.Almacen - b.Almacen);

  const totals: ValuedStockTotals = data.reduce((sum, row) => ({
    StockIni: sum.StockIni + row.StockIni,
    Ingresos: sum.Ingresos + row.Ingresos,
    Salidas: sum.Salidas + row.Salidas,
    Saldo: sum.Saldo + row.Saldo,
    Valorizado: sum.Valorizado + row.Valorizado
  }), { StockIni: 0, Ingresos: 0, Salidas: 0, Saldo: 0, Valorizado: 0 });

  return {
    data,
    total: data.length,
    movementTotal: data.reduce((sum, row) => sum + row.movements.length, 0),
    totals,
    period: {
      mes, anio,
      desde: `${anio}-${String(mes).padStart(2, '0')}-01`,
      hasta: `${anio}-${String(mes).padStart(2, '0')}-${String(new Date(Date.UTC(anio, mes, 0)).getUTCDate()).padStart(2, '0')}`
    }
  };
}
