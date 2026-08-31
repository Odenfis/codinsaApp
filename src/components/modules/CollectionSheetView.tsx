import React, { useEffect, useState } from 'react';
import {
  AlertCircle, Building2, ClipboardList, FileSpreadsheet, FileText, LoaderCircle,
  Search, Signature, UserRound
} from 'lucide-react';
import {
  PlanillaCobranzaNumero, PlanillaCobranzaResponse, PlanillaCobranzaSerie
} from '../../types';
import { exportCollectionSheetToExcel, exportCollectionSheetToPdf } from '../../utils/exportUtils';

const currency = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 });
const money = (value: number) => currency.format(value || 0);
const dateText = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-PE');
};

const referencesFor = (item: PlanillaCobranzaResponse['items'][number]) => [
  item.NotaCred && `Nota de crédito: ${item.NotaCred}`,
  item.NroOperacion && `Operación: ${item.NroOperacion}`,
  item.NroLetra && `Letra: ${item.NroLetra}`,
  item.NroCheque && `Cheque: ${item.NroCheque}`,
  item.CtaBanco && `Cuenta: ${item.CtaBanco}`
].filter(Boolean);

export const CollectionSheetView: React.FC = () => {
  const [series, setSeries] = useState<PlanillaCobranzaSerie[]>([]);
  const [numbers, setNumbers] = useState<PlanillaCobranzaNumero[]>([]);
  const [serie, setSerie] = useState('');
  const [numero, setNumero] = useState('');
  const [report, setReport] = useState<PlanillaCobranzaResponse | null>(null);
  const [loadingSeries, setLoadingSeries] = useState(true);
  const [loadingNumbers, setLoadingNumbers] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    fetch('/api/reportes/planillas-cobranza/series')
      .then(async response => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar las series.');
        setSeries(payload.data || []);
      })
      .catch(requestError => setError(requestError instanceof Error ? requestError.message : 'No se pudieron cargar las series.'))
      .finally(() => setLoadingSeries(false));
  }, []);

  const selectSerie = async (value: string) => {
    setSerie(value);
    setNumero('');
    setNumbers([]);
    setReport(null);
    setHasSearched(false);
    setError('');
    if (!value) return;
    setLoadingNumbers(true);
    try {
      const response = await fetch(`/api/reportes/planillas-cobranza/numeros?${new URLSearchParams({ serie: value })}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar las planillas.');
      setNumbers(payload.data || []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudieron cargar las planillas.');
    } finally {
      setLoadingNumbers(false);
    }
  };

  const generate = async () => {
    setError('');
    if (!serie || !numero) return setError('Seleccione la Serie y el Número de planilla.');
    setLoadingReport(true);
    setReport(null);
    try {
      const response = await fetch(`/api/reportes/planilla-cobranza?${new URLSearchParams({ serie, numero })}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'No se pudo generar la planilla.');
      setReport(payload as PlanillaCobranzaResponse);
      setHasSearched(true);
    } catch (requestError) {
      setHasSearched(true);
      setError(requestError instanceof Error ? requestError.message : 'No se pudo generar la planilla.');
    } finally {
      setLoadingReport(false);
    }
  };

  const paymentSummary = report ? [
    ['Descuento', report.totals.Descuento], ['Efectivo', report.totals.Efectivo],
    ['Depósito', report.totals.Deposito], ['Letra', report.totals.Letra],
    ['Transferencia', report.totals.Transferencia], ['Cheque', report.totals.Cheque]
  ] as const : [];

  return (
    <div className="w-full min-w-0 max-w-[1500px] mx-auto flex flex-col gap-6 animate-fade-in pb-12">
      <header className="w-full min-w-0 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-surface-variant pb-5">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider font-bold text-primary mb-1">Reportes / Cuentas</p>
          <h2 className="font-headline text-2xl font-bold flex items-center gap-2.5">
            <ClipboardList className="text-primary" size={27} /> Planilla Cobranza
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">Documento de cobranza por Serie y Número de planilla</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button disabled={!report} onClick={() => report && exportCollectionSheetToExcel(report)} className="bg-secondary-container text-on-secondary-container px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"><FileSpreadsheet size={16} /> Excel</button>
          <button disabled={!report} onClick={() => report && exportCollectionSheetToPdf(report)} className="bg-tertiary-container text-on-tertiary-container px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"><FileText size={16} /> PDF</button>
        </div>
      </header>

      <section className="w-full min-w-0 bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:flex-wrap md:items-end gap-4">
          <label className="flex flex-col gap-1.5 text-xs font-bold text-on-surface-variant min-w-[180px]">
            Serie
            <select disabled={loadingSeries} value={serie} onChange={event => selectSerie(event.target.value)} className="bg-surface border border-outline-variant rounded-lg px-3 py-2.5 text-sm font-normal focus:border-primary focus:outline-none disabled:opacity-60">
              <option value="">{loadingSeries ? 'Cargando series…' : 'Seleccione una serie'}</option>
              {series.map(option => <option key={option.Serie} value={option.Serie}>{option.Serie}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-on-surface-variant min-w-[300px] max-w-full">
            Número de planilla
            <select disabled={!serie || loadingNumbers} value={numero} onChange={event => { setNumero(event.target.value); setReport(null); setHasSearched(false); setError(''); }} className="bg-surface border border-outline-variant rounded-lg px-3 py-2.5 text-sm font-normal focus:border-primary focus:outline-none disabled:opacity-60">
              <option value="">{loadingNumbers ? 'Cargando planillas…' : !serie ? 'Seleccione primero la serie' : 'Seleccione un número'}</option>
              {numbers.map(option => <option key={option.Numero} value={option.Numero}>{option.Numero} · {dateText(option.FechaIng)} · {option.Vendedor} - {option.Nombre}</option>)}
            </select>
          </label>
          <button disabled={loadingReport || !serie || !numero} onClick={generate} className="bg-primary text-on-primary rounded-lg px-5 py-2.5 text-sm font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-surface-tint disabled:opacity-50 disabled:cursor-not-allowed">
            {loadingReport ? <LoaderCircle size={17} className="animate-spin" /> : <Search size={17} />}{loadingReport ? 'Generando…' : 'Generar planilla'}
          </button>
        </div>
        {error && <div role="alert" className="mt-4 flex items-center gap-2 text-sm text-error bg-error/5 border border-error/20 rounded-lg p-3"><AlertCircle size={18} className="shrink-0" />{error}</div>}
      </section>

      {loadingReport && <section className="bg-surface-container-lowest border border-surface-variant rounded-xl py-16 text-center text-primary"><LoaderCircle size={34} className="animate-spin mx-auto mb-3" /><p className="text-sm font-bold">Preparando documento de cobranza…</p></section>}

      {!loadingReport && !report && <section className="bg-surface-container-lowest border border-surface-variant rounded-xl py-16 text-center text-outline"><ClipboardList size={36} className="mx-auto mb-3 opacity-40" /><p className="text-sm font-semibold">{hasSearched ? 'La planilla no contiene información para mostrar.' : 'Seleccione una Serie y un Número para generar la planilla.'}</p></section>}

      {report && <article className="w-full min-w-0 bg-white border border-outline-variant rounded-xl shadow-md overflow-hidden print:shadow-none">
        <div className="p-5 sm:p-8 border-b-4 border-primary">
          <div className="flex flex-col sm:flex-row justify-between gap-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-primary mb-2"><Building2 size={20} /><span className="text-xs font-bold uppercase tracking-wide">Documento operativo</span></div>
              <h3 className="font-headline text-xl sm:text-2xl font-bold text-on-surface">COMPAÑIA DISTRIBUIDORA AMERICANA S.A.C.</h3>
              <p className="text-xs text-outline mt-1">Planilla y detalle de documentos cobrados</p>
            </div>
            <div className="shrink-0 border-2 border-primary rounded-xl overflow-hidden text-center min-w-[210px]">
              <div className="bg-primary text-on-primary px-4 py-2 text-xs font-bold tracking-wider">PLANILLA DE COBRANZA</div>
              <div className="px-4 py-3 text-xl font-mono font-bold text-primary">{report.header.Serie}-{report.header.Numero}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-7 text-xs">
            <div><span className="block text-outline font-bold uppercase mb-1">Vendedor</span><span className="font-semibold flex items-center gap-1.5"><UserRound size={14} className="text-primary" />{report.header.Vendedor} - {report.header.Nombre}</span></div>
            <div><span className="block text-outline font-bold uppercase mb-1">Forma de pago</span><span className="font-semibold">{report.header.FormaPago || 'No especificada'}</span></div>
            <div><span className="block text-outline font-bold uppercase mb-1">Fecha creación</span><span className="font-semibold">{dateText(report.header.FechaCrea)}</span></div>
            <div><span className="block text-outline font-bold uppercase mb-1">Fecha ingreso</span><span className="font-semibold">{dateText(report.header.FechaIng)}</span></div>
          </div>
        </div>

        <div className="w-full max-w-full overflow-x-auto overscroll-x-contain report-table-scroll">
          <table className="w-full min-w-[900px] text-left border-collapse">
            <thead><tr className="bg-surface-container text-[10px] uppercase tracking-wide text-on-surface-variant">
              <th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Documento y referencias</th><th className="px-4 py-3 text-center">Fecha</th><th className="px-4 py-3 text-right">Valor</th><th className="px-4 py-3 text-right">Aplicado</th>
            </tr></thead>
            <tbody className="divide-y divide-surface-variant text-xs">
              {report.items.map((item, index) => {
                const references = referencesFor(item);
                return <tr key={`${item.Documento}-${index}`} className="even:bg-surface-container-low hover:bg-primary-container/10">
                  <td className="px-4 py-3 align-top"><span className="block font-mono text-[10px] text-primary font-bold">#{item.CodClie}</span><span className="font-semibold">{item.Razon}</span></td>
                  <td className="px-4 py-3 align-top"><span className="font-mono font-bold">{item.Documento}</span><span className="text-outline ml-2">Tipo {item.TipoDoc}</span><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-outline">{references.length ? references.map(reference => <span key={reference}>{reference}</span>) : <span>Sin referencias adicionales</span>}</div></td>
                  <td className="px-4 py-3 text-center align-top whitespace-nowrap">{dateText(item.FechaFac)}</td>
                  <td className="px-4 py-3 text-right align-top font-mono whitespace-nowrap">{money(item.Valor)}</td>
                  <td className="px-4 py-3 text-right align-top font-mono font-bold text-primary whitespace-nowrap">{money(item.TotalGeneral)}</td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>

        <div className="p-5 sm:p-8 border-t border-surface-variant">
          <h4 className="text-xs font-bold uppercase tracking-wide text-primary mb-4">Resumen de medios de pago</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {paymentSummary.map(([label, value]) => <div key={label} className="min-w-0 rounded-lg bg-surface-container-low p-3"><span className="block text-[10px] font-bold uppercase text-outline">{label}</span><span className="block mt-1 text-sm font-mono font-bold truncate">{money(value)}</span></div>)}
          </div>
          <div className="mt-5 rounded-xl bg-primary text-on-primary p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"><span className="text-xs font-bold uppercase tracking-wide">Total general cobrado</span><span className="text-2xl font-bold font-mono">{money(report.totals.TotalGeneral)}</span></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-16 sm:gap-24 mt-20 mb-3 px-4 sm:px-10">
            <div className="border-t border-outline pt-2 text-center text-xs text-outline flex items-center justify-center gap-1.5"><Signature size={14} /> Elaborado por</div>
            <div className="border-t border-outline pt-2 text-center text-xs text-outline flex items-center justify-center gap-1.5"><Signature size={14} /> Recibido por</div>
          </div>
        </div>
      </article>}
    </div>
  );
};
