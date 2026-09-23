import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, CalendarDays, ChevronLeft, ChevronRight, FileSpreadsheet,
  FileText, LoaderCircle, MoveHorizontal, PackageSearch, Search
} from 'lucide-react';
import { KardexProductoResponse, KardexProductoRow, KardexProductoTotals } from '../../types';
import { exportProductKardexToExcel, exportProductKardexToPdf } from '../../utils/exportUtils';
import { loadTrimmedLogoDataUrl } from '../../utils/logoUtils';
import logoUrl from '../../../assets/logotipo.png';

const months = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const emptyTotals: KardexProductoTotals = { Saldoini: 0, Ingresos: 0, salidas: 0, saldoFin: 0, Valor: 0 };
const quantity = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const currency = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 });

const columns: Array<{ key: keyof KardexProductoRow; label: string; numeric?: boolean; money?: boolean }> = [
  { key: 'codpro', label: 'Código' },
  { key: 'codSunat', label: 'Cód. SUNAT' },
  { key: 'Producto', label: 'Producto' },
  { key: 'Unimed', label: 'Unidad' },
  { key: 'Saldoini', label: 'Saldo inicial', numeric: true },
  { key: 'Ingresos', label: 'Ingresos', numeric: true },
  { key: 'salidas', label: 'Salidas', numeric: true },
  { key: 'saldoFin', label: 'Saldo final', numeric: true },
  { key: 'Costo', label: 'Costo', money: true },
  { key: 'Valor', label: 'Valor', money: true }
];

