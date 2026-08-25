import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, HardDrive, Shield, Clock, Folder, AlertCircle, CheckCircle, XCircle, RefreshCw, Play, Save } from 'lucide-react';
import { BackupConfig } from '../../types';

export const SettingsView: React.FC = () => {
  const [config, setConfig] = useState<BackupConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/config/backup');
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
      }
    } catch (err) {
      console.error('Error loading config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/config/backup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Configuración guardada correctamente' });
      } else {
        setMessage({ type: 'error', text: 'Error al guardar la configuración' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error de conexión al guardar' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleRunNow = async () => {
    setRunning(true);
    setMessage(null);
    try {
      const res = await fetch('/api/backup/run', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setMessage({ type: 'success', text: data.message || 'Backup ejecutado correctamente' });
        loadConfig();
      } else {
        const errData = await res.json();
        setMessage({ type: 'error', text: errData.error || 'Error al ejecutar backup' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error de conexión al ejecutar backup' });
    } finally {
      setRunning(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const formatLastBackup = (iso: string | null) => {
    if (!iso) return 'Nunca ejecutado';
    const d = new Date(iso);
    return d.toLocaleDateString('es-PE', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto flex flex-col gap-6 animate-fade-in pb-12 select-none">
      <div className="border-b pb-5">
        <h2 className="font-headline text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="text-primary" size={26} /> Configuración del Sistema
        </h2>
        <p className="text-xs text-outline">Gestión de backups automáticos y configuración general</p>
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
              <HardDrive className="text-primary" size={22} />
              <h3 className="font-headline font-bold text-lg">Backups Automáticos</h3>
            </div>

            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between py-3 px-4 bg-surface-container-high rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield size={20} className={config?.enabled ? 'text-green-600' : 'text-outline'} />
                  <div>
                    <p className="text-sm font-semibold">Backups programados</p>
                    <p className="text-xs text-outline">Generar .bak automáticamente todos los días</p>
                  </div>
                </div>
                <button
                  onClick={() => setConfig(prev => prev ? { ...prev, enabled: !prev.enabled } : prev)}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                    config?.enabled ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                    config?.enabled ? 'translate-x-6' : ''
                  }`} />
                </button>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold mb-1.5">
                  <Folder size={16} className="text-outline" /> Ruta de destino
                </label>
                <input
                  type="text"
                  value={config?.destinationPath || ''}
                  onChange={e => setConfig(prev => prev ? { ...prev, destinationPath: e.target.value } : prev)}
                  placeholder="C:\Backups\COINSA\"
                  className="w-full px-4 py-2.5 border rounded-lg text-sm bg-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <p className="text-xs text-outline mt-1">Ruta en el servidor SQL Server donde se guardarán los archivos .bak</p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold mb-1.5">
                  <Clock size={16} className="text-outline" /> Hora programada
                </label>
                <select
                  value={config?.time || '20:00'}
                  onChange={e => setConfig(prev => prev ? { ...prev, time: e.target.value } : prev)}
                  className="w-full px-4 py-2.5 border rounded-lg text-sm bg-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="19:00">7:00 PM</option>
                  <option value="20:00">8:00 PM</option>
                  <option value="21:00">9:00 PM</option>
                  <option value="22:00">10:00 PM</option>
                  <option value="23:00">11:00 PM</option>
                  <option value="00:00">12:00 AM</option>
                  <option value="01:00">1:00 AM</option>
                  <option value="02:00">2:00 AM</option>
                  <option value="03:00">3:00 AM</option>
                </select>
                <p className="text-xs text-outline mt-1">Hora del servidor en que se ejecutará el backup automático</p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all hover:bg-surface-tint active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={16} />
                  {saving ? 'Guardando...' : 'Guardar configuración'}
                </button>

                <button
                  onClick={handleRunNow}
                  disabled={running}
                  className="flex items-center gap-2 px-5 py-2.5 border border-primary text-primary text-sm font-semibold rounded-lg hover:bg-primary-container/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {running ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Play size={16} />
                  )}
                  {running ? 'Ejecutando...' : 'Ejecutar backup ahora'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-surface-container-lowest border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <HardDrive className="text-primary" size={20} />
              <h3 className="font-headline font-bold">Estado del Backup</h3>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between py-2 border-b border-surface-variant">
                <span className="text-xs text-outline">Último backup</span>
                <span className="text-xs font-semibold">{formatLastBackup(config?.lastBackup || null)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-surface-variant">
                <span className="text-xs text-outline">Estado</span>
                <span className={`text-xs font-semibold flex items-center gap-1 ${
                  config?.lastBackupStatus === 'success' ? 'text-green-600' : 
                  config?.lastBackupStatus === 'failed' ? 'text-red-600' : 'text-outline'
                }`}>
                  {config?.lastBackupStatus === 'success' && <><CheckCircle size={14} /> Exitoso</>}
                  {config?.lastBackupStatus === 'failed' && <><XCircle size={14} /> Fallido</>}
                  {!config?.lastBackupStatus && 'Sin información'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-surface-variant">
                <span className="text-xs text-outline">Tamaño</span>
                <span className="text-xs font-semibold">{config?.lastBackupSize || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-outline">Backup automático</span>
                <span className={`text-xs font-semibold ${config?.enabled ? 'text-green-600' : 'text-outline'}`}>
                  {config?.enabled ? 'Activado' : 'Desactivado'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="text-outline" size={20} />
              <h3 className="font-headline font-bold">Información</h3>
            </div>
            <div className="text-xs text-on-surface-variant leading-relaxed space-y-2">
              <p>• Los backups se generan en formato <strong>.bak</strong> de SQL Server.</p>
              <p>• Se conservan los últimos <strong>30 días</strong> automáticamente.</p>
              <p>• La ruta de destino debe existir en el servidor SQL Server.</p>
              <p>• El backup incluye toda la base de datos <strong>COINSA</strong>.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
