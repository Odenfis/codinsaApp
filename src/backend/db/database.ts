/**
 * @license
 * Tool Kit Enterprise Database Engine (SQL Server Mock / In-Memory Storage)
 * Mantiene coherencia transaccional e indexación por ID.
 */

import { Usuario, Rol, Modulo, Cliente, Proveedor, Reporte, Auditoria, TransaccionMovimiento, ChartActivityData } from '../../types';

class EnterpriseDatabase {
  public roles: Rol[] = [
    { id_rol: 1, nombre_rol: 'Enterprise Admin', descripcion: 'Acceso total y control de módulos empresariales e integraciones' },
    { id_rol: 2, nombre_rol: 'Auditor Senior', descripcion: 'Supervisión de transacciones, logs de auditoría y reportes' },
    { id_rol: 3, nombre_rol: 'Gestor Operativo', descripcion: 'Administración de Clientes, Proveedores y generación de reportes' }
  ];

  public modulos: Modulo[] = [
    { id_modulo: 1, nombre_modulo: 'Dashboard', icono: 'LayoutDashboard', ruta: '/dashboard', orden: 1, estado: true },
    { id_modulo: 2, nombre_modulo: 'Clientes', icono: 'Users', ruta: '/clients', orden: 2, estado: true, children: [
      { id_modulo: 8, nombre_modulo: 'Gestión Ubigeos', icono: 'MapPin', ruta: '/clients/ubigeo', orden: 1, estado: true }
    ] },
    { id_modulo: 9, nombre_modulo: 'Productos', icono: 'Package', ruta: '/products', orden: 3, estado: true, children: [
      { id_modulo: 10, nombre_modulo: 'Listado de Productos', icono: 'List', ruta: '/products', orden: 1, estado: true },
      { id_modulo: 11, nombre_modulo: 'Editar Cod. Laboratorio', icono: 'PenLine', ruta: '/products/edit-lab', orden: 2, estado: true }
    ] },
    { id_modulo: 3, nombre_modulo: 'Providers', icono: 'Network', ruta: '/providers', orden: 4, estado: false },
    { id_modulo: 4, nombre_modulo: 'Users', icono: 'UserCheck', ruta: '/users', orden: 5, estado: false },
    { id_modulo: 5, nombre_modulo: 'Reports', icono: 'BarChart3', ruta: '/reports', orden: 6, estado: false },
    { id_modulo: 6, nombre_modulo: 'Configuración', icono: 'Settings', ruta: '/settings', orden: 7, estado: true, children: [
      { id_modulo: 12, nombre_modulo: 'Backups', icono: 'HardDrive', ruta: '/settings/backups', orden: 1, estado: true }
    ] },
    { id_modulo: 7, nombre_modulo: 'Audit', icono: 'ShieldCheck', ruta: '/audit', orden: 8, estado: false }
  ];