export const ProductKardexReportView: React.FC = () => {
  const today = useMemo(() => new Date(), []);
  const [mes, setMes] = useState(today.getMonth() + 1);
  const [anio, setAnio] = useState(today.getFullYear());
  const [report, setReport] = useState<KardexProductoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(1);
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
  const totals = report?.totals || emptyTotals;
  const totalPages = Math.max(1, Math.ceil(data.length / perPage));
  const visibleRows = data.slice((page - 1) * perPage, page * perPage);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter(value => value === 1 || value === totalPages || Math.abs(value - page) <= 1);
  const years = Array.from({ length: Math.max(1, today.getFullYear() - 1999) }, (_, index) => today.getFullYear() - index);

  const generate = async () => {
    setError('');
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) return setError('Seleccione un mes válido.');
    if (!Number.isInteger(anio) || anio < 1900 || anio > 2100) return setError('Seleccione un año válido.');
    setLoading(true);
    try {
      const response = await fetch(`/api/reportes/kardex-productos?${new URLSearchParams({ mes: String(mes), anio: String(anio) })}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'No se pudo generar el Kardex de Productos.');
      setReport(payload as KardexProductoResponse);
      setPage(1);
      setHasSearched(true);
    } catch (requestError) {
      setReport(null);
      setHasSearched(true);
      setError(requestError instanceof Error ? requestError.message : 'No se pudo generar el Kardex de Productos.');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format: 'excel' | 'pdf') => {
    if (!report?.data.length) return;
    setError('');
    setExporting(format);
    try {
      if (format === 'excel') await exportProductKardexToExcel(report);
      else await exportProductKardexToPdf(report);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'No se pudo exportar el reporte.');
    } finally {
      setExporting(null);
    }
  };

  const periodLabel = report ? `${months[report.period.mes - 1]} ${report.period.anio}` : '';
  const renderValue = (row: KardexProductoRow, column: typeof columns[number]) => {
    const value = row[column.key];
    if (column.money) return currency.format(Number(value || 0));
    if (column.numeric) return quantity.format(Number(value || 0));
    return String(value || '—');
  };

  const summary = [
    { label: 'Productos', value: data.length.toLocaleString('es-PE') },
    { label: 'Saldo inicial', value: quantity.format(totals.Saldoini) },
    { label: 'Ingresos', value: quantity.format(totals.Ingresos) },
    { label: 'Salidas', value: quantity.format(totals.salidas) },
    { label: 'Saldo final', value: quantity.format(totals.saldoFin) },
    { label: 'Valor del inventario', value: currency.format(totals.Valor), emphasized: true }
  ];

  return (
    <div className="w-full min-w-0 max-w-[1600px] mx-auto flex flex-col gap-6 animate-fade-in pb-12">
      <header className="w-full min-w-0 flex flex-col xl:flex-row xl:items-center justify-between gap-5 border-b border-surface-variant pb-5">
        <div className="min-w-0 flex items-center gap-4">
          <img src={documentLogoUrl} alt="CODINSA" className="w-[150px] sm:w-[190px] h-[62px] object-contain object-left shrink-0" />
          <div className="min-w-0 border-l border-surface-variant pl-4">
            <p className="text-[11px] uppercase tracking-wider font-bold text-primary mb-1">Reportes / Almacén</p>
            <h2 className="font-headline text-xl sm:text-2xl font-bold flex items-center gap-2.5">
              <PackageSearch className="text-primary shrink-0" size={27} /> Kardex de Productos
            </h2>
            <p className="text-xs text-on-surface-variant mt-1">Inventario valorizado y movimientos consolidados por mes</p>
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
          <label className="flex flex-col gap-1.5 text-xs font-bold text-on-surface-variant min-w-[190px]">
            Mes
            <select value={mes} onChange={event => { setMes(Number(event.target.value)); setError(''); }} className="bg-surface border border-outline-variant rounded-lg px-3 py-2.5 text-sm font-normal focus:border-primary focus:outline-none">
              {months.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-on-surface-variant min-w-[130px]">
            Año
            <select value={anio} onChange={event => { setAnio(Number(event.target.value)); setError(''); }} className="bg-surface border border-outline-variant rounded-lg px-3 py-2.5 text-sm font-normal focus:border-primary focus:outline-none">
              {years.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <button onClick={generate} disabled={loading} className="bg-primary text-on-primary rounded-lg px-5 py-2.5 text-sm font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-surface-tint disabled:opacity-60">
            {loading ? <LoaderCircle size={17} className="animate-spin" /> : <Search size={17} />}{loading ? 'Generando…' : 'Generar reporte'}
          </button>
          {report && data.length > 0 && <p className="w-full xl:w-auto xl:ml-auto text-xs text-outline md:pb-2">Periodo consultado: <strong className="text-on-surface">{periodLabel}</strong></p>}
        </div>
        {error && <div role="alert" className="mt-4 flex items-center gap-2 text-sm text-error bg-error/5 border border-error/20 rounded-lg p-3"><AlertCircle size={18} className="shrink-0" />{error}</div>}
      </section>

      {data.length > 0 && <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
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
        <div className="report-table-scroll w-full max-w-full overflow-x-auto overscroll-x-contain" style={{ WebkitOverflowScrolling: 'touch', scrollbarGutter: 'stable' }}>
          <table className="min-w-[1450px] w-full text-left border-collapse">
            <thead><tr className="bg-surface-container text-on-surface-variant text-[10px] font-bold uppercase tracking-wide border-b border-surface-variant">
              {columns.map((column, index) => <th key={column.key} className={`py-3 px-3 whitespace-nowrap ${column.numeric || column.money ? 'text-right' : ''} ${index === 0 ? 'sticky left-0 z-30 w-[130px] bg-surface-container' : ''} ${index === 2 ? 'min-w-[320px]' : ''}`}>{column.label}</th>)}
            </tr></thead>
            <tbody className="text-xs divide-y divide-surface-variant">
              {visibleRows.map((row, index) => <tr key={`${row.codpro}-${index}`} className="hover:bg-primary-container/10 even:bg-surface-container-low">
                {columns.map((column, columnIndex) => <td key={column.key} title={column.key === 'Producto' ? row.Producto : undefined} className={`py-3 px-3 whitespace-nowrap ${column.numeric || column.money ? 'text-right font-mono' : ''} ${column.key === 'Producto' ? 'max-w-[420px] truncate font-semibold' : ''} ${column.key === 'saldoFin' || column.key === 'Valor' ? 'font-bold text-primary' : ''} ${columnIndex === 0 ? `sticky left-0 z-20 w-[130px] font-semibold ${index % 2 ? 'bg-surface-container-low' : 'bg-surface-container-lowest'}` : ''}`}>{renderValue(row, column)}</td>)}
              </tr>)}
              {!loading && !data.length && <tr><td colSpan={columns.length} className="py-16 text-center text-outline"><PackageSearch size={34} className="mx-auto mb-3 opacity-40" /><p className="text-sm font-semibold">{hasSearched ? 'No se encontraron productos para el periodo seleccionado.' : 'Seleccione el mes y año para generar el Kardex de Productos.'}</p></td></tr>}
              {loading && <tr><td colSpan={columns.length} className="py-16 text-center text-primary"><LoaderCircle size={32} className="animate-spin mx-auto mb-3" /><p className="text-sm font-semibold">Calculando inventario valorizado…</p></td></tr>}
            </tbody>
          </table>
        </div>
        {data.length > 0 && <div className="p-4 border-t border-surface-variant bg-surface flex flex-col sm:flex-row gap-3 justify-between items-center text-xs text-outline">
          <span>Mostrando {(page - 1) * perPage + 1}–{Math.min(page * perPage, data.length)} de {data.length} productos</span>
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
