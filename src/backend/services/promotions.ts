import { Router, Response } from 'express';
import { getDbPool, sql } from '../../db';
import { db } from '../db/database';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/authMiddleware';

export function promotionRole(username: string): number | undefined {
  if (username.trim().toLocaleLowerCase() === 'administrador') return 1;
  return db.usuarios.find(u => u.estado && u.usuario.toLocaleLowerCase() === username.trim().toLocaleLowerCase())?.id_rol;
}

export function parsePromotion(body: any) {
  const text = (value: unknown, max: number, label: string) => {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new Error(`${label} es obligatorio y admite hasta ${max} caracteres.`);
    return value.trim();
  };
  const date = (value: unknown) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Ingrese fechas válidas.');
    const parsed = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value || value < '1900-01-01' || value > '2079-06-06') throw new Error('Ingrese fechas válidas dentro del rango permitido.');
    return value;
  };
  const laboratorio = text(body?.laboratorio, 4, 'Laboratorio');
  const descripcion = text(body?.descripcion, 100, 'Descripción');
  const inicio = date(body?.inicio), fin = date(body?.fin);
  if (inicio > fin) throw new Error('La fecha final no puede ser anterior a la inicial.');
  const producto = text(body?.producto, 10, 'Producto');
  const monto = body?.monto;
  if (typeof monto !== 'number' || !Number.isFinite(monto) || monto < 0 || monto > 99999999999999 || Math.abs(monto * 10000 - Math.round(monto * 10000)) > 0.001) throw new Error('Ingrese un monto válido con hasta cuatro decimales.');
  const cantidad = body?.cantidad;
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 2147483647) throw new Error('Ingrese una cantidad entera positiva.');
  if (!Array.isArray(body?.productos) || body.productos.length === 0 || body.productos.length > 2000) throw new Error('Seleccione entre 1 y 2000 productos asociados.');
  const productos: string[] = body.productos.map((v: unknown) => text(v, 10, 'Código de producto'));
  if (new Set(productos.map(p => p.toLocaleUpperCase())).size !== productos.length) throw new Error('No se permiten productos repetidos.');
  return { laboratorio, descripcion, inicio, fin, producto, monto, cantidad, productos };
}

export const promotionsRouter = Router();
promotionsRouter.use(authMiddleware, (req: AuthenticatedRequest, res, next) => {
  if (![1, 3].includes(promotionRole(req.user!.usuario) ?? 0)) return res.status(403).json({ error: 'Su usuario no tiene un perfil autorizado para Bonificaciones.' });
  next();
});
const failure = (res: Response, err: any) => {
  console.error('[PROMOCIONES]', err);
  if (err?.number === 2627 || err?.number === 2601 || err?.number === 1205) return res.status(409).json({ error: 'La promoción entró en conflicto con otra operación. Actualice e inténtelo nuevamente.' });
  return res.status(500).json({ error: 'No se pudo completar la operación de promociones.' });
};
const idParam = (s: string) => /^\d+$/.test(s) && Number(s) > 0 && Number(s) <= 2147483647 ? Number(s) : null;

// parsePromotion ya comprobó que se trata de una fecha ISO real y dentro de rango.
export function promotionSqlDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function promotionSaveQuery(productCount: number): string {
  return `DECLARE @codigo int=@id; IF @codigo IS NULL BEGIN SELECT @codigo=ISNULL(MAX(CodPromo),0)+1 FROM dbo.BoniPromo_cab WITH (UPDLOCK,HOLDLOCK); INSERT dbo.BoniPromo_cab(CodPromo,Laboratorio,Descripcion,Inicio,Fin,Monto,Producto,Cantidad) VALUES(@codigo,@lab,@descripcion,@inicio,@fin,@monto,@producto,@cantidad); END ELSE BEGIN UPDATE dbo.BoniPromo_cab SET Descripcion=@descripcion,Inicio=@inicio,Fin=@fin,Monto=@monto,Producto=@producto,Cantidad=@cantidad WHERE CodPromo=@codigo; DELETE dbo.BoniPromo_det WHERE Codpromo=@codigo; END; ${Array.from({ length: productCount }, (_, index) => `INSERT dbo.BoniPromo_det(Codpromo,CodPro) VALUES(@codigo,@detail${index});`).join(' ')} SELECT @codigo AS codigo;`;
}

