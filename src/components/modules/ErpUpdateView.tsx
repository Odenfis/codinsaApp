import React, { useEffect, useState } from 'react';
import {
  CloudDownload,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Save,
  Loader2,
  History,
  Info,
  FileDown,
  Hash
} from 'lucide-react';
import { ErpUpdateConfig } from '../../types';

export const ErpUpdateView: React.FC = () => {
  const [driveUrl, setDriveUrl] = useState('');
  const [sha256, setSha256] = useState('');
  const [zipName, setZipName] = useState('');
  const [nota, setNota] = useState('');

  const [config, setConfig] = useState<ErpUpdateConfig | null>(null);
  const [historial, setHistorial] = useState<ErpUpdateConfig[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/config/erp-update');
        if (res.ok) {
          const data = await res.json();
          setConfig(data.config || null);
          setHistorial(data.historial || []);
        }
      } catch {
        setMessage({ type: 'error', text: 'Error de conexión al obtener la configuración' });
      } finally {
        setLoadingConfig(false);
      }
    })();
  }, []);

  const cargarConfig = async () => {
    try {
      const res = await fetch('/api/config/erp-update');
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config || null);
        setHistorial(data.historial || []);
      }
    } catch {
      /* silencioso: se usa el estado actual */
    }
  };

  const handleSave = async () => {
    if (!driveUrl.trim()) {
      setMessage({ type: 'error', text: 'Ingrese el enlace de Google Drive del ZIP de actualización.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/config/erp-update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driveUrl: driveUrl.trim(), sha256: sha256.trim(), zipName: zipName.trim(), nota: nota.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'Configuración guardada correctamente. El instalador .bat ya está disponible para descarga.' });
        await cargarConfig();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al guardar la configuración' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión al guardar la configuración' });
    } finally {
      setSaving(false);
    }
  };

  const fmtFecha = (iso: string | null | undefined): string => {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const inputCls = "w-full px-3 py-2 border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors bg-surface-container-lowest";
  const tieneConfig = Boolean(config?.driveId);

  return (
    <div className="max-w-[1440px] mx-auto flex flex-col gap-6 animate-fade-in pb-12 select-none">
      <div className="border-b pb-5">
        <h2 className="font-headline text-2xl font-bold flex items-center gap-2">
          <CloudDownload className="text-primary" size={26} /> Actualización ERP
        </h2>
        <p className="text-xs text-outline">Configuración del instalador de actualizaciones del Sistema ERP Nube y descarga del script para clientes</p>
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

          {/* Formulario de configuración */}
          <div className="bg-surface-container-lowest border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Save className="text-primary" size={22} />
              <h3 className="font-headline font-bold text-lg">1 · Configurar actualización</h3>
            </div>

            <div className="flex flex-col gap-5">
              <div className="flex items-start gap-3 py-3 px-4 bg-surface-container-high rounded-lg">
                <AlertTriangle size={20} className="text-outline shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">Enlace compartido del ZIP en Google Drive</p>
                  <p className="text-xs text-outline mt-1">
                    Pegue el enlace de compartición del archivo .zip (ej. <span className="font-mono">https://drive.google.com/file/d/ID/view?usp=sharing</span>).
                    El servidor extrae el ID automáticamente. El SHA256 es opcional: si lo deja vacío, el instalador omite la validación de integridad.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label htmlFor="erp-update-url" className="text-xs font-medium text-on-surface-variant">Enlace de Google Drive *</label>
                  <input
                    id="erp-update-url"
                    type="text"
                    value={driveUrl}
                    onChange={(e) => setDriveUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/XXXXXXXXXXXXXXXXXX/view?usp=sharing"
                    className={`${inputCls} font-mono`}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="erp-update-sha256" className="text-xs font-medium text-on-surface-variant flex items-center gap-1">
                    <Hash size={12} /> SHA256 del ZIP (opcional)
                  </label>
                  <input
                    id="erp-update-sha256"
                    type="text"
                    value={sha256}
                    onChange={(e) => setSha256(e.target.value)}
                    placeholder="ej. aaf342cb0cdb1fa5d0e021a2750bd127..."
                    className={`${inputCls} font-mono`}
                    maxLength={64}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="erp-update-zipname" className="text-xs font-medium text-on-surface-variant">Nombre del ZIP (opcional)</label>
                  <input
                    id="erp-update-zipname"
                    type="text"
                    value={zipName}
                    onChange={(e) => setZipName(e.target.value)}
                    placeholder="actualizacionERP.zip"
                    className={inputCls}
                  />
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label htmlFor="erp-update-nota" className="text-xs font-medium text-on-surface-variant">Nota interna (opcional)</label>
                  <input
                    id="erp-update-nota"
                    type="text"
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    placeholder="ej. Versión 2.5 - corrección de impresión de guías"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-on-primary text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all hover:bg-surface-tint active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? 'Guardando...' : 'Guardar configuración'}
                </button>
              </div>
            </div>
          </div>

          {/* Configuración vigente */}
          <div className="bg-surface-container-lowest border rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <CloudDownload className="text-primary" size={22} />
                <h3 className="font-headline font-bold text-lg">2 · Instalador para clientes</h3>
              </div>
              {loadingConfig ? (
                <Loader2 size={18} className="animate-spin text-outline" />
              ) : tieneConfig ? (
                <a
                  href="/api/updates/actualizar-erp"
                  download="Actualizar_ERP_Nube.bat"
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all hover:bg-surface-tint active:scale-[0.98]"
                >
                  <FileDown size={16} />
                  Descargar Actualizar_ERP_Nube.bat
                </a>
              ) : (
                <button
                  disabled
                  title="Configure primero el enlace de Google Drive"
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary text-sm font-semibold rounded-lg shadow-sm active:scale-[0.98] opacity-50 cursor-not-allowed"
                >
                  <FileDown size={16} />
                  Descargar Actualizar_ERP_Nube.bat
                </button>
              )}
            </div>

            {!loadingConfig && !tieneConfig ? (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-sm font-medium">
                <AlertTriangle size={18} />
                Aún no hay configuración vigente. Guarde un enlace de Google Drive para habilitar la descarga.
              </div>
            ) : config && (
              <div className="rounded-lg border border-outline-variant overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-outline-variant bg-surface-container-high/50">
                      <td className="px-4 py-2.5 text-on-surface-variant font-medium w-48">Última actualización</td>
                      <td className="px-4 py-2.5">{fmtFecha(config.fechaActualizacion)}</td>
                    </tr>
                    <tr className="border-b border-outline-variant">
                      <td className="px-4 py-2.5 text-on-surface-variant font-medium">Configurado por</td>
                      <td className="px-4 py-2.5">{config.actualizadoPor || '—'}</td>
                    </tr>
                    <tr className="border-b border-outline-variant bg-surface-container-high/50">
                      <td className="px-4 py-2.5 text-on-surface-variant font-medium">Drive ID</td>
                      <td className="px-4 py-2.5 font-mono text-xs break-all">{config.driveId}</td>
                    </tr>
                    <tr className="border-b border-outline-variant">
                      <td className="px-4 py-2.5 text-on-surface-variant font-medium">Archivo ZIP</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{config.zipName}</td>
                    </tr>
                    <tr className="border-b border-outline-variant bg-surface-container-high/50">
                      <td className="px-4 py-2.5 text-on-surface-variant font-medium">Validación SHA256</td>
                      <td className="px-4 py-2.5">
                        {config.sha256 ? (
                          <span className="inline-flex items-center gap-1.5 text-green-700 font-medium text-xs">
                            <CheckCircle size={14} /> Activa
                            <span className="font-mono text-outline ml-1 break-all">({config.sha256})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-outline text-xs">
                            <XCircle size={14} /> Omitida (sin hash configurado)
                          </span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-on-surface-variant font-medium align-top">Nota</td>
                      <td className="px-4 py-2.5">{config.nota || '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Historial */}
          <div className="bg-surface-container-lowest border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <History className="text-primary" size={22} />
              <h3 className="font-headline font-bold text-lg">Historial de configuraciones</h3>
            </div>
            {historial.length === 0 ? (
              <p className="text-xs text-outline">Sin registros previos. Cada vez que guarde una nueva configuración, la anterior pasará a este historial (máx. 20).</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-outline-variant">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-container-high text-left">
                      <th className="px-4 py-2.5 font-semibold text-xs uppercase tracking-wide text-on-surface-variant">Fecha</th>
                      <th className="px-4 py-2.5 font-semibold text-xs uppercase tracking-wide text-on-surface-variant">Usuario</th>
                      <th className="px-4 py-2.5 font-semibold text-xs uppercase tracking-wide text-on-surface-variant">Drive ID</th>
                      <th className="px-4 py-2.5 font-semibold text-xs uppercase tracking-wide text-on-surface-variant">ZIP</th>
                      <th className="px-4 py-2.5 font-semibold text-xs uppercase tracking-wide text-on-surface-variant">SHA256</th>
                      <th className="px-4 py-2.5 font-semibold text-xs uppercase tracking-wide text-on-surface-variant">Nota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((h, i) => (
                      <tr key={`${h.fechaActualizacion}-${i}`} className={i % 2 === 0 ? '' : 'bg-surface-container-high/40'}>
                        <td className="px-4 py-2.5 whitespace-nowrap">{fmtFecha(h.fechaActualizacion)}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap">{h.actualizadoPor || '—'}</td>
                        <td className="px-4 py-2.5 font-mono text-xs max-w-[180px] truncate" title={h.driveId}>{h.driveId}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{h.zipName}</td>
                        <td className="px-4 py-2.5">
                          {h.sha256 ? <CheckCircle size={15} className="text-green-600" /> : <XCircle size={15} className="text-outline" />}
                        </td>
                        <td className="px-4 py-2.5 max-w-[220px] truncate" title={h.nota || ''}>{h.nota || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Columna lateral: instrucciones e información */}
        <div className="flex flex-col gap-6">
          <div className="bg-surface-container-lowest border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Info className="text-primary" size={20} />
              <h3 className="font-headline font-bold">Instrucciones para el cliente</h3>
            </div>
            <div className="text-xs text-on-surface-variant leading-relaxed space-y-2">
              <p>1. Descargue <strong>Actualizar_ERP_Nube.bat</strong> desde esta pantalla.</p>
              <p>2. Envíelo al cliente (correo, WhatsApp, etc.).</p>
              <p>3. El cliente hace <strong>doble clic</strong>: el script se auto-eleva como administrador.</p>
              <p>4. El script descarga el ZIP desde Google Drive, valida su integridad (si hay SHA256), cierra los procesos abiertos del ERP, copia los <strong>COD_*.exe</strong> al Escritorio, instala las <strong>Cod*.dll</strong> en <strong>SysWOW64</strong>, las registra con regsvr32 y limpia los temporales.</p>
              <p><strong>Requisitos:</strong> Windows 10 (versión 1803 o superior) / Windows 11, 64 bits y conexión a internet.</p>
              <p>El log detallado queda en <span className="font-mono">%TEMP%\codinsa_instalador.log</span>.</p>
            </div>
          </div>

          <div className="bg-surface-container-lowest border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <CloudDownload className="text-primary" size={20} />
              <h3 className="font-headline font-bold">Información técnica</h3>
            </div>
            <div className="text-xs text-on-surface-variant leading-relaxed space-y-2">
              <p>• Plantilla: <strong>updates/Actualizar_ERP_Nube.bat</strong></p>
              <p>• Los valores <span className="font-mono">@@DRIVE_ID@@</span>, <span className="font-mono">@@ZIP_NAME@@</span> y <span className="font-mono">@@ZIP_SHA256@@</span> se reemplazan al momento de cada descarga.</p>
              <p>• Config persistida en <strong>config/erp-update-config.json</strong></p>
              <p>• Endpoints: <span className="font-mono">GET/PUT /api/config/erp-update</span> · <span className="font-mono">GET /api/updates/actualizar-erp</span></p>
              <p>• Si cambia el ZIP, regenere el hash con <span className="font-mono">certutil -hashfile archivo.zip SHA256</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
