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
import { getNisiraCount, exportNisiraToDbf, runNisiraSp, exportNisiraToDbfDirect } from './src/backend/services/NisiraExportService';
import { NisiraExportConfigManager } from './src/backend/nisiraConfig';
import { ErpUpdateConfigManager } from './src/backend/erpUpdateConfig';
import { buildValuedStockReport } from './src/backend/services/valuedStockReport';
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
const nisiraConfigManager = new NisiraExportConfigManager();
const erpUpdateConfigManager = new ErpUpdateConfigManager();

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

app.get('/api/dashboard/summary', authMiddleware, async (req: Request, res: Response) => {
  try {
    return res.json(await dashboardService.getSummary());
  } catch (err: any) {
    console.error('[DASHBOARD SUMMARY ERROR]', err);
    return res.status(500).json({ error: 'No se pudieron obtener las estadísticas del dashboard.' });
  }
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

const cobranzaMoneyFields = [
  'Importe', 'pAnterior', 'NotaCred', 'Descuento', 'efectivo', 'deposito',
  'letra', 'Transferencia', 'cheque', 'Total', 'saldo'
] as const;

app.get('/api/reportes/cobranzas', authMiddleware, async (req: Request, res: Response) => {
  const desde = typeof req.query.desde === 'string' ? req.query.desde : '';
  const hasta = typeof req.query.hasta === 'string' ? req.query.hasta : '';
  const isoDate = /^\d{4}-\d{2}-\d{2}$/;

  if (!isoDate.test(desde) || !isoDate.test(hasta)) {
    return res.status(400).json({ error: 'Las fechas desde y hasta son obligatorias y deben usar el formato YYYY-MM-DD.' });
  }

  const fromDate = new Date(`${desde}T00:00:00`);
  const toDate = new Date(`${hasta}T23:59:00`);
  const isExactDate = (value: string, date: Date) => {
    const [year, month, day] = value.split('-').map(Number);
    return !Number.isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  };

  if (!isExactDate(desde, fromDate) || !isExactDate(hasta, toDate)) {
    return res.status(400).json({ error: 'El rango contiene una fecha inválida.' });
  }
  if (fromDate > toDate) {
    return res.status(400).json({ error: 'La fecha Del no puede ser posterior a la fecha Al.' });
  }

  try {
    const pool = await getDbPool();
    const toDmy = (value: string) => {
      const [year, month, day] = value.split('-');
      return `${day}/${month}/${year}`;
    };
    const result = await pool.request()
      .input('fec1', sql.VarChar(10), toDmy(desde))
      .input('fec2', sql.VarChar(10), toDmy(hasta))
      .query(`
        SET DATEFORMAT dmy;
        EXEC [dbo].[sp_Cobranzas_reporte] @fec1 = @fec1, @fec2 = @fec2;
      `);

    const data = result.recordset.map((record: Record<string, unknown>) => {
      const normalized = { ...record } as Record<string, unknown>;
      for (const field of cobranzaMoneyFields) {
        const numericValue = Number(record[field] ?? 0);
        normalized[field] = Number.isFinite(numericValue) ? numericValue : 0;
      }
      return normalized;
    });

    const totals = Object.fromEntries(cobranzaMoneyFields.map(field => [
      field,
      data.reduce((sum: number, row: Record<string, unknown>) => sum + Number(row[field] || 0), 0)
    ]));

    return res.json({ data, total: data.length, totals });
  } catch (err) {
    console.error('[REPORTE COBRANZAS ERROR]', err);
    return res.status(500).json({ error: 'No se pudo generar el reporte de cobranzas. Inténtelo nuevamente.' });
  }
});

const validPlanillaValue = (value: unknown, maxLength: number) =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;

app.get('/api/reportes/planillas-cobranza/series', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const pool = await getDbPool();
    const result = await pool.request().query(`
      SELECT DISTINCT RTRIM(Serie) AS Serie
      FROM PlanC_cobranza
      ORDER BY Serie
    `);
    return res.json({ data: result.recordset });
  } catch (err) {
    console.error('[PLANILLA COBRANZA SERIES ERROR]', err);
    return res.status(500).json({ error: 'No se pudieron cargar las series de cobranza.' });
  }
});

