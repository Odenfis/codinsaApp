import React, { useEffect, useState } from 'react';
import {
  AlertCircle, ClipboardList, FileSpreadsheet, FileText, LoaderCircle, Search
} from 'lucide-react';
import {
  PlanillaCobranzaNumero, PlanillaCobranzaResponse, PlanillaCobranzaSerie
} from '../../types';
import { exportCollectionSheetToExcel, exportCollectionSheetToPdf } from '../../utils/exportUtils';
import { buildCollectionSheetPresentation, collectionSheetDeposit, documentCode } from '../../utils/collectionSheetModel';
import { loadTrimmedLogoDataUrl } from '../../utils/logoUtils';
import logoUrl from '../../../assets/logotipo.png';

const currency = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 });
const money = (value: number) => currency.format(value || 0);
const dateText = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-PE');
};

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
  const [documentLogoUrl, setDocumentLogoUrl] = useState(logoUrl);

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

  useEffect(() => {
    let active = true;
    loadTrimmedLogoDataUrl(logoUrl)
      .then(trimmed => { if (active) setDocumentLogoUrl(trimmed.dataUrl); })
      .catch(() => { /* El archivo original permanece como fallback visual. */ });
    return () => { active = false; };
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

  const presentation = report ? buildCollectionSheetPresentation(report) : null;
  const paymentBlocks = presentation ? [
    { title: 'DEPÓSITOS', rows: presentation.deposits, reference: 'Nº OPERACIÓN' },
    { title: 'CHEQUE', rows: presentation.checks, reference: 'NÚMERO' }
  ] : [];

  const runExport = async (format: 'excel' | 'pdf') => {
    if (!report) return;
    setError('');
    try {
      if (format === 'excel') await exportCollectionSheetToExcel(report);
      else await exportCollectionSheetToPdf(report);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : `No se pudo exportar el archivo ${format.toUpperCase()}.`);
    }
  };

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
          <button disabled={!report} onClick={() => void runExport('excel')} className="bg-secondary-container text-on-secondary-container px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"><FileSpreadsheet size={16} /> Excel</button>
          <button disabled={!report} onClick={() => void runExport('pdf')} className="bg-tertiary-container text-on-tertiary-container px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"><FileText size={16} /> PDF</button>
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

      {report && presentation && <article className="w-full min-w-0 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-md overflow-hidden print:shadow-none">
        <div className="px-4 py-3 border-b border-surface-variant bg-surface-container-low flex items-center justify-between gap-3">
          <div><p className="text-xs font-bold text-on-surface">Vista previa del formato operativo</p><p className="text-[10px] text-outline">{presentation.pages.length} página(s) · {report.items.length} documento(s)</p></div>
          <span className="text-[10px] font-bold uppercase tracking-wide text-primary">Formato oficial</span>
        </div>
        <div className="w-full overflow-x-auto overscroll-x-contain p-4 sm:p-6 bg-surface-container-low report-table-scroll">
          <div className="min-w-[1180px] flex flex-col gap-6">
            {presentation.pages.map((pageItems, pageIndex) => {
              const isLast = pageIndex === presentation.pages.length - 1;
              return <section key={pageIndex} className="bg-white text-[#253232] border border-outline-variant shadow-sm p-5 font-sans">
                <div className="grid grid-cols-[360px_1fr_330px] items-start min-h-[92px]">
                  <img src={documentLogoUrl} alt="CODINSA" className="w-[300px] h-[90px] object-contain object-left" />
                  <div />
                  <dl className="grid grid-cols-[145px_1fr] text-[11px] border border-[#637676]">
                    <dt className="font-bold px-2 py-1 border-b border-r border-[#637676]">Fecha de Liquidación:</dt><dd className="px-2 py-1 border-b border-[#637676]">{dateText(report.header.FechaIng)}</dd>
                    <dt className="font-bold px-2 py-1 border-b border-r border-[#637676]">Vendedor:</dt><dd className="px-2 py-1 border-b border-[#637676]">{report.header.Nombre}</dd>
                    <dt className="font-bold px-2 py-1 border-r border-[#637676]">Localidad:</dt><dd className="px-2 py-1">{presentation.location}</dd>
                  </dl>
                </div>
                <div className="grid grid-cols-[1fr_190px] items-end mb-1">
                  <h3 className="text-center text-[17px] font-bold tracking-[0.38em] text-primary">PLANILLA DE COBRANZA</h3>
                  <div className="text-center text-sm font-bold">Nº {report.header.Numero}</div>
                </div>
                <table className="w-full table-fixed border-collapse text-[9px] [&_th]:border [&_th]:border-[#637676] [&_th]:p-1 [&_td]:border [&_td]:border-[#637676] [&_td]:px-1 [&_td]:text-center">
                  <colgroup><col className="w-[5%]"/><col className="w-[9%]"/><col className="w-[17%]"/><col className="w-[11%]"/><col className="w-[4%]"/><col className="w-[7%]"/><col className="w-[7%]"/><col className="w-[8%]"/><col className="w-[7%]"/><col className="w-[6.25%]"/><col className="w-[6.25%]"/><col className="w-[6.25%]"/><col className="w-[6.25%]"/></colgroup>
                  <thead>
                    <tr><th rowSpan={2}>Código<br/>Cliente</th><th rowSpan={2}>R.U.C.</th><th rowSpan={2}>Nombre del cliente</th><th rowSpan={2}>Lugar</th><th colSpan={3}>Documento</th><th rowSpan={2}>Importe<br/>Amortizado</th><th rowSpan={2}>Descuento<br/>NC</th><th colSpan={4}>Forma de Pago</th></tr>
                    <tr><th>Tipo</th><th>Número</th><th>F. Emisión</th><th>Efectivo</th><th>Depósito</th><th>Letras</th><th>Cheque</th></tr>
                  </thead>
                  <tbody>{Array.from({ length: 15 }, (_, index) => {
                    const item = pageItems[index];
                    return <tr key={index} className="h-7">
                      <td>{item?.CodClie || ''}</td><td>{item?.RUC || ''}</td><td className="text-left px-1 truncate" title={item?.Razon}>{item?.Razon || ''}</td><td className="px-2 truncate" title={item?.Lugar}>{item?.Lugar || ''}</td>
                      <td>{item ? documentCode(item.TipoDoc) : ''}</td><td>{item?.Documento || ''}</td><td>{item ? dateText(item.FechaFac) : ''}</td>
                      <td className="text-right">{item ? money(item.Valor) : ''}</td><td className="text-right">{item?.Descuento ? money(item.Descuento) : item?.NotaCred || ''}</td>
                      <td className="text-right">{item?.Efectivo ? money(item.Efectivo) : ''}</td><td className="text-right">{item && collectionSheetDeposit(item) ? money(collectionSheetDeposit(item)) : ''}</td>
                      <td className="text-right">{item?.Letra ? money(item.Letra) : ''}</td><td className="text-right">{item?.Cheque ? money(item.Cheque) : ''}</td>
                    </tr>;
                  })}</tbody>
                  {isLast && <tfoot><tr className="font-bold bg-primary-container/30"><td colSpan={8} className="text-right px-2">TOTALES</td><td className="text-right">{money(presentation.totals.descuento)}</td><td className="text-right">{money(presentation.totals.efectivo)}</td><td className="text-right">{money(presentation.totals.deposito)}</td><td className="text-right">{money(presentation.totals.letra)}</td><td className="text-right">{money(presentation.totals.cheque)}</td></tr></tfoot>}
                </table>
                {isLast && <>
                  <div className="grid grid-cols-[1.3fr_1fr] gap-8 mt-3 text-[9px]">
                    <div className="border border-[#637676] p-2"><p className="font-bold text-primary mb-1">CÓDIGOS DE DOCUMENTO PARA SER USADOS EN LA LIQUIDACIÓN DE PLANILLA DE COBRANZA</p><div className="grid grid-cols-3 gap-x-3"><span>1 = FACTURA<br/>2 = LETRA</span><span>3 = NOTA DE DÉBITO<br/>4 = NOTA DE CRÉDITO<br/>5 = PAGO A CUENTA</span><span>6 = CHEQUE DEVUELTO<br/>7 = LETRA PROTESTADA<br/>8 = OTROS</span></div></div>
                    <div className="grid grid-cols-[1fr_120px] border border-[#637676]"><div className="font-bold bg-primary-container/60 p-2">TOTAL EFECTIVO<br/><br/>TOTAL DEPÓSITO BCO.<br/><br/>TOTAL LETRAS<br/><br/>TOTAL CHEQUE AL DÍA<br/><br/>TOTAL COBRADO</div><div className="text-right p-2 font-mono">{money(presentation.totals.efectivo)}<br/><br/>{money(presentation.totals.deposito)}<br/><br/>{money(presentation.totals.letra)}<br/><br/>{money(presentation.totals.cheque)}<br/><br/><strong>{money(presentation.totals.cobrado)}</strong></div></div>
                  </div>
                  <div className="grid grid-cols-2 gap-8 mt-3 text-[9px]">
                    {paymentBlocks.map(({ title, rows, reference }) => <table key={title} className="w-full border-collapse [&_th]:border [&_th]:border-[#637676] [&_th]:p-1 [&_td]:border [&_td]:border-[#637676] [&_td]:p-1 [&_td]:text-center"><thead><tr><th colSpan={4} className="bg-primary-container/60">{title}</th></tr><tr><th>MONTO</th><th>{reference}</th><th>FECHA</th><th>BANCO</th></tr></thead><tbody>{(rows.length ? rows : [{ amount: 0, reference: '', date: '', bank: '' }]).map((paymentRow, index) => <tr key={index}><td className="text-right">{paymentRow.amount ? money(paymentRow.amount) : ''}</td><td>{paymentRow.reference}</td><td>{paymentRow.date ? dateText(paymentRow.date) : ''}</td><td>{paymentRow.bank}</td></tr>)}</tbody></table>)}
                  </div>
                  <div className="grid grid-cols-3 gap-24 mt-16 px-16 text-[9px] text-center"><div className="border-t border-[#637676] pt-1">VENDEDOR</div><div className="border-t border-[#637676] pt-1">CAJERO</div><div className="border-t border-[#637676] pt-1">VºBº</div></div>
                  <div className="mt-5 border-b border-[#637676] text-[9px] pb-4"><strong>OBSERVACIONES:</strong></div>
                </>}
                <p className="text-right text-[9px] text-outline mt-2">Página {pageIndex + 1} de {presentation.pages.length}</p>
              </section>;
            })}
          </div>
        </div>
      </article>}
    </div>
  );
};
