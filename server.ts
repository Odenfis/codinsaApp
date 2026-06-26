/**
 * @license
 * Tool Kit Enterprise Platform Backend API Server
 * Node.js + Express REST API & Vite SPA Middleware
 * Puerto: 3000
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import session from 'express-session';
import { createServer as createViteServer } from 'vite';
import { getDbPool, sql } from './src/db';
import { desencriptarPassword } from './src/authUtils';
import { authMiddleware, AuthenticatedRequest } from './src/backend/middlewares/authMiddleware';
import { AuthService, DashboardService } from './src/backend/services';
import { ClientRepository, ProviderRepository, UserRepository, ReportRepository, AuditRepository } from './src/backend/repositories';
import { db } from './src/backend/db/database';
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
  });
}

setupServer();
