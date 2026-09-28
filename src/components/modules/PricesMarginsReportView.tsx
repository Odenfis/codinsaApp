import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ChevronDown, ChevronLeft, ChevronRight, FileSpreadsheet, FileText,
  LoaderCircle, MoveHorizontal, Percent, Search
} from 'lucide-react';
import { PriceMarginsResponse, PriceMarginsRow, SalesProgressLaboratory } from '../../types';
import { exportPriceMarginsToExcel, exportPriceMarginsToPdf } from '../../utils/priceMarginsExport';
import { filterPriceMargins, summarizePriceMargins } from '../../utils/priceMarginsModel';
import { loadTrimmedLogoDataUrl } from '../../utils/logoUtils';
import logoUrl from '../../../assets/logotipo.png';

const quantity = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 });
const columns: Array<{ key: keyof PriceMarginsRow; label: string; money?: boolean }> = [
  { key: 'Codigo', label: 'Código' }, { key: 'Producto', label: 'Producto' },
  { key: 'Stock', label: 'Stock' }, { key: 'PVF', label: 'PVF', money: true },
  { key: 'CostoIgv', label: 'Costo con IGV', money: true }, { key: 'Mas10', label: '+10%', money: true },
  { key: 'Mas15', label: '+15%', money: true }, { key: 'Mas20', label: '+20%', money: true },
  { key: 'Mas25', label: '+25%', money: true }
];
const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-PE');

