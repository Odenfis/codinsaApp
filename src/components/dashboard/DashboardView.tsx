/**
 * @license
 * Tool Kit Enterprise Main Dashboard View
 * Implementación exacta de Figma UI (CODINSA S.A.C. Enterprise Admin)
 */

import React, { useEffect, useState } from 'react';
import { 
  ShoppingCart,
  CalendarClock,
  ClipboardList,
  FilePlus, 
  TrendingDown, 
  RefreshCw, 
  Download, 
  UserPlus, 
  FileText, 
  ShieldCheck, 
  ArrowRight 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { KpiSummary, ChartActivityData, TransaccionMovimiento } from '../../types';
import { exportToPdf } from '../../utils/exportUtils';

interface DashboardViewProps {
  onNavigateToModule: (ruta: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateToModule }) => {
  const [summary, setSummary] = useState<KpiSummary | null>(null);
  const [chartData, setChartData] = useState<ChartActivityData[]>([]);
  const [transactions, setTransactions] = useState<TransaccionMovimiento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setSummaryError(null);
      const token = localStorage.getItem('toolkit_jwt');
      const headers = { Authorization: `Bearer ${token}` };

      const [sumRes, actRes, trxRes] = await Promise.all([
        fetch('/api/dashboard/summary', { headers }),
        fetch('/api/dashboard/activity', { headers }),
        fetch('/api/dashboard/transactions', { headers })
      ]);

      if (sumRes.ok) {
        setSummary(await sumRes.json());
      } else {
        setSummaryError('No se pudieron cargar las estadísticas de ventas.');
      }
      if (actRes.ok) setChartData(await actRes.json());
      if (trxRes.ok) setTransactions(await trxRes.json());
    } catch (err) {
      console.error('Error cargando datos del Dashboard REST API:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const currencyFormatter = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2
  });
  const numberFormatter = new Intl.NumberFormat('es-PE');

  const updatedLabel = summary?.actualizadoEn
    ? `Actualizado hoy, ${new Intl.DateTimeFormat('es-PE', {
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(summary.actualizadoEn))}`
    : isLoading ? 'Actualizando estadísticas...' : 'Estadísticas no disponibles';

  const handleExportDashboardReport = () => {
    const headers = ['ID Transacción', 'Entidad', 'Acción', 'Fecha', 'Estado'];
    const rows = transactions.map(t => [t.id_transaccion, t.entidad_nombre, t.accion, t.fecha_texto, t.estado]);
    exportToPdf('Resumen de Movimientos & Métrica Operativa', headers, rows, 'ToolKit_Dashboard_Reporte');
  };

  // Renderizado de logos con iniciales por entidad
  const renderEntityBadge = (code: string) => {
    const colors: Record<string, string> = {
      AC: 'bg-tertiary-fixed text-on-tertiary-fixed',
      ZI: 'bg-primary-fixed text-on-primary-fixed',
      GL: 'bg-error-container text-error',
      LR: 'bg-secondary-container text-on-secondary-container',
      PF: 'bg-tertiary-fixed text-on-tertiary-fixed'
    };
    return (
      <div className={`w-6 h-6 rounded flex items-center justify-center text-[11px] font-bold shrink-0 ${colors[code] || 'bg-surface-variant text-on-surface'}`}>
        {code}
      </div>
    );
  };

  return (
    <div className="max-w-[1440px] mx-auto flex flex-col gap-8 animate-fade-in pb-12 select-none">
      
      {/* Encabezado de la Sección */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-surface-variant pb-6">
        <div>
          <h2 className="font-headline text-3xl font-bold text-on-surface tracking-tight">Resumen General</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Vista consolidada de operaciones y métricas clave en base de datos SQL Server.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 bg-surface-container border border-outline-variant/80 rounded-lg text-xs font-semibold text-on-surface-variant flex items-center gap-2 shadow-sm">
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-primary' : 'text-primary'} />
            <span>{updatedLabel}</span>
          </span>

          <button 
            onClick={handleExportDashboardReport}
            className="bg-primary text-on-primary px-4 py-2 rounded-lg text-xs font-semibold shadow hover:bg-surface-tint transition-all active:scale-[0.98] flex items-center gap-2"
          >
            <Download size={16} />
            <span>Reporte</span>
          </button>
        </div>
      </div>

      {summaryError && (
        <div className="-mt-4 rounded-lg border border-error/30 bg-error-container px-4 py-3 text-sm font-medium text-on-error-container" role="alert">
          {summaryError} Vuelve a cargar la página para intentarlo nuevamente.
        </div>
      )}

      {/* Grid de 4 Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-variant shadow-sm flex h-[150px] flex-col justify-between hover:shadow transition-shadow">
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 text-xs font-bold uppercase leading-4 tracking-wider text-on-surface-variant">
              Ventas del Mes <span className="text-primary">{summary?.ventasMes.mes ?? '—'}</span>
            </span>
            <div className="w-8 h-8 shrink-0 rounded-full bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed-variant">
              <ShoppingCart size={18} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-headline text-3xl font-bold leading-none tabular-nums text-on-surface">{summary ? currencyFormatter.format(summary.ventasMes.totalVentas) : '—'}</span>
            <div className="flex min-h-4 items-start gap-1 text-xs font-bold leading-4 text-secondary">
              <ShoppingCart size={14} className="mt-px shrink-0" />
              <span>{summary ? `${numberFormatter.format(summary.ventasMes.numeroVentas)} ventas · ${summary.ventasMes.anio}` : 'Consultando ventas...'}</span>
            </div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-variant shadow-sm flex h-[150px] flex-col justify-between hover:shadow transition-shadow">
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 text-xs font-bold uppercase leading-4 tracking-wider text-on-surface-variant">
              Ventas Mes Anterior <span className="text-primary">{summary?.ventasMesAnterior.mes ?? '—'}</span>
            </span>
            <div className="w-8 h-8 shrink-0 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed-variant">
              <CalendarClock size={18} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-headline text-3xl font-bold leading-none tabular-nums text-on-surface">{summary ? currencyFormatter.format(summary.ventasMesAnterior.totalVentas) : '—'}</span>
            <div className="flex min-h-4 items-start gap-1 text-xs font-bold leading-4 text-secondary">
              <CalendarClock size={14} className="mt-px shrink-0" />
              <span>{summary ? `${numberFormatter.format(summary.ventasMesAnterior.numeroVentas)} ventas · ${summary.ventasMesAnterior.anio}` : 'Consultando ventas...'}</span>
            </div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-variant shadow-sm flex h-[150px] flex-col justify-between hover:shadow transition-shadow">
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 text-xs font-bold uppercase leading-4 tracking-wider text-on-surface-variant">Pedidos por Facturar</span>
            <div className="w-8 h-8 shrink-0 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
              <ClipboardList size={18} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-headline text-4xl font-bold leading-none tabular-nums text-on-surface">{summary ? numberFormatter.format(summary.pedidosPorFacturar.cantidad) : '—'}</span>
            <div className="flex min-h-4 items-start gap-1 text-xs font-bold leading-4 text-outline">
              <ClipboardList size={14} className="mt-px shrink-0" />
              <span>{summary ? 'Pedidos pendientes de facturación' : 'Consultando pedidos...'}</span>
            </div>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-variant shadow-sm flex h-[150px] flex-col justify-between hover:shadow transition-shadow">
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 text-xs font-bold uppercase leading-4 tracking-wider text-on-surface-variant">Registros del Día</span>
            <div className="w-8 h-8 shrink-0 rounded-full bg-error-container flex items-center justify-center text-on-error-container">
              <FilePlus size={18} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-headline text-4xl font-bold leading-none tabular-nums text-on-surface">{summary?.registrosDia.valor ?? '342'}</span>
            <div className="flex min-h-4 items-start gap-1 text-xs font-bold leading-4 text-error">
              <TrendingDown size={14} className="mt-px shrink-0" />
              <span>{summary?.registrosDia.variacion ?? '-2% hoy'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sección Bento Grid: Gráfico + Accesos Rápidos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Panel del Gráfico (Spans 2 columns) */}
        <div className="lg:col-span-2 bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm p-6 flex flex-col h-[420px]">
          <div className="flex justify-between items-center mb-6 pb-3 border-b border-surface-variant">
            <div>
              <h3 className="font-headline text-lg font-bold text-on-surface">Actividad del Sistema</h3>
              <p className="text-xs text-outline font-medium">Transacciones e invocaciones de APIs REST por día</p>
            </div>
            <select className="bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 text-xs font-semibold text-on-surface focus:outline-none focus:border-primary">
              <option>Últimos 7 días</option>
              <option>Último mes</option>
            </select>
          </div>

          <div className="flex-1 w-full h-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e1e3e4" vertical={false} />
                <XAxis dataKey="dia" stroke="#6f7979" fontSize={12} tickLine={false} />
                <YAxis stroke="#6f7979" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #bec9c8', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar name="Procesos Administrativos" dataKey="procesos" fill="#006767" radius={[4, 4, 0, 0]} barSize={26} />
                <Bar name="Consultas SQL" dataKey="consultas" fill="#b8d22c" radius={[4, 4, 0, 0]} barSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Panel de Accesos Rápidos */}
        <div className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm p-6 flex flex-col justify-between">
          <div className="mb-4 pb-3 border-b border-surface-variant">
            <h3 className="font-headline text-lg font-bold text-on-surface">Accesos Rápidos</h3>
            <p className="text-xs text-outline font-medium">Acciones ejecutables frecuentes</p>
          </div>

          <div className="flex flex-col gap-3.5 flex-1 justify-center">
            <button 
              onClick={() => onNavigateToModule('/users')}
              className="flex items-center gap-4 p-3.5 rounded-xl hover:bg-surface-container transition-all group border border-outline-variant/40 hover:border-primary/50 text-left bg-surface shadow-sm hover:shadow"
            >
              <div className="w-11 h-11 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors shrink-0">
                <UserPlus size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-on-surface">Nuevo Usuario</h4>
                <p className="text-xs text-on-surface-variant">Registrar en plataforma y asignar rol</p>
              </div>
            </button>

            <button 
              onClick={() => onNavigateToModule('/reports')}
              className="flex items-center gap-4 p-3.5 rounded-xl hover:bg-surface-container transition-all group border border-outline-variant/40 hover:border-secondary/50 text-left bg-surface shadow-sm hover:shadow"
            >
              <div className="w-11 h-11 rounded-lg bg-secondary-container/50 flex items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-on-secondary transition-colors shrink-0">
                <FileText size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-on-surface">Generar Reporte</h4>
                <p className="text-xs text-on-surface-variant">Exportar datos consolidados en PDF/XLSX</p>
              </div>
            </button>

            <button 
              onClick={() => onNavigateToModule('/audit')}
              className="flex items-center gap-4 p-3.5 rounded-xl hover:bg-surface-container transition-all group border border-outline-variant/40 hover:border-tertiary/50 text-left bg-surface shadow-sm hover:shadow"
            >
              <div className="w-11 h-11 rounded-lg bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed group-hover:bg-tertiary group-hover:text-on-tertiary transition-colors shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-on-surface">Auditoría</h4>
                <p className="text-xs text-on-surface-variant">Revisar trazas de acceso, acciones e IP</p>
              </div>
            </button>
          </div>
        </div>

      </div>

      {/* Tabla de Últimos Movimientos */}
      <div className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-surface-variant flex justify-between items-center bg-surface">
          <div>
            <h3 className="font-headline text-lg font-bold text-on-surface">Últimos Movimientos</h3>
            <p className="text-xs text-outline">Transacciones empresariales auditadas en SQL Server</p>
          </div>
          <button 
            onClick={() => onNavigateToModule('/audit')}
            className="text-primary text-xs font-bold hover:underline flex items-center gap-1 group"
          >
            <span>Ver todos</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container text-on-surface-variant text-xs font-bold uppercase tracking-wider border-b border-surface-variant">
                <th className="py-3.5 px-6">ID Transacción</th>
                <th className="py-3.5 px-6">Entidad</th>
                <th className="py-3.5 px-6">Acción</th>
                <th className="py-3.5 px-6">Fecha/Hora</th>
                <th className="py-3.5 px-6">Estado</th>
              </tr>
            </thead>
            <tbody className="text-sm text-on-surface divide-y divide-surface-variant">
              {transactions.map((trx, idx) => (
                <tr 
                  key={trx.id_transaccion} 
                  className={`hover:bg-surface-container-low transition-colors ${idx % 2 !== 0 ? 'bg-[#F1F3F5]' : 'bg-surface-container-lowest'}`}
                >
                  <td className="py-3.5 px-6 font-mono text-xs font-semibold text-outline">{trx.id_transaccion}</td>
                  <td className="py-3.5 px-6 flex items-center gap-3 font-semibold text-on-surface">
                    {renderEntityBadge(trx.entidad_codigo)}
                    <span>{trx.entidad_nombre}</span>
                  </td>
                  <td className="py-3.5 px-6 text-on-surface-variant">{trx.accion}</td>
                  <td className="py-3.5 px-6 text-xs text-outline font-medium">{trx.fecha_texto}</td>
                  <td className="py-3.5 px-6">
                    {trx.estado === 'COMPLETADO' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Completado
                      </span>
                    )}
                    {trx.estado === 'PROCESANDO' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-highest text-on-surface text-[10px] font-bold uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-outline animate-pulse"></span> Procesando
                      </span>
                    )}
                    {trx.estado === 'FALLIDO' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-error-container text-error text-[10px] font-bold uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-error"></span> Fallido
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