  public rolesModulos: Record<number, number[]> = {
    1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], // Enterprise Admin: todo
    2: [1, 2, 3, 5, 7],                      // Auditor: todo menos users, settings, productos (sólo lectura)
    3: [1, 2, 3, 5, 9, 10, 11]               // Gestor operativo: incluye productos
  };

  public usuarios: Usuario[] = [
    {
      id_usuario: 1,
      usuario: 'admin',
      contrasena_hash: 'Admin123!', // En login validaremos en claro o hash para simplicidad interactiva
      nombres: 'William',
      apellidos: 'Moncada',
      email: 'wmoncada@tecsup.edu.pe',
      id_rol: 1,
      nombre_rol: 'Enterprise Admin',
      avatar_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAkdmjPTRkHU9YE47QzpWuGyTRlaWhsQZADCN8JEpA8ixMjmyCf8sBX5asL1QI9ps1pRNncmzryYw7bgD1F3mTLCVVjQKO6vXlBFOPgximunVyPrrdqGUeDqCW47ThkxIuIaBZWtigWXyB8DA3FOdz0K9v-pLVhJVPF8euE7KQ2ky6MfxZMaDIOgzVHhD4aylCEPcoSeIMUN7W04CjrDSKX2tIlBEw7yc6KSFtLyglWfph4TS_QeUxLD2CP6FiWo1pGF6aNtDPS8uN3',
      estado: true,
      fecha_creacion: '2024-01-15 08:30:00'
    },
    {
      id_usuario: 2,
      usuario: 'carlos.operador',
      contrasena_hash: 'Operador123!',
      nombres: 'Carlos',
      apellidos: 'Mendoza',
      email: 'cmendoza@codinsa.com.pe',
      id_rol: 3,
      nombre_rol: 'Gestor Operativo',
      estado: true,
      fecha_creacion: '2024-02-10 10:15:00'
    },
    {
      id_usuario: 3,
      usuario: 'ana.auditora',
      contrasena_hash: 'Auditor123!',
      nombres: 'Ana',
      apellidos: 'Torres',
      email: 'atorres@codinsa.com.pe',
      id_rol: 2,
      nombre_rol: 'Auditor Senior',
      estado: true,
      fecha_creacion: '2024-03-01 09:00:00'
    }
  ];

  public clientes: Cliente[] = [
    { id_cliente: 1, codigo_ruc: '20512345678', razon_social: 'Alpha Corp S.A.C.', contacto: 'Roberto Gómez', telefono: '+51 987 654 321', email: 'contacto@alphacorp.com', direccion: 'Av. Javier Prado Este 1234, San Isidro, Lima', categoria: 'VIP', estado: true, fecha_registro: '2024-01-20' },
    { id_cliente: 2, codigo_ruc: '20498765432', razon_social: 'Zeta Industries S.A.', contacto: 'Elena Rostova', telefono: '+51 912 345 678', email: 'ventas@zetaindustries.pe', direccion: 'Calle Los Laureles 450, Miraflores, Lima', categoria: 'Mayorista', estado: true, fecha_registro: '2024-02-05' },
    { id_cliente: 3, codigo_ruc: '20600112233', razon_social: 'Global Logistics Perú', contacto: 'Marco Aurelio', telefono: '+51 955 443 322', email: 'logistica@globalpe.com', direccion: 'Av. Elmer Faucett 2800, Callao', categoria: 'VIP', estado: true, fecha_registro: '2024-02-18' },
    { id_cliente: 4, codigo_ruc: '20100200300', razon_social: 'Farmacéutica Andina S.A.', contacto: 'Patricia Salas', telefono: '+51 1 442 1234', email: 'psalas@farmandina.com', direccion: 'Av. República de Panamá 3500, Surquillo', categoria: 'Mayorista', estado: true, fecha_registro: '2024-03-10' },
    { id_cliente: 5, codigo_ruc: '20556677889', razon_social: 'Clínica San Borja S.A.C.', contacto: 'Dr. Hernán Silva', telefono: '+51 988 112 233', email: 'hsilva@clinicasanborja.pe', direccion: 'Av. Guardia Civil 400, San Borja', categoria: 'VIP', estado: true, fecha_registro: '2024-03-25' },
    { id_cliente: 6, codigo_ruc: '20332211445', razon_social: 'Distribuidora Médica del Sur', contacto: 'Liliana Peña', telefono: '+51 977 665 544', email: 'lpena@dmedicasur.pe', direccion: 'Av. Ejército 702, Arequipa', categoria: 'Estándar', estado: true, fecha_registro: '2024-04-02' }
  ];

  public proveedores: Proveedor[] = [
    { id_proveedor: 1, codigo_ruc: '20100012345', razon_social: 'Laboratorios Roche Perú', rubro: 'Medicamentos Oncológicos', contacto: 'Claudia Ramos', telefono: '+51 1 611 2233', email: 'cramos@roche.com', condicion_pago: 'Crédito 45 días', calificacion: 4.9, estado: true, fecha_registro: '2023-11-15' },
    { id_proveedor: 2, codigo_ruc: '20200054321', razon_social: 'Pfizer S.A. Perú', rubro: 'Productos Farmacéuticos', contacto: 'Fernando Soto', telefono: '+51 1 500 1000', email: 'fsoto@pfizer.com', condicion_pago: 'Crédito 30 días', calificacion: 4.8, estado: true, fecha_registro: '2023-12-01' },
    { id_proveedor: 3, codigo_ruc: '20334455667', razon_social: 'Bayer S.A.', rubro: 'Insumos Médicos', contacto: 'Gabriela Mistral', telefono: '+51 999 888 777', email: 'gmistral@bayer.com', condicion_pago: 'Contado', calificacion: 5.0, estado: true, fecha_registro: '2024-01-10' },
    { id_proveedor: 4, codigo_ruc: '20445566778', razon_social: 'Medtech Supplies S.A.C.', rubro: 'Equipos Biomédicos', contacto: 'Hugo Sánchez', telefono: '+51 944 332 211', email: 'hsanchez@medtech.pe', condicion_pago: 'Crédito 60 días', calificacion: 4.6, estado: true, fecha_registro: '2024-02-20' }
  ];

  public reportes: Reporte[] = [
    { id_reporte: 1, titulo: 'Reporte Consolidado Mensual - Mayo 2024', tipo: 'Financiero', formato: 'PDF', generado_por: 'William Moncada', tamano_kb: 2450, fecha_generacion: '2024-05-31 18:00' },
    { id_reporte: 2, titulo: 'Inventario de Lotes Críticos - Droguería', tipo: 'Inventario', formato: 'EXCEL', generado_por: 'Carlos Mendoza', tamano_kb: 840, fecha_generacion: '2024-06-01 09:15' },
    { id_reporte: 3, titulo: 'Auditoria de Accesos y Permisos Q2', tipo: 'Auditoría', formato: 'PDF', generado_por: 'Ana Torres', tamano_kb: 1120, fecha_generacion: '2024-06-15 11:30' }
  ];

  public transacciones: TransaccionMovimiento[] = [
    { id_transaccion: 'TRX-8923', entidad_codigo: 'AC', entidad_nombre: 'Alpha Corp', accion: 'Actualización de perfil', fecha_texto: 'Hoy, 10:23 AM', estado: 'COMPLETADO' },
    { id_transaccion: 'TRX-8922', entidad_codigo: 'ZI', entidad_nombre: 'Zeta Industries', accion: 'Sincronización API', fecha_texto: 'Hoy, 09:45 AM', estado: 'PROCESANDO' },
    { id_transaccion: 'TRX-8921', entidad_codigo: 'GL', entidad_nombre: 'Global Logistics', accion: 'Carga masiva de datos', fecha_texto: 'Ayer, 16:30 PM', estado: 'FALLIDO' },
    { id_transaccion: 'TRX-8920', entidad_codigo: 'LR', entidad_nombre: 'Lab Roche', accion: 'Recepción de orden de compra #4512', fecha_texto: 'Ayer, 14:10 PM', estado: 'COMPLETADO' },
    { id_transaccion: 'TRX-8919', entidad_codigo: 'PF', entidad_nombre: 'Pfizer Perú', accion: 'Aprobación de crédito comercial', fecha_texto: '22 Jun, 09:00 AM', estado: 'COMPLETADO' }
  ];

  public actividadChart: ChartActivityData[] = [
    { dia: 'Lun', procesos: 3800, consultas: 5200 },
    { dia: 'Mar', procesos: 4200, consultas: 6100 },
    { dia: 'Mié', procesos: 5100, consultas: 7400 },
    { dia: 'Jue', procesos: 4800, consultas: 6800 },
    { dia: 'Vie', procesos: 6500, consultas: 8900 },
    { dia: 'Sáb', procesos: 3100, consultas: 4100 },
    { dia: 'Dom', procesos: 1800, consultas: 2300 }
  ];

  public auditoria: Auditoria[] = [
    { id_auditoria: 1001, id_usuario: 1, usuario: 'William Moncada', modulo: 'Sistema', accion: 'Inicio de sesión exitoso', fecha: '2026-06-24 08:45:10', ip: '192.168.1.45' },
    { id_auditoria: 1002, id_usuario: 1, usuario: 'William Moncada', modulo: 'Clientes', accion: 'Actualizó información de Alpha Corp S.A.C.', fecha: '2026-06-24 10:23:05', ip: '192.168.1.45' },
    { id_auditoria: 1003, id_usuario: 2, usuario: 'Carlos Mendoza', modulo: 'Reportes', accion: 'Exportó reporte Excel de inventario', fecha: '2026-06-24 09:15:22', ip: '192.168.1.88' }
  ];

  public addAuditLog(usuario: string, modulo: string, accion: string, ip: string = '127.0.0.1') {
    const nextId = this.auditoria.length > 0 ? Math.max(...this.auditoria.map(a => a.id_auditoria)) + 1 : 1001;
    this.auditoria.unshift({
      id_auditoria: nextId,
      usuario,
      modulo,
      accion,
      fecha: new Date().toISOString().replace('T', ' ').substring(0, 19),
      ip
    });
  }
}

export const db = new EnterpriseDatabase();
