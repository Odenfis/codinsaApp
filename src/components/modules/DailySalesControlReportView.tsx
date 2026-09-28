import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ChevronLeft, ChevronRight, ClipboardCheck, FileSpreadsheet,
  FileText, LoaderCircle, MoveHorizontal, RefreshCw, Search
} from 'lucide-react';
import { DailySalesControlResponse, DailySalesControlRow } from '../../types';
import { filterDailySalesControl, summarizeDailySalesControl } from '../../utils/dailySalesControlModel';
import {
  dailySalesControlColumns, exportDailySalesControlToExcel, exportDailySalesControlToPdf
} from '../../utils/dailySalesControlExport';
import { loadTrimmedLogoDataUrl } from '../../utils/logoUtils';
import logoUrl from '../../../assets/logotipo.png';

const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 });
const displayDate = (value: string) => value
  ? new Date(`${value}T12:00:00`).toLocaleDateString('es-PE')
  : '—';
const stickyColumns: Record<number, string> = {
  0: 'left-0 w-[125px] min-w-[125px] max-w-[125px]',
  1: 'left-[125px] w-[320px] min-w-[320px] max-w-[320px] shadow-[6px_0_8px_-8px_rgba(0,0,0,0.55)]'
};

export const DailySalesControlReportView: React.FC = () => {
  const [report, setReport] = useState<DailySalesControlResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [documentLogoUrl, setDocumentLogoUrl] = useState(logoUrl);
  const requestRef = useRef<AbortController | null>(null);
  const perPage = 20;

  const load = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/reportes/control-diario', {
        signal: controller.signal,
        cache: 'no-store'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'No se pudo obtener el Control Diario.');
      if (controller.signal.aborted) return;
      setReport(payload as DailySalesControlResponse);
      setSearch('');
      setPage(1);
    } catch (requestError) {
      if (!controller.signal.aborted) {
        setReport(null);
        setError(requestError instanceof Error ? requestError.message : 'No se pudo obtener el Control Diario.');
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => requestRef.current?.abort();
  }, [load]);

  useEffect(() => {
    let active = true;
    loadTrimmedLogoDataUrl(logoUrl)
      .then(logo => { if (active) setDocumentLogoUrl(logo.dataUrl); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const filteredRows = useMemo(() => filterDailySalesControl(report?.data || [], search), [report, search]);
  const totals = useMemo(() => summarizeDailySalesControl(filteredRows), [filteredRows]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage));
  const visibleRows = filteredRows.slice((page - 1) * perPage, page * perPage);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter(value => value === 1 || value === totalPages || Math.abs(value - page) <= 1);
  const generatedAt = report?.generatedAt
    ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(report.generatedAt))
    : '';

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const exportReport = async (format: 'excel' | 'pdf') => {
    if (!report || !filteredRows.length) return;
    setError('');
    setExporting(format);
    try {
      if (format === 'excel') await exportDailySalesControlToExcel(filteredRows, report);
      else await exportDailySalesControlToPdf(filteredRows, report);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'No se pudo exportar el reporte.');
    } finally {
      setExporting(null);
    }
  };

  const renderValue = (row: DailySalesControlRow, key: keyof DailySalesControlRow) => {
    const value = row[key];
    if (key === 'Monto' || key === 'MasIgv') return money.format(Number(value || 0));
    return value == null || value === '' ? '—' : String(value);
  };

  return (
    <div className="w-full min-w-0 max-w-[1800px] mx-auto flex flex-col gap-6 animate-fade-in pb-12">
      <header className="w-full min-w-0 flex flex-col xl:flex-row xl:items-center justify-between gap-5 border-b border-surface-variant pb-5">
        <div className="min-w-0 flex items-center gap-4">
          <img src={documentLogoUrl} alt="CODINSA" className="w-[150px] sm:w-[190px] h-[62px] object-contain object-left shrink-0" />
          <div className="min-w-0 border-l border-surface-variant pl-4">
            <p className="text-[11px] uppercase tracking-wider font-bold text-primary mb-1">Reportes / Ventas</p>
            <h2 className="font-headline text-xl sm:text-2xl font-bold flex items-center gap-2.5"><ClipboardCheck className="text-primary shrink-0" size={27} />Control Diario</h2>
            <p className="text-xs text-on-surface-variant mt-1">Ventas del día operativo actual de SQL Server</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button disabled={!filteredRows.length || exporting !== null || loading} onClick={() => void exportReport('excel')} className="bg-secondary-container text-on-secondary-container px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">{exporting === 'excel' ? <LoaderCircle size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />} Excel</button>
          <button disabled={!filteredRows.length || exporting !== null || loading} onClick={() => void exportReport('pdf')} className="bg-tertiary-container text-on-tertiary-container px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">{exporting === 'pdf' ? <LoaderCircle size={16} className="animate-spin" /> : <FileText size={16} />} PDF</button>
        </div>
      </header>

      <section className="w-full min-w-0 bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm p-4 sm:p-5 overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <label className="flex flex-col gap-1.5 text-xs font-bold text-on-surface-variant min-w-0 flex-1 lg:max-w-2xl">
            Buscar en los resultados
            <span className="relative"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" /><input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Cliente, RUC/DNI, distrito, pedido, vendedor o factura" className="w-full bg-surface border border-outline-variant rounded-lg pl-9 pr-3 py-2.5 text-sm font-normal focus:border-primary focus:outline-none" /></span>
          </label>
          <button onClick={() => void load()} disabled={loading} className="bg-primary text-on-primary rounded-lg px-5 py-2.5 text-sm font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-surface-tint disabled:opacity-60">
            {loading ? <LoaderCircle size={17} className="animate-spin" /> : <RefreshCw size={17} />}{loading ? 'Actualizando…' : 'Actualizar reporte'}
          </button>
        </div>
        {report && <p className="text-xs text-outline mt-3">Fecha operativa SQL Server: <strong className="text-on-surface">{displayDate(report.reportDate)}</strong> · Consultado: <strong className="text-on-surface">{generatedAt}</strong> · Mostrando {filteredRows.length.toLocaleString('es-PE')} de {report.total.toLocaleString('es-PE')} registros</p>}
        {error && <div role="alert" className="mt-4 flex items-center gap-2 text-sm text-error bg-error/5 border border-error/20 rounded-lg p-3"><AlertCircle size={18} className="shrink-0" />{error}</div>}
      </section>

      {report && <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
        {[
          { label: 'Facturas', value: totals.invoices.toLocaleString('es-PE') },
          { label: 'Clientes', value: totals.clients.toLocaleString('es-PE') },
          { label: 'Pedidos', value: totals.orders.toLocaleString('es-PE') },
          { label: 'Vendedores', value: totals.salespeople.toLocaleString('es-PE') },
          { label: 'Subtotal', value: money.format(totals.subtotal) },
          { label: 'Total con IGV', value: money.format(totals.totalWithTax), emphasized: true }
        ].map(item => <div key={item.label} className={`min-w-0 overflow-hidden rounded-xl border p-4 shadow-sm ${item.emphasized ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-lowest border-surface-variant'}`}><p className={`text-[10px] font-bold uppercase tracking-wide ${item.emphasized ? 'opacity-80' : 'text-outline'}`}>{item.label}</p><p className={`text-xl font-bold mt-1 truncate ${item.emphasized ? '' : 'text-primary'}`} title={item.value}>{item.value}</p></div>)}
      </section>}

      <section className="w-full min-w-0 bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-surface-variant bg-surface text-[11px] font-medium text-outline"><span className="flex items-center gap-2"><MoveHorizontal size={15} className="text-primary" />Desplácese horizontalmente para ver las 12 columnas</span>{report && <span className="hidden sm:inline font-bold text-primary">{displayDate(report.reportDate)}</span>}</div>
        {filteredRows.length > 0 ? <div className="report-table-scroll w-full max-w-full overflow-x-auto overscroll-x-contain" style={{ WebkitOverflowScrolling: 'touch', scrollbarGutter: 'stable' }}>
          <table className="min-w-[2250px] w-full text-left border-collapse">
            <thead><tr className="bg-surface-container text-on-surface-variant text-[10px] font-bold uppercase tracking-wide border-b border-surface-variant">{dailySalesControlColumns.map((column, index) => <th key={column.key} className={`py-3 px-3 whitespace-nowrap ${column.money ? 'text-right' : ''} ${stickyColumns[index] ? `sticky ${stickyColumns[index]} z-30 bg-surface-container` : ''}`}>{column.label}</th>)}</tr></thead>
            <tbody className="text-xs divide-y divide-surface-variant">{visibleRows.map((row, rowIndex) => <tr key={`${row.Nro}-${row.NP}-${row.Factura}-${rowIndex}`} className="hover:bg-primary-container/10 even:bg-surface-container-low">{dailySalesControlColumns.map((column, columnIndex) => <td key={column.key} title={['NomComercial', 'Observacion'].includes(column.key) ? String(row[column.key] || '') : undefined} className={`py-3 px-3 whitespace-nowrap ${column.money ? 'text-right font-mono' : ''} ${['NomComercial', 'Observacion'].includes(column.key) ? 'truncate font-semibold' : ''} ${column.key === 'MasIgv' ? 'font-bold text-primary' : ''} ${stickyColumns[columnIndex] ? `sticky ${stickyColumns[columnIndex]} z-20 ${rowIndex % 2 ? 'bg-surface-container-low' : 'bg-surface-container-lowest'}` : ''}`}>{renderValue(row, column.key)}</td>)}</tr>)}</tbody>
          </table>
        </div> : <div className={`py-16 px-4 text-center ${loading ? 'text-primary' : 'text-outline'}`}>{loading ? <LoaderCircle size={32} className="animate-spin mx-auto mb-3" /> : <ClipboardCheck size={34} className="mx-auto mb-3 opacity-40" />}<p className="text-sm font-semibold">{loading ? 'Consultando el Control Diario…' : error ? 'No se pudo cargar el reporte.' : report && search.trim() ? 'No hay ventas que coincidan con la búsqueda.' : report ? 'No se encontraron ventas para la fecha operativa.' : 'Cargando el reporte del día…'}</p></div>}
        {filteredRows.length > 0 && <div className="p-4 border-t border-surface-variant bg-surface flex flex-col sm:flex-row gap-3 justify-between items-center text-xs text-outline"><span>Mostrando {(page - 1) * perPage + 1}–{Math.min(page * perPage, filteredRows.length)} de {filteredRows.length} registros filtrados</span><div className="flex items-center gap-1"><button aria-label="Página anterior" disabled={page === 1} onClick={() => setPage(value => value - 1)} className="p-1.5 rounded border border-outline-variant disabled:opacity-30"><ChevronLeft size={16} /></button>{pages.map((pageNumber, index) => <React.Fragment key={pageNumber}>{index > 0 && pageNumber - pages[index - 1] > 1 && <span className="px-1">…</span>}<button onClick={() => setPage(pageNumber)} className={`min-w-8 h-8 rounded border text-xs font-bold ${pageNumber === page ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant hover:bg-surface-container'}`}>{pageNumber}</button></React.Fragment>)}<button aria-label="Página siguiente" disabled={page === totalPages} onClick={() => setPage(value => value + 1)} className="p-1.5 rounded border border-outline-variant disabled:opacity-30"><ChevronRight size={16} /></button></div></div>}
      </section>
    </div>
  );
};
