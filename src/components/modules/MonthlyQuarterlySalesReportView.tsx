import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, CalendarRange, ChevronLeft, ChevronRight, FileSpreadsheet, FileText,
  LoaderCircle, MoveHorizontal, Search
} from 'lucide-react';
import { MonthlyQuarterlySalesResponse, MonthlyQuarterlySalesRow } from '../../types';
import {
  filterMonthlyQuarterlySales, getSalesPeriodShortcut, SalesPeriodShortcut,
  summarizeMonthlyQuarterlySales
} from '../../utils/monthlyQuarterlySalesModel';
import {
  exportMonthlyQuarterlySalesToExcel, exportMonthlyQuarterlySalesToPdf,
  monthlyQuarterlySalesColumns
} from '../../utils/monthlyQuarterlySalesExport';
import { loadTrimmedLogoDataUrl } from '../../utils/logoUtils';
import logoUrl from '../../../assets/logotipo.png';

const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 });
const quantity = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const displayDate = (value: string | null) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('es-PE') : '—';
const dateKeys = new Set<keyof MonthlyQuarterlySalesRow>(['Fecha', 'Vencimiento']);
const stickyColumns: Record<number, string> = {
  0: 'left-0 w-[110px] min-w-[110px] max-w-[110px]',
  1: 'left-[110px] w-[70px] min-w-[70px] max-w-[70px]',
  2: 'left-[180px] w-[80px] min-w-[80px] max-w-[80px]',
  3: 'left-[260px] w-[90px] min-w-[90px] max-w-[90px]',
  4: 'left-[350px] w-[120px] min-w-[120px] max-w-[120px] shadow-[6px_0_8px_-8px_rgba(0,0,0,0.55)]'
};
const shortcutLabels: Array<{ key: SalesPeriodShortcut; label: string }> = [
  { key: 'current-month', label: 'Mes actual' },
  { key: 'previous-month', label: 'Mes anterior' },
  { key: 'current-quarter', label: 'Trimestre actual' }
];

