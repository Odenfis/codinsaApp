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

export interface KardexProductoRow {
  FecIni: string;
  FecFin: string;
  codpro: string;
  codSunat: string;
  Producto: string;
  Unimed: string;
  Saldoini: number;
  Ingresos: number;
  salidas: number;
  saldoFin: number;
  Costo: number;
  Valor: number;
}

export interface KardexProductoTotals {
  Saldoini: number;
  Ingresos: number;
  salidas: number;
  saldoFin: number;
  Valor: number;
}

export interface KardexProductoResponse {
  data: KardexProductoRow[];
  total: number;
  totals: KardexProductoTotals;
  period: {
    mes: number;
    anio: number;
    desde: string;
    hasta: string;
  };
}

export interface ValuedStockMovement {
  Numero: number;
  Fecha: string;
  TipoDoc: string;
  Documento: string;
  StockIni: number;
  Ingresos: number;
  CosIng: number;
  CostoI: number;
  Salidas: number;
  CosUnit: number;
  CostoS: number;
  Saldo: number;
  ValorUni: number;
  Valorizado: number;
}

export interface ValuedStockRow {
  Codpro: string;
  Lote: string;
  Almacen: number;
  CodSunat: string;
  TipoPro: string;
  Descripcion: string;
  UniMed: string;
  StockIni: number;
  InitialValorUni: number;
  InitialValorizado: number;
  Ingresos: number;
  Salidas: number;
  Saldo: number;
  ValorUni: number;
  Valorizado: number;
  movements: ValuedStockMovement[];
}

export interface ValuedStockTotals {
  StockIni: number;
  Ingresos: number;
  Salidas: number;
  Saldo: number;
  Valorizado: number;
}

export interface ValuedStockResponse {
  data: ValuedStockRow[];
  total: number;
  movementTotal: number;
  totals: ValuedStockTotals;
  period: { mes: number; anio: number; desde: string; hasta: string };
}

export interface ProductStockRow {
  Codigo: string;
  CodSunat: string;
  Producto: string;
  PrincipioActivo: string;
  stock: number;
  PVF: number | null;
  Lotes: string;
  vencimiento: string | null;
}

export interface ProductStockResponse {
  data: ProductStockRow[];
  total: number;
  generatedAt: string;
}

export interface SalesProgressLaboratory {
  CodLab: string;
  Descripcion: string;
}

export interface SalesProgressRow {
  Ruc: string;
  Cliente: string;
  codpro: string;
  CodAnte: string;
  Producto: string;
  Cantidad: number;
  Total: number;
  Departamento: string;
  Provincia: string;
  Distrito: string;
  Ubigeo: string;
  Fecha: string;
  Tipo_doc: string;
  Serie: string;
  nro_doc: string;
  Vendedor: string;
}

export interface SalesProgressTotals {
  lines: number;
  clients: number;
  documents: number;
  units: number;
  sales: number;
}

export interface SalesProgressResponse {
  data: SalesProgressRow[];
  total: number;
  totals: SalesProgressTotals;
  laboratory: SalesProgressLaboratory;
  period: { mes: number; anio: number; desde: string; hasta: string };
  generatedAt: string;
}

export interface PriceMarginsRow {
  Codigo: string;
  Producto: string;
  Stock: number;
  PVF: number;
  CostoIgv: number;
  Mas10: number;
  Mas15: number;
  Mas20: number;
  Mas25: number;
}

export interface PriceMarginsTotals {
  products: number;
  stock: number;
}

export interface PriceMarginsResponse {
  data: PriceMarginsRow[];
  total: number;
  totals: PriceMarginsTotals;
  laboratory: SalesProgressLaboratory;
  generatedAt: string;
}

export interface SalesRegisterRow {
  Fecha: string;
  FechaV: string;
  TipoDoc: string;
  Serie: string;
  Numero: string;
  Tipo: string;
  NumeroClie: string;
  Razon: string;
  ValorExp: number;
  Gravado: number;
  Exonerado: number;
  Inafecta: number;
  ISC: number;
  IGV: number;
  Otros: number;
  Total: number;
  TipoCambio: number | null;
  Feca: string | null;
  TipoF: string;
  SerieF: string;
  NumDocF: string;
  Cta12D: string;
  Cta12H: string;
  Cta70: string;
  Cuenta10: string;
  FecPago: string | null;
  Sindato: string;
  Glosa: string;
}

