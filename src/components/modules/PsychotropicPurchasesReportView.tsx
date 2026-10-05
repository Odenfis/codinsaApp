import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, CalendarDays, ChevronLeft, ChevronRight, FileSpreadsheet, FileText,
  LoaderCircle, MoveHorizontal, ReceiptText, Search
} from 'lucide-react';
import { PsychotropicPurchasesResponse, PsychotropicPurchasesRow } from '../../types';
import { filterPsychotropicPurchases, summarizePsychotropicPurchases } from '../../utils/psychotropicPurchasesModel';
import {
  exportPsychotropicPurchasesToExcel, exportPsychotropicPurchasesToPdf, psychotropicPurchasesColumns
} from '../../utils/psychotropicPurchasesExport';
import { loadTrimmedLogoDataUrl } from '../../utils/logoUtils';
import logoUrl from '../../../assets/logotipo.png';

const decimal = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
const localIsoDate = (date: Date) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
};
const initialDates = () => {
  const today = new Date();
  return { desde: localIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)), hasta: localIsoDate(today) };
};
const displayDate = (value: string | null) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('es-PE') : '—';
const dateKeys = new Set<keyof PsychotropicPurchasesRow>(['Fecha']);
const stickyColumns: Record<number, string> = {
  2: 'left-0 w-[280px] min-w-[280px] max-w-[280px] shadow-[6px_0_8px_-8px_rgba(0,0,0,0.55)]'
};

