import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, FileClock,
  FileSpreadsheet, FileText, LoaderCircle, MoveHorizontal, Search, UserRoundSearch
} from 'lucide-react';
import { CustomerHistoryClient, CustomerHistoryResponse, CustomerHistoryRow } from '../../types';
import { exportCustomerHistoryToExcel, exportCustomerHistoryToPdf } from '../../utils/customerHistoryExport';

const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 });
const dateText = (value: string | null) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('es-PE') : '—';

const statusDetails = (value: string) => {
  const normalized = value.replaceAll('*', '').trim().toLocaleLowerCase('es-PE');
  if (normalized.includes('cancelado')) return { label: 'Cancelado', className: 'bg-green-100 text-green-800 border-green-200' };
  if (normalized.includes('vencida') || normalized.includes('vencido')) return { label: 'Vencida', className: 'bg-error/10 text-error border-error/20' };
  return { label: normalized ? value.replaceAll('*', '').trim() : 'Pendiente', className: 'bg-amber-100 text-amber-800 border-amber-200' };
};

const columns: Array<{ key: keyof CustomerHistoryRow; label: string; kind?: 'money' | 'date' | 'status' }> = [
  { key: 'Nro', label: 'Nro.' }, { key: 'Item', label: 'Ítem' }, { key: 'Vendedor', label: 'Vendedor' },
  { key: 'Documento', label: 'Documento / movimiento' }, { key: 'Numero', label: 'Número' },
  { key: 'Fecha', label: 'Fecha', kind: 'date' }, { key: 'Importe', label: 'Importe', kind: 'money' },
  { key: 'Amortizado', label: 'Amortizado', kind: 'money' }, { key: 'FechaV', label: 'Vencimiento', kind: 'date' },
  { key: 'Saldo', label: 'Saldo', kind: 'money' }, { key: 'Situacion', label: 'Situación', kind: 'status' }
];

