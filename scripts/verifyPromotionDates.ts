import assert from 'node:assert/strict';
import { getDbPool, sql } from '../src/db';
import { parsePromotion, promotionSaveQuery, promotionSqlDate } from '../src/backend/services/promotions';

// Utiliza únicamente tablas temporales y revierte toda la transacción.
async function main() {
  const pool = await getDbPool();
  const tx = new sql.Transaction(pool);
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    await new sql.Request(tx).batch(`
      CREATE TABLE #BoniPromo_cab (CodPromo int PRIMARY KEY, Laboratorio char(4) NOT NULL, Descripcion char(100), Inicio smalldatetime NOT NULL, Fin smalldatetime NOT NULL, Monto money NOT NULL, Producto char(10) NOT NULL, Cantidad int NOT NULL);
      CREATE TABLE #BoniPromo_det (Codpromo int NOT NULL, CodPro char(10) NOT NULL);
    `);
    const query = promotionSaveQuery(2).replaceAll('dbo.BoniPromo_cab', '#BoniPromo_cab').replaceAll('dbo.BoniPromo_det', '#BoniPromo_det');
    for (const format of ['dmy', 'mdy'] as const) {
      await new sql.Request(tx).query(`SET DATEFORMAT ${format}`);
      for (const [inicio, fin] of [['2026-11-24', '2027-01-31'], ['2024-02-29', '2024-12-31'], ['1900-01-01', '2079-06-06']]) {
        const data = parsePromotion({ laboratorio: '01', descripcion: 'Prueba', inicio, fin, monto: 10.25, producto: '01001', cantidad: 1, productos: ['01001', '01002'] });
        const save = (id: number | null) => new sql.Request(tx).input('id', sql.Int, id).input('lab', sql.Char(4), data.laboratorio).input('descripcion', sql.VarChar(100), data.descripcion).input('inicio', sql.Date, promotionSqlDate(data.inicio)).input('fin', sql.Date, promotionSqlDate(data.fin)).input('monto', sql.Money, data.monto).input('producto', sql.Char(10), data.producto).input('cantidad', sql.Int, data.cantidad).input('detail0', sql.Char(10), data.productos[0]).input('detail1', sql.Char(10), data.productos[1]).query(query);
        const created = await save(null);
        const codigo = created.recordset[0].codigo;
        const verify = async () => {
          const result = await new sql.Request(tx).input('id', sql.Int, codigo).query(`SELECT CONVERT(char(10), Inicio, 23) AS inicio, CONVERT(char(10), Fin, 23) AS fin, (SELECT COUNT(*) FROM #BoniPromo_det WHERE Codpromo=@id) AS total FROM #BoniPromo_cab WHERE CodPromo=@id`);
          assert.deepEqual(result.recordset[0], { inicio, fin, total: 2 });
        };
        await verify();
        // Cambiar primero las fechas hace que la prueba compruebe también la rama UPDATE.
        await new sql.Request(tx).input('id', sql.Int, codigo).query(`UPDATE #BoniPromo_cab SET Inicio=CONVERT(smalldatetime,'20000101',112), Fin=CONVERT(smalldatetime,'20000101',112) WHERE CodPromo=@id`);
        await save(codigo);
        await verify();
        console.log(`${format}: creación y edición ${inicio} / ${fin} correctas`);
      }
    }
  } finally {
    await tx.rollback();
    await pool.close();
  }
}
main().catch(err => { console.error(err); process.exitCode = 1; });