promotionsRouter.get('/productos', async (req, res) => {
  const lab = typeof req.query.lab === 'string' ? req.query.lab.trim() : '';
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
  if (!lab || lab.length > 4) return res.status(400).json({ error: 'Seleccione un laboratorio válido.' });
  try {
    const pool = await getDbPool();
    const r = await pool.request().input('lab', sql.Char(4), lab).input('search', sql.NVarChar(102), `%${search}%`).query(`SELECT RTRIM(CodPro) AS codigo, RTRIM(Nombre) AS nombre FROM dbo.Productos WHERE Eliminado = 0 AND LEFT(CodPro,2)=LEFT(@lab,2) AND (CodPro LIKE @search OR Nombre LIKE @search) ORDER BY Nombre, CodPro`);
    return res.json({ data: r.recordset });
  } catch (err) { return failure(res, err); }
});
promotionsRouter.get('/', async (_req, res) => {
  try {
    const pool = await getDbPool();
    const r = await pool.request().query(`SELECT c.CodPromo AS codigo, RTRIM(c.Laboratorio) AS laboratorio, RTRIM(l.Descripcion) AS laboratorioNombre, RTRIM(c.Descripcion) AS descripcion, CONVERT(char(10),c.Inicio,23) AS inicio, CONVERT(char(10),c.Fin,23) AS fin, c.Monto AS monto, RTRIM(c.Producto) AS producto, RTRIM(p.Nombre) AS productoNombre, c.Cantidad AS cantidad FROM dbo.BoniPromo_cab c LEFT JOIN dbo.Laboratorios l ON l.CodLab=c.Laboratorio LEFT JOIN dbo.Productos p ON p.CodPro=c.Producto ORDER BY c.CodPromo DESC`);
    return res.json({ data: r.recordset });
  } catch (err) { return failure(res, err); }
});
promotionsRouter.get('/:id', async (req, res) => {
  const id = idParam(req.params.id); if (!id) return res.status(400).json({ error: 'Código inválido.' });
  try {
    const pool = await getDbPool();
    const r = await pool.request().input('id', sql.Int, id).query(`SELECT c.CodPromo AS codigo, RTRIM(c.Laboratorio) AS laboratorio, RTRIM(c.Descripcion) AS descripcion, CONVERT(char(10),c.Inicio,23) AS inicio, CONVERT(char(10),c.Fin,23) AS fin, c.Monto AS monto, RTRIM(c.Producto) AS producto, RTRIM(p.Nombre) AS productoNombre, c.Cantidad AS cantidad FROM dbo.BoniPromo_cab c LEFT JOIN dbo.Productos p ON p.CodPro=c.Producto WHERE c.CodPromo=@id; SELECT RTRIM(d.CodPro) AS codigo, RTRIM(p.Nombre) AS nombre FROM dbo.BoniPromo_det d LEFT JOIN dbo.Productos p ON p.CodPro=d.CodPro WHERE d.Codpromo=@id ORDER BY p.Nombre,d.CodPro`);
    if (!r.recordsets[0][0]) return res.status(404).json({ error: 'Promoción no encontrada.' });
    return res.json({ data: { ...r.recordsets[0][0], productos: r.recordsets[1] } });
  } catch (err) { return failure(res, err); }
});
async function save(req: AuthenticatedRequest, res: Response) {
  const id = req.method === 'PUT' ? idParam(req.params.id) : null;
  if (req.method === 'PUT' && !id) return res.status(400).json({ error: 'Código inválido.' });
  let data: ReturnType<typeof parsePromotion>;
  try { data = parsePromotion(req.body); } catch (err) { return res.status(400).json({ error: (err as Error).message }); }
  let tx: InstanceType<typeof sql.Transaction> | undefined;
  try {
    const pool = await getDbPool(); tx = new sql.Transaction(pool); await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const request = () => new sql.Request(tx!);
    const lock = await request().input('lab', sql.Char(4), data.laboratorio).input('id', sql.Int, id).query(`SELECT CodLab FROM dbo.Laboratorios WHERE CodLab=@lab; SELECT Laboratorio FROM dbo.BoniPromo_cab WITH (UPDLOCK,HOLDLOCK) WHERE CodPromo=@id`);
    if (!lock.recordsets[0].length) throw new Error('VALID:Laboratorio no encontrado.');
    if (id && !lock.recordsets[1].length) throw new Error('NOTFOUND');
    if (id && String(lock.recordsets[1][0].Laboratorio).trim() !== data.laboratorio) throw new Error('VALID:No se puede cambiar el laboratorio de una promoción existente.');
    const codes = [...new Set([data.producto, ...data.productos])];
    const check = request().input('lab', sql.Char(4), data.laboratorio);
    codes.forEach((code, index) => check.input(`code${index}`, sql.Char(10), code));
    const valid = await check.query(`SELECT COUNT(DISTINCT RTRIM(p.CodPro)) AS total FROM dbo.Productos p WHERE p.Eliminado=0 AND LEFT(p.CodPro,2)=LEFT(@lab,2) AND p.CodPro IN (${codes.map((_, index) => `@code${index}`).join(',')})`);
    if (valid.recordset[0].total !== codes.length) throw new Error('VALID:Hay productos inexistentes, eliminados o de otro laboratorio.');
    const q = request().input('id', sql.Int, id).input('lab', sql.Char(4), data.laboratorio).input('descripcion', sql.VarChar(100), data.descripcion).input('inicio', sql.Date, promotionSqlDate(data.inicio)).input('fin', sql.Date, promotionSqlDate(data.fin)).input('monto', sql.Money, data.monto).input('producto', sql.Char(10), data.producto).input('cantidad', sql.Int, data.cantidad);
    data.productos.forEach((code, index) => q.input(`detail${index}`, sql.Char(10), code));
    const result = await q.query(promotionSaveQuery(data.productos.length));
    await tx.commit(); tx = undefined;
    const codigo = result.recordset[0].codigo;
    db.addAuditLog(req.user!.usuario, 'Bonificaciones', `${id ? 'Actualizó' : 'Creó'} promoción ${codigo}`, req.ip);
    return res.status(id ? 200 : 201).json({ codigo });
  } catch (err: any) {
    if (tx) { try { await tx.rollback(); } catch {} }
    if (err.message === 'NOTFOUND') return res.status(404).json({ error: 'Promoción no encontrada.' });
    if (err.message?.startsWith('VALID:')) return res.status(400).json({ error: err.message.slice(6) });
    return failure(res, err);
  }
}
promotionsRouter.post('/', save);
promotionsRouter.put('/:id', save);