app.get('/api/reportes/planillas-cobranza/numeros', authMiddleware, async (req: Request, res: Response) => {
  const serie = typeof req.query.serie === 'string' ? req.query.serie.trim() : '';
  if (!validPlanillaValue(serie, 4)) {
    return res.status(400).json({ error: 'Seleccione una serie válida.' });
  }
  try {
    const pool = await getDbPool();
    const result = await pool.request()
      .input('serie', sql.Char(4), serie)
      .query(`
        SELECT RTRIM(pc.Numero) AS Numero, pc.FechaIng, pc.Vendedor,
               RTRIM(COALESCE(e.Nombre, '')) AS Nombre
        FROM PlanC_cobranza pc
        LEFT JOIN Empleados e ON e.Codemp = pc.Vendedor
        WHERE pc.Serie = @serie
        ORDER BY pc.FechaIng DESC, pc.Numero DESC
      `);
    return res.json({ data: result.recordset });
  } catch (err) {
    console.error('[PLANILLA COBRANZA NUMEROS ERROR]', err);
    return res.status(500).json({ error: 'No se pudieron cargar las planillas de la serie.' });
  }
});

app.get('/api/reportes/planilla-cobranza', authMiddleware, async (req: Request, res: Response) => {
  const serie = typeof req.query.serie === 'string' ? req.query.serie.trim() : '';
  const numero = typeof req.query.numero === 'string' ? req.query.numero.trim() : '';
  if (!validPlanillaValue(serie, 4) || !validPlanillaValue(numero, 8)) {
    return res.status(400).json({ error: 'Seleccione una Serie y un Número válidos.' });
  }

  try {
    const pool = await getDbPool();
    const result = await pool.request()
      .input('serie', sql.Char(4), serie)
      .input('numero', sql.Char(8), numero)
      .execute('sp_Planilla_cobranza');

    if (!result.recordset.length) {
      return res.status(404).json({ error: 'La planilla seleccionada no existe o no contiene documentos.' });
    }

    const field = (row: Record<string, unknown>, name: string) => {
      const key = Object.keys(row).find(candidate => candidate.toLowerCase() === name.toLowerCase());
      return key ? row[key] : undefined;
    };
    const textValue = (value: unknown) => value == null ? '' : String(value).trim();
    const moneyValue = (value: unknown) => {
      const parsed = Number(value ?? 0);
      return Number.isFinite(parsed) ? parsed : 0;
    };
    const first = result.recordset[0] as Record<string, unknown>;
    const header = {
      Serie: textValue(field(first, 'Serie')),
      Numero: textValue(field(first, 'Numero')),
      Vendedor: Number(field(first, 'Vendedor') ?? 0),
      Nombre: textValue(field(first, 'Nombre')),
      FechaCrea: field(first, 'FechaCrea'),
      FechaIng: field(first, 'FechaIng'),
      FormaPago: textValue(field(first, 'FormaPago'))
    };

    const items = result.recordset.map((raw: Record<string, unknown>) => {
      const Descuento = moneyValue(field(raw, 'Descuento'));
      const Efectivo = moneyValue(field(raw, 'Efectivo'));
      const Deposito = moneyValue(field(raw, 'Deposito'));
      const Letra = moneyValue(field(raw, 'Letra'));
      const Transferencia = moneyValue(field(raw, 'Transferencia'));
      const Cheque = moneyValue(field(raw, 'Cheque'));
      return {
        CodClie: textValue(field(raw, 'CodClie')),
        RUC: textValue(field(raw, 'RUC') ?? field(raw, 'RucCliente')),
        Razon: textValue(field(raw, 'Razon')),
        Documento: textValue(field(raw, 'documento')),
        Lugar: textValue(field(raw, 'Lugar')),
        TipoDoc: Number(field(raw, 'tipodoc') ?? 0),
        FechaFac: field(raw, 'fechaFac'),
        Valor: moneyValue(field(raw, 'Valor')),
        NotaCred: textValue(field(raw, 'NotaCred')),
        Descuento, Efectivo, Deposito, Letra,
        NroLetra: textValue(field(raw, 'NroLetra')),
        Transferencia, Cheque,
        NroCheque: textValue(field(raw, 'NroCheque')),
        CtaBanco: textValue(field(raw, 'CtaBanco')),
        Banco: textValue(field(raw, 'Banco')),
        NroOperacion: textValue(field(raw, 'NroOperacion')),
        DescuentoEfectivo: Descuento + Efectivo,
        Total: moneyValue(field(raw, 'Total')),
        TotalGeneral: Descuento + Efectivo + Deposito + Letra + Transferencia + Cheque
      };
    });

    const totalFields = ['Valor', 'Descuento', 'Efectivo', 'Deposito', 'Letra', 'Transferencia', 'Cheque', 'Total', 'TotalGeneral'] as const;
    const totals = Object.fromEntries(totalFields.map(key => [
      key, items.reduce((sum, item) => sum + item[key], 0)
    ]));

    return res.json({ header, items, totals });
  } catch (err) {
    console.error('[PLANILLA COBRANZA ERROR]', err);
    return res.status(500).json({ error: 'No se pudo generar la planilla de cobranza. Inténtelo nuevamente.' });
  }
});

