import React, { useMemo, useState } from 'react';
import {
  AlertCircle, CalendarDays, ChevronLeft, ChevronRight, FileSpreadsheet,
  FileText, LoaderCircle, MoveHorizontal, ReceiptText, Search
} from 'lucide-react';
import { CobranzaReporteResponse, CobranzaReporteRow, CobranzaReporteTotals } from '../../types';
import { exportCollectionsToExcel, exportCollectionsToPdf } from '../../utils/exportUtils';

const moneyFields: Array<keyof CobranzaReporteTotals> = [
  'Importe', 'pAnterior', 'NotaCred', 'Descuento', 'efectivo', 'deposito',
  'letra', 'Transferencia', 'cheque', 'Total', 'saldo'
];

const emptyTotals = Object.fromEntries(moneyFields.map(field => [field, 0])) as CobranzaReporteTotals;

const localIsoDate = (date: Date) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
};

const initialDates = () => {
  const today = new Date();
  return { desde: localIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)), hasta: localIsoDate(today) };
};

const currency = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 });
const number = (value: number) => currency.format(value || 0);
const displayDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-PE');
};

const columns: Array<{ key: keyof CobranzaReporteRow; label: string; money?: boolean }> = [
  { key: 'Documento', label: 'Documento' }, { key: 'Razon', label: 'Razón social' },
  { key: 'Importe', label: 'Importe', money: true }, { key: 'pAnterior', label: 'Pago anterior', money: true },
  { key: 'Planilla', label: 'Planilla' }, { key: 'FechaIng', label: 'Fecha ingreso' },
  { key: 'Vendedor', label: 'Vendedor' }, { key: 'NotaCred', label: 'Nota crédito', money: true },
  { key: 'Descuento', label: 'Descuento', money: true }, { key: 'efectivo', label: 'Efectivo', money: true },
  { key: 'deposito', label: 'Depósito', money: true }, { key: 'letra', label: 'Letra', money: true },
  { key: 'Transferencia', label: 'Transferencia', money: true }, { key: 'cheque', label: 'Cheque', money: true },
  { key: 'NroOperacion', label: 'Nro. operación' }, { key: 'Total', label: 'Total', money: true },
  { key: 'saldo', label: 'Saldo', money: true }
];

