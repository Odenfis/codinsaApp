import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, Boxes, CalendarDays, ChevronDown, ChevronLeft, ChevronRight,
  FileSpreadsheet, FileText, LoaderCircle, MoveHorizontal, Search
} from 'lucide-react';
import { ValuedStockResponse, ValuedStockRow } from '../../types';
import { exportValuedStockToExcel, exportValuedStockToPdf } from '../../utils/exportUtils';
import { loadTrimmedLogoDataUrl } from '../../utils/logoUtils';
import logoUrl from '../../../assets/logotipo.png';

const months = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const quantity = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 });
const displayDate = (value: string) => value ? new Date(value).toLocaleDateString('es-PE', { timeZone: 'UTC' }) : '—';
const rowKey = (row: ValuedStockRow) => JSON.stringify([row.Codpro, row.Lote, row.Almacen]);

export const ValuedStockReportView: React.FC = () => {
  const today = useMemo(() => new Date(), []);
  const [mes, setMes] = useState(today.getMonth() + 1);
  const [anio, setAnio] = useState(today.getFullYear());
  const [report, setReport] = useState<ValuedStockResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [documentLogoUrl, setDocumentLogoUrl] = useState(logoUrl);
  const perPage = 20;

  useEffect(() => {
    let active = true;
    loadTrimmedLogoDataUrl(logoUrl)
      .then(logo => { if (active) setDocumentLogoUrl(logo.dataUrl); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const data = report?.data || [];
  const totalPages = Math.max(1, Math.ceil(data.length / perPage));
  const visibleRows = data.slice((page - 1) * perPage, page * perPage);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter(value => value === 1 || value === totalPages || Math.abs(value - page) <= 1);
  const years = Array.from({ length: Math.max(1, today.getFullYear() - 1999) }, (_, index) => today.getFullYear() - index);
  const periodLabel = report ? `${months[report.period.mes - 1]} ${report.period.anio}` : '';

  const generate = async () => {
    setError('');
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) return setError('Seleccione un mes válido.');
    if (!Number.isInteger(anio) || anio < 1900 || anio > 2100) return setError('Seleccione un año válido.');
    setLoading(true);
    setReport(null);
    setExpanded(new Set());
    try {
      const params = new URLSearchParams({ mes: String(mes), anio: String(anio) });
      const response = await fetch(`/api/reportes/stock-valorizado?${params}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'No se pudo generar Stock Valorizado.');
      setReport(payload as ValuedStockResponse);
      setPage(1);
      setHasSearched(true);
    } catch (requestError) {
      setHasSearched(true);
      setError(requestError instanceof Error ? requestError.message : 'No se pudo generar Stock Valorizado.');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format: 'excel' | 'pdf') => {
    if (!report?.data.length) return;
    setError('');
    setExporting(format);
    try {
      if (format === 'excel') await exportValuedStockToExcel(report);
      else await exportValuedStockToPdf(report);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'No se pudo exportar el reporte.');
    } finally {
      setExporting(null);
    }
  };

  const toggleDetail = (key: string) => setExpanded(current => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });

  const summary = report ? [
    { label: 'Productos / lotes', value: report.total.toLocaleString('es-PE') },
    { label: 'Movimientos', value: report.movementTotal.toLocaleString('es-PE') },
    { label: 'Stock inicial', value: quantity.format(report.totals.StockIni) },
    { label: 'Ingresos', value: quantity.format(report.totals.Ingresos) },
    { label: 'Salidas', value: quantity.format(report.totals.Salidas) },
    { label: 'Stock final', value: quantity.format(report.totals.Saldo) },
    { label: 'Valor total', value: money.format(report.totals.Valorizado), emphasized: true }
  ] : [];

  return (
    <div className="w-full min-w-0 max-w-[1600px] mx-auto flex flex-col gap-6 animate-fade-in pb-12">
      <header className="w-full min-w-0 flex flex-col xl:flex-row xl:items-center justify-between gap-5 border-b border-surface-variant pb-5">
        <div className="min-w-0 flex items-center gap-4">
          <img src={documentLogoUrl} alt="CODINSA" className="w-[150px] sm:w-[190px] h-[62px] object-contain object-left shrink-0" />
          <div className="min-w-0 border-l border-surface-variant pl-4">
            <p className="text-[11px] uppercase tracking-wider font-bold text-primary mb-1">Reportes / Almacén</p>
            <h2 className="font-headline text-xl sm:text-2xl font-bold flex items-center gap-2.5"><Boxes className="text-primary shrink-0" size={27} />Stock Valorizado</h2>
            <p className="text-xs text-on-surface-variant mt-1">Saldo y valor final por producto, lote y almacén</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button disabled={!data.length || exporting !== null} onClick={() => exportReport('excel')} className="bg-secondary-container text-on-secondary-container px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
            {exporting === 'excel' ? <LoaderCircle size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />} Excel
          </button>
          <button disabled={!data.length || exporting !== null} onClick={() => exportReport('pdf')} className="bg-tertiary-container text-on-tertiary-container px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
            {exporting === 'pdf' ? <LoaderCircle size={16} className="animate-spin" /> : <FileText size={16} />} PDF
          </button>
        </div>
      </header>

      <section className="w-full min-w-0 bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm p-4 sm:p-5 overflow-hidden">
        <div className="flex flex-col md:flex-row md:flex-wrap md:items-end gap-4">
          <div className="flex items-center gap-2 text-primary mr-1 pb-2"><CalendarDays size={20} /><span className="text-sm font-bold">Periodo</span></div>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-on-surface-variant min-w-[190px]">Mes
            <select value={mes} onChange={event => { setMes(Number(event.target.value)); setError(''); }} className="bg-surface border border-outline-variant rounded-lg px-3 py-2.5 text-sm font-normal focus:border-primary focus:outline-none">
              {months.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-on-surface-variant min-w-[130px]">Año
            <select value={anio} onChange={event => { setAnio(Number(event.target.value)); setError(''); }} className="bg-surface border border-outline-variant rounded-lg px-3 py-2.5 text-sm font-normal focus:border-primary focus:outline-none">
              {years.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <button onClick={generate} disabled={loading} className="bg-primary text-on-primary rounded-lg px-5 py-2.5 text-sm font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-surface-tint disabled:opacity-60">
            {loading ? <LoaderCircle size={17} className="animate-spin" /> : <Search size={17} />}{loading ? 'Generando…' : 'Generar reporte'}
          </button>
          {report && <p className="w-full xl:w-auto xl:ml-auto text-xs text-outline md:pb-2">Periodo consultado: <strong className="text-on-surface">{periodLabel}</strong></p>}
        </div>
        {error && <div role="alert" className="mt-4 flex items-center gap-2 text-sm text-error bg-error/5 border border-error/20 rounded-lg p-3"><AlertCircle size={18} className="shrink-0" />{error}</div>}
      </section>

      {report && <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7 gap-3">
        {summary.map(item => <div key={item.label} className={`min-w-0 overflow-hidden rounded-xl border p-4 shadow-sm ${item.emphasized ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-lowest border-surface-variant'}`}>
          <p className={`text-[10px] font-bold uppercase tracking-wide ${item.emphasized ? 'opacity-80' : 'text-outline'}`}>{item.label}</p>
          <p className={`text-lg font-bold mt-1 truncate ${item.emphasized ? '' : 'text-primary'}`} title={item.value}>{item.value}</p>
        </div>)}
      </section>}

      <section className="w-full min-w-0 bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-surface-variant bg-surface text-[11px] font-medium text-outline">
          <span className="flex items-center gap-2"><MoveHorizontal size={15} className="text-primary" />Desplácese horizontalmente para ver todas las columnas</span>
          {report && <span className="hidden sm:inline font-bold text-primary">{periodLabel}</span>}
        </div>
        {data.length > 0 ? <div className="report-table-scroll w-full max-w-full overflow-x-auto overscroll-x-contain" style={{ WebkitOverflowScrolling: 'touch', scrollbarGutter: 'stable' }}>
          <table className="min-w-[1550px] w-full text-left border-collapse">
            <thead><tr className="bg-surface-container text-on-surface-variant text-[10px] font-bold uppercase tracking-wide border-b border-surface-variant">
              {['Código', 'Cód. SUNAT', 'Producto', 'Lote', 'Almacén', 'Unidad', 'Stock inicial', 'Ingresos', 'Salidas', 'Stock final', 'Valor unitario', 'Valorizado', 'Detalle'].map(label => <th key={label} className={`py-3 px-3 whitespace-nowrap ${['Stock inicial', 'Ingresos', 'Salidas', 'Stock final', 'Valor unitario', 'Valorizado'].includes(label) ? 'text-right' : ''} ${label === 'Código' ? 'sticky left-0 z-30 bg-surface-container' : ''}`}>{label}</th>)}
            </tr></thead>
            <tbody className="text-xs divide-y divide-surface-variant">
              {visibleRows.map((row, index) => {
                const key = rowKey(row);
                const isExpanded = expanded.has(key);
                return <React.Fragment key={key}>
                  <tr className="hover:bg-primary-container/10 even:bg-surface-container-low">
                    <td className={`py-3 px-3 sticky left-0 z-20 font-semibold whitespace-nowrap ${index % 2 ? 'bg-surface-container-low' : 'bg-surface-container-lowest'}`}>{row.Codpro}</td>
                    <td className="py-3 px-3 whitespace-nowrap">{row.CodSunat || '—'}</td>
                    <td className="py-3 px-3 min-w-[290px] max-w-[360px] truncate font-semibold" title={row.Descripcion}>{row.Descripcion}</td>
                    <td className="py-3 px-3 whitespace-nowrap">{row.Lote || '—'}</td>
                    <td className="py-3 px-3 whitespace-nowrap">{row.Almacen}</td>
                    <td className="py-3 px-3 whitespace-nowrap">{row.UniMed}</td>
                    <td className="py-3 px-3 text-right font-mono">{quantity.format(row.StockIni)}</td>
                    <td className="py-3 px-3 text-right font-mono">{quantity.format(row.Ingresos)}</td>
                    <td className="py-3 px-3 text-right font-mono">{quantity.format(row.Salidas)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-primary">{quantity.format(row.Saldo)}</td>
                    <td className="py-3 px-3 text-right font-mono">{money.format(row.ValorUni)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-primary">{money.format(row.Valorizado)}</td>
                    <td className="py-3 px-3"><button aria-expanded={isExpanded} aria-label={`Ver detalle de ${row.Codpro}, lote ${row.Lote}, almacén ${row.Almacen}`} onClick={() => toggleDetail(key)} className="flex items-center gap-1 text-primary font-bold hover:underline"><ChevronDown size={15} className={isExpanded ? 'rotate-180' : ''} />{row.movements.length} mov.</button></td>
                  </tr>
                  {isExpanded && <tr><td colSpan={13} className="p-4 bg-primary-container/10">
                    <div className="text-xs font-bold text-primary mb-2">Detalle · {row.Codpro} / {row.Lote || 'Sin lote'} / Almacén {row.Almacen}</div>
                    <table className="w-full min-w-[1100px] text-[11px] border-collapse">
                      <thead className="bg-surface-container text-on-surface-variant"><tr>{['Número', 'Fecha', 'Tipo doc.', 'Documento', 'Stock inicial', 'Ingresos', 'Costo ingreso', 'Salidas', 'Costo salida', 'Saldo', 'Valor unitario', 'Valorizado'].map(label => <th key={label} className="p-2 text-left border-b border-surface-variant">{label}</th>)}</tr></thead>
                      <tbody className="divide-y divide-surface-variant">
                        <tr className="bg-surface-container-lowest"><td className="p-2 font-semibold">Inicial</td><td className="p-2">—</td><td className="p-2">—</td><td className="p-2">—</td><td className="p-2">{quantity.format(row.StockIni)}</td><td className="p-2">—</td><td className="p-2">—</td><td className="p-2">—</td><td className="p-2">—</td><td className="p-2">{quantity.format(row.StockIni)}</td><td className="p-2">{money.format(row.InitialValorUni)}</td><td className="p-2">{money.format(row.InitialValorizado)}</td></tr>
                        {row.movements.map((movement, movementIndex) => <tr key={`${movement.Numero}-${movementIndex}`} className="bg-surface-container-lowest"><td className="p-2">{movement.Numero}</td><td className="p-2">{displayDate(movement.Fecha)}</td><td className="p-2">{movement.TipoDoc || '—'}</td><td className="p-2">{movement.Documento || '—'}</td><td className="p-2">{quantity.format(movement.StockIni)}</td><td className="p-2">{quantity.format(movement.Ingresos)}</td><td className="p-2">{money.format(movement.CostoI)}</td><td className="p-2">{quantity.format(movement.Salidas)}</td><td className="p-2">{money.format(movement.CostoS)}</td><td className="p-2">{quantity.format(movement.Saldo)}</td><td className="p-2">{money.format(movement.ValorUni)}</td><td className="p-2">{money.format(movement.Valorizado)}</td></tr>)}
                      </tbody>
                    </table>
                  </td></tr>}
                </React.Fragment>;
              })}
            </tbody>
          </table>
        </div> : <div className={`py-16 px-4 text-center ${loading ? 'text-primary' : 'text-outline'}`}>
          {loading ? <LoaderCircle size={32} className="animate-spin mx-auto mb-3" /> : <Boxes size={34} className="mx-auto mb-3 opacity-40" />}
          <p className="text-sm font-semibold">{loading ? 'Calculando stock valorizado…' : hasSearched ? 'No se encontraron lotes para el periodo seleccionado.' : 'Seleccione el mes y año para generar Stock Valorizado.'}</p>
        </div>}
        {data.length > 0 && <div className="p-4 border-t border-surface-variant bg-surface flex flex-col sm:flex-row gap-3 justify-between items-center text-xs text-outline">
          <span>Mostrando {(page - 1) * perPage + 1}–{Math.min(page * perPage, data.length)} de {data.length} lotes</span>
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