const kardexNumericFields = ['Saldoini', 'Ingresos', 'salidas', 'saldoFin', 'Costo', 'Valor'] as const;
const kardexTotalFields = ['Saldoini', 'Ingresos', 'salidas', 'saldoFin', 'Valor'] as const;

app.get('/api/reportes/kardex-productos', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const mes = Number(req.query.mes);
  const anio = Number(req.query.anio);

  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    return res.status(400).json({ error: 'El mes debe ser un número entero entre 1 y 12.' });
  }
  if (!Number.isInteger(anio) || anio < 1900 || anio > 2100) {
    return res.status(400).json({ error: 'El año debe ser un número entero entre 1900 y 2100.' });
  }

  try {
    const pool = await getDbPool();
    const transaction = new sql.Transaction(pool);
    let result;
    try {
      await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
      result = await new sql.Request(transaction)
        .input('mes', sql.Int, mes)
        .input('anio', sql.Int, anio)
        .query(`
          DECLARE @lockResult INT;
          EXEC @lockResult = sys.sp_getapplock
            @Resource = 'CODINSA_KARDEX_PRODUCTOS',
            @LockMode = 'Exclusive',
            @LockOwner = 'Transaction',
            @LockTimeout = 30000;
          IF @lockResult < 0
            THROW 51000, 'No se pudo reservar la generación del Kardex. Inténtelo nuevamente.', 1;

          EXEC [dbo].[sp_KardexDelMesX] @mes = @mes, @anio = @anio;

          SELECT FecIni, FecFin, codpro, codSunat, Producto, Unimed,
                 Saldoini, Ingresos, salidas, saldoFin, Costo, Valor
          FROM [dbo].[LibInvValorizado]
          ORDER BY Producto, codpro;
        `);
      await transaction.commit();
    } catch (transactionError) {
      try { await transaction.rollback(); } catch { /* La transacción puede haber sido cerrada por SQL Server. */ }
      throw transactionError;
    }

    const textValue = (value: unknown) => value == null ? '' : String(value).trim();
    const dateValue = (value: unknown) => value instanceof Date ? value.toISOString() : textValue(value);
    const data = result.recordset.map((record: Record<string, unknown>) => {
      const normalized: Record<string, unknown> = {
        FecIni: dateValue(record.FecIni),
        FecFin: dateValue(record.FecFin),
        codpro: textValue(record.codpro),
        codSunat: textValue(record.codSunat),
        Producto: textValue(record.Producto),
        Unimed: textValue(record.Unimed)
      };
      for (const field of kardexNumericFields) {
        const value = Number(record[field] ?? 0);
        normalized[field] = Number.isFinite(value) ? value : 0;
      }
      return normalized;
    });
    const totals = Object.fromEntries(kardexTotalFields.map(field => [
      field,
      data.reduce((sum: number, row: Record<string, unknown>) => sum + Number(row[field] || 0), 0)
    ]));
    const lastDay = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
    const period = {
      mes,
      anio,
      desde: `${anio}-${String(mes).padStart(2, '0')}-01`,
      hasta: `${anio}-${String(mes).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    };

    db.addAuditLog(
      `${req.user?.nombres || ''} ${req.user?.apellidos || ''}`.trim() || req.user?.usuario || 'Usuario',
      'Reportes',
      `Generó Kardex de Productos ${String(mes).padStart(2, '0')}/${anio} (${data.length} registros)`,
      req.ip
    );
    return res.json({ data, total: data.length, totals, period });
  } catch (err) {
    console.error('[KARDEX PRODUCTOS ERROR]', err);
    return res.status(500).json({ error: 'No se pudo generar el Kardex de Productos. Inténtelo nuevamente.' });
  }
});

app.get('/api/reportes/stock-valorizado', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const mes = Number(req.query.mes);
  const anio = Number(req.query.anio);
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    return res.status(400).json({ error: 'El mes debe ser un número entero entre 1 y 12.' });
  }
  if (!Number.isInteger(anio) || anio < 1900 || anio > 2100) {
    return res.status(400).json({ error: 'El año debe ser un número entero entre 1900 y 2100.' });
  }

  try {
    const pool = await getDbPool();
    const transaction = new sql.Transaction(pool);
    let report;
    try {
      await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
      const request = new sql.Request(transaction);
      (request as sql.Request & { timeout: number }).timeout = 300000;
      const result = await request
        .input('mes', sql.Int, mes)
        .input('anio', sql.Int, anio)
        .query(`
          DECLARE @lockResult INT;
          EXEC @lockResult = sys.sp_getapplock
            @Resource = 'CODINSA_STOCK_VALORIZADO',
            @LockMode = 'Exclusive',
            @LockOwner = 'Transaction',
            @LockTimeout = 30000;
          IF @lockResult < 0
            THROW 51001, 'No se pudo reservar la generación del Stock Valorizado. Inténtelo nuevamente.', 1;

          EXEC [dbo].[sp_KardexDelMesD] @mes = @mes, @anio = @anio;

          SELECT Numero, Codpro, Lote, Almacen, CodSunat, TipoPro, Descripcion, UniMed,
                 Fecha, TipoDoc, Documento, StockIni, Ingresos, CosIng, CostoI,
                 Salidas, CosUnit, CostoS, Saldo, ValorUni, Valorizado
          FROM [dbo].[LibInvValorizadoD]
          ORDER BY Codpro, Lote, Almacen, Numero;
        `);
      report = buildValuedStockReport(result.recordset as Record<string, unknown>[], mes, anio);
      await transaction.commit();
    } catch (transactionError) {
      try { await transaction.rollback(); } catch { /* SQL Server puede haber cerrado la transacción. */ }
      throw transactionError;
    }

    db.addAuditLog(
      `${req.user?.nombres || ''} ${req.user?.apellidos || ''}`.trim() || req.user?.usuario || 'Usuario',
      'Reportes',
      `Generó Stock Valorizado ${String(mes).padStart(2, '0')}/${anio} (${report.total} lotes)`,
      req.ip
    );
    return res.json(report);
  } catch (err) {
    console.error('[STOCK VALORIZADO ERROR]', err);
    return res.status(500).json({ error: 'No se pudo generar el Stock Valorizado. Inténtelo nuevamente.' });
  }
});

app.get('/api/reportes/stock-productos', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pool = await getDbPool();
    const result = await pool.request().execute('sp_Productos_SaldosStock');
    const cleanText = (value: unknown) => value == null ? '' : String(value).trim();
    const data = result.recordset.map((record: Record<string, unknown>) => {
      const stock = Number(record.stock ?? 0);
      const pvf = record.PVF == null ? null : Number(record.PVF);
      const expiry = record.vencimiento instanceof Date
        ? record.vencimiento.toISOString().slice(0, 10)
        : record.vencimiento == null ? null : String(record.vencimiento).slice(0, 10);
      return {
        Codigo: cleanText(record.Codigo),
        CodSunat: cleanText(record.CodSunat),
        Producto: cleanText(record.Producto),
        PrincipioActivo: cleanText(record.PrincipioActivo),
        stock: Number.isFinite(stock) ? stock : 0,
        PVF: pvf !== null && Number.isFinite(pvf) ? pvf : null,
        Lotes: cleanText(record.Lotes),
        vencimiento: expiry
      };
    }).sort((a, b) => a.Producto.localeCompare(b.Producto, 'es') || a.Codigo.localeCompare(b.Codigo) || a.Lotes.localeCompare(b.Lotes) || (a.vencimiento || '').localeCompare(b.vencimiento || ''));

    res.setHeader('Cache-Control', 'no-store');
    db.addAuditLog(
      `${req.user?.nombres || ''} ${req.user?.apellidos || ''}`.trim() || req.user?.usuario || 'Usuario',
      'Reportes', `Consultó Stock de Productos (${data.length} lotes)`, req.ip
    );
    return res.json({ data, total: data.length, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[STOCK PRODUCTOS ERROR]', err);
    return res.status(500).json({ error: 'No se pudo obtener el Stock de Productos. Inténtelo nuevamente.' });
  }
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
// 3f1. ENDPOINT PARA EJECUTAR SP DE NISIRA (GENERAR TABLA)
// ==============================================================================

app.post('/api/nisira/generar', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dia = Number(req.body?.dia);
    const mes = Number(req.body?.mes);
    const anio = Number(req.body?.anio);

    if (!Number.isInteger(dia) || dia < 1 || dia > 31 ||
        !Number.isInteger(mes) || mes < 1 || mes > 12 ||
        !Number.isInteger(anio) || anio < 2000 || anio > 2100) {
      return res.status(400).json({ error: 'Parámetros inválidos: Día (1-31), Mes (1-12) y Año (2000-2100) son requeridos.' });
    }

    const { count } = await runNisiraSp(dia, mes, anio);

    db.addAuditLog(
      req.user?.nombres + ' ' + req.user?.apellidos,
      'Nisira Export',
      `Ejecutó SP sp_Exporta_Nisira para ${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${anio} - ${count} registros generados`,
      req.ip
    );

    return res.json({ success: true, count });
  } catch (err: any) {
    console.error('[NISIRA GENERAR ERROR]', err);
    return res.status(500).json({
      error: 'Error al ejecutar el stored procedure sp_Exporta_Nisira. La tabla tablaNisira podría haber quedado incompleta. Detalle: ' + err.message
    });
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

// ==============================================================================
// 3g. ENDPOINTS NISIRA EXPORT DIRECT (DBF a ruta fija del servidor)
// ==============================================================================

app.get('/api/nisira/direct-config', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const config = nisiraConfigManager.getConfig();
    return res.json({ success: true, config });
  } catch (err: any) {
    console.error('[NISIRA DIRECT CONFIG GET ERROR]', err);
    return res.status(500).json({ error: 'Error al obtener la configuración: ' + err.message });
  }
});

app.put('/api/nisira/direct-config', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const destinationPath = String(req.body?.destinationPath || '').trim();

    if (!destinationPath) {
      return res.status(400).json({ error: 'La ruta destino no puede estar vacía.' });
    }

    const config = nisiraConfigManager.updateDestinationPath(destinationPath);

    db.addAuditLog(
      req.user?.nombres + ' ' + req.user?.apellidos,
      'Nisira Export Direct',
      `Configuró la ruta destino de exportación: ${destinationPath}`,
      req.ip
    );

    return res.json({ success: true, config });
  } catch (err: any) {
    console.error('[NISIRA DIRECT CONFIG SAVE ERROR]', err);
    return res.status(500).json({ error: 'Error al guardar la configuración: ' + err.message });
  }
});

app.post('/api/nisira/export-direct', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const destinationPath = nisiraConfigManager.getDestinationPath();
    const { filePath, count, filename } = await exportNisiraToDbfDirect(destinationPath);

    nisiraConfigManager.setLastExport('success', count);

    db.addAuditLog(
      req.user?.nombres + ' ' + req.user?.apellidos,
      'Nisira Export Direct',
      `Exportó tabla Nisira a ${filePath} - ${count} registros`,
      req.ip
    );

    return res.json({ success: true, path: filePath, filename, count });
  } catch (err: any) {
    console.error('[NISIRA EXPORT DIRECT ERROR]', err);
    nisiraConfigManager.setLastExport('failed');
    return res.status(500).json({ error: 'Error al exportar directamente: ' + err.message });
  }
});

// ==============================================================================
// 3h. ENDPOINTS DE ACTUALIZACIÓN ERP (instalador .bat desde Google Drive)
// ==============================================================================

app.get('/api/config/erp-update', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    success: true,
    config: erpUpdateConfigManager.getConfig(),
    historial: erpUpdateConfigManager.getHistorial()
  });
});

app.put('/api/config/erp-update', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const driveUrl = String(req.body?.driveUrl || '').trim();
  const sha256Raw = String(req.body?.sha256 || '').trim();
  const zipNameRaw = String(req.body?.zipName || '').trim();
  const notaRaw = String(req.body?.nota || '').trim();

  if (!driveUrl) {
    return res.status(400).json({ error: 'El enlace de Google Drive es requerido.' });
  }

  // Extraer el ID del enlace: soporta /file/d/ID, ?id=ID y /d/ID
  const match = driveUrl.match(/\/file\/d\/([A-Za-z0-9_-]{10,})|[?&]id=([A-Za-z0-9_-]{10,})|\/d\/([A-Za-z0-9_-]{10,})/);
  const driveId = match ? (match[1] || match[2] || match[3]) : '';
  if (!driveId) {
    return res.status(400).json({ error: 'No se pudo extraer el ID del archivo desde el enlace. Verifique que sea un enlace compartido de Google Drive.' });
  }

  let sha256: string | null = null;
  if (sha256Raw) {
    if (!/^[a-fA-F0-9]{64}$/.test(sha256Raw)) {
      return res.status(400).json({ error: 'El SHA256 debe ser un hash hexadecimal de 64 caracteres (o dejarlo vacío para omitir la validación).' });
    }
    sha256 = sha256Raw.toLowerCase();
  }

  let zipName = 'actualizacionERP.zip';
  if (zipNameRaw) {
    if (!/^[A-Za-z0-9._-]+\.zip$/i.test(zipNameRaw)) {
      return res.status(400).json({ error: 'El nombre del ZIP solo admite letras, números, punto, guion y guion bajo, y debe terminar en .zip' });
    }
    zipName = zipNameRaw;
  }

  const config = erpUpdateConfigManager.update({
    driveId,
    driveUrl,
    zipName,
    sha256,
    nota: notaRaw || null,
    actualizadoPor: req.user?.usuario || null
  });

  db.addAuditLog(
    req.user?.usuario || 'desconocido',
    'Actualización ERP',
    `Configuró actualización ERP: Drive ID ${driveId}, ZIP ${zipName}${sha256 ? ', con SHA256' : ', sin SHA256'}`,
    req.ip
  );

  return res.json({ success: true, config, message: 'Configuración guardada correctamente' });
});

app.get('/api/updates/actualizar-erp', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const config = erpUpdateConfigManager.getConfig();
    if (!config.driveId) {
      return res.status(400).json({ error: 'No hay configuración vigente. Configure primero el enlace de Google Drive del ZIP de actualización.' });
    }

    const templatePath = path.join(process.cwd(), 'updates', 'Actualizar_ERP_Nube.bat');
    if (!fs.existsSync(templatePath)) {
      console.error('[ERP UPDATE ERROR] Plantilla no encontrada:', templatePath);
      return res.status(500).json({ error: 'Plantilla del instalador no encontrada en el servidor.' });
    }

    const contenido = fs.readFileSync(templatePath, 'utf-8')
      .replace(/@@DRIVE_ID@@/g, config.driveId)
      .replace(/@@ZIP_NAME@@/g, config.zipName)
      .replace(/@@ZIP_SHA256@@/g, config.sha256 || '');

    db.addAuditLog(
      req.user?.usuario || 'desconocido',
      'Actualización ERP',
      `Descargó instalador Actualizar_ERP_Nube.bat (Drive ID ${config.driveId})`,
      req.ip
    );

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="Actualizar_ERP_Nube.bat"');
    return res.send(contenido);
  } catch (err: any) {
    console.error('[ERP UPDATE DOWNLOAD ERROR]', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Error al generar el instalador: ' + err.message });
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