export type SalesRegisterTotals = Pick<SalesRegisterRow,
  'ValorExp' | 'Gravado' | 'Exonerado' | 'Inafecta' | 'ISC' | 'IGV' | 'Otros' | 'Total'
>;

export interface SalesRegisterResponse {
  data: SalesRegisterRow[];
  total: number;
  totals: SalesRegisterTotals;
  period: { desde: string; hasta: string };
  generatedAt: string;
}

export interface Salesperson {
  Codemp: number;
  Nombre: string;
}

export interface CustomersBySalespersonRow {
  codclie: string;
  Ruc: string;
  Razon: string;
  titular: string;
  Direccion: string;
  Telefono1: string;
  Telefono2: string;
  email: string;
  Departamento: string;
  Localidad: string;
  Vendedor: string;
  ubigeo_6d: string;
  Limite: number;
  TipoCliente: string;
  RegDigemid: string;
}

export interface CustomersBySalespersonTotals {
  clients: number;
  located: number;
  typeA: number;
  typeB: number;
  typeC: number;
  creditLimit: number;
}

export interface CustomersBySalespersonResponse {
  data: CustomersBySalespersonRow[];
  total: number;
  totals: CustomersBySalespersonTotals;
  salesperson: Salesperson;
  generatedAt: string;
}

export interface MonthlyQuarterlySalesRow {
  Fecha: string;
  Tipo: string;
  TipoDoc: string;
  Serie: string;
  NroDoc: string;
  Codigo: string;
  Producto: string;
  Cantidad: number;
  Precio: number;
  Total: number;
  Lote: string;
  Vencimiento: string | null;
  Vendedor: string;
  Zona: string;
  Laboratorio: string;
  RucDni: string;
  Empresa: string;
  Direccion: string;
  Lugar: string;
  Departamento: string;
  Provincia: string;
  Distrito: string;
}

export interface MonthlyQuarterlySalesTotals {
  lines: number;
  documents: number;
  clients: number;
  products: number;
  units: number;
  sales: number;
}

export interface MonthlyQuarterlySalesResponse {
  data: MonthlyQuarterlySalesRow[];
  total: number;
  totals: MonthlyQuarterlySalesTotals;
  period: { desde: string; hasta: string };
  generatedAt: string;
}

export interface DailySalesControlRow {
  Nro: string;
  NomComercial: string;
  Distrito: string;
  RucDni: string;
  NP: string;
  Vendedor: string;
  Representante: string;
  Condicion: string;
  Factura: string;
  Monto: number;
  MasIgv: number;
  Observacion: string;
}

export interface DailySalesControlTotals {
  invoices: number;
  clients: number;
  orders: number;
  salespeople: number;
  subtotal: number;
  totalWithTax: number;
}

export interface DailySalesControlResponse {
  data: DailySalesControlRow[];
  total: number;
  totals: DailySalesControlTotals;
  reportDate: string;
  generatedAt: string;
}

export interface PurchaseRegisterRow {
  Fecha: string;
  FechaV: string;
  TipoDoc: string;
  Serie: string;
  Numero: string;
  Tipo: string;
  NumeroProv: string;
  Razon: string;
  ValorExp: number;
  BaseImponibleM: number;
  IGVm: number;
  BaseImponibleG: number;
  IGVg: number;
  BaseImponible3: number;
  Igv3: number;
  Total: number;
  NumEmitido: string;
  NumDetraccion: string;
  FechaDetraccion: string | null;
  TipoCambio: number | null;
  FecRefer: string | null;
  TipoRef: string;
  SerieRef: string;
  NroComprobante: string;
}

export type PurchaseRegisterTotals = Pick<PurchaseRegisterRow,
  'ValorExp' | 'BaseImponibleM' | 'IGVm' | 'BaseImponibleG' | 'IGVg' |
  'BaseImponible3' | 'Igv3' | 'Total'
>;

export interface PurchaseRegisterResponse {
  data: PurchaseRegisterRow[];
  total: number;
  totals: PurchaseRegisterTotals;
  period: { desde: string; hasta: string };
  generatedAt: string;
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
