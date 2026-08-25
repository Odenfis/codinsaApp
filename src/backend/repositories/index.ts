/**
 * @license
 * Tool Kit Enterprise Repositories (SOLID & Clean Architecture)
 */

import { db } from '../db/database';
import { Cliente, Proveedor, Usuario, Reporte, Modulo } from '../../types';
import { getDbPool, sql } from '../../db';

export class AuthRepository {
  findByUsername(username: string): Usuario | undefined {
    return db.usuarios.find(u => u.usuario.toLowerCase() === username.toLowerCase() && u.estado);
  }

  getUserModules(idRol: number): Modulo[] {
    const allowedModuleIds = db.rolesModulos[idRol] || [];
    return db.modulos
      .filter(m => allowedModuleIds.includes(m.id_modulo) && m.estado)
      .sort((a, b) => a.orden - b.orden);
  }
}

export class ClientRepository {
  getAll(search: string = ''): Cliente[] {
    if (!search) return db.clientes;
    const lower = search.toLowerCase();
    return db.clientes.filter(c =>
      c.razon_social.toLowerCase().includes(lower) ||
      c.codigo_ruc.includes(lower) ||
      (c.contacto && c.contacto.toLowerCase().includes(lower))
    );
  }

  create(data: Omit<Cliente, 'id_cliente' | 'fecha_registro'>): Cliente {
    const nextId = db.clientes.length > 0 ? Math.max(...db.clientes.map(c => c.id_cliente)) + 1 : 1;
    const newClient: Cliente = {
      ...data,
      id_cliente: nextId,
      fecha_registro: new Date().toISOString().substring(0, 10)
    };
    db.clientes.unshift(newClient);
    return newClient;
  }

  update(id: number, data: Partial<Cliente>): Cliente | null {
    const idx = db.clientes.findIndex(c => c.id_cliente === id);
    if (idx === -1) return null;
    db.clientes[idx] = { ...db.clientes[idx], ...data };
    return db.clientes[idx];
  }

  delete(id: number): boolean {
    const initialLen = db.clientes.length;
    db.clientes = db.clientes.filter(c => c.id_cliente !== id);
    return db.clientes.length < initialLen;
  }
}

export class ProviderRepository {
  getAll(search: string = ''): Proveedor[] {
    if (!search) return db.proveedores;
    const lower = search.toLowerCase();
    return db.proveedores.filter(p =>
      p.razon_social.toLowerCase().includes(lower) ||
      p.codigo_ruc.includes(lower) ||
      p.rubro.toLowerCase().includes(lower)
    );
  }

  create(data: Omit<Proveedor, 'id_proveedor' | 'fecha_registro'>): Proveedor {
    const nextId = db.proveedores.length > 0 ? Math.max(...db.proveedores.map(p => p.id_proveedor)) + 1 : 1;
    const newProvider: Proveedor = {
      ...data,
      id_proveedor: nextId,
      fecha_registro: new Date().toISOString().substring(0, 10)
    };
    db.proveedores.unshift(newProvider);
    return newProvider;
  }

  update(id: number, data: Partial<Proveedor>): Proveedor | null {
    const idx = db.proveedores.findIndex(p => p.id_proveedor === id);
    if (idx === -1) return null;
    db.proveedores[idx] = { ...db.proveedores[idx], ...data };
    return db.proveedores[idx];
  }

  delete(id: number): boolean {
    const initialLen = db.proveedores.length;
    db.proveedores = db.proveedores.filter(p => p.id_proveedor !== id);
    return db.proveedores.length < initialLen;
  }
}

export class UserRepository {
  async getAll(search: string = ''): Promise<string[]> {
    try {
      const pool = await getDbPool();
      const result = await pool.request()
        .input('search', sql.NVarChar, `%${search}%`)
        .query(`
          SELECT [Usuario] 
          FROM [dbo].[Usuarios] 
          WHERE [Usuario] LIKE @search
        `);
      return result.recordset.map(row => row.Usuario);
    } catch (err) {
      console.error('Error en UserRepository.getAll:', err);
      return [];
    }
  }

  create(data: Omit<Usuario, 'id_usuario' | 'fecha_creacion'>): Usuario {
    const nextId = db.usuarios.length > 0 ? Math.max(...db.usuarios.map(u => u.id_usuario)) + 1 : 1;
    const rol = db.roles.find(r => r.id_rol === Number(data.id_rol));
    const newUser: Usuario = {
      ...data,
      id_usuario: nextId,
      nombre_rol: rol ? rol.nombre_rol : 'Gestor Operativo',
      fecha_creacion: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    db.usuarios.unshift(newUser);
    return newUser;
  }

  update(id: number, data: Partial<Usuario>): Usuario | null {
    const idx = db.usuarios.findIndex(u => u.id_usuario === id);
    if (idx === -1) return null;
    if (data.id_rol) {
      const rol = db.roles.find(r => r.id_rol === Number(data.id_rol));
      data.nombre_rol = rol ? rol.nombre_rol : undefined;
    }
    db.usuarios[idx] = { ...db.usuarios[idx], ...data };
    return db.usuarios[idx];
  }

  delete(id: number): boolean {
    const initialLen = db.usuarios.length;
    db.usuarios = db.usuarios.filter(u => u.id_usuario !== id);
    return db.usuarios.length < initialLen;
  }
}

export class ReportRepository {
  getAll(): Reporte[] {
    return db.reportes;
  }

  create(data: Omit<Reporte, 'id_reporte' | 'fecha_generacion'>): Reporte {
    const nextId = db.reportes.length > 0 ? Math.max(...db.reportes.map(r => r.id_reporte)) + 1 : 1;
    const newReport: Reporte = {
      ...data,
      id_reporte: nextId,
      fecha_generacion: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    db.reportes.unshift(newReport);
    return newReport;
  }

  delete(id: number): boolean {
    const initialLen = db.reportes.length;
    db.reportes = db.reportes.filter(r => r.id_reporte !== id);
    return db.reportes.length < initialLen;
  }
}

export class AuditRepository {
  getAll() {
    return db.auditoria;
  }
}
