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
  ventasMes: {
    mes: string;
    anio: number;
    numeroVentas: number;
    totalVentas: number;
  };
  ventasMesAnterior: {
    mes: string;
    anio: number;
    numeroVentas: number;
    totalVentas: number;
  };
  pedidosPorFacturar: { cantidad: number };
  registrosDia: { valor: string; variacion: string; positivo: boolean };
  actualizadoEn: string;
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

export interface CobranzaReporteRow {
  Documento: string;
  Razon: string;
  Importe: number;
  pAnterior: number;
  Planilla: string;
  FechaIng: string;
  Vendedor: string;
  NotaCred: number;
  Descuento: number;
  efectivo: number;
  deposito: number;
  letra: number;
  Transferencia: number;
  cheque: number;
  NroOperacion: string | number | null;
  Total: number;
  saldo: number;
}

export type CobranzaReporteTotals = Pick<CobranzaReporteRow,
  'Importe' | 'pAnterior' | 'NotaCred' | 'Descuento' | 'efectivo' |
  'deposito' | 'letra' | 'Transferencia' | 'cheque' | 'Total' | 'saldo'
>;

export interface CobranzaReporteResponse {
  data: CobranzaReporteRow[];
  total: number;
  totals: CobranzaReporteTotals;
}

export interface PlanillaCobranzaSerie {
  Serie: string;
}

export interface PlanillaCobranzaNumero {
  Numero: string;
  FechaIng: string;
  Vendedor: number;
  Nombre: string;
}

export interface PlanillaCobranzaHeader {
  Serie: string;
  Numero: string;
  Vendedor: number;
  Nombre: string;
  FechaCrea: string;
  FechaIng: string;
  FormaPago: string;
}

export interface PlanillaCobranzaItem {
  CodClie: string;
  RUC: string;
  Razon: string;
  Documento: string;
  Lugar: string;
  TipoDoc: number;
  FechaFac: string;
  Valor: number;
  NotaCred: string;
  Descuento: number;
  Efectivo: number;
  Deposito: number;
  Letra: number;
  NroLetra: string;
  Transferencia: number;
  Cheque: number;
  NroCheque: string;
  CtaBanco: string;
  Banco: string;
  NroOperacion: string;
  DescuentoEfectivo: number;
  Total: number;
  TotalGeneral: number;
}

export interface PlanillaCobranzaTotals {
  Valor: number;
  Descuento: number;
  Efectivo: number;
  Deposito: number;
  Letra: number;
  Transferencia: number;
  Cheque: number;
  Total: number;
  TotalGeneral: number;
}

export interface PlanillaCobranzaResponse {
  header: PlanillaCobranzaHeader;
  items: PlanillaCobranzaItem[];
  totals: PlanillaCobranzaTotals;
}

export interface ApiRucResponse {
  success: boolean;
  datos: {
    ruc: string;
    razon_social: string;
    estado: string;
    condicion: string;
    domiciliado: {
      direccion: string;
      distrito: string;
      provincia: string;
      departamento: string;
      ubigeo: string;
    };
  };
}

export interface ApiDniResponse {
  success: boolean;
  datos: {
    dni: string;
    nombres: string;
    ape_paterno: string;
    ape_materno: string;
    domiciliado: {
      direccion: string;
      distrito: string;
      provincia: string;
      departamento: string;
      ubigeo: string;
    };
  };
}

export interface ProcesoMasivoEvento {
  type: 'progress' | 'complete' | 'error';
  processed: number;
  failed: number;
  skipped: number;
  total: number;
  currentRuc?: string;
  currentCliente?: string;
  message?: string;
  error?: string;
  detalles?: Array<{
    ruc: string;
    cliente: string;
    estado: 'procesado' | 'fallido' | 'saltado';
    mensaje?: string;
  }>;
}

export interface BackupConfig {
  enabled: boolean;
  destinationPath: string;
  time: string;
  lastBackup: string | null;
  lastBackupSize: string | null;
  lastBackupStatus: 'success' | 'failed' | null;
}

export interface ErpUpdateConfig {
  driveId: string;
  driveUrl: string;
  zipName: string;
  sha256: string | null;
  nota: string | null;
  actualizadoPor: string | null;
  fechaActualizacion: string | null;
}

export type { TablaNisira, NisiraExportResponse, NisiraDirectConfig } from './nisira';