export const MonthlyQuarterlySalesReportView: React.FC = () => {
  const defaults = useMemo(() => getSalesPeriodShortcut('current-month'), []);
  const [desde, setDesde] = useState(defaults.desde);
  const [hasta, setHasta] = useState(defaults.hasta);
  const [activeShortcut, setActiveShortcut] = useState<SalesPeriodShortcut | null>('current-month');
  const [report, setReport] = useState<MonthlyQuarterlySalesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [documentLogoUrl, setDocumentLogoUrl] = useState(logoUrl);
  const requestRef = useRef<AbortController | null>(null);
  const perPage = 20;

  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => {
    let active = true;
    loadTrimmedLogoDataUrl(logoUrl).then(logo => { if (active) setDocumentLogoUrl(logo.dataUrl); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const filteredRows = useMemo(() => filterMonthlyQuarterlySales(report?.data || [], search), [report, search]);
  const totals = useMemo(() => summarizeMonthlyQuarterlySales(filteredRows), [filteredRows]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage));
  const visibleRows = filteredRows.slice((page - 1) * perPage, page * perPage);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter(value => value === 1 || value === totalPages || Math.abs(value - page) <= 1);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const changeCriteria = () => {
    setReport(null);
    setHasSearched(false);
    setSearch('');
    setPage(1);
    setError('');
  };

  const applyShortcut = (shortcut: SalesPeriodShortcut) => {
    const period = getSalesPeriodShortcut(shortcut);
    changeCriteria();
    setDesde(period.desde);
    setHasta(period.hasta);
    setActiveShortcut(shortcut);
  };

  const changeDate = (field: 'desde' | 'hasta', value: string) => {
    changeCriteria();
    setActiveShortcut(null);
    if (field === 'desde') setDesde(value);
    else setHasta(value);
  };

  const generate = async () => {
    setError('');
    if (!desde || !hasta) return setError('Seleccione las fechas Del y Al para generar el reporte.');
    if (desde > hasta) return setError('La fecha Del no puede ser posterior a la fecha Al.');
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setReport(null);
    try {
      const response = await fetch(`/api/reportes/ventas-mensuales-trimestrales?${new URLSearchParams({ desde, hasta })}`, { signal: controller.signal, cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'No se pudo generar el reporte de Ventas Mensuales o Trimestrales.');
      if (controller.signal.aborted) return;
      setReport(payload as MonthlyQuarterlySalesResponse);
      setHasSearched(true);
      setSearch('');
      setPage(1);
    } catch (requestError) {
      if (!controller.signal.aborted) {
        setHasSearched(true);
        setError(requestError instanceof Error ? requestError.message : 'No se pudo generar el reporte de Ventas Mensuales o Trimestrales.');
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const exportReport = async (format: 'excel' | 'pdf') => {
    if (!report || !filteredRows.length) return;
    setError('');
    setExporting(format);
    try {
      if (format === 'excel') await exportMonthlyQuarterlySalesToExcel(filteredRows, report);
      else await exportMonthlyQuarterlySalesToPdf(filteredRows, report);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'No se pudo exportar el reporte.');
    } finally {
      setExporting(null);
    }
  };

  const renderValue = (row: MonthlyQuarterlySalesRow, key: keyof MonthlyQuarterlySalesRow) => {
    const value = row[key];
    if (key === 'Precio' || key === 'Total') return money.format(Number(value || 0));
    if (key === 'Cantidad') return quantity.format(Number(value || 0));
    if (dateKeys.has(key)) return displayDate(value == null ? null : String(value));
    return value == null || value === '' ? '—' : String(value);
  };

  return (
    <div className="w-full min-w-0 max-w-[1800px] mx-auto flex flex-col gap-6 animate-fade-in pb-12">
      <header className="w-full min-w-0 flex flex-col xl:flex-row xl:items-center justify-between gap-5 border-b border-surface-variant pb-5">
        <div className="min-w-0 flex items-center gap-4">
          <img src={documentLogoUrl} alt="CODINSA" className="w-[150px] sm:w-[190px] h-[62px] object-contain object-left shrink-0" />
          <div className="min-w-0 border-l border-surface-variant pl-4">
            <p className="text-[11px] uppercase tracking-wider font-bold text-primary mb-1">Reportes / Ventas</p>
            <h2 className="font-headline text-xl sm:text-2xl font-bold flex items-center gap-2.5"><CalendarRange className="text-primary shrink-0" size={27} />Ventas Mensuales o Trimestrales</h2>
            <p className="text-xs text-on-surface-variant mt-1">Detalle de ventas por documento, producto, cliente y ubicación</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button disabled={!filteredRows.length || exporting !== null || loading} onClick={() => void exportReport('excel')} className="bg-secondary-container text-on-secondary-container px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">{exporting === 'excel' ? <LoaderCircle size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />} Excel</button>
          <button disabled={!filteredRows.length || exporting !== null || loading} onClick={() => void exportReport('pdf')} className="bg-tertiary-container text-on-tertiary-container px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">{exporting === 'pdf' ? <LoaderCircle size={16} className="animate-spin" /> : <FileText size={16} />} PDF</button>
        </div>
      </header>

      <section className="w-full min-w-0 bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm p-4 sm:p-5 overflow-visible">
        <div className="flex min-w-0 flex-col lg:flex-row lg:flex-wrap lg:items-end gap-4">
          <div className="flex items-center gap-2 text-primary mr-1 pb-2"><CalendarRange size={20} /><span className="text-sm font-bold">Parámetros</span></div>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-on-surface-variant">Del<input aria-label="Fecha inicial" type="date" value={desde} max={hasta || undefined} onChange={event => changeDate('desde', event.target.value)} className="bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm font-normal text-on-surface focus:border-primary focus:outline-none" /></label>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-on-surface-variant">Al<input aria-label="Fecha final" type="date" value={hasta} min={desde || undefined} onChange={event => changeDate('hasta', event.target.value)} className="bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm font-normal text-on-surface focus:border-primary focus:outline-none" /></label>
          <button onClick={generate} disabled={loading} className="bg-primary text-on-primary rounded-lg px-5 py-2.5 text-sm font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-surface-tint disabled:opacity-60">{loading ? <LoaderCircle size={17} className="animate-spin" /> : <Search size={17} />}{loading ? 'Generando…' : 'Generar reporte'}</button>
          {report && <div className="w-full xl:w-auto xl:ml-auto text-xs text-outline md:pb-2">Rango consultado: <strong className="text-on-surface">{displayDate(report.period.desde)} – {displayDate(report.period.hasta)}</strong></div>}
        </div>
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-surface-variant">
          <span className="text-xs font-bold text-on-surface-variant self-center mr-1">Atajos:</span>
          {shortcutLabels.map(item => <button key={item.key} type="button" onClick={() => applyShortcut(item.key)} className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-colors ${activeShortcut === item.key ? 'bg-primary text-on-primary border-primary' : 'bg-surface text-on-surface-variant border-outline-variant hover:border-primary hover:text-primary'}`}>{item.label}</button>)}
        </div>
        {error && <div role="alert" className="mt-4 flex items-center gap-2 text-sm text-error bg-error/5 border border-error/20 rounded-lg p-3"><AlertCircle size={18} className="shrink-0" />{error}</div>}
      </section>

      {report && <section className="w-full min-w-0 bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm p-4">
        <label className="flex flex-col gap-1.5 text-xs font-bold text-on-surface-variant max-w-2xl">Buscar en los resultados<span className="relative"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" /><input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Documento, producto, lote, vendedor, empresa o ubicación" className="w-full bg-surface border border-outline-variant rounded-lg pl-9 pr-3 py-2.5 text-sm font-normal focus:border-primary focus:outline-none" /></span></label>
        <p className="text-xs text-outline mt-3">Mostrando <strong className="text-on-surface">{filteredRows.length.toLocaleString('es-PE')}</strong> de {report.total.toLocaleString('es-PE')} líneas</p>
      </section>}

      {report && <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
        {[
          { label: 'Líneas', value: totals.lines.toLocaleString('es-PE') },
          { label: 'Documentos', value: totals.documents.toLocaleString('es-PE') },
          { label: 'Clientes', value: totals.clients.toLocaleString('es-PE') },
          { label: 'Productos', value: totals.products.toLocaleString('es-PE') },
          { label: 'Unidades', value: quantity.format(totals.units) },
          { label: 'Venta total', value: money.format(totals.sales), emphasized: true }
        ].map(item => <div key={item.label} className={`min-w-0 overflow-hidden rounded-xl border p-4 shadow-sm ${item.emphasized ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-lowest border-surface-variant'}`}><p className={`text-[10px] font-bold uppercase tracking-wide ${item.emphasized ? 'opacity-80' : 'text-outline'}`}>{item.label}</p><p className={`text-xl font-bold mt-1 truncate ${item.emphasized ? '' : 'text-primary'}`} title={item.value}>{item.value}</p></div>)}
      </section>}

      <section className="w-full min-w-0 bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-surface-variant bg-surface text-[11px] font-medium text-outline"><span className="flex items-center gap-2"><MoveHorizontal size={15} className="text-primary" />Desplácese horizontalmente para ver las 22 columnas</span>{report && <span className="hidden sm:inline font-bold text-primary">{displayDate(report.period.desde)} – {displayDate(report.period.hasta)}</span>}</div>
        {filteredRows.length > 0 ? <div className="report-table-scroll w-full max-w-full overflow-x-auto overscroll-x-contain" style={{ WebkitOverflowScrolling: 'touch', scrollbarGutter: 'stable' }}>
          <table className="min-w-[3500px] w-full text-left border-collapse">
            <thead><tr className="bg-surface-container text-on-surface-variant text-[10px] font-bold uppercase tracking-wide border-b border-surface-variant">{monthlyQuarterlySalesColumns.map((column, index) => <th key={column.key} className={`py-3 px-3 whitespace-nowrap ${column.kind === 'money' || column.kind === 'quantity' ? 'text-right' : ''} ${stickyColumns[index] ? `sticky ${stickyColumns[index]} z-30 bg-surface-container` : ''}`}>{column.label}</th>)}</tr></thead>
            <tbody className="text-xs divide-y divide-surface-variant">{visibleRows.map((row, rowIndex) => <tr key={`${row.Fecha}-${row.TipoDoc}-${row.Serie}-${row.NroDoc}-${row.Codigo}-${rowIndex}`} className="hover:bg-primary-container/10 even:bg-surface-container-low">{monthlyQuarterlySalesColumns.map((column, columnIndex) => <td key={column.key} title={['Producto', 'Empresa', 'Direccion'].includes(column.key) ? String(row[column.key] || '') : undefined} className={`py-3 px-3 whitespace-nowrap ${column.kind === 'money' || column.kind === 'quantity' ? 'text-right font-mono' : ''} ${['Producto', 'Empresa', 'Direccion'].includes(column.key) ? 'max-w-[360px] truncate font-semibold' : ''} ${column.key === 'Total' ? 'font-bold text-primary' : ''} ${stickyColumns[columnIndex] ? `sticky ${stickyColumns[columnIndex]} z-20 ${rowIndex % 2 ? 'bg-surface-container-low' : 'bg-surface-container-lowest'}` : ''}`}>{renderValue(row, column.key)}</td>)}</tr>)}</tbody>
          </table>
        </div> : <div className={`py-16 px-4 text-center ${loading ? 'text-primary' : 'text-outline'}`}>{loading ? <LoaderCircle size={32} className="animate-spin mx-auto mb-3" /> : <CalendarRange size={34} className="mx-auto mb-3 opacity-40" />}<p className="text-sm font-semibold">{loading ? 'Generando Ventas Mensuales o Trimestrales…' : error ? 'No se pudo cargar el reporte.' : report && search.trim() ? 'No hay ventas que coincidan con la búsqueda.' : report || hasSearched ? 'No se encontraron ventas en el rango seleccionado.' : 'Seleccione el rango y genere el reporte.'}</p></div>}
        {filteredRows.length > 0 && <div className="p-4 border-t border-surface-variant bg-surface flex flex-col sm:flex-row gap-3 justify-between items-center text-xs text-outline"><span>Mostrando {(page - 1) * perPage + 1}–{Math.min(page * perPage, filteredRows.length)} de {filteredRows.length} líneas filtradas</span><div className="flex items-center gap-1"><button aria-label="Página anterior" disabled={page === 1} onClick={() => setPage(value => value - 1)} className="p-1.5 rounded border border-outline-variant disabled:opacity-30"><ChevronLeft size={16} /></button>{pages.map((pageNumber, index) => <React.Fragment key={pageNumber}>{index > 0 && pageNumber - pages[index - 1] > 1 && <span className="px-1">…</span>}<button onClick={() => setPage(pageNumber)} className={`min-w-8 h-8 rounded border text-xs font-bold ${pageNumber === page ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant hover:bg-surface-container'}`}>{pageNumber}</button></React.Fragment>)}<button aria-label="Página siguiente" disabled={page === totalPages} onClick={() => setPage(value => value + 1)} className="p-1.5 rounded border border-outline-variant disabled:opacity-30"><ChevronRight size={16} /></button></div></div>}
      </section>
    </div>
  );
};