export const PricesMarginsReportView: React.FC = () => {
  const [laboratories, setLaboratories] = useState<SalesProgressLaboratory[]>([]);
  const [labora, setLabora] = useState('');
  const [laboratorySearch, setLaboratorySearch] = useState('');
  const [laboratoryOpen, setLaboratoryOpen] = useState(false);
  const [loadingLaboratories, setLoadingLaboratories] = useState(true);
  const [report, setReport] = useState<PriceMarginsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [documentLogoUrl, setDocumentLogoUrl] = useState(logoUrl);
  const comboRef = useRef<HTMLLabelElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const perPage = 20;

  useEffect(() => {
    const controller = new AbortController();
    setLoadingLaboratories(true);
    fetch('/api/reportes/ventas/laboratorios', { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar los laboratorios.');
        setLaboratories((payload.data || []) as SalesProgressLaboratory[]);
      })
      .catch(requestError => {
        if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : 'No se pudieron cargar los laboratorios.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoadingLaboratories(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let active = true;
    loadTrimmedLogoDataUrl(logoUrl).then(logo => { if (active) setDocumentLogoUrl(logo.dataUrl); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!comboRef.current?.contains(event.target as Node)) setLaboratoryOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => () => requestRef.current?.abort(), []);

  const matchingLaboratories = useMemo(() => {
    const term = normalizeSearch(laboratorySearch.trim());
    if (!term) return laboratories;
    return laboratories.filter(item => normalizeSearch(`${item.Descripcion} ${item.CodLab}`).includes(term));
  }, [laboratories, laboratorySearch]);
  const filteredRows = useMemo(() => filterPriceMargins(report?.data || [], search), [report, search]);
  const totals = useMemo(() => summarizePriceMargins(filteredRows), [filteredRows]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage));
  const visibleRows = filteredRows.slice((page - 1) * perPage, page * perPage);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter(value => value === 1 || value === totalPages || Math.abs(value - page) <= 1);

  const changeCriteria = () => {
    setReport(null);
    setHasSearched(false);
    setSearch('');
    setPage(1);
    setError('');
  };

  const selectLaboratory = (item: SalesProgressLaboratory) => {
    changeCriteria();
    setLabora(item.CodLab);
    setLaboratorySearch(item.Descripcion);
    setLaboratoryOpen(false);
  };

  const generate = async () => {
    setError('');
    if (!labora) return setError('Seleccione un laboratorio.');
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setReport(null);
    try {
      const params = new URLSearchParams({ labora });
      const response = await fetch(`/api/reportes/precios-margenes?${params}`, { signal: controller.signal, cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'No se pudo generar el reporte de Precios con Márgenes.');
      if (controller.signal.aborted) return;
      setReport(payload as PriceMarginsResponse);
      setHasSearched(true);
      setSearch('');
      setPage(1);
    } catch (requestError) {
      if (!controller.signal.aborted) {
        setHasSearched(true);
        setError(requestError instanceof Error ? requestError.message : 'No se pudo generar el reporte de Precios con Márgenes.');
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
      if (format === 'excel') await exportPriceMarginsToExcel(filteredRows, report);
      else await exportPriceMarginsToPdf(filteredRows, report);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'No se pudo exportar el reporte.');
    } finally {
      setExporting(null);
    }
  };

  const renderValue = (row: PriceMarginsRow, column: typeof columns[number]) => {
    if (column.money) return money.format(Number(row[column.key] || 0));
    if (column.key === 'Stock') return quantity.format(row.Stock);
    return String(row[column.key] || '—');
  };

  return (
    <div className="w-full min-w-0 max-w-[1800px] mx-auto flex flex-col gap-6 animate-fade-in pb-12">
      <header className="w-full min-w-0 flex flex-col xl:flex-row xl:items-center justify-between gap-5 border-b border-surface-variant pb-5">
        <div className="min-w-0 flex items-center gap-4">
          <img src={documentLogoUrl} alt="CODINSA" className="w-[150px] sm:w-[190px] h-[62px] object-contain object-left shrink-0" />
          <div className="min-w-0 border-l border-surface-variant pl-4">
            <p className="text-[11px] uppercase tracking-wider font-bold text-primary mb-1">Reportes / Ventas</p>
            <h2 className="font-headline text-xl sm:text-2xl font-bold flex items-center gap-2.5"><Percent className="text-primary shrink-0" size={27} />Precios con Márgenes</h2>
            <p className="text-xs text-on-surface-variant mt-1">Precios, costos y márgenes proyectados por laboratorio</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button disabled={!filteredRows.length || exporting !== null || loading} onClick={() => void exportReport('excel')} className="bg-secondary-container text-on-secondary-container px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
            {exporting === 'excel' ? <LoaderCircle size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />} Excel
          </button>
          <button disabled={!filteredRows.length || exporting !== null || loading} onClick={() => void exportReport('pdf')} className="bg-tertiary-container text-on-tertiary-container px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
            {exporting === 'pdf' ? <LoaderCircle size={16} className="animate-spin" /> : <FileText size={16} />} PDF
          </button>
        </div>
      </header>

      <section className="w-full min-w-0 bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm p-4 sm:p-5 overflow-visible">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex items-center gap-2 text-primary mr-1 pb-2"><Percent size={20} /><span className="text-sm font-bold">Parámetros</span></div>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-on-surface-variant min-w-0 flex-1 lg:min-w-[360px]" ref={comboRef}>
            Laboratorio
            <div className="relative">
              <input
                role="combobox" aria-expanded={laboratoryOpen} aria-controls="price-margins-laboratory-options" autoComplete="off"
                value={laboratorySearch} disabled={loadingLaboratories}
                onFocus={() => setLaboratoryOpen(true)}
                onChange={event => { changeCriteria(); setLabora(''); setLaboratorySearch(event.target.value); setLaboratoryOpen(true); }}
                placeholder={loadingLaboratories ? 'Cargando laboratorios…' : 'Busque por nombre o código'}
                className="w-full bg-surface border border-outline-variant rounded-lg pl-3 pr-10 py-2.5 text-sm font-normal focus:border-primary focus:outline-none disabled:opacity-60"
              />
              <button type="button" aria-label="Mostrar laboratorios" disabled={loadingLaboratories} onClick={() => setLaboratoryOpen(value => !value)} className="absolute right-0 top-0 h-full px-3 text-outline disabled:opacity-40"><ChevronDown size={17} className={laboratoryOpen ? 'rotate-180 transition-transform' : 'transition-transform'} /></button>
              {laboratoryOpen && !loadingLaboratories && <div id="price-margins-laboratory-options" role="listbox" className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-outline-variant bg-surface shadow-xl">
                {matchingLaboratories.length ? matchingLaboratories.map(item => <button type="button" role="option" aria-selected={item.CodLab === labora} key={item.CodLab} onClick={() => selectLaboratory(item)} className="w-full px-3 py-2.5 text-left text-sm hover:bg-primary-container/20 flex gap-3 border-b border-surface-variant last:border-0">
                  <span className="font-mono font-bold text-primary shrink-0">{item.CodLab}</span><span className="truncate">{item.Descripcion}</span>
                </button>) : <p className="px-3 py-4 text-sm text-outline text-center">No se encontraron laboratorios.</p>}
              </div>}
            </div>
          </label>
          <button onClick={() => void generate()} disabled={loading || loadingLaboratories} className="bg-primary text-on-primary rounded-lg px-5 py-2.5 text-sm font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-surface-tint disabled:opacity-60">
            {loading ? <LoaderCircle size={17} className="animate-spin" /> : <Search size={17} />}{loading ? 'Generando…' : 'Generar reporte'}
          </button>
        </div>
        {error && <div role="alert" className="mt-4 flex items-center gap-2 text-sm text-error bg-error/5 border border-error/20 rounded-lg p-3"><AlertCircle size={18} className="shrink-0" />{error}</div>}
      </section>

      {report && <section className="w-full min-w-0 bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm p-4">
        <label className="flex flex-col gap-1.5 text-xs font-bold text-on-surface-variant max-w-2xl">Buscar en los resultados
          <span className="relative"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" /><input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Código o nombre del producto" className="w-full bg-surface border border-outline-variant rounded-lg pl-9 pr-3 py-2.5 text-sm font-normal focus:border-primary focus:outline-none" /></span>
        </label>
        <p className="text-xs text-outline mt-3">Laboratorio: <strong className="text-on-surface">{report.laboratory.CodLab} · {report.laboratory.Descripcion}</strong> · Mostrando {filteredRows.length.toLocaleString('es-PE')} de {report.total.toLocaleString('es-PE')} productos</p>
      </section>}

      {report && <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { label: 'Productos', value: totals.products.toLocaleString('es-PE') },
          { label: 'Stock total', value: quantity.format(totals.stock), emphasized: true }
        ].map(item => <div key={item.label} className={`min-w-0 overflow-hidden rounded-xl border p-4 shadow-sm ${item.emphasized ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-lowest border-surface-variant'}`}>
          <p className={`text-[10px] font-bold uppercase tracking-wide ${item.emphasized ? 'opacity-80' : 'text-outline'}`}>{item.label}</p>
          <p className={`text-xl font-bold mt-1 truncate ${item.emphasized ? '' : 'text-primary'}`} title={item.value}>{item.value}</p>
        </div>)}
      </section>}

      <section className="w-full min-w-0 bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-surface-variant bg-surface text-[11px] font-medium text-outline">
          <span className="flex items-center gap-2"><MoveHorizontal size={15} className="text-primary" />Desplácese horizontalmente para ver todas las columnas</span>
          {report && <span className="hidden sm:inline font-bold text-primary">{report.laboratory.CodLab} · {report.laboratory.Descripcion}</span>}
        </div>
        {filteredRows.length > 0 ? <div className="report-table-scroll w-full max-w-full overflow-x-auto overscroll-x-contain" style={{ WebkitOverflowScrolling: 'touch', scrollbarGutter: 'stable' }}>
          <table className="min-w-[1350px] w-full text-left border-collapse">
            <thead><tr className="bg-surface-container text-on-surface-variant text-[10px] font-bold uppercase tracking-wide border-b border-surface-variant">
              {columns.map((column, index) => <th key={column.key} className={`py-3 px-3 whitespace-nowrap ${index >= 2 ? 'text-right' : ''} ${index === 0 ? 'sticky left-0 z-30 w-[125px] bg-surface-container' : ''} ${index === 1 ? 'sticky left-[125px] z-30 min-w-[310px] bg-surface-container' : ''}`}>{column.label}</th>)}
            </tr></thead>
            <tbody className="text-xs divide-y divide-surface-variant">
              {visibleRows.map((row, index) => <tr key={row.Codigo || index} className="hover:bg-primary-container/10 even:bg-surface-container-low">
                {columns.map((column, columnIndex) => <td key={column.key} title={column.key === 'Producto' ? row.Producto : undefined} className={`py-3 px-3 whitespace-nowrap ${columnIndex >= 2 ? 'text-right font-mono' : ''} ${column.key === 'Producto' ? 'max-w-[360px] truncate font-semibold' : ''} ${column.money ? 'font-bold text-primary' : ''} ${columnIndex === 0 ? `sticky left-0 z-20 w-[125px] font-medium ${index % 2 ? 'bg-surface-container-low' : 'bg-surface-container-lowest'}` : ''} ${columnIndex === 1 ? `sticky left-[125px] z-20 min-w-[310px] ${index % 2 ? 'bg-surface-container-low' : 'bg-surface-container-lowest'}` : ''}`}>{renderValue(row, column)}</td>)}
              </tr>)}
            </tbody>
          </table>
        </div> : <div className={`py-16 px-4 text-center ${loading ? 'text-primary' : 'text-outline'}`}>
          {loading ? <LoaderCircle size={32} className="animate-spin mx-auto mb-3" /> : <Percent size={34} className="mx-auto mb-3 opacity-40" />}
          <p className="text-sm font-semibold">{loading ? 'Generando Precios con Márgenes…' : error ? 'No se pudo cargar el reporte.' : report ? 'No hay productos que coincidan con la búsqueda.' : hasSearched ? 'No se encontraron productos con stock para el laboratorio seleccionado.' : 'Seleccione un laboratorio para generar el reporte.'}</p>
        </div>}
        {filteredRows.length > 0 && <div className="p-4 border-t border-surface-variant bg-surface flex flex-col sm:flex-row gap-3 justify-between items-center text-xs text-outline">
          <span>Mostrando {(page - 1) * perPage + 1}–{Math.min(page * perPage, filteredRows.length)} de {filteredRows.length} productos filtrados</span>
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
