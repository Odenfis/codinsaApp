import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, FileSpreadsheet, FileText, LoaderCircle, Search } from 'lucide-react';
import type { MonthlyLaboratoriesResponse } from '../../types';
import { filterMonthlyLaboratory, monthlyLaboratoriesMonths, monthlyLaboratoriesPeriod, monthlyLaboratoryCellText, summarizeMonthlyLaboratory } from '../../utils/monthlyLaboratoriesModel';
import { exportMonthlyLaboratoriesExcel, exportMonthlyLaboratoryPdf } from '../../utils/monthlyLaboratoriesExport';
import { loadTrimmedLogoDataUrl } from '../../utils/logoUtils';
import logoUrl from '../../../assets/logotipo.png';

const number = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 6 });
const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-PE');

export const MonthlyLaboratoriesReportView: React.FC = () => {
  const initial = useMemo(() => {
    const parts = new Intl.DateTimeFormat('en', { timeZone: 'America/Lima', month: 'numeric', year: 'numeric' }).formatToParts(new Date());
    return { mes: Number(parts.find(part => part.type === 'month')?.value), anio: Number(parts.find(part => part.type === 'year')?.value) };
  }, []);
  const [mes, setMes] = useState(initial.mes);
  const [anio, setAnio] = useState(String(initial.anio));
  const [report, setReport] = useState<MonthlyLaboratoriesResponse | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [laboratorySearch, setLaboratorySearch] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [documentLogoUrl, setDocumentLogoUrl] = useState(logoUrl);
  const requestRef = useRef<AbortController | null>(null);
  const comboRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    let active = true;
    loadTrimmedLogoDataUrl(logoUrl)
      .then(logo => { if (active) setDocumentLogoUrl(logo.dataUrl); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!comboRef.current?.contains(event.target as Node) && comboRef.current) comboRef.current.open = false; };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const generate = async () => {
    if (requestRef.current) return;
    if (!/^\d{4}$/.test(anio) || Number(anio) < 1900 || Number(anio) > 2100) { setError('El año debe ser un entero entre 1900 y 2100.'); return; }
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/reportes/mes-laboratorios', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', signal: controller.signal,
        body: JSON.stringify({ mes, anio: Number(anio) }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo generar el reporte. Intente nuevamente.');
      if (controller.signal.aborted) return;
      const result = payload as MonthlyLaboratoriesResponse;
      setReport(result); setSelectedId((result.laboratories.find(lab => lab.total > 0) ?? result.laboratories[0])?.id ?? '');
      setSearch(''); setLaboratorySearch(''); setPage(1);
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'No se pudo generar el reporte.');
    } finally {
      if (!controller.signal.aborted) { setLoading(false); requestRef.current = null; }
    }
  };
  const section = report?.laboratories.find(lab => lab.id === selectedId);
  const rows = useMemo(() => section ? filterMonthlyLaboratory(section, search) : [], [section, search]);
  const totals = useMemo(() => summarizeMonthlyLaboratory(rows), [rows]);
  const pages = Math.max(1, Math.ceil(rows.length / 20));
  const visiblePage = Math.min(page, pages);
  const paginated = rows.slice((visiblePage - 1) * 20, visiblePage * 20);
  const choose = (id: string) => { setSelectedId(id); setSearch(''); setPage(1); setLaboratorySearch(''); if (comboRef.current) comboRef.current.open = false; };
  const runExport = async (kind: 'all' | 'excel' | 'pdf') => {
    if (!report || !section || exporting) return;
    setExporting(true); setError('');
    try {
      if (kind === 'pdf') await exportMonthlyLaboratoryPdf(report, section, rows);
      else await exportMonthlyLaboratoriesExcel(report, kind === 'all' ? undefined : section, kind === 'all' ? undefined : rows);
    } catch { setError('No se pudo exportar el reporte. Intente nuevamente.'); }
    finally { setExporting(false); }
  };
  const exportDisabled = !report || loading || exporting;
  const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-40 transition-colors';
  const inputClass = 'rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-50';

  return <div className="mx-auto min-w-0 flex max-w-[1600px] flex-col gap-5 pb-12 animate-fade-in">
    <header className="min-w-0 flex flex-wrap items-center justify-between gap-4 border-b border-surface-variant pb-5">
      <div className="min-w-0 flex items-center gap-4">
        <img src={documentLogoUrl} alt="CODINSA" className="w-[150px] sm:w-[190px] h-[62px] object-contain object-left shrink-0" />
        <div className="min-w-0 border-l border-surface-variant pl-4">
          <h2 className="font-headline text-xl sm:text-2xl font-bold text-on-surface">Reportes Mes Laboratorios</h2>
          <p className="mt-1 text-xs text-on-surface-variant">Reportes mensuales de los 15 laboratorios</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button disabled={exportDisabled} onClick={() => runExport('all')} className={`${buttonClass} bg-secondary-container text-on-secondary-container`}><FileSpreadsheet size={15} /> Excel completo</button>
        <button disabled={exportDisabled || !rows.length} onClick={() => runExport('excel')} className={`${buttonClass} bg-secondary-container text-on-secondary-container`}><FileSpreadsheet size={15} /> Excel del laboratorio</button>
        <button disabled={exportDisabled || !rows.length} onClick={() => runExport('pdf')} className={`${buttonClass} bg-tertiary-container text-on-tertiary-container`}><FileText size={15} /> PDF del laboratorio</button>
      </div>
    </header>

    <form onSubmit={e => { e.preventDefault(); generate(); }} className="flex flex-wrap items-end gap-4 rounded-xl border border-surface-variant bg-surface-container-lowest p-4 shadow-sm">
      <label className="flex flex-col gap-1.5 text-xs font-bold text-on-surface-variant">Mes
        <select disabled={loading} value={mes} onChange={e => setMes(Number(e.target.value))} className={`${inputClass} min-w-[160px]`}>{monthlyLaboratoriesMonths.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select>
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-bold text-on-surface-variant">Año
        <input disabled={loading} type="number" min={1900} max={2100} step={1} required value={anio} onChange={e => setAnio(e.target.value)} className={`${inputClass} w-28`} />
      </label>
      <button disabled={loading} className={`${buttonClass} bg-primary text-on-primary hover:bg-surface-tint py-2.5`} type="submit">{loading ? <LoaderCircle className="animate-spin" size={16} /> : <CalendarDays size={16} />}{loading ? 'Generando…' : 'Generar reporte'}</button>
      <p className="text-xs text-outline sm:ml-auto">Se generan todos los laboratorios en una sola consulta.</p>
    </form>
    {error && <div role="alert" className="rounded-lg border border-error/20 bg-error-container p-4 text-sm text-error">{error}</div>}
    {loading && <p role="status" className="text-sm text-on-surface-variant">Generando el período solicitado. Esta operación puede tardar unos minutos.</p>}
    {!report && !loading && <div className="rounded-xl border border-dashed border-outline-variant p-10 text-center text-sm text-outline">Seleccione mes y año y pulse Generar reporte.</div>}

    {report && <>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <h3 className="font-bold text-primary">Período generado: {monthlyLaboratoriesPeriod(report)}</h3>
        <span className="text-xs text-outline">{report.total} registros · Generado {new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'short' }).format(new Date(report.generatedAt))}</span>
      </div>
      {report.total === 0 && <p role="status" className="rounded-lg bg-surface-container p-4 text-sm text-on-surface-variant">No hay registros en ninguno de los laboratorios para este período.</p>}
      <details open className="rounded-xl border border-surface-variant bg-surface-container-lowest shadow-sm">
        <summary className="cursor-pointer p-4 text-sm font-bold text-on-surface">Resumen de los 15 laboratorios</summary>
        <div className="max-h-72 overflow-auto border-t border-surface-variant">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-surface-container text-on-surface-variant"><tr><th className="px-4 py-2">Laboratorio</th><th className="px-4 py-2 text-right">Registros</th><th className="px-4 py-2 text-right">Cantidad</th><th className="px-4 py-2 text-right whitespace-nowrap">Total reportado</th></tr></thead>
            <tbody className="divide-y divide-surface-variant">{report.laboratories.map(lab => <tr key={lab.id} className={lab.id === selectedId ? 'bg-primary/5' : 'hover:bg-surface'}>
              <td className="px-4 py-2"><button onClick={() => choose(lab.id)} className="font-semibold text-primary hover:underline">{lab.name}</button></td>
              <td className="px-4 py-2 text-right">{lab.total}</td><td className="px-4 py-2 text-right">{number.format(lab.totals.cantidad)}</td><td className="px-4 py-2 text-right whitespace-nowrap">{money.format(lab.totals.importe)}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </details>
      {section && <>
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-surface-variant bg-surface-container-lowest p-4">
          <details ref={comboRef} onKeyDown={e => { if (e.key === 'Escape' && comboRef.current) comboRef.current.open = false; }} className="relative min-w-[220px]">
            <summary aria-label="Seleccionar laboratorio" className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm font-semibold text-on-surface [&::-webkit-details-marker]:hidden">{section.name} ({section.total})<ChevronDown size={16} /></summary>
            <div className="absolute left-0 top-full z-20 mt-2 w-72 max-w-[80vw] rounded-xl border border-surface-variant bg-surface-container-lowest p-2 shadow-lg">
              <input aria-label="Buscar laboratorio" value={laboratorySearch} onChange={e => setLaboratorySearch(e.target.value)} placeholder="Buscar laboratorio…" className={`${inputClass} mb-2 w-full`} />
              <div className="max-h-60 overflow-auto">{report.laboratories.filter(lab => normalize(lab.name).includes(normalize(laboratorySearch))).map(lab => <button key={lab.id} onClick={() => choose(lab.id)} className={`flex w-full justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-container ${lab.id === selectedId ? 'bg-primary/5 text-primary font-bold' : 'text-on-surface'}`}>{lab.name}<span className="text-xs text-outline">{lab.total}</span></button>)}
                {!report.laboratories.some(lab => normalize(lab.name).includes(normalize(laboratorySearch))) && <p className="p-3 text-xs text-outline">Sin coincidencias.</p>}
              </div>
            </div>
          </details>
          <div className="relative min-w-[200px] flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" /><input aria-label="Buscar en el detalle" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar cliente, documento, producto…" className={`${inputClass} w-full pl-9`} /></div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{[['Registros visibles', totals.registros], ['Cantidad', number.format(totals.cantidad)], ['Total reportado', money.format(totals.importe)]].map(([label, value]) => <div key={label} className="rounded-xl border border-surface-variant bg-surface-container-lowest p-4"><p className="text-xs text-outline">{label}</p><p className="mt-1 text-xl font-bold text-primary">{value}</p></div>)}</div>
        <p className="text-xs text-outline">Detalle de {section.name}. Los importes y signos se conservan tal como los genera el reporte, que incluye ventas y notas de crédito. Deslice la tabla horizontalmente para ver todas las columnas.</p>
        <div className="overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest shadow-sm">
          <div className="overflow-x-auto"><table aria-label={`Detalle de ${section.name}`} className="w-full border-collapse text-left text-xs">
            <thead className="bg-surface-container text-on-surface-variant"><tr>{section.columns.map(column => <th key={column.key} className="whitespace-nowrap px-3 py-3">{column.label}</th>)}</tr></thead>
            <tbody className="divide-y divide-surface-variant">{paginated.map((row, index) => <tr key={index} className={index % 2 ? 'bg-surface' : ''}>{section.columns.map(column => <td key={column.key} className={`px-3 py-3 ${column.kind === 'money' || column.kind === 'number' ? 'text-right font-mono whitespace-nowrap' : 'min-w-[110px] max-w-[280px] break-words'}`}>{monthlyLaboratoryCellText(row[column.key], column)}</td>)}</tr>)}
              {!rows.length && <tr><td colSpan={section.columns.length} className="px-4 py-10 text-center text-outline">{section.total ? 'No se encontraron coincidencias.' : 'Sin registros para este laboratorio en el período generado.'}</td></tr>}
            </tbody>
          </table></div>
          <div className="flex items-center justify-between gap-2 border-t border-surface-variant bg-surface p-4 text-xs text-outline"><span>Página {visiblePage} de {pages}</span><div className="flex gap-2"><button aria-label="Página anterior" disabled={visiblePage <= 1} onClick={() => setPage(visiblePage - 1)} className="rounded border border-outline-variant p-1.5 disabled:opacity-30"><ChevronLeft size={16} /></button><button aria-label="Página siguiente" disabled={visiblePage >= pages} onClick={() => setPage(visiblePage + 1)} className="rounded border border-outline-variant p-1.5 disabled:opacity-30"><ChevronRight size={16} /></button></div></div>
        </div>
      </>}
    </>}
  </div>;
};