export const CollectionsReportView: React.FC = () => {
  const defaults = useMemo(initialDates, []);
  const [desde, setDesde] = useState(defaults.desde);
  const [hasta, setHasta] = useState(defaults.hasta);
  const [appliedRange, setAppliedRange] = useState<{ desde: string; hasta: string } | null>(null);
  const [data, setData] = useState<CobranzaReporteRow[]>([]);
  const [totals, setTotals] = useState<CobranzaReporteTotals>(emptyTotals);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 20;

  const totalPages = Math.max(1, Math.ceil(data.length / perPage));
  const visibleRows = data.slice((page - 1) * perPage, page * perPage);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter(value => value === 1 || value === totalPages || Math.abs(value - page) <= 1);

  const generate = async () => {
    setError('');
    if (!desde || !hasta) return setError('Seleccione las fechas Del y Al para generar el reporte.');
    if (desde > hasta) return setError('La fecha Del no puede ser posterior a la fecha Al.');
    setLoading(true);
    try {
      const params = new URLSearchParams({ desde, hasta });
      const response = await fetch(`/api/reportes/cobranzas?${params}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'No se pudo generar el reporte.');
      const report = payload as CobranzaReporteResponse;
      setData(report.data || []);
      setTotals(report.totals || emptyTotals);
      setAppliedRange({ desde, hasta });
      setPage(1);
      setHasSearched(true);
    } catch (requestError) {
      setData([]);
      setTotals(emptyTotals);
      setAppliedRange(null);
      setHasSearched(true);
      setError(requestError instanceof Error ? requestError.message : 'No se pudo generar el reporte.');
    } finally {
      setLoading(false);
    }
  };

  const renderValue = (row: CobranzaReporteRow, column: typeof columns[number]) => {
    if (column.money) return number(Number(row[column.key] || 0));
    if (column.key === 'FechaIng') return displayDate(String(row[column.key] || ''));
    return String(row[column.key] ?? '—');
  };

  return (
    <div className="w-full min-w-0 max-w-[1600px] mx-auto flex flex-col gap-6 animate-fade-in pb-12">
      <header className="w-full min-w-0 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-surface-variant pb-5">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider font-bold text-primary mb-1">Reportes / Cuentas</p>
          <h2 className="font-headline text-2xl font-bold flex items-center gap-2.5">
            <ReceiptText className="text-primary" size={27} /> Reporte de Cobranzas
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">Consulta consolidada de cobranzas por rango de fechas</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button disabled={!data.length || !appliedRange} onClick={() => appliedRange && exportCollectionsToExcel(data, totals, appliedRange.desde, appliedRange.hasta)} className="bg-secondary-container text-on-secondary-container px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button disabled={!data.length || !appliedRange} onClick={() => appliedRange && exportCollectionsToPdf(data, totals, appliedRange.desde, appliedRange.hasta)} className="bg-tertiary-container text-on-tertiary-container px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
            <FileText size={16} /> PDF
          </button>
        </div>
      </header>

      <section className="w-full min-w-0 max-w-full bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm p-4 sm:p-5 overflow-hidden">
        <div className="flex min-w-0 flex-col md:flex-row md:flex-wrap md:items-end gap-4">
          <div className="flex items-center gap-2 text-primary mr-1 pb-2"><CalendarDays size={20} /><span className="text-sm font-bold">Rango</span></div>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-on-surface-variant">
            Del
            <input aria-label="Fecha inicial" type="date" value={desde} max={hasta || undefined} onChange={event => { setDesde(event.target.value); setError(''); }} className="bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm font-normal text-on-surface focus:border-primary focus:outline-none" />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-on-surface-variant">
            Al
            <input aria-label="Fecha final" type="date" value={hasta} min={desde || undefined} onChange={event => { setHasta(event.target.value); setError(''); }} className="bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm font-normal text-on-surface focus:border-primary focus:outline-none" />
          </label>
          <button onClick={generate} disabled={loading} className="bg-primary text-on-primary rounded-lg px-5 py-2.5 text-sm font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-surface-tint disabled:opacity-60">
            {loading ? <LoaderCircle size={17} className="animate-spin" /> : <Search size={17} />}{loading ? 'Generando…' : 'Generar reporte'}
          </button>
          {appliedRange && data.length > 0 && <div className="w-full xl:w-auto xl:ml-auto min-w-0 text-xs text-outline md:pb-2 break-words">Rango consultado: <strong className="text-on-surface whitespace-normal">{displayDate(`${appliedRange.desde}T12:00:00`)} – {displayDate(`${appliedRange.hasta}T12:00:00`)}</strong></div>}
        </div>
        {error && <div role="alert" className="mt-4 flex items-center gap-2 text-sm text-error bg-error/5 border border-error/20 rounded-lg p-3"><AlertCircle size={18} />{error}</div>}
      </section>

      {data.length > 0 && (
        <section className="w-full min-w-0 max-w-full grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
          <div className="min-w-0 overflow-hidden bg-surface-container-lowest border border-surface-variant rounded-xl p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-outline">Registros encontrados</p><p className="text-2xl font-bold text-primary mt-1 truncate">{data.length.toLocaleString('es-PE')}</p></div>
          <div className="min-w-0 overflow-hidden bg-primary text-on-primary rounded-xl p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide opacity-80">Total general cobrado</p><p className="text-2xl font-bold mt-1 truncate">{number(totals.Total)}</p></div>
        </section>
      )}

      <section className="w-full min-w-0 max-w-full bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-surface-variant bg-surface text-[11px] font-medium text-outline">
          <MoveHorizontal size={15} className="shrink-0 text-primary" />
          <span>Desplácese horizontalmente para ver todas las columnas</span>
        </div>
        <div className="report-table-scroll w-full max-w-full overflow-x-auto overscroll-x-contain" style={{ WebkitOverflowScrolling: 'touch', scrollbarGutter: 'stable' }}>
          <table className="min-w-[2350px] w-full text-left border-collapse">
            <thead><tr className="bg-surface-container text-on-surface-variant text-[10px] font-bold uppercase tracking-wide border-b border-surface-variant">
              {columns.map((column, columnIndex) => <th key={column.key} className={`py-3 px-3 whitespace-nowrap ${column.money ? 'text-right' : ''} ${columnIndex === 0 ? 'sticky left-0 z-30 w-[140px] min-w-[140px] max-w-[140px] bg-surface-container' : ''} ${columnIndex === 1 ? 'sticky left-[140px] z-30 w-[280px] min-w-[280px] max-w-[280px] bg-surface-container shadow-[6px_0_8px_-8px_rgba(0,0,0,0.55)]' : ''}`}>{column.label}</th>)}
            </tr></thead>
            <tbody className="text-xs divide-y divide-surface-variant">
              {visibleRows.map((row, index) => <tr key={`${row.Documento}-${row.Planilla}-${index}`} className="hover:bg-primary-container/10 even:bg-surface-container-low">
                {columns.map((column, columnIndex) => <td key={column.key} className={`py-3 px-3 whitespace-nowrap ${column.money ? 'text-right font-mono' : ''} ${column.key === 'Razon' ? 'truncate font-semibold' : ''} ${column.key === 'Total' ? 'font-bold text-primary' : ''} ${columnIndex === 0 ? `sticky left-0 z-20 w-[140px] min-w-[140px] max-w-[140px] ${index % 2 ? 'bg-surface-container-low' : 'bg-surface-container-lowest'}` : ''} ${columnIndex === 1 ? `sticky left-[140px] z-20 w-[280px] min-w-[280px] max-w-[280px] shadow-[6px_0_8px_-8px_rgba(0,0,0,0.55)] ${index % 2 ? 'bg-surface-container-low' : 'bg-surface-container-lowest'}` : ''}`}>{renderValue(row, column)}</td>)}
              </tr>)}
              {!loading && !data.length && <tr><td colSpan={columns.length} className="py-14 text-center text-outline"><ReceiptText size={32} className="mx-auto mb-3 opacity-40" /><p className="text-sm font-semibold">{hasSearched ? 'No se encontraron cobranzas en el rango seleccionado.' : 'Seleccione el rango y genere el reporte para visualizar los resultados.'}</p></td></tr>}
              {loading && <tr><td colSpan={columns.length} className="py-14 text-center text-primary"><LoaderCircle size={30} className="animate-spin mx-auto mb-3" /><p className="text-sm font-semibold">Consultando cobranzas…</p></td></tr>}
            </tbody>
          </table>
        </div>
        {data.length > 0 && <div className="p-4 border-t border-surface-variant bg-surface flex flex-col sm:flex-row gap-3 justify-between items-center text-xs text-outline">
          <span>Mostrando {(page - 1) * perPage + 1}–{Math.min(page * perPage, data.length)} de {data.length} registros</span>
          <div className="flex items-center gap-1">
            <button aria-label="Página anterior" disabled={page === 1} onClick={() => setPage(value => value - 1)} className="p-1.5 rounded border border-outline-variant disabled:opacity-30"><ChevronLeft size={16} /></button>
            {pages.map((pageNumber, index) => <React.Fragment key={pageNumber}>{index > 0 && pageNumber - pages[index - 1] > 1 && <span className="px-1">…</span>}<button onClick={() => setPage(pageNumber)} className={`min-w-8 h-8 rounded border text-xs font-bold ${pageNumber === page ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant hover:bg-surface-container'}`}>{pageNumber}</button></React.Fragment>)}
            <button aria-label="Página siguiente" disabled={page === totalPages} onClick={() => setPage(value => value + 1)} className="p-1.5 rounded border border-outline-variant disabled:opacity-30"><ChevronRight size={16} /></button>
          </div>
        </div>}
      </section>
    </div>
  );
};
