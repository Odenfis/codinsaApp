import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ChevronDown, ChevronLeft, ChevronRight, FileSpreadsheet, FileText,
  LoaderCircle, MoveHorizontal, Search, Users
} from 'lucide-react';
import { CustomersBySalespersonResponse, CustomersBySalespersonRow, Salesperson } from '../../types';
import { filterCustomersBySalesperson, summarizeCustomersBySalesperson } from '../../utils/customersBySalespersonModel';
import {
  customersBySalespersonColumns, exportCustomersBySalespersonToExcel,
  exportCustomersBySalespersonToPdf
} from '../../utils/customersBySalespersonExport';
import { loadTrimmedLogoDataUrl } from '../../utils/logoUtils';
import logoUrl from '../../../assets/logotipo.png';

const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 });
const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-PE');
const stickyColumns: Record<number, string> = {
  0: 'left-0 w-[125px] min-w-[125px] max-w-[125px]',
  1: 'left-[125px] w-[150px] min-w-[150px] max-w-[150px]',
  2: 'left-[275px] w-[320px] min-w-[320px] max-w-[320px] shadow-[6px_0_8px_-8px_rgba(0,0,0,0.55)]'
};

export const CustomersBySalespersonReportView: React.FC = () => {
  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);
  const [vende, setVende] = useState<number | null>(null);
  const [salespersonSearch, setSalespersonSearch] = useState('');
  const [salespersonOpen, setSalespersonOpen] = useState(false);
  const [loadingSalespeople, setLoadingSalespeople] = useState(true);
  const [report, setReport] = useState<CustomersBySalespersonResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [documentLogoUrl, setDocumentLogoUrl] = useState(logoUrl);
  const comboRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const perPage = 20;

  useEffect(() => {
    const controller = new AbortController();
    setLoadingSalespeople(true);
    fetch('/api/reportes/ventas/vendedores', { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar los vendedores.');
        setSalespeople((payload.data || []) as Salesperson[]);
      })
      .catch(requestError => {
        if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : 'No se pudieron cargar los vendedores.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoadingSalespeople(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let active = true;
    loadTrimmedLogoDataUrl(logoUrl).then(logo => { if (active) setDocumentLogoUrl(logo.dataUrl); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!comboRef.current?.contains(event.target as Node)) setSalespersonOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => () => requestRef.current?.abort(), []);

  const matchingSalespeople = useMemo(() => {
    const term = normalizeSearch(salespersonSearch.trim());
    if (!term) return salespeople;
    return salespeople.filter(item => normalizeSearch(`${item.Codemp} ${item.Nombre}`).includes(term));
  }, [salespeople, salespersonSearch]);
  const filteredRows = useMemo(() => filterCustomersBySalesperson(report?.data || [], search), [report, search]);
  const totals = useMemo(() => summarizeCustomersBySalesperson(filteredRows), [filteredRows]);
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

  const selectSalesperson = (item: Salesperson) => {
    changeCriteria();
    setVende(item.Codemp);
    setSalespersonSearch(`${item.Codemp} · ${item.Nombre}`);
    setSalespersonOpen(false);
  };

  const generate = async () => {
    setError('');
    if (vende == null) return setError('Seleccione un vendedor.');
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setReport(null);
    try {
      const response = await fetch(`/api/reportes/clientes-vendedor?${new URLSearchParams({ vende: String(vende) })}`, { signal: controller.signal, cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'No se pudo generar el reporte de Clientes por Vendedor.');
      if (controller.signal.aborted) return;
      setReport(payload as CustomersBySalespersonResponse);
      setHasSearched(true);
      setSearch('');
      setPage(1);
    } catch (requestError) {
      if (!controller.signal.aborted) {
        setHasSearched(true);
        setError(requestError instanceof Error ? requestError.message : 'No se pudo generar el reporte de Clientes por Vendedor.');
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
      if (format === 'excel') await exportCustomersBySalespersonToExcel(filteredRows, report);
      else await exportCustomersBySalespersonToPdf(filteredRows, report);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'No se pudo exportar el reporte.');
    } finally {
      setExporting(null);
    }
  };

  const renderValue = (row: CustomersBySalespersonRow, key: keyof CustomersBySalespersonRow) => {
    if (key === 'Limite') return money.format(row.Limite);
    return String(row[key] || '—');
  };

  return (
    <div className="w-full min-w-0 max-w-[1800px] mx-auto flex flex-col gap-6 animate-fade-in pb-12">
      <header className="w-full min-w-0 flex flex-col xl:flex-row xl:items-center justify-between gap-5 border-b border-surface-variant pb-5">
        <div className="min-w-0 flex items-center gap-4">
          <img src={documentLogoUrl} alt="CODINSA" className="w-[150px] sm:w-[190px] h-[62px] object-contain object-left shrink-0" />
          <div className="min-w-0 border-l border-surface-variant pl-4">
            <p className="text-[11px] uppercase tracking-wider font-bold text-primary mb-1">Reportes / Ventas</p>
            <h2 className="font-headline text-xl sm:text-2xl font-bold flex items-center gap-2.5"><Users className="text-primary shrink-0" size={27} />Reportes de Clientes por Vendedor</h2>
            <p className="text-xs text-on-surface-variant mt-1">Cartera, ubicación, contacto y límite de crédito asignados a cada vendedor</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button disabled={!filteredRows.length || exporting !== null || loading} onClick={() => void exportReport('excel')} className="bg-secondary-container text-on-secondary-container px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">{exporting === 'excel' ? <LoaderCircle size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />} Excel</button>
          <button disabled={!filteredRows.length || exporting !== null || loading} onClick={() => void exportReport('pdf')} className="bg-tertiary-container text-on-tertiary-container px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">{exporting === 'pdf' ? <LoaderCircle size={16} className="animate-spin" /> : <FileText size={16} />} PDF</button>
        </div>
      </header>

      <section className="w-full min-w-0 bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm p-4 sm:p-5 overflow-visible">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex items-center gap-2 text-primary mr-1 pb-2"><Users size={20} /><span className="text-sm font-bold">Parámetros</span></div>
          <div className="flex flex-col gap-1.5 text-xs font-bold text-on-surface-variant min-w-0 flex-1 lg:max-w-[560px]" ref={comboRef}>
            Vendedor
            <div className="relative">
              <input role="combobox" aria-expanded={salespersonOpen} aria-controls="salesperson-options" autoComplete="off" value={salespersonSearch} disabled={loadingSalespeople}
                onFocus={() => setSalespersonOpen(true)}
                onChange={event => { changeCriteria(); setVende(null); setSalespersonSearch(event.target.value); setSalespersonOpen(true); }}
                placeholder={loadingSalespeople ? 'Cargando vendedores…' : 'Buscar por código o nombre'}
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 pr-10 py-2.5 text-sm font-normal text-on-surface focus:border-primary focus:outline-none disabled:opacity-60" />
              <button type="button" aria-label="Mostrar vendedores" disabled={loadingSalespeople} onClick={() => setSalespersonOpen(value => !value)} className="absolute inset-y-0 right-0 px-3 text-outline disabled:opacity-50"><ChevronDown size={17} className={`transition-transform ${salespersonOpen ? 'rotate-180' : ''}`} /></button>
              {salespersonOpen && <div id="salesperson-options" role="listbox" className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-outline-variant bg-surface-container-lowest shadow-xl">
                {matchingSalespeople.length ? matchingSalespeople.map(item => <button type="button" role="option" aria-selected={vende === item.Codemp} key={item.Codemp} onClick={() => selectSalesperson(item)} className={`w-full px-3 py-2.5 text-left text-sm hover:bg-primary-container/30 ${vende === item.Codemp ? 'bg-primary-container/40 text-primary font-bold' : 'text-on-surface'}`}><span className="font-mono text-xs text-outline mr-2">{item.Codemp}</span>{item.Nombre}</button>) : <p className="px-3 py-4 text-sm text-outline text-center">No se encontraron vendedores.</p>}
              </div>}
            </div>
          </div>
          <button onClick={generate} disabled={loading || loadingSalespeople} className="bg-primary text-on-primary rounded-lg px-5 py-2.5 text-sm font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-surface-tint disabled:opacity-60">{loading ? <LoaderCircle size={17} className="animate-spin" /> : <Search size={17} />}{loading ? 'Generando…' : 'Generar reporte'}</button>
        </div>
        {error && <div role="alert" className="mt-4 flex items-center gap-2 text-sm text-error bg-error/5 border border-error/20 rounded-lg p-3"><AlertCircle size={18} className="shrink-0" />{error}</div>}
      </section>

      {report && <section className="w-full min-w-0 bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm p-4">
        <label className="flex flex-col gap-1.5 text-xs font-bold text-on-surface-variant max-w-2xl">Buscar en los resultados<span className="relative"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" /><input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Código, RUC, razón social, contacto, ubicación o Digemid" className="w-full bg-surface border border-outline-variant rounded-lg pl-9 pr-3 py-2.5 text-sm font-normal focus:border-primary focus:outline-none" /></span></label>
        <p className="text-xs text-outline mt-3">Vendedor: <strong className="text-on-surface">{report.salesperson.Codemp} · {report.salesperson.Nombre}</strong> · Mostrando {filteredRows.length.toLocaleString('es-PE')} de {report.total.toLocaleString('es-PE')} clientes</p>
      </section>}

      {report && <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
        {[
          { label: 'Clientes', value: totals.clients.toLocaleString('es-PE') },
          { label: 'Con UBIGEO', value: totals.located.toLocaleString('es-PE') },
          { label: 'Tipo A', value: totals.typeA.toLocaleString('es-PE') },
          { label: 'Tipo B', value: totals.typeB.toLocaleString('es-PE') },
          { label: 'Tipo C', value: totals.typeC.toLocaleString('es-PE') },
          { label: 'Límite de crédito', value: money.format(totals.creditLimit), emphasized: true }
        ].map(item => <div key={item.label} className={`min-w-0 overflow-hidden rounded-xl border p-4 shadow-sm ${item.emphasized ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-lowest border-surface-variant'}`}><p className={`text-[10px] font-bold uppercase tracking-wide ${item.emphasized ? 'opacity-80' : 'text-outline'}`}>{item.label}</p><p className={`text-xl font-bold mt-1 truncate ${item.emphasized ? '' : 'text-primary'}`} title={item.value}>{item.value}</p></div>)}
      </section>}

      <section className="w-full min-w-0 bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-surface-variant bg-surface text-[11px] font-medium text-outline"><span className="flex items-center gap-2"><MoveHorizontal size={15} className="text-primary" />Desplácese horizontalmente para ver las 15 columnas</span>{report && <span className="hidden sm:inline font-bold text-primary">{report.salesperson.Codemp} · {report.salesperson.Nombre}</span>}</div>
        {filteredRows.length > 0 ? <div className="report-table-scroll w-full max-w-full overflow-x-auto overscroll-x-contain" style={{ WebkitOverflowScrolling: 'touch', scrollbarGutter: 'stable' }}>
          <table className="min-w-[2550px] w-full text-left border-collapse">
            <thead><tr className="bg-surface-container text-on-surface-variant text-[10px] font-bold uppercase tracking-wide border-b border-surface-variant">{customersBySalespersonColumns.map((column, index) => <th key={column.key} className={`py-3 px-3 whitespace-nowrap ${column.money ? 'text-right' : ''} ${stickyColumns[index] ? `sticky ${stickyColumns[index]} z-30 bg-surface-container` : ''}`}>{column.label}</th>)}</tr></thead>
            <tbody className="text-xs divide-y divide-surface-variant">{visibleRows.map((row, rowIndex) => <tr key={row.codclie || rowIndex} className="hover:bg-primary-container/10 even:bg-surface-container-low">{customersBySalespersonColumns.map((column, columnIndex) => <td key={column.key} title={['Razon', 'titular', 'Direccion', 'email'].includes(column.key) ? String(row[column.key] || '') : undefined} className={`py-3 px-3 whitespace-nowrap ${column.money ? 'text-right font-mono font-bold text-primary' : ''} ${['Razon', 'titular', 'Direccion', 'email'].includes(column.key) ? 'max-w-[360px] truncate' : ''} ${column.key === 'Razon' ? 'font-semibold' : ''} ${stickyColumns[columnIndex] ? `sticky ${stickyColumns[columnIndex]} z-20 ${rowIndex % 2 ? 'bg-surface-container-low' : 'bg-surface-container-lowest'}` : ''}`}>{renderValue(row, column.key)}</td>)}</tr>)}</tbody>
          </table>
        </div> : <div className={`py-16 px-4 text-center ${loading ? 'text-primary' : 'text-outline'}`}>{loading ? <LoaderCircle size={32} className="animate-spin mx-auto mb-3" /> : <Users size={34} className="mx-auto mb-3 opacity-40" />}<p className="text-sm font-semibold">{loading ? 'Generando Clientes por Vendedor…' : error ? 'No se pudo cargar el reporte.' : report && search.trim() ? 'No hay clientes que coincidan con la búsqueda.' : report || hasSearched ? 'El vendedor seleccionado no tiene clientes asignados.' : 'Seleccione un vendedor para generar el reporte.'}</p></div>}
        {filteredRows.length > 0 && <div className="p-4 border-t border-surface-variant bg-surface flex flex-col sm:flex-row gap-3 justify-between items-center text-xs text-outline"><span>Mostrando {(page - 1) * perPage + 1}–{Math.min(page * perPage, filteredRows.length)} de {filteredRows.length} clientes filtrados</span><div className="flex items-center gap-1"><button aria-label="Página anterior" disabled={page === 1} onClick={() => setPage(value => value - 1)} className="p-1.5 rounded border border-outline-variant disabled:opacity-30"><ChevronLeft size={16} /></button>{pages.map((pageNumber, index) => <React.Fragment key={pageNumber}>{index > 0 && pageNumber - pages[index - 1] > 1 && <span className="px-1">…</span>}<button onClick={() => setPage(pageNumber)} className={`min-w-8 h-8 rounded border text-xs font-bold ${pageNumber === page ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant hover:bg-surface-container'}`}>{pageNumber}</button></React.Fragment>)}<button aria-label="Página siguiente" disabled={page === totalPages} onClick={() => setPage(value => value + 1)} className="p-1.5 rounded border border-outline-variant disabled:opacity-30"><ChevronRight size={16} /></button></div></div>}
      </section>
    </div>
  );
};
