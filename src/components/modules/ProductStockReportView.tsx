import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ChevronLeft, ChevronRight, FileSpreadsheet, FileText,
  LoaderCircle, MoveHorizontal, Package, RefreshCw, Search
} from 'lucide-react';
import { ProductStockResponse } from '../../types';
import { exportProductStockToExcel, exportProductStockToPdf } from '../../utils/productStockExport';
import { loadTrimmedLogoDataUrl } from '../../utils/logoUtils';
import { ExpiryFilter, filterProductStock, StockFilter, summarizeProductStock } from '../../utils/productStockModel';
import logoUrl from '../../../assets/logotipo.png';

const quantity = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 });
const localIsoDate = (date: Date) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
};
const displayDate = (value: string | null) => value
  ? new Date(`${value}T12:00:00`).toLocaleDateString('es-PE') : '—';

export const ProductStockReportView: React.FC = () => {
  const [report, setReport] = useState<ProductStockResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>('all');
  const [page, setPage] = useState(1);
  const [documentLogoUrl, setDocumentLogoUrl] = useState(logoUrl);
  const requestRef = useRef<AbortController | null>(null);
  const perPage = 20;
  const today = localIsoDate(new Date());

  const load = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setError('');
    setLoading(true);
    setReport(null);
    try {
      const response = await fetch('/api/reportes/stock-productos', { signal: controller.signal, cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'No se pudo obtener el Stock de Productos.');
      if (controller.signal.aborted) return;
      setReport(payload as ProductStockResponse);
      setPage(1);
    } catch (requestError) {
      if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : 'No se pudo obtener el Stock de Productos.');
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

  const filteredRows = useMemo(() => filterProductStock(report?.data || [], {
    search, stock: stockFilter, expiry: expiryFilter
  }, today), [report, search, stockFilter, expiryFilter, today]);
  const summary = useMemo(() => summarizeProductStock(filteredRows, today), [filteredRows, today]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage));
  const visibleRows = filteredRows.slice((page - 1) * perPage, page * perPage);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter(value => value === 1 || value === totalPages || Math.abs(value - page) <= 1);
  const generatedAt = report?.generatedAt
    ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(report.generatedAt)) : '';

  const exportReport = async (format: 'excel' | 'pdf') => {
    if (!report || !filteredRows.length) return;
    setError('');
    setExporting(format);
    try {
      if (format === 'excel') await exportProductStockToExcel(filteredRows, report.generatedAt, today);
      else await exportProductStockToPdf(filteredRows, report.generatedAt, today);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'No se pudo exportar el reporte.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="w-full min-w-0 max-w-[1600px] mx-auto flex flex-col gap-6 animate-fade-in pb-12">
      <header className="w-full min-w-0 flex flex-col xl:flex-row xl:items-center justify-between gap-5 border-b border-surface-variant pb-5">
        <div className="min-w-0 flex items-center gap-4">
          <img src={documentLogoUrl} alt="CODINSA" className="w-[150px] sm:w-[190px] h-[62px] object-contain object-left shrink-0" />
          <div className="min-w-0 border-l border-surface-variant pl-4">
            <p className="text-[11px] uppercase tracking-wider font-bold text-primary mb-1">Reportes / Almacén</p>
            <h2 className="font-headline text-xl sm:text-2xl font-bold flex items-center gap-2.5"><Package className="text-primary shrink-0" size={27} />Stock de Productos</h2>
            <p className="text-xs text-on-surface-variant mt-1">Existencias por producto y lote con precio de venta final</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button disabled={!filteredRows.length || exporting !== null || loading} onClick={() => exportReport('excel')} className="bg-secondary-container text-on-secondary-container px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
            {exporting === 'excel' ? <LoaderCircle size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />} Excel
          </button>
          <button disabled={!filteredRows.length || exporting !== null || loading} onClick={() => exportReport('pdf')} className="bg-tertiary-container text-on-tertiary-container px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
            {exporting === 'pdf' ? <LoaderCircle size={16} className="animate-spin" /> : <FileText size={16} />} PDF
          </button>
        </div>
      </header>

      <section className="w-full min-w-0 bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm p-4 sm:p-5 overflow-hidden">
        <div className="flex flex-col md:flex-row md:flex-wrap md:items-end gap-4">
          <label className="flex flex-col gap-1.5 text-xs font-bold text-on-surface-variant min-w-0 flex-1 md:min-w-[260px]">
            Buscar producto o lote
            <span className="relative"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" /><input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Código, producto, principio activo o lote" className="w-full bg-surface border border-outline-variant rounded-lg pl-9 pr-3 py-2.5 text-sm font-normal focus:border-primary focus:outline-none" /></span>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-on-surface-variant min-w-[160px]">
            Stock del lote
            <select value={stockFilter} onChange={event => { setStockFilter(event.target.value as StockFilter); setPage(1); }} className="bg-surface border border-outline-variant rounded-lg px-3 py-2.5 text-sm font-normal focus:border-primary focus:outline-none">
              <option value="all">Todos</option><option value="positive">Solo positivo</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-on-surface-variant min-w-[160px]">
            Vencimiento
            <select value={expiryFilter} onChange={event => { setExpiryFilter(event.target.value as ExpiryFilter); setPage(1); }} className="bg-surface border border-outline-variant rounded-lg px-3 py-2.5 text-sm font-normal focus:border-primary focus:outline-none">
              <option value="all">Todos</option><option value="valid">Vigentes</option><option value="expired">Vencidos</option>
            </select>
          </label>
          <button onClick={() => void load()} disabled={loading} className="bg-primary text-on-primary rounded-lg px-5 py-2.5 text-sm font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-surface-tint disabled:opacity-60">
            {loading ? <LoaderCircle size={17} className="animate-spin" /> : <RefreshCw size={17} />}{loading ? 'Actualizando…' : 'Actualizar reporte'}
          </button>
        </div>
        {report && <p className="text-xs text-outline mt-3">Datos consultados: <strong className="text-on-surface">{generatedAt}</strong> · Mostrando {filteredRows.length.toLocaleString('es-PE')} de {report.total.toLocaleString('es-PE')} lotes</p>}
        {error && <div role="alert" className="mt-4 flex items-center gap-2 text-sm text-error bg-error/5 border border-error/20 rounded-lg p-3"><AlertCircle size={18} className="shrink-0" />{error}</div>}
      </section>

      {report && <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: 'Productos', value: summary.products.toLocaleString('es-PE') },
          { label: 'Lotes', value: summary.lots.toLocaleString('es-PE') },
          { label: 'Unidades', value: quantity.format(summary.units) },
          { label: 'Lotes vencidos', value: summary.expired.toLocaleString('es-PE'), emphasized: true }
        ].map(item => <div key={item.label} className={`min-w-0 overflow-hidden rounded-xl border p-4 shadow-sm ${item.emphasized ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-lowest border-surface-variant'}`}>
          <p className={`text-[10px] font-bold uppercase tracking-wide ${item.emphasized ? 'opacity-80' : 'text-outline'}`}>{item.label}</p>
          <p className={`text-xl font-bold mt-1 truncate ${item.emphasized ? '' : 'text-primary'}`} title={item.value}>{item.value}</p>
        </div>)}
      </section>}

      <section className="w-full min-w-0 bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-surface-variant bg-surface text-[11px] font-medium text-outline">
          <span className="flex items-center gap-2"><MoveHorizontal size={15} className="text-primary" />Desplácese horizontalmente para ver todas las columnas</span>
          {report && <span className="hidden sm:inline font-bold text-primary">{filteredRows.length} lotes</span>}
        </div>
        {filteredRows.length > 0 ? <div className="report-table-scroll w-full max-w-full overflow-x-auto overscroll-x-contain" style={{ WebkitOverflowScrolling: 'touch', scrollbarGutter: 'stable' }}>
          <table className="min-w-[1250px] w-full text-left border-collapse">
            <thead><tr className="bg-surface-container text-on-surface-variant text-[10px] font-bold uppercase tracking-wide border-b border-surface-variant">
              {['Código', 'Cód. SUNAT', 'Producto', 'Principio activo', 'Stock', 'PVF', 'Lote', 'Vencimiento'].map(label => <th key={label} className={`py-3 px-3 whitespace-nowrap ${label === 'Stock' || label === 'PVF' ? 'text-right' : ''} ${label === 'Código' ? 'sticky left-0 z-30 bg-surface-container' : ''}`}>{label}</th>)}
            </tr></thead>
            <tbody className="text-xs divide-y divide-surface-variant">
              {visibleRows.map((row, index) => {
                const expired = row.vencimiento != null && row.vencimiento < today;
                return <tr key={`${row.Codigo}-${row.Lotes}-${row.vencimiento}-${index}`} className="hover:bg-primary-container/10 even:bg-surface-container-low">
                  <td className={`py-3 px-3 sticky left-0 z-20 font-semibold whitespace-nowrap ${index % 2 ? 'bg-surface-container-low' : 'bg-surface-container-lowest'}`}>{row.Codigo}</td>
                  <td className="py-3 px-3 whitespace-nowrap">{row.CodSunat || '—'}</td>
                  <td className="py-3 px-3 min-w-[260px] max-w-[360px] truncate font-semibold" title={row.Producto}>{row.Producto}</td>
                  <td className="py-3 px-3 min-w-[210px] max-w-[290px] truncate" title={row.PrincipioActivo}>{row.PrincipioActivo || '—'}</td>
                  <td className={`py-3 px-3 text-right font-mono font-bold ${row.stock > 0 ? 'text-primary' : 'text-outline'}`}>{quantity.format(row.stock)}</td>
                  <td className="py-3 px-3 text-right font-mono whitespace-nowrap">{row.PVF == null ? '—' : money.format(row.PVF)}</td>
                  <td className="py-3 px-3 whitespace-nowrap">{row.Lotes || '—'}</td>
                  <td className="py-3 px-3 whitespace-nowrap"><span className={expired ? 'text-error font-bold' : ''}>{displayDate(row.vencimiento)}</span>{expired && <span className="ml-2 text-[10px] font-bold text-error bg-error/5 rounded px-1.5 py-0.5">Vencido</span>}</td>
                </tr>;
              })}
            </tbody>
          </table>
        </div> : <div className={`py-16 px-4 text-center ${loading ? 'text-primary' : 'text-outline'}`}>
          {loading ? <LoaderCircle size={32} className="animate-spin mx-auto mb-3" /> : <Package size={34} className="mx-auto mb-3 opacity-40" />}
          <p className="text-sm font-semibold">{loading ? 'Consultando stock de productos…' : error ? 'No se pudo cargar el reporte.' : report ? 'No hay lotes que coincidan con los filtros.' : 'No hay productos para mostrar.'}</p>
        </div>}
        {filteredRows.length > 0 && <div className="p-4 border-t border-surface-variant bg-surface flex flex-col sm:flex-row gap-3 justify-between items-center text-xs text-outline">
          <span>Mostrando {(page - 1) * perPage + 1}–{Math.min(page * perPage, filteredRows.length)} de {filteredRows.length} lotes filtrados</span>
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
