/**
 * @license
 * Tool Kit Enterprise Platform Backend API Server
 * Node.js + Express REST API & Vite SPA Middleware
 * Puerto: 3000
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import session from 'express-session';
import { createServer as createViteServer } from 'vite';
import { getDbPool, sql } from './src/db';
import { desencriptarPassword } from './src/authUtils';
import { authMiddleware, AuthenticatedRequest } from './src/backend/middlewares/authMiddleware';
import { AuthService, DashboardService } from './src/backend/services';
import { ClientRepository, ProviderRepository, UserRepository, ReportRepository, AuditRepository } from './src/backend/repositories';
import { db } from './src/backend/db/database';
import { BackupConfigManager } from './src/backend/backupConfig';
import { BackupScheduler } from './src/backend/backup/backupScheduler';
import { getNisiraCount, exportNisiraToDbf } from './src/backend/services/NisiraExportService';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'default_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Inyección de servicios y repositorios
const authService = new AuthService();
const dashboardService = new DashboardService();
const clientRepo = new ClientRepository();
const providerRepo = new ProviderRepository();
const userRepo = new UserRepository();
const reportRepo = new ReportRepository();
const auditRepo = new AuditRepository();
const backupConfigManager = new BackupConfigManager();
const backupScheduler = new BackupScheduler(backupConfigManager);

// Logging Middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`[API LOG] ${req.method} ${req.url} - ${new Date().toISOString()}`);
  }
  next();
});

// ==============================================================================
// 1. ENDPOINTS DE AUTENTICACIÓN Y MENÚ DINÁMICO
// ==============================================================================

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
    }

    const pool = await getDbPool();
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .query('SELECT [Password] FROM [dbo].[Usuarios] WHERE [Usuario] = @username');

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    const storedHash = result.recordset[0].Password;
    const decryptedPassword = desencriptarPassword(storedHash);

    if (decryptedPassword === password) {
      req.session.user = { usuario: username };
      return res.json({ success: true, user: { usuario: username } });
    } else {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }
  } catch (err: any) {
    console.error('[LOGIN ERROR]', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

app.get('/api/auth/users', async (req: Request, res: Response) => {
  try {
    const users = await userRepo.getAll();
    return res.json({ users });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al obtener usuarios.' });
  }
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Error al cerrar sesión.' });
    res.json({ success: true });
  });
});

app.get('/api/session', (req: Request, res: Response) => {
  if (req.session.user) {
    return res.json({ authenticated: true, user: req.session.user });
  }
  return res.json({ authenticated: false });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  if (req.session.user) {
    return res.json({ user: req.session.user });
  }
  return res.status(401).json({ error: 'No autenticado' });
});

app.get('/api/modules', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const idRol = req.user?.id_rol || 1;
  const allowedModuleIds = db.rolesModulos[idRol] || [];
  const menu = db.modulos
    .filter(m => allowedModuleIds.includes(m.id_modulo) && m.estado)
    .sort((a, b) => a.orden - b.orden);
  return res.json({ modules: menu });
});

// ==============================================================================
// 2. ENDPOINTS DEL DASHBOARD INICIAL (KPIs, Gráficos y Transacciones)
// ==============================================================================

app.get('/api/dashboard/summary', authMiddleware, (req: Request, res: Response) => {
  return res.json(dashboardService.getSummary());
});

app.get('/api/dashboard/activity', authMiddleware, (req: Request, res: Response) => {
  return res.json(dashboardService.getActivityChart());
});

app.get('/api/dashboard/transactions', authMiddleware, (req: Request, res: Response) => {
  return res.json(dashboardService.getRecentTransactions());
});

// ==============================================================================
// 3. ENDPOINTS CRUD DE MÓDULOS DEL ERP (Clientes, Proveedores, Usuarios, etc)
// ==============================================================================

// CLIENTES
app.get('/api/clients', authMiddleware, (req: Request, res: Response) => {
  const search = (req.query.search as string) || '';
  return res.json({ data: clientRepo.getAll(search), total: clientRepo.getAll(search).length });
});

app.post('/api/clients', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const newClient = clientRepo.create(req.body);
  db.addAuditLog(req.user?.nombres + ' ' + req.user?.apellidos, 'Clients', `Creó cliente RUC ${newClient.codigo_ruc}`, req.ip);
  return res.status(201).json(newClient);
});

app.put('/api/clients/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const updated = clientRepo.update(Number(req.params.id), req.body);
  if (!updated) return res.status(404).json({ error: 'Cliente no encontrado' });
  db.addAuditLog(req.user?.nombres + ' ' + req.user?.apellidos, 'Clients', `Actualizó cliente ID ${req.params.id}`, req.ip);
  return res.json(updated);
});

app.delete('/api/clients/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const deleted = clientRepo.delete(Number(req.params.id));
  if (!deleted) return res.status(404).json({ error: 'Cliente no encontrado' });
  db.addAuditLog(req.user?.nombres + ' ' + req.user?.apellidos, 'Clients', `Eliminó cliente ID ${req.params.id}`, req.ip);
  return res.json({ success: true });
});

// PROVEEDORES
app.get('/api/providers', authMiddleware, (req: Request, res: Response) => {
  const search = (req.query.search as string) || '';
  return res.json({ data: providerRepo.getAll(search), total: providerRepo.getAll(search).length });
});

app.post('/api/providers', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const newProv = providerRepo.create(req.body);
  db.addAuditLog(req.user?.nombres + ' ' + req.user?.apellidos, 'Providers', `Creó proveedor RUC ${newProv.codigo_ruc}`, req.ip);
  return res.status(201).json(newProv);
});

app.put('/api/providers/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const updated = providerRepo.update(Number(req.params.id), req.body);
  if (!updated) return res.status(404).json({ error: 'Proveedor no encontrado' });
  db.addAuditLog(req.user?.nombres + ' ' + req.user?.apellidos, 'Providers', `Actualizó proveedor ID ${req.params.id}`, req.ip);
  return res.json(updated);
});

app.delete('/api/providers/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const deleted = providerRepo.delete(Number(req.params.id));
  if (!deleted) return res.status(404).json({ error: 'Proveedor no encontrado' });
  db.addAuditLog(req.user?.nombres + ' ' + req.user?.apellidos, 'Providers', `Eliminó proveedor ID ${req.params.id}`, req.ip);
  return res.json({ success: true });
});

// ==============================================================================
// 3c. ENDPOINTS DE PRODUCTOS (Listado con filtros desde SQL Server real)
// ==============================================================================

app.get('/api/productos', authMiddleware, async (req: Request, res: Response) => {
  try {
    const pool = await getDbPool();
    const search = (req.query.search as string) || '';
    const linea = (req.query.linea as string) || '';
    const lab = (req.query.lab as string) || '';

    let query = `SELECT p.CodPro, p.CodBar, p.Nombre, p.Clinea, p.Stock, p.Costo, p.PventaMa, p.PventaMi, p.Eliminado, p.CodLab, l.Descripcion AS linea_descripcion, lab.Descripcion AS lab_descripcion FROM Productos p LEFT JOIN Lineas l ON p.Clinea = l.CodLinea LEFT JOIN Laboratorios lab ON LEFT(p.CodPro, 2) = LEFT(lab.CodLab, 2) WHERE p.Eliminado = 0`;
    const request = pool.request();

    if (search) {
      query += ` AND p.Nombre LIKE @search`;
      request.input('search', sql.NVarChar, `%${search}%`);
    }
    if (linea) {
      query += ` AND p.Clinea = @linea`;
      request.input('linea', sql.Int, parseInt(linea));
    }
    if (lab) {
      query += ` AND LEFT(p.CodPro, 2) = LEFT(@lab, 2)`;
      request.input('lab', sql.Char(4), lab);
    }

    query += ` ORDER BY p.Nombre`;
    const result = await request.query(query);
    return res.json({ data: result.recordset, total: result.recordset.length });
  } catch (err: any) {
    console.error('[PRODUCTOS ERROR]', err);
    return res.status(500).json({ error: 'Error al obtener productos.' });
  }
});

app.get('/api/productos/lineas', authMiddleware, async (req: Request, res: Response) => {
  try {
    const pool = await getDbPool();
    const result = await pool.request().query(`SELECT CodLinea, Descripcion FROM Lineas ORDER BY Descripcion`);
    return res.json({ data: result.recordset });
  } catch (err: any) {
    console.error('[PRODUCTOS ERROR]', err);
    return res.status(500).json({ error: 'Error al obtener líneas.' });
  }
});

app.get('/api/productos/laboratorios', authMiddleware, async (req: Request, res: Response) => {
  try {
    const pool = await getDbPool();
    const result = await pool.request().query(`SELECT CodLab, Descripcion FROM Laboratorios ORDER BY Descripcion`);
    return res.json({ data: result.recordset });
  } catch (err: any) {
    console.error('[PRODUCTOS ERROR]', err);
    return res.status(500).json({ error: 'Error al obtener laboratorios.' });
  }
});

app.put('/api/productos/:codpro/codlab', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { codpro } = req.params;
    const { codlab } = req.body;

    const pool = await getDbPool();
    await pool.request()
      .input('codpro', sql.Char(10), codpro)
      .input('codlab', sql.VarChar(50), codlab || null)
      .query(`UPDATE Productos SET CodLab = @codlab WHERE CodPro = @codpro`);

    db.addAuditLog(
      req.user?.nombres + ' ' + req.user?.apellidos,
      'Productos',
      `Actualizó CodLab del producto ${codpro} → ${codlab || '(ninguno)'}`,
      req.ip
    );

    return res.json({ success: true, CodLab: codlab });
  } catch (err: any) {
    console.error('[PRODUCTOS PUT ERROR]', err);
    return res.status(500).json({ error: 'Error al actualizar código de laboratorio.' });
  }
});

// USUARIOS
app.get('/api/users', authMiddleware, async (req: Request, res: Response) => {
  try {
    const search = (req.query.search as string) || '';
    const users = await userRepo.getAll(search);
    return res.json({ data: users, total: users.length });
  } catch (err: any) {
    console.error('Error en GET /api/users:', err);
    return res.status(500).json({ error: 'Error al obtener usuarios.' });
  }
});

app.post('/api/users', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const newUser = userRepo.create(req.body);
  db.addAuditLog(req.user?.nombres + ' ' + req.user?.apellidos, 'Users', `Registró nuevo usuario @${newUser.usuario}`, req.ip);
  return res.status(201).json(newUser);
});

app.put('/api/users/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const updated = userRepo.update(Number(req.params.id), req.body);
  if (!updated) return res.status(404).json({ error: 'Usuario no encontrado' });
  db.addAuditLog(req.user?.nombres + ' ' + req.user?.apellidos, 'Users', `Actualizó usuario ID ${req.params.id}`, req.ip);
  return res.json(updated);
});

app.delete('/api/users/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const deleted = userRepo.delete(Number(req.params.id));
  if (!deleted) return res.status(404).json({ error: 'Usuario no encontrado' });
  db.addAuditLog(req.user?.nombres + ' ' + req.user?.apellidos, 'Users', `Desactivó usuario ID ${req.params.id}`, req.ip);
  return res.json({ success: true });
});

// REPORTES
app.get('/api/reports', authMiddleware, (req: Request, res: Response) => {
  return res.json({ data: reportRepo.getAll() });
});

app.post('/api/reports', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const newRep = reportRepo.create({
    ...req.body,
    generado_por: `${req.user?.nombres} ${req.user?.apellidos}`
  });
  db.addAuditLog(req.user?.nombres + ' ' + req.user?.apellidos, 'Reports', `Generó reporte: ${newRep.titulo}`, req.ip);
  return res.status(201).json(newRep);
});

app.delete('/api/reports/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  reportRepo.delete(Number(req.params.id));
  return res.json({ success: true });
});

// AUDITORÍA
app.get('/api/audit', authMiddleware, (req: Request, res: Response) => {
  return res.json({ data: auditRepo.getAll() });
});

// CONFIGURACIÓN / ROLES
app.get('/api/settings', authMiddleware, (req: Request, res: Response) => {
  return res.json({ roles: db.roles, modulos: db.modulos });
});

// ==============================================================================
// 3b. ENDPOINTS DE UBIGEO (Catálogo SUNAT + Asignación a Clientes)
// ==============================================================================

app.get('/api/ubigeo/departamentos', authMiddleware, async (req: Request, res: Response) => {
  try {
    const pool = await getDbPool();
    const result = await pool.request()
      .query(`SELECT DISTINCT cod_dpto, nom_dpto FROM Ubigeos_SUNAT ORDER BY nom_dpto`);
    return res.json({ data: result.recordset });
  } catch (err: any) {
    console.error('[UBIGEO ERROR]', err);
    return res.status(500).json({ error: 'Error al obtener departamentos.' });
  }
});

app.get('/api/ubigeo/provincias/:dpto', authMiddleware, async (req: Request, res: Response) => {
  try {
    const pool = await getDbPool();
    const result = await pool.request()
      .input('dpto', sql.Char(2), req.params.dpto)
      .query(`SELECT DISTINCT cod_prov, nom_prov FROM Ubigeos_SUNAT WHERE cod_dpto = @dpto ORDER BY nom_prov`);
    return res.json({ data: result.recordset });
  } catch (err: any) {
    console.error('[UBIGEO ERROR]', err);
    return res.status(500).json({ error: 'Error al obtener provincias.' });
  }
});

app.get('/api/ubigeo/distritos/:dpto/:prov', authMiddleware, async (req: Request, res: Response) => {
  try {
    const pool = await getDbPool();
    const result = await pool.request()
      .input('dpto', sql.Char(2), req.params.dpto)
      .input('prov', sql.Char(2), req.params.prov)
      .query(`SELECT cod_dist, nom_dist, ubigeo_6d FROM Ubigeos_SUNAT WHERE cod_dpto = @dpto AND cod_prov = @prov ORDER BY nom_dist`);
    return res.json({ data: result.recordset });
  } catch (err: any) {
    console.error('[UBIGEO ERROR]', err);
    return res.status(500).json({ error: 'Error al obtener distritos.' });
  }
});

app.get('/api/ubigeo/clientes', authMiddleware, async (req: Request, res: Response) => {
  try {
    const pool = await getDbPool();
    const search = (req.query.search as string) || '';
    let query = `SELECT Codclie, Razon, Documento FROM Clientes`;
    if (search) {
      query = `SELECT Codclie, Razon, Documento FROM Clientes WHERE Razon LIKE @search OR Documento LIKE @search`;
    }
    query += ` ORDER BY Razon`;
    const request = pool.request();
    if (search) {
      request.input('search', sql.NVarChar, `%${search}%`);
    }
    const result = await request.query(query);
    return res.json({ data: result.recordset });
  } catch (err: any) {
    console.error('[UBIGEO ERROR]', err);
    return res.status(500).json({ error: 'Error al obtener clientes.' });
  }
});

app.get('/api/ubigeo/cliente/:codclie', authMiddleware, async (req: Request, res: Response) => {
  try {
    const pool = await getDbPool();
    const result = await pool.request()
      .input('codclie', sql.Int, parseInt(req.params.codclie))
      .query(`SELECT * FROM t_Clientes_ubigeo WHERE CODIGO = @codclie`);
    return res.json({ data: result.recordset[0] || null });
  } catch (err: any) {
    console.error('[UBIGEO ERROR]', err);
    return res.status(500).json({ error: 'Error al obtener ubigeo del cliente.' });
  }
});

app.put('/api/ubigeo/cliente/:codclie', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const codclie = parseInt(req.params.codclie);
    const { ruc_dni, dpto, provincia, distrito, ubigeo } = req.body;
    const pool = await getDbPool();

    const exists = await pool.request()
      .input('codclie', sql.Int, codclie)
      .query(`SELECT COUNT(*) AS cnt FROM t_Clientes_ubigeo WHERE CODIGO = @codclie`);

    if (exists.recordset[0].cnt > 0) {
      await pool.request()
        .input('codclie', sql.Int, codclie)
        .input('ruc_dni', sql.Char(12), ruc_dni || '')
        .input('dpto', sql.Int, parseInt(dpto) || 0)
        .input('provincia', sql.Int, parseInt(provincia) || 0)
        .input('distrito', sql.Int, parseInt(distrito) || 0)
        .input('ubigeo', sql.Char(6), ubigeo || '')
        .query(`UPDATE t_Clientes_ubigeo SET ruc_dni = @ruc_dni, dpto = @dpto, provincia = @provincia, distrito = @distrito, UBIGEO = @ubigeo, NUBIGEO = @ubigeo WHERE CODIGO = @codclie`);
    } else {
      await pool.request()
        .input('codclie', sql.Int, codclie)
        .input('ruc_dni', sql.Char(12), ruc_dni || '')
        .input('dpto', sql.Int, parseInt(dpto) || 0)
        .input('provincia', sql.Int, parseInt(provincia) || 0)
        .input('distrito', sql.Int, parseInt(distrito) || 0)
        .input('ubigeo', sql.Char(6), ubigeo || '')
        .query(`INSERT INTO t_Clientes_ubigeo (CODIGO, ruc_dni, dpto, provincia, distrito, UBIGEO, NUBIGEO) VALUES (@codclie, @ruc_dni, @dpto, @provincia, @distrito, @ubigeo, @ubigeo)`);
    }

    db.addAuditLog(req.user?.nombres + ' ' + req.user?.apellidos, 'Ubigeo', `Actualizó ubigeo del cliente CODIGO ${codclie}`, req.ip);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[UBIGEO ERROR]', err);
    return res.status(500).json({ error: 'Error al guardar ubigeo del cliente.' });
  }
});

// ==============================================================================
// 3c. ASIGNACIÓN MASIVA DE UBIGEOS VÍA API RUC (SSE)
// ==============================================================================

app.get('/api/ubigeo/asignar-masivo', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const sendEvent = (event: string, data: any) => {
    try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch {}
  };

  const close = () => {
    try { res.end(); } catch {}
  };

  req.on('close', close);

  try {
    const pool = await getDbPool();
    const result = await pool.request().query(`
      SELECT c.Codclie, c.Razon, c.Documento
      FROM Clientes c
      WHERE c.Documento IS NOT NULL AND c.Documento != ''
        AND NOT EXISTS (SELECT 1 FROM t_Clientes_ubigeo u WHERE u.CODIGO = c.Codclie)
      ORDER BY c.Razon
    `);

    const clientes = result.recordset;
    const total = clientes.length;

    if (total === 0) {
      sendEvent('complete', { processed: 0, failed: 0, skipped: 0, total: 0, detalles: [], message: 'No hay clientes pendientes de asignación.' });
      close(); return;
    }

    let processed = 0, failed = 0, skipped = 0;
    const detalles: Array<{ruc: string; cliente: string; estado: string; mensaje?: string}> = [];
    const API_TOKEN = (process.env.API_RUC_TOKEN || '').trim();
    const CONCURRENCY = 3;

    sendEvent('progress', { processed: 0, failed: 0, skipped: 0, total, currentRuc: '', currentCliente: 'Iniciando proceso...' });

    for (let i = 0; i < clientes.length; i += CONCURRENCY) {
      const batch = clientes.slice(i, i + CONCURRENCY);
      const promises = batch.map(async (cliente: any) => {
        const ruc = (cliente.Documento || '').trim();
        if (!ruc) { skipped++; detalles.push({ ruc, cliente: cliente.Razon, estado: 'saltado', mensaje: 'RUC vacío' }); return; }

        try {
          const apiRes = await fetch(`https://miapi.cloud/v1/ruc/${ruc}`, {
            headers: { Authorization: `Bearer ${API_TOKEN}` }
          });
          if (!apiRes.ok) { failed++; detalles.push({ ruc, cliente: cliente.Razon, estado: 'fallido', mensaje: `API responded ${apiRes.status}` }); return; }

          const apiData = await apiRes.json();
          if (!apiData.success || !apiData.datos?.domiciliado?.ubigeo) {
            skipped++; detalles.push({ ruc, cliente: cliente.Razon, estado: 'saltado', mensaje: 'API no devolvió ubigeo' }); return;
          }

          const ubigeoCode = apiData.datos.domiciliado.ubigeo;
          const ubRes = await pool.request()
            .input('ubigeo', sql.Char(6), ubigeoCode)
            .query(`SELECT cod_dpto, cod_prov, cod_dist FROM Ubigeos_SUNAT WHERE ubigeo_6d = @ubigeo`);

          if (ubRes.recordset.length === 0) {
            skipped++; detalles.push({ ruc, cliente: cliente.Razon, estado: 'saltado', mensaje: `Ubigeo ${ubigeoCode} no encontrado en catálogo` }); return;
          }

          const { cod_dpto, cod_prov, cod_dist } = ubRes.recordset[0];
          const existsCheck = await pool.request()
            .input('codclie', sql.Int, cliente.Codclie)
            .query(`SELECT COUNT(*) AS cnt FROM t_Clientes_ubigeo WHERE CODIGO = @codclie`);

          const upsertReq = pool.request()
            .input('codclie', sql.Int, cliente.Codclie)
            .input('ruc_dni', sql.Char(12), ruc)
            .input('dpto', sql.Int, parseInt(cod_dpto))
            .input('provincia', sql.Int, parseInt(cod_prov))
            .input('distrito', sql.Int, parseInt(cod_dist))
            .input('ubigeo', sql.Char(6), ubigeoCode);

          if (existsCheck.recordset[0].cnt > 0) {
            await upsertReq.query(`UPDATE t_Clientes_ubigeo SET ruc_dni = @ruc_dni, dpto = @dpto, provincia = @provincia, distrito = @distrito, UBIGEO = @ubigeo, NUBIGEO = @ubigeo WHERE CODIGO = @codclie`);
          } else {
            await upsertReq.query(`INSERT INTO t_Clientes_ubigeo (CODIGO, ruc_dni, dpto, provincia, distrito, UBIGEO, NUBIGEO) VALUES (@codclie, @ruc_dni, @dpto, @provincia, @distrito, @ubigeo, @ubigeo)`);
          }

          processed++;
          detalles.push({ ruc, cliente: cliente.Razon, estado: 'procesado' });
        } catch (err: any) {
          failed++;
          detalles.push({ ruc, cliente: cliente.Razon, estado: 'fallido', mensaje: err.message });
        }
      });

      await Promise.all(promises);
      const last = batch[batch.length - 1];
      sendEvent('progress', { processed, failed, skipped, total, currentRuc: last?.Documento || '', currentCliente: last?.Razon || '' });
    }

    try {
      db.addAuditLog(req.user?.nombres + ' ' + req.user?.apellidos, 'Ubigeo', `Asignación masiva: ${processed} procesados, ${failed} fallidos, ${skipped} saltados (${total} totales)`, req.ip);
    } catch {}

    sendEvent('complete', { processed, failed, skipped, total, message: `Proceso completado. ${processed} procesados, ${failed} fallidos, ${skipped} saltados.`, detalles });
    close();
  } catch (err: any) {
    console.error('[UBIGEO MASIVO ERROR]', err);
    sendEvent('error', { error: err.message || 'Error interno del servidor.' });
    close();
  }
});

// ==============================================================================
// 3d. ASIGNACIÓN MASIVA DE UBIGEOS VÍA API DNI (SSE)
// ==============================================================================

app.get('/api/ubigeo/asignar-masivo-dni', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const sendEvent = (event: string, data: any) => {
    try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch {}
  };

  const close = () => {
    try { res.end(); } catch {}
  };

  req.on('close', close);

  try {
    const pool = await getDbPool();
    const result = await pool.request().query(`
      SELECT c.Codclie, c.Razon, c.Documento
      FROM Clientes c
      WHERE LEN(c.Documento) = 8
        AND NOT EXISTS (SELECT 1 FROM t_Clientes_ubigeo u WHERE u.CODIGO = c.Codclie)
      ORDER BY c.Razon
    `);

    const clientes = result.recordset;
    const total = clientes.length;

    if (total === 0) {
      sendEvent('complete', { processed: 0, failed: 0, skipped: 0, total: 0, detalles: [], message: 'No hay clientes DNI pendientes de asignación.' });
      close(); return;
    }

    let processed = 0, failed = 0, skipped = 0;
    const detalles: Array<{dni: string; cliente: string; estado: string; mensaje?: string}> = [];
    const API_TOKEN = (process.env.API_RUC_TOKEN || '').trim();
    const CONCURRENCY = 3;

    sendEvent('progress', { processed: 0, failed: 0, skipped: 0, total, currentRuc: '', currentCliente: 'Iniciando proceso...' });

    for (let i = 0; i < clientes.length; i += CONCURRENCY) {
      const batch = clientes.slice(i, i + CONCURRENCY);
      const promises = batch.map(async (cliente: any) => {
        const dni = (cliente.Documento || '').trim();
        if (!dni) { skipped++; detalles.push({ dni, cliente: cliente.Razon, estado: 'saltado', mensaje: 'DNI vacío' }); return; }

        try {
          const apiRes = await fetch(`https://miapi.cloud/v1/dni/${dni}`, {
            headers: { Authorization: `Bearer ${API_TOKEN}` }
          });
          if (!apiRes.ok) { failed++; detalles.push({ dni, cliente: cliente.Razon, estado: 'fallido', mensaje: `API responded ${apiRes.status}` }); return; }

          const apiData = await apiRes.json();
          if (!apiData.success || !apiData.datos?.domiciliado?.ubigeo) {
            skipped++; detalles.push({ dni, cliente: cliente.Razon, estado: 'saltado', mensaje: 'API no devolvió ubigeo' }); return;
          }

          const ubigeoCode = apiData.datos.domiciliado.ubigeo;
          const ubRes = await pool.request()
            .input('ubigeo', sql.Char(6), ubigeoCode)
            .query(`SELECT cod_dpto, cod_prov, cod_dist FROM Ubigeos_SUNAT WHERE ubigeo_6d = @ubigeo`);

          if (ubRes.recordset.length === 0) {
            skipped++; detalles.push({ dni, cliente: cliente.Razon, estado: 'saltado', mensaje: `Ubigeo ${ubigeoCode} no encontrado en catálogo` }); return;
          }

          const { cod_dpto, cod_prov, cod_dist } = ubRes.recordset[0];
          const existsCheck = await pool.request()
            .input('codclie', sql.Int, cliente.Codclie)
            .query(`SELECT COUNT(*) AS cnt FROM t_Clientes_ubigeo WHERE CODIGO = @codclie`);

          const upsertReq = pool.request()
            .input('codclie', sql.Int, cliente.Codclie)
            .input('ruc_dni', sql.Char(12), dni)
            .input('dpto', sql.Int, parseInt(cod_dpto))
            .input('provincia', sql.Int, parseInt(cod_prov))
            .input('distrito', sql.Int, parseInt(cod_dist))
            .input('ubigeo', sql.Char(6), ubigeoCode);

          if (existsCheck.recordset[0].cnt > 0) {
            await upsertReq.query(`UPDATE t_Clientes_ubigeo SET ruc_dni = @ruc_dni, dpto = @dpto, provincia = @provincia, distrito = @distrito, UBIGEO = @ubigeo, NUBIGEO = @ubigeo WHERE CODIGO = @codclie`);
          } else {
            await upsertReq.query(`INSERT INTO t_Clientes_ubigeo (CODIGO, ruc_dni, dpto, provincia, distrito, UBIGEO, NUBIGEO) VALUES (@codclie, @ruc_dni, @dpto, @provincia, @distrito, @ubigeo, @ubigeo)`);
          }

          processed++;
          detalles.push({ dni, cliente: cliente.Razon, estado: 'procesado' });
        } catch (err: any) {
          failed++;
          detalles.push({ dni, cliente: cliente.Razon, estado: 'fallido', mensaje: err.message });
        }
      });

      await Promise.all(promises);
      const last = batch[batch.length - 1];
      sendEvent('progress', { processed, failed, skipped, total, currentRuc: last?.Documento || '', currentCliente: last?.Razon || '' });
    }

    try {
      db.addAuditLog(req.user?.nombres + ' ' + req.user?.apellidos, 'Ubigeo', `Asignación masiva DNI: ${processed} procesados, ${failed} fallidos, ${skipped} saltados (${total} totales)`, req.ip);
    } catch {}

    sendEvent('complete', { processed, failed, skipped, total, message: `Proceso DNI completado. ${processed} procesados, ${failed} fallidos, ${skipped} saltados.`, detalles });
    close();
  } catch (err: any) {
    console.error('[UBIGEO MASIVO DNI ERROR]', err);
    sendEvent('error', { error: err.message || 'Error interno del servidor.' });
    close();
  }
});

// ==============================================================================
// 3e. ENDPOINTS DE CONFIGURACIÓN DE BACKUPS
// ==============================================================================

app.get('/api/config/backup', authMiddleware, (req: Request, res: Response) => {
  return res.json({ config: backupConfigManager.getConfig() });
});

app.put('/api/config/backup', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { enabled, destinationPath, time } = req.body;
  const updated = backupConfigManager.updateConfig({ enabled, destinationPath, time });
  backupScheduler.restart();
  db.addAuditLog(
    req.user?.nombres + ' ' + req.user?.apellidos,
    'Configuración',
    `Actualizó configuración de backups: ${enabled ? 'activado' : 'desactivado'}, ruta: ${destinationPath}, hora: ${time}`,
    req.ip
  );
  return res.json({ config: updated, message: 'Configuración guardada correctamente' });
});

app.post('/api/backup/run', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await backupScheduler.executeBackup();
    await backupScheduler.cleanupOldBackups();
    db.addAuditLog(
      req.user?.nombres + ' ' + req.user?.apellidos,
      'Backups',
      'Ejecutó backup manual de la base de datos',
      req.ip
    );
    return res.json({ success: true, message: 'Backup ejecutado correctamente' });
  } catch (err: any) {
    console.error('[BACKUP RUN ERROR]', err);
    return res.status(500).json({ error: 'Error al ejecutar backup: ' + err.message });
  }
});

// ==============================================================================
// 3f. ENDPOINT DE NISIRA EXPORT (DBF)
// ==============================================================================

app.get('/api/nisira/export', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const countOnly = req.query.count === 'true';

    if (countOnly) {
      const count = await getNisiraCount();
      return res.json({ success: true, count });
    }

    const { tempPath, count, filename } = await exportNisiraToDbf();

    db.addAuditLog(
      req.user?.nombres + ' ' + req.user?.apellidos,
      'Nisira Export',
      `Exportó tabla Nisira a DBF - ${count} registros exportados`,
      req.ip
    );

    res.download(tempPath, filename, (err) => {
      if (err) {
        console.error('[NISIRA DOWNLOAD ERROR]', err);
      }
      fs.unlink(tempPath, () => {});
    });
  } catch (err: any) {
    console.error('[NISIRA EXPORT ERROR]', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Error al exportar: ' + err.message });
    }
  }
});

// CONSULTAS SQL EXPORTABLES
app.get('/api/sql-script', (req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), 'sql', 'database_schema.sql'));
});

// ==============================================================================
// 4. MANEJO CENTRALIZADO DE ERRORES & VITE MIDDLEWARE
// ==============================================================================

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[API ERROR CENTRAL]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor en Tool Kit Platform'
  });
});

async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Enterprise Admin] Tool Kit Backend & SPA en puerto ${PORT}`);
    backupScheduler.start();
  });
}

setupServer();