export const PsychotropicPurchasesReportView: React.FC = () => {
  const defaults = useMemo(initialDates, []);
  const [desde, setDesde] = useState(defaults.desde);
  const [hasta, setHasta] = useState(defaults.hasta);
  const [report, setReport] = useState<PsychotropicPurchasesResponse | null>(null);
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
    loadTrimmedLogoDataUrl(logoUrl)
      .then(logo => { if (active) setDocumentLogoUrl(logo.dataUrl); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const filteredRows = useMemo(() => filterPsychotropicPurchases(report?.data || [], search), [report, search]);
  const totals = useMemo(() => summarizePsychotropicPurchases(filteredRows), [filteredRows]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage));
  const visibleRows = filteredRows.slice((page - 1) * perPage, page * perPage);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter(value => value === 1 || value === totalPages || Math.abs(value - page) <= 1);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

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
      const params = new URLSearchParams({ desde, hasta });
      const response = await fetch(`/api/reportes/compras-psicotropicos?${params}`, {
        signal: controller.signal,
        cache: 'no-store'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'No se pudo generar el reporte Compras Psicotrópicos.');
      if (controller.signal.aborted) return;
      setReport(payload as PsychotropicPurchasesResponse);
      setSearch('');
      setPage(1);
      setHasSearched(true);
    } catch (requestError) {
      if (controller.signal.aborted) return;
      setReport(null);
      setHasSearched(true);
      setError(requestError instanceof Error ? requestError.message : 'No se pudo generar el reporte Compras Psicotrópicos.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const exportReport = async (format: 'excel' | 'pdf') => {
    if (!report || !filteredRows.length) return;
    setError('');
    setExporting(format);
    try {
      if (format === 'excel') await exportPsychotropicPurchasesToExcel(filteredRows, report);
      else await exportPsychotropicPurchasesToPdf(filteredRows, report);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'No se pudo exportar el reporte.');
    } finally {
      setExporting(null);
    }
  };

  const renderValue = (row: PsychotropicPurchasesRow, key: keyof PsychotropicPurchasesRow) => {
    const value = row[key];
    if (key === 'Cantidad') return value == null ? '—' : decimal.format(Number(value));
    if (dateKeys.has(key)) return displayDate(value == null ? null : String(value));
    return value == null || value === '' ? '—' : String(value);
  };

  return (
    <div className="w-full min-w-0 max-w-[1800px] mx-auto flex flex-col gap-6 animate-fade-in pb-12">
      <header className="w-full min-w-0 flex flex-col xl:flex-row xl:items-center justify-between gap-5 border-b border-surface-variant pb-5">
        <div className="min-w-0 flex items-center gap-4">
          <img src={documentLogoUrl} alt="CODINSA" className="w-[150px] sm:w-[190px] h-[62px] object-contain object-left shrink-0" />
          <div className="min-w-0 border-l border-surface-variant pl-4">
            <p className="text-[11px] uppercase tracking-wider font-bold text-primary mb-1">Reportes / Dirección Técnica</p>
            <h2 className="font-headline text-xl sm:text-2xl font-bold flex items-center gap-2.5"><ReceiptText className="text-primary shrink-0" size={27} />Compras Psicotrópicos</h2>
            <p className="text-xs text-on-surface-variant mt-1">Detalle por producto, forma farmacéutica y proveedor</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button disabled={!filteredRows.length || exporting !== null || loading} onClick={() => void exportReport('excel')} className="bg-secondary-container text-on-secondary-container px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">{exporting === 'excel' ? <LoaderCircle size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />} Excel</button>
          <button disabled={!filteredRows.length || exporting !== null || loading} onClick={() => void exportReport('pdf')} className="bg-tertiary-container text-on-tertiary-container px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">{exporting === 'pdf' ? <LoaderCircle size={16} className="animate-spin" /> : <FileText size={16} />} PDF</button>
        </div>
      </header>

      <section className="w-full min-w-0 bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm p-4 sm:p-5 overflow-visible">
        <div className="flex min-w-0 flex-col md:flex-row md:flex-wrap md:items-end gap-4">
          <div className="flex items-center gap-2 text-primary mr-1 pb-2"><CalendarDays size={20} /><span className="text-sm font-bold">Parámetros</span></div>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-on-surface-variant">Del<input aria-label="Fecha inicial" type="date" value={desde} max={hasta || undefined} onChange={event => { setDesde(event.target.value); setError(''); }} className="bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm font-normal text-on-surface focus:border-primary focus:outline-none" /></label>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-on-surface-variant">Al<input aria-label="Fecha final" type="date" value={hasta} min={desde || undefined} onChange={event => { setHasta(event.target.value); setError(''); }} className="bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm font-normal text-on-surface focus:border-primary focus:outline-none" /></label>
          <button onClick={() => void generate()} disabled={loading} className="bg-primary text-on-primary rounded-lg px-5 py-2.5 text-sm font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-surface-tint disabled:opacity-60">{loading ? <LoaderCircle size={17} className="animate-spin" /> : <Search size={17} />}{loading ? 'Generando…' : 'Generar reporte'}</button>
          {report && <div className="w-full xl:w-auto xl:ml-auto text-xs text-outline md:pb-2">Rango consultado: <strong className="text-on-surface">{displayDate(report.period.desde)} – {displayDate(report.period.hasta)}</strong></div>}
        </div>
        {error && <div role="alert" className="mt-4 flex items-center gap-2 text-sm text-error bg-error/5 border border-error/20 rounded-lg p-3"><AlertCircle size={18} className="shrink-0" />{error}</div>}
      </section>

      {report && <section className="w-full min-w-0 bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm p-4">
        <label className="flex flex-col gap-1.5 text-xs font-bold text-on-surface-variant max-w-2xl">Buscar en los resultados<span className="relative"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" /><input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Principio activo, producto, proveedor, lote o factura" className="w-full bg-surface border border-outline-variant rounded-lg pl-9 pr-3 py-2.5 text-sm font-normal focus:border-primary focus:outline-none" /></span></label>
        <p className="text-xs text-outline mt-3">Mostrando <strong className="text-on-surface">{filteredRows.length.toLocaleString('es-PE')}</strong> de {report.total.toLocaleString('es-PE')} registros</p>
      </section>}

      {report && <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
        {[
          { label: 'Registros', value: totals.registros.toLocaleString('es-PE') },
          { label: 'Facturas', value: totals.facturas.toLocaleString('es-PE') },
          { label: 'Proveedores', value: totals.proveedores.toLocaleString('es-PE') },
          { label: 'Cantidad reportada TAB', value: decimal.format(totals.tab) },
          { label: 'Cantidad reportada GOT', value: decimal.format(totals.got) },
          { label: 'Cantidad reportada sin FF', value: decimal.format(totals.sinFF) }
        ].map(item => <div key={item.label} className="min-w-0 overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wide text-outline">{item.label}</p><p className="text-xl font-bold mt-1 truncate text-primary" title={item.value}>{item.value}</p></div>)}
      </section>}

      <section className="w-full min-w-0 bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-surface-variant bg-surface text-[11px] font-medium text-outline"><span className="flex items-center gap-2"><MoveHorizontal size={15} className="text-primary" />Desplácese horizontalmente para ver las 9 columnas</span>{report && <span className="hidden sm:inline font-bold text-primary">{displayDate(report.period.desde)} – {displayDate(report.period.hasta)}</span>}</div>
        {filteredRows.length > 0 ? <div className="report-table-scroll w-full max-w-full overflow-x-auto overscroll-x-contain" style={{ WebkitOverflowScrolling: 'touch', scrollbarGutter: 'stable' }}>
          <table className="min-w-[1600px] w-full text-left border-collapse">
            <thead><tr className="bg-surface-container text-on-surface-variant text-[10px] font-bold uppercase tracking-wide border-b border-surface-variant">{psychotropicPurchasesColumns.map((column, index) => <th key={column.key} className={`py-3 px-3 whitespace-nowrap ${column.kind === 'number' ? 'text-right' : ''} ${stickyColumns[index] ? `sticky ${stickyColumns[index]} z-30 bg-surface-container` : ''}`}>{column.label}</th>)}</tr></thead>
            <tbody className="text-xs divide-y divide-surface-variant">{visibleRows.map((row, rowIndex) => <tr key={`${row.Fecha}-${row.NroFactura}-${row.Lote}-${rowIndex}`} className="hover:bg-primary-container/10 even:bg-surface-container-low">{psychotropicPurchasesColumns.map((column, columnIndex) => <td key={column.key} title={column.key === 'Descripcion' ? String(row[column.key] || '') : undefined} className={`py-3 px-3 whitespace-nowrap ${column.kind === 'number' ? 'text-right font-mono' : ''} ${column.key === 'Descripcion' ? 'max-w-[340px] truncate font-semibold' : ''} ${column.key === 'Cantidad' ? 'font-bold text-primary' : ''} ${stickyColumns[columnIndex] ? `sticky ${stickyColumns[columnIndex]} z-20 ${rowIndex % 2 ? 'bg-surface-container-low' : 'bg-surface-container-lowest'}` : ''}`}>{renderValue(row, column.key)}</td>)}</tr>)}</tbody>
          </table>
        </div> : <div className={`py-16 px-4 text-center ${loading ? 'text-primary' : 'text-outline'}`}>{loading ? <LoaderCircle size={32} className="animate-spin mx-auto mb-3" /> : <ReceiptText size={34} className="mx-auto mb-3 opacity-40" />}<p className="text-sm font-semibold">{loading ? 'Generando Compras Psicotrópicos…' : error ? 'No se pudo cargar el reporte.' : report && search.trim() ? 'No hay registros que coincidan con la búsqueda.' : report || hasSearched ? 'No se encontraron movimientos en el rango seleccionado.' : 'Seleccione el rango y genere el reporte para visualizar los resultados.'}</p></div>}
        {filteredRows.length > 0 && <div className="p-4 border-t border-surface-variant bg-surface flex flex-col sm:flex-row gap-3 justify-between items-center text-xs text-outline"><span>Mostrando {(page - 1) * perPage + 1}–{Math.min(page * perPage, filteredRows.length)} de {filteredRows.length} registros filtrados</span><div className="flex items-center gap-1"><button aria-label="Página anterior" disabled={page === 1} onClick={() => setPage(value => value - 1)} className="p-1.5 rounded border border-outline-variant disabled:opacity-30"><ChevronLeft size={16} /></button>{pages.map((pageNumber, index) => <React.Fragment key={pageNumber}>{index > 0 && pageNumber - pages[index - 1] > 1 && <span className="px-1">…</span>}<button onClick={() => setPage(pageNumber)} className={`min-w-8 h-8 rounded border text-xs font-bold ${pageNumber === page ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant hover:bg-surface-container'}`}>{pageNumber}</button></React.Fragment>)}<button aria-label="Página siguiente" disabled={page === totalPages} onClick={() => setPage(value => value + 1)} className="p-1.5 rounded border border-outline-variant disabled:opacity-30"><ChevronRight size={16} /></button></div></div>}
      </section>
    </div>
  );
};
