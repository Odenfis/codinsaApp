/**
 * @license
 * Tool Kit Enterprise Modular Platform
 * Clean Architecture DTOs & Domain Models
 */

export interface Rol {
  id_rol: number;
  nombre_rol: string;
  descripcion: string;
}

export interface Usuario {
  id_usuario: number;
  usuario: string;
  contrasena_hash: string;
  nombres: string;
  apellidos: string;
  email: string;
  id_rol: number;
  nombre_rol?: string;
  avatar_url?: string;
  estado: boolean;
  fecha_creacion: string;
}

export interface Permiso {
  id_permiso: number;
  codigo_permiso: string;
  nombre_permiso: string;
  descripcion?: string;
}

export interface Modulo {
  id_modulo: number;
  nombre_modulo: string;
  icono: string;
  ruta: string;
  orden: number;
  estado: boolean;
  permisos?: {
    lectura: boolean;
    escritura: boolean;
    eliminacion: boolean;
    exportar: boolean;
  };
  children?: Modulo[];
}

export interface Auditoria {
  id_auditoria: number;
  id_usuario?: number;
  usuario: string;
  modulo: string;
  accion: string;
  detalles?: string;
  fecha: string;
  ip: string;
}

export interface Cliente {
  id_cliente: number;
  codigo_ruc: string;
  razon_social: string;
  contacto: string;
  telefono: string;
  email: string;
  direccion: string;
  categoria: 'VIP' | 'Mayorista' | 'Estándar';
  estado: boolean;
  fecha_registro: string;
}

export interface Proveedor {
  id_proveedor: number;
  codigo_ruc: string;
  razon_social: string;
  rubro: string;
  contacto: string;
  telefono: string;
  email: string;
  condicion_pago: string;
  calificacion: number;
  estado: boolean;
  fecha_registro: string;
}

export interface Reporte {
  id_reporte: number;
  titulo: string;
  tipo: string;
  formato: 'PDF' | 'EXCEL';
  generado_por: string;
  tamano_kb: number;
  fecha_generacion: string;
}

export interface TransaccionMovimiento {
  id_transaccion: string;
  entidad_codigo: string;
  entidad_nombre: string;
  accion: string;
  fecha_texto: string;
  estado: 'COMPLETADO' | 'PROCESANDO' | 'FALLIDO';
}

export interface KpiSummary {
  totalClientes: { valor: string; variacion: string; positivo: boolean };
  totalUsuarios: { valor: string; variacion: string; positivo: boolean };
  procesosEjecutados: { valor: string; estado: string };
  registrosDia: { valor: string; variacion: string; positivo: boolean };
}

export interface ChartActivityData {
  dia: string;
  procesos: number;
  consultas: number;
}

export interface LoginResponseDto {
  token: string;
  refreshToken: string;
  user: {
    id_usuario: number;
    usuario: string;
    nombres: string;
    apellidos: string;
    email: string;
    rol: string;
    avatar_url?: string;
  };
  menu: Modulo[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UbigeoSunat {
  cod_dpto: string;
  nom_dpto: string;
  cod_prov: string;
  nom_prov: string;
  cod_dist: string;
  nom_dist: string;
  ubigeo_6d: string;
}

export interface ClienteUbigeo {
  CODIGO: number;
  ruc_dni: string;
  dpto: string;
  provincia: string;
  distrito: string;
  UBIGEO: string;
  NUBIGEO: string;
}

export interface ClienteSimple {
  Codclie: number;
  Razon: string;
  Documento: string;
}

export interface Producto {
  CodPro: string;
  CodBar: string | null;
  Nombre: string;
  Clinea: number;
  Stock: number;
  Costo: number;
  PventaMa: number;
  PventaMi: number;
  Eliminado: boolean;
  CodLab: string | null;
  linea_descripcion?: string;
  lab_descripcion?: string;
}

export interface Linea {
  CodLinea: number;
  Descripcion: string | null;
}

export interface Laboratorio {
  CodLab: string;
  Descripcion: string;
}

export interface BackupConfig {
  enabled: boolean;
  destinationPath: string;
  time: string;
  lastBackup: string | null;
  lastBackupSize: string | null;
  lastBackupStatus: 'success' | 'failed' | null;
}
