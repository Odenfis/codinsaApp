import React, { useState, useEffect, useRef } from 'react';
import { Producto, Linea, Laboratorio } from '../../types';
import { exportToExcel, exportToPdf } from '../../utils/exportUtils';
import type { ProductCodeField, ProductCodes, ProductCodeChanges } from '../../backend/services/productCodes';
import { Search, Package, FileSpreadsheet, FileText, ChevronLeft, ChevronRight, Filter, Check, Save, RotateCcw, X } from 'lucide-react';

const codeColumns: { field: ProductCodeField; label: string }[] = [
  { field: 'CodLab', label: 'Cod. anterior' },
  { field: 'CodLab1', label: 'Cod. SUNAT' },
  { field: 'CodLabo', label: 'Cod. laboratorio' },
];
type ProductDraft = { original: ProductCodes; changes: ProductCodeChanges };
type Confirmation = { product: Producto; draft: ProductDraft };
const productCodes = (p: Producto): ProductCodes => ({
  CodLab: p.CodLab ?? null, CodLab1: p.CodLab1 ?? null, CodLabo: p.CodLabo ?? null,
});

export const ProductsEditCodLabView: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [laboratorios, setLaboratorios] = useState<Laboratorio[]>([]);
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, ProductDraft>>({});
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [saveError, setSaveError] = useState('');
  const [loadError, setLoadError] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const listRequestId = useRef(0);
  const [savedFeedback, setSavedFeedback] = useState<Set<string>>(new Set());

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLinea, setSelectedLinea] = useState('');
  const [selectedLab, setSelectedLab] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const token = localStorage.getItem('toolkit_jwt');
  const headers = { Authorization: `Bearer ${token}` };
  const saveInProgress = useRef(false);
  const feedbackTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => { feedbackTimers.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (confirmation && !dialog?.open) dialog?.showModal();
    if (!confirmation && dialog?.open) dialog.close();
  }, [confirmation]);

  useEffect(() => {
    fetch('/api/productos/lineas', { headers })
      .then(r => r.json()).then(d => setLineas(d.data || [])).catch(console.error);
    fetch('/api/productos/laboratorios', { headers })
      .then(r => r.json()).then(d => setLaboratorios(d.data || [])).catch(console.error);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (selectedLinea) params.set('linea', selectedLinea);
    if (selectedLab) params.set('lab', selectedLab);

    const controller = new AbortController();
    const requestId = ++listRequestId.current;
    setLoadError('');
    setCurrentPage(1);
    fetch(`/api/productos?${params.toString()}`, { headers, signal: controller.signal })
      .then(async r => {
        if (!r.ok) throw new Error('No se pudo cargar el listado de productos.');
        return r.json();
      })
      .then(d => {
        if (requestId === listRequestId.current) setProductos(d.data || []);
      })
      .catch(err => {
        if (!controller.signal.aborted && requestId === listRequestId.current) setLoadError(err.message);
      });
    return () => controller.abort();
  }, [searchTerm, selectedLinea, selectedLab]);

  const handleInputChange = (p: Producto, field: ProductCodeField, raw: string) => {
    setSavedFeedback(prev => { const next = new Set(prev); next.delete(p.CodPro); return next; });
    setDrafts(prev => {
      const original = prev[p.CodPro]?.original ?? productCodes(p);
      const changes = { ...prev[p.CodPro]?.changes };
      const value = raw === '' ? null : raw;
      if ((original[field] ?? '') === (value ?? '')) delete changes[field];
      else changes[field] = value;
      const next = { ...prev };
      if (Object.keys(changes).length) next[p.CodPro] = { original, changes };
      else delete next[p.CodPro];
      return next;
    });
  };

  const discardDraft = (codpro: string) => setDrafts(prev => {
    const next = { ...prev };
    delete next[codpro];
    return next;
  });

  const openConfirmation = (p: Producto) => {
    if (!drafts[p.CodPro]) return;
    setSaveError('');
    setConfirmation({ product: p, draft: drafts[p.CodPro] });
  };

  const confirmSave = async () => {
    if (!confirmation || saveInProgress.current) return;
    const { product, draft } = confirmation;
    saveInProgress.current = true;
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch(`/api/productos/${encodeURIComponent(product.CodPro)}/codigos`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ cambios: draft.changes }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || 'No se pudieron guardar los códigos. Intenta nuevamente.');
      // An older list response must not replace the codes just confirmed.
      listRequestId.current++;
      setProductos(prev => prev.map(p => p.CodPro === product.CodPro ? {
        ...p, CodLab: data.CodLab, CodLab1: data.CodLab1, CodLabo: data.CodLabo,
      } : p));
      discardDraft(product.CodPro);
      setConfirmation(null);
      setSavedFeedback(prev => new Set(prev).add(product.CodPro));
      feedbackTimers.current.push(setTimeout(() => {
        setSavedFeedback(prev => { const next = new Set(prev); next.delete(product.CodPro); return next; });
      }, 2500));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'No se pudieron guardar los códigos. Intenta nuevamente.');
    } finally {
      saveInProgress.current = false;
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: ProductCodeField) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const inputs = Array.from<HTMLInputElement>(viewRef.current?.querySelectorAll<HTMLInputElement>(`input[data-code-field="${field}"]:not(:disabled)`) ?? []);
    const idx = inputs.indexOf(e.currentTarget);
    if (idx >= 0 && idx < inputs.length - 1) inputs[idx + 1].focus();
  };

  const totalPages = Math.ceil(productos.length / itemsPerPage) || 1;
  const paginatedProductos = productos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportExcel = () => exportToExcel(productos.map(p => {
    const { CodLab, CodLab1, CodLabo, ...rest } = p;
    return { ...rest, 'Cod. anterior': CodLab ?? '', 'Cod. SUNAT': CodLab1 ?? '', 'Cod. laboratorio': CodLabo ?? '' };
  }), 'ToolKit_Productos_CodLab', 'Editar CodLaboratorio');

  const exportPdf = () => {
    const head = ['Código', 'Nombre', 'Línea', 'Stock', 'Costo', 'P. Venta', 'Laboratorio', 'Cod. anterior', 'Cod. SUNAT', 'Cod. laboratorio'];
    const rows = productos.map(p => [
      p.CodPro, p.Nombre, p.linea_descripcion || '-',
      p.Stock, p.Costo, p.PventaMa, p.lab_descripcion || '-', p.CodLab || '-', p.CodLab1 || '-', p.CodLabo || '-'
    ]);
    exportToPdf('Editar Código de Laboratorio', head, rows, 'ToolKit_Productos_CodLab', { orientation: 'landscape', fontSize: 7 });
  };

  return (
    <div ref={viewRef} className="max-w-[1440px] mx-auto flex flex-col gap-6 animate-fade-in pb-12 select-none">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-surface-variant pb-5">
        <div>
          <h2 className="font-headline text-2xl font-bold text-on-surface flex items-center gap-2.5">
            <Package className="text-primary" size={26} />
            <span>Editar Código de Laboratorio</span>
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Edita los códigos y pulsa Guardar en el producto para revisar y confirmar los cambios. Enter avanza en la misma columna; Tab cambia de campo sin guardar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button onClick={exportExcel} className="bg-secondary-container text-on-secondary-container px-3 py-2 rounded-lg text-xs font-bold hover:opacity-90 flex items-center gap-1.5 shadow-sm">
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button onClick={exportPdf} className="bg-tertiary-container text-on-tertiary-container px-3 py-2 rounded-lg text-xs font-bold hover:opacity-90 flex items-center gap-1.5 shadow-sm">
            <FileText size={16} /> PDF
          </button>
        </div>
      </div>

      <div className="bg-surface-container-lowest p-4 rounded-xl border border-surface-variant shadow-sm flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre de producto..."
            className="w-full bg-surface border border-outline-variant rounded-lg pl-10 pr-4 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Filter size={16} className="text-outline" />
          <select
            aria-label="Filtrar por línea"
            value={selectedLinea}
            onChange={(e) => setSelectedLinea(e.target.value)}
            className="bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none min-w-[160px]"
          >
            <option value="">Todas las líneas</option>
            {lineas.map(l => (
              <option key={l.CodLinea} value={l.CodLinea}>{l.Descripcion}</option>
            ))}
          </select>

          <select
            aria-label="Filtrar por laboratorio"
            value={selectedLab}
            onChange={(e) => setSelectedLab(e.target.value)}
            className="bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none min-w-[160px]"
          >
            <option value="">Todos los laboratorios</option>
            {laboratorios.map(l => (
              <option key={l.CodLab} value={l.CodLab}>{l.Descripcion}</option>
            ))}
          </select>
        </div>

        <div className="text-xs font-bold text-outline ml-auto">
          Total: <span className="text-primary">{productos.length}</span> productos
        </div>
      </div>

      {loadError && <p role="alert" className="text-xs text-error">{loadError}</p>}
      {Object.keys(drafts).length > 0 && (
        <p role="status" className="text-xs text-on-surface-variant">
          {Object.keys(drafts).length} producto(s) con cambios pendientes. Las exportaciones incluyen únicamente valores confirmados.
        </p>
      )}

      <div className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container text-on-surface-variant text-xs font-bold uppercase tracking-wider border-b border-surface-variant">
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Nombre</th>
                <th className="py-3 px-4">Línea</th>
                <th className="py-3 px-4 text-right">Stock</th>
                <th className="py-3 px-4 text-right">Costo</th>
                <th className="py-3 px-4 text-right">P. Venta</th>
                <th className="py-3 px-4">Laboratorio</th>
                {codeColumns.map(({ field, label }) => <th key={field} className="py-3 px-4 min-w-[165px]">{label}</th>)}
                <th className="py-3 px-4 min-w-[220px]">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-surface-variant">
              {paginatedProductos.map((p, idx) => (
                <tr key={p.CodPro} className={`hover:bg-surface-container-low transition-colors ${idx % 2 !== 0 ? 'bg-[#F1F3F5]' : 'bg-surface-container-lowest'}`}>
                  <td className="py-3 px-4 font-mono text-xs font-bold text-primary">{p.CodPro}</td>
                  <td className="py-3 px-4 font-semibold text-on-surface min-w-[200px] max-w-[280px] truncate" title={p.Nombre}>{p.Nombre}</td>
                  <td className="py-3 px-4 text-xs text-on-surface-variant">{p.linea_descripcion || '-'}</td>
                  <td className="py-3 px-4 text-right font-mono text-xs">{p.Stock}</td>
                  <td className="py-3 px-4 text-right font-mono text-xs">{p.Costo?.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right font-mono text-xs font-bold text-primary">{p.PventaMa?.toFixed(2)}</td>
                  <td className="py-3 px-4 text-xs text-on-surface-variant">{p.lab_descripcion || '-'}</td>
                  {codeColumns.map(({ field, label }) => {
                    const draft = drafts[p.CodPro];
                    const changed = Boolean(draft && Object.hasOwn(draft.changes, field));
                    const value = changed ? draft.changes[field] : p[field];
                    return (
                      <td key={field} className="py-3 px-4">
                        <input
                          type="text"
                          aria-label={`${label} de ${p.Nombre} (${p.CodPro})`}
                          data-code-field={field}
                          maxLength={50}
                          value={value ?? ''}
                          onChange={e => handleInputChange(p, field, e.target.value)}
                          onKeyDown={e => handleKeyDown(e, field)}
                          disabled={saving && confirmation?.product.CodPro === p.CodPro}
                          placeholder="Sin código"
                          className={`w-full border rounded-lg px-2.5 py-1.5 text-xs text-on-surface placeholder:text-outline/50 focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-50 ${changed ? 'bg-primary/5 border-primary' : 'bg-surface border-outline-variant focus:border-primary'}`}
                        />
                      </td>
                    );
                  })}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openConfirmation(p)}
                        disabled={!drafts[p.CodPro] || saving}
                        aria-label={`Guardar cambios de ${p.Nombre} (${p.CodPro})`}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-bold text-on-primary disabled:opacity-40 hover:bg-surface-tint"
                      ><Save size={13} /> Guardar</button>
                      <button
                        onClick={() => discardDraft(p.CodPro)}
                        disabled={!drafts[p.CodPro] || saving}
                        aria-label={`Descartar cambios de ${p.Nombre} (${p.CodPro})`}
                        className="inline-flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg border border-outline-variant text-outline disabled:opacity-30 hover:bg-surface-container"
                        title="Descartar cambios"
                      ><RotateCcw size={14} /> Descartar</button>
                    </div>
                    {savedFeedback.has(p.CodPro) && (
                      <span role="status" className="mt-1 inline-flex items-center gap-1 text-xs text-primary"><Check size={13} /> Cambios guardados</span>
                    )}
                  </td>
                </tr>
              ))}
              {paginatedProductos.length === 0 && (
                <tr><td colSpan={11} className="py-8 text-center text-outline text-xs">No se encontraron productos con los filtros seleccionados.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-surface-variant bg-surface flex justify-between items-center text-xs text-outline">
          <span>Página {currentPage} de {totalPages}</span>
          <div className="flex gap-2">
            <button aria-label="Página anterior" disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)} className="p-1.5 rounded border border-outline-variant disabled:opacity-30 hover:bg-surface-container">
              <ChevronLeft size={16} />
            </button>
            <button aria-label="Página siguiente" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(c => c + 1)} className="p-1.5 rounded border border-outline-variant disabled:opacity-30 hover:bg-surface-container">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
      <dialog
        ref={dialogRef}
        aria-labelledby="product-codes-confirmation-title"
        onCancel={e => {
          e.preventDefault();
          if (!saveInProgress.current) setConfirmation(null);
        }}
        className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl border border-surface-variant bg-surface-container-lowest p-5 text-on-surface shadow-xl backdrop:bg-on-surface/40 backdrop:backdrop-blur-xs sm:p-6"
      >
        {confirmation && <>
          <div className="flex items-start justify-between gap-4 border-b border-surface-variant pb-4">
            <div>
              <h3 id="product-codes-confirmation-title" className="font-headline text-lg font-bold">Confirmar cambios</h3>
              <p className="mt-1 text-sm font-semibold">{confirmation.product.Nombre}</p>
              <p className="text-xs text-outline">Código: {confirmation.product.CodPro}</p>
            </div>
            <button aria-label="Cerrar confirmación" disabled={saving} onClick={() => setConfirmation(null)} className="rounded p-1 text-outline hover:text-on-surface disabled:opacity-40"><X size={20} /></button>
          </div>
          <p className="my-4 text-xs text-on-surface-variant">Revisa los códigos modificados antes de guardar este producto.</p>
          <div className="overflow-x-auto rounded-lg border border-surface-variant">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container text-on-surface-variant"><tr>
                <th className="p-3">Campo</th><th className="p-3">Valor anterior</th><th className="p-3">Valor nuevo</th>
              </tr></thead>
              <tbody className="divide-y divide-surface-variant">
                {codeColumns.filter(({ field }) => Object.hasOwn(confirmation.draft.changes, field)).map(({ field, label }) => (
                  <tr key={field}>
                    <th className="p-3 font-semibold">{label}</th>
                    <td className="p-3 text-outline whitespace-pre-wrap break-all">{confirmation.draft.original[field] || 'Sin código'}</td>
                    <td className="p-3 text-primary font-semibold whitespace-pre-wrap break-all">{confirmation.draft.changes[field] || 'Sin código'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {saveError && <p role="alert" className="mt-4 rounded-lg bg-error-container p-3 text-xs text-error">{saveError}</p>}
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <button disabled={saving} onClick={() => setConfirmation(null)} className="rounded-lg border border-outline-variant px-4 py-2 text-xs font-bold hover:bg-surface disabled:opacity-40">Seguir editando</button>
            <button disabled={saving} onClick={confirmSave} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary hover:bg-surface-tint disabled:opacity-50">
              {saving ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-on-primary border-t-transparent" /> : <Save size={14} />}
              {saving ? 'Guardando…' : 'Confirmar cambios'}
            </button>
          </div>
        </>}
      </dialog>
    </div>
  );
};
