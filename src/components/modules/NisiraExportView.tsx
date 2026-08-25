import React, { useState } from 'react';
import { FileDown, Database, CheckCircle, XCircle, AlertTriangle, Download, Loader2, Zap } from 'lucide-react';

export const NisiraExportView: React.FC = () => {
  const today = new Date();
  const [dia, setDia] = useState(String(today.getDate()));
  const [mes, setMes] = useState(String(today.getMonth() + 1));
  const [anio, setAnio] = useState(String(today.getFullYear()));
  const [generating, setGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [countLoading, setCountLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [recordCount, setRecordCount] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleGenerate = async () => {
    const d = Number(dia);
    const m = Number(mes);
    const a = Number(anio);

    if (!Number.isInteger(d) || d < 1 || d > 31 ||
        !Number.isInteger(m) || m < 1 || m > 12 ||
        !Number.isInteger(a) || a < 2000 || a > 2100) {
      setMessage({ type: 'error', text: 'Ingrese valores válidos: Día (1-31), Mes (1-12) y Año (2000-2100).' });
      return;
    }

    setGenerating(true);
    setMessage(null);
    try {
      const res = await fetch('/api/nisira/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dia: d, mes: m, anio: a })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGeneratedCount(data.count);
        setRecordCount(data.count);
        setShowConfirm(true);
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al ejecutar el stored procedure' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión al ejecutar el stored procedure' });
    } finally {
      setGenerating(false);
    }
  };

  const handleGetCount = async () => {
    setCountLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/nisira/export?count=true');
      if (res.ok) {
        const data = await res.json();
        setRecordCount(data.count);
        setShowConfirm(true);
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Error al obtener el conteo de registros' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión al consultar registros' });
    } finally {
      setCountLoading(false);
    }
  };

  const handleExport = () => {
    setShowConfirm(false);
    setLoading(true);
    setMessage(null);
    try {
      const a = document.createElement('a');
      a.href = '/api/nisira/export';
      a.download = '';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setMessage({ type: 'success', text: `Exportación iniciada. Se exportaron ${recordCount?.toLocaleString()} registros.` });
    } catch {
      setMessage({ type: 'error', text: 'Error al iniciar la descarga' });
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-3 py-2 border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors bg-surface-container-lowest";

  return (
    <div className="max-w-[1440px] mx-auto flex flex-col gap-6 animate-fade-in pb-12 select-none">
      <div className="border-b pb-5">
        <h2 className="font-headline text-2xl font-bold flex items-center gap-2">
          <Database className="text-primary" size={26} /> Nisira Export
        </h2>
        <p className="text-xs text-outline">Generación de tabla Nisira vía SP y exportación a formato DBF (dBase III)</p>
      </div>

      {message && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-surface-container-lowest border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Zap className="text-primary" size={22} />
              <h3 className="font-headline font-bold text-lg">1 · Generar tabla Nisira (Ejecutar SP)</h3>
            </div>

            <div className="flex flex-col gap-5">
              <div className="flex items-start gap-3 py-3 px-4 bg-surface-container-high rounded-lg">
                <AlertTriangle size={20} className="text-outline shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">Paso previo a la exportación</p>
                  <p className="text-xs text-outline mt-1">
                    Ejecuta el stored procedure <strong>[dbo].[sp_Exporta_Nisira]</strong> con día, mes y año.
                    El SP elimina y vuelve a llenar la tabla <strong>[dbo].[tablaNisira]</strong> con facturas, boletas, notas de crédito y guías de la fecha indicada.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="nisira-dia" className="text-xs font-medium text-on-surface-variant">Día</label>
                  <input
                    id="nisira-dia"
                    type="number"
                    min={1}
                    max={31}
                    value={dia}
                    onChange={(e) => setDia(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="nisira-mes" className="text-xs font-medium text-on-surface-variant">Mes</label>
                  <input
                    id="nisira-mes"
                    type="number"
                    min={1}
                    max={12}
                    value={mes}
                    onChange={(e) => setMes(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="nisira-anio" className="text-xs font-medium text-on-surface-variant">Año</label>
                  <input
                    id="nisira-anio"
                    type="number"
                    min={2000}
                    max={2100}
                    value={anio}
                    onChange={(e) => setAnio(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={generating || loading}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-on-primary text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all hover:bg-surface-tint active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Zap size={16} />
                  )}
                  {generating ? 'Ejecutando SP...' : 'Ejecutar SP y generar tabla'}
                </button>
              </div>

              {generatedCount !== null && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 text-green-700 border border-green-200 text-sm font-medium">
                  <CheckCircle size={18} />
                  Tabla generada correctamente: <strong>{generatedCount.toLocaleString()}</strong> registro(s). Continúe con la exportación en el paso 2.
                </div>
              )}
            </div>
          </div>

          <div className="bg-surface-container-lowest border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <FileDown className="text-primary" size={22} />
              <h3 className="font-headline font-bold text-lg">2 · Exportar a DBF</h3>
            </div>

            <div className="flex flex-col gap-5">
              <div className="flex items-start gap-3 py-3 px-4 bg-surface-container-high rounded-lg">
                <AlertTriangle size={20} className="text-outline shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">Exportación completa de la tabla Nisira</p>
                  <p className="text-xs text-outline mt-1">
                    Se exportarán todos los registros de <strong>[dbo].[tablaNisira]</strong> (~80 campos) 
                    a un archivo .dbf compatible con sistemas SUNAT y otros sistemas legacy.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleGetCount}
                  disabled={countLoading || loading || generating}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all hover:bg-surface-tint active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {countLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  {countLoading ? 'Consultando...' : 'Exportar a DBF'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-surface-container-lowest border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Database className="text-primary" size={20} />
              <h3 className="font-headline font-bold">Información</h3>
            </div>
            <div className="text-xs text-on-surface-variant leading-relaxed space-y-2">
              <p>• Proceso: <strong>1. Ejecutar SP</strong> → <strong>2. Exportar</strong></p>
              <p>• SP: <strong>[dbo].[sp_Exporta_Nisira]</strong> (parámetros Día, Mes, Año)</p>
              <p>• Tabla origen: <strong>[dbo].[tablaNisira]</strong></p>
              <p>• Formato de salida: <strong>dBase III (.dbf)</strong></p>
              <p>• Aprox. <strong>80 campos</strong> por registro</p>
              <p>• Compatible con SUNAT y sistemas contables legacy</p>
              <p>• El archivo se genera con fecha en el nombre: NisiraExport_YYYYMMDD_HHMMSS.dbf</p>
            </div>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <Database className="text-primary" size={24} />
              <h3 className="font-headline font-bold text-lg">Confirmar exportación</h3>
            </div>
            <p className="text-sm text-on-surface-variant mb-6">
              Se exportarán <strong className="text-on-surface">{recordCount?.toLocaleString()}</strong> registros 
              de la tabla Nisira a un archivo .dbf. ¿Desea continuar?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleExport}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all hover:bg-surface-tint active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                {loading ? 'Exportando...' : 'Confirmar exportación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};