export const CustomerHistoryReportView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<CustomerHistoryClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<CustomerHistoryClient | null>(null);
  const [report, setReport] = useState<CustomerHistoryResponse | null>(null);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(1);
  const selectorRef = useRef<HTMLDivElement>(null);
  const perPage = 20;

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!selectorRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    if (selectedClient && search === `${selectedClient.Razon} · ${selectedClient.Ruc}`) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadingClients(true);
      try {
        const response = await fetch(`/api/reportes/historial-cliente/clientes?${new URLSearchParams({ search: search.trim() })}`, {
          signal: controller.signal, cache: 'no-store'
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar los clientes.');
        setClients(payload.data || []);
      } catch (requestError) {
        if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : 'No se pudieron cargar los clientes.');
      } finally {
        if (!controller.signal.aborted) setLoadingClients(false);
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [search, selectedClient]);

  const selectClient = (client: CustomerHistoryClient) => {
    setSelectedClient(client);
    setSearch(`${client.Razon} · ${client.Ruc}`);
    setReport(null);
    setHasSearched(false);
    setPage(1);
    setError('');
    setOpen(false);
  };

  const changeSearch = (value: string) => {
    setSearch(value);
    setSelectedClient(null);
    setReport(null);
    setHasSearched(false);
    setPage(1);
    setError('');
    setOpen(true);
  };

  const generate = async () => {
    setError('');
    if (!selectedClient) return setError('Seleccione un cliente de la lista para generar el historial.');
    setLoadingReport(true);
    setReport(null);
    try {
      const response = await fetch('/api/reportes/historial-cliente', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codclie: selectedClient.Codclie })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'No se pudo generar el historial del cliente.');
      setReport(payload as CustomerHistoryResponse);
      setHasSearched(true);
      setPage(1);
    } catch (requestError) {
      setHasSearched(true);
      setError(requestError instanceof Error ? requestError.message : 'No se pudo generar el historial del cliente.');
    } finally {
      setLoadingReport(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil((report?.data.length || 0) / perPage));
  const visibleRows = report?.data.slice((page - 1) * perPage, page * perPage) || [];
  const pages = useMemo(() => Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter(value => value === 1 || value === totalPages || Math.abs(value - page) <= 1), [page, totalPages]);

  const runExport = async (format: 'excel' | 'pdf') => {
    if (!report?.data.length) return;
    setError('');
    try {
      if (format === 'excel') await exportCustomerHistoryToExcel(report);
      else await exportCustomerHistoryToPdf(report);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : `No se pudo exportar el archivo ${format.toUpperCase()}.`);
    }
  };

  const renderValue = (row: CustomerHistoryRow, column: typeof columns[number]) => {
    if (column.kind === 'money') return money.format(Number(row[column.key] || 0));
    if (column.kind === 'date') return dateText(row[column.key] == null ? null : String(row[column.key]));
    if (column.kind === 'status') {
      const status = statusDetails(String(row[column.key] || ''));
      return <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${status.className}`}>{status.label}</span>;
    }
    return String(row[column.key] ?? '—');
  };

  return (
    <div className="w-full min-w-0 max-w-[1600px] mx-auto flex flex-col gap-6 animate-fade-in pb-12">
      <header className="w-full min-w-0 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-surface-variant pb-5">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider font-bold text-primary mb-1">Reportes / Cuentas</p>
          <h2 className="font-headline text-2xl font-bold flex items-center gap-2.5"><FileClock className="text-primary" size={27} /> Historial del Cliente</h2>
          <p className="text-xs text-on-surface-variant mt-1">Documentos, amortizaciones y situación de cuenta por cliente</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button disabled={!report?.data.length} onClick={() => void runExport('excel')} className="bg-secondary-container text-on-secondary-container px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"><FileSpreadsheet size={16} /> Excel</button>
          <button disabled={!report?.data.length} onClick={() => void runExport('pdf')} className="bg-tertiary-container text-on-tertiary-container px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"><FileText size={16} /> PDF</button>
        </div>
      </header>

      <section className="w-full min-w-0 bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div ref={selectorRef} className="relative flex-1 max-w-3xl">
            <label htmlFor="customer-history-search" className="flex items-center gap-2 text-xs font-bold text-on-surface-variant mb-1.5"><UserRoundSearch size={17} className="text-primary" /> Cliente con RUC</label>
            <div className={`flex items-center rounded-lg border bg-surface focus-within:ring-2 focus-within:ring-primary/20 ${selectedClient ? 'border-primary' : 'border-outline-variant'}`}>
              <Search size={17} className="ml-3 text-outline shrink-0" />
              <input id="customer-history-search" role="combobox" aria-expanded={open} aria-controls="customer-history-options" autoComplete="off" value={search} onFocus={() => setOpen(true)} onChange={event => changeSearch(event.target.value)} placeholder="Busque por razón social o RUC" className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none" />
              {loadingClients ? <LoaderCircle size={17} className="mr-3 text-primary animate-spin" /> : <ChevronDown size={17} className="mr-3 text-outline" />}
            </div>
            {open && (
              <div id="customer-history-options" role="listbox" className="absolute z-40 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-outline-variant bg-surface shadow-xl">
                {!loadingClients && !clients.length && <p className="px-4 py-5 text-center text-xs text-outline">No se encontraron clientes con RUC.</p>}
                {clients.map(client => (
                  <button key={client.Codclie} type="button" role="option" aria-selected={selectedClient?.Codclie === client.Codclie} onClick={() => selectClient(client)} className="w-full px-4 py-3 text-left hover:bg-primary-container/20 border-b last:border-b-0 border-surface-variant flex items-center justify-between gap-3">
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold text-on-surface">{client.Razon}</span><span className="block text-xs text-outline mt-0.5">RUC {client.Ruc}</span></span>
                    {!client.Activo && <span className="shrink-0 rounded-full border border-error/20 bg-error/10 px-2 py-1 text-[10px] font-bold uppercase text-error">Inactivo</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => void generate()} disabled={loadingReport || !selectedClient} className="bg-primary text-on-primary rounded-lg px-5 py-2.5 text-sm font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-surface-tint disabled:opacity-50 disabled:cursor-not-allowed">
            {loadingReport ? <LoaderCircle size={17} className="animate-spin" /> : <Search size={17} />}{loadingReport ? 'Generando…' : 'Generar reporte'}
          </button>
        </div>
        {selectedClient && <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-on-surface-variant"><CheckCircle2 size={15} className="text-primary" /><strong className="text-on-surface">{selectedClient.Razon}</strong><span>RUC {selectedClient.Ruc}</span>{!selectedClient.Activo && <span className="font-bold text-error">Cliente inactivo</span>}</div>}
        {error && <div role="alert" className="mt-4 flex items-center gap-2 text-sm text-error bg-error/5 border border-error/20 rounded-lg p-3"><AlertCircle size={18} className="shrink-0" />{error}</div>}
      </section>

      {report && report.data.length > 0 && (
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            ['Documentos', report.totals.documents.toLocaleString('es-PE')],
            ['Importe', money.format(report.totals.importe)],
            ['Amortizado', money.format(report.totals.amortizado)],
            ['Saldo', money.format(report.totals.saldo)]
          ].map(([label, value], index) => <div key={label} className={`min-w-0 overflow-hidden rounded-xl border p-4 shadow-sm ${index === 3 ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-lowest border-surface-variant'}`}><p className={`text-xs font-bold uppercase tracking-wide ${index === 3 ? 'opacity-80' : 'text-outline'}`}>{label}</p><p className={`text-2xl font-bold mt-1 truncate ${index === 3 ? '' : 'text-primary'}`}>{value}</p></div>)}
        </section>
      )}

      <section className="w-full min-w-0 bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-surface-variant bg-surface text-[11px] font-medium text-outline"><MoveHorizontal size={15} className="shrink-0 text-primary" /><span>Los movimientos asociados aparecen debajo de su documento principal. Desplácese horizontalmente para ver todas las columnas.</span></div>
        <div className="report-table-scroll w-full max-w-full overflow-x-auto overscroll-x-contain" style={{ WebkitOverflowScrolling: 'touch', scrollbarGutter: 'stable' }}>
          <table className="min-w-[1450px] w-full text-left border-collapse">
            <thead><tr className="bg-surface-container text-on-surface-variant text-[10px] font-bold uppercase tracking-wide border-b border-surface-variant">{columns.map((column, index) => <th key={column.key} className={`py-3 px-3 whitespace-nowrap ${column.kind === 'money' ? 'text-right' : ''} ${index === 3 ? 'w-[250px]' : ''}`}>{column.label}</th>)}</tr></thead>
            <tbody className="text-xs divide-y divide-surface-variant">
              {visibleRows.map((row, index) => {
                const mainDocument = row.Item === 1;
                return <tr key={`${row.Nro}-${row.Item}-${row.Numero}-${index}`} className={mainDocument ? 'bg-primary-container/10 hover:bg-primary-container/20 font-semibold' : 'hover:bg-surface-container-low text-on-surface-variant'}>{columns.map(column => <td key={column.key} className={`py-3 px-3 whitespace-nowrap ${column.kind === 'money' ? 'text-right font-mono' : ''} ${column.key === 'Documento' ? `max-w-[250px] truncate ${mainDocument ? '' : 'pl-7'}` : ''} ${column.key === 'Saldo' && row.Saldo > 0 ? 'font-bold text-error' : ''}`}>{renderValue(row, column)}</td>)}</tr>;
              })}
              {!loadingReport && !report?.data.length && <tr><td colSpan={columns.length} className="py-14 text-center text-outline"><FileClock size={32} className="mx-auto mb-3 opacity-40" /><p className="text-sm font-semibold">{hasSearched ? 'El cliente no tiene movimientos en su historial.' : 'Seleccione un cliente y genere el reporte para visualizar su historial.'}</p></td></tr>}
              {loadingReport && <tr><td colSpan={columns.length} className="py-14 text-center text-primary"><LoaderCircle size={30} className="animate-spin mx-auto mb-3" /><p className="text-sm font-semibold">Procesando el historial del cliente…</p></td></tr>}
            </tbody>
          </table>
        </div>
        {report && report.data.length > 0 && <div className="p-4 border-t border-surface-variant bg-surface flex flex-col sm:flex-row gap-3 justify-between items-center text-xs text-outline"><span>Mostrando {(page - 1) * perPage + 1}–{Math.min(page * perPage, report.data.length)} de {report.data.length} movimientos</span><div className="flex items-center gap-1"><button aria-label="Página anterior" disabled={page === 1} onClick={() => setPage(value => value - 1)} className="p-1.5 rounded border border-outline-variant disabled:opacity-30"><ChevronLeft size={16} /></button>{pages.map((pageNumber, index) => <React.Fragment key={pageNumber}>{index > 0 && pageNumber - pages[index - 1] > 1 && <span className="px-1">…</span>}<button onClick={() => setPage(pageNumber)} className={`min-w-8 h-8 rounded border text-xs font-bold ${pageNumber === page ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant hover:bg-surface-container'}`}>{pageNumber}</button></React.Fragment>)}<button aria-label="Página siguiente" disabled={page === totalPages} onClick={() => setPage(value => value + 1)} className="p-1.5 rounded border border-outline-variant disabled:opacity-30"><ChevronRight size={16} /></button></div></div>}
      </section>
    </div>
  );
};
