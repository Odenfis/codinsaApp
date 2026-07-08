import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ClienteSimple, UbigeoSunat, ProcesoMasivoEvento } from '../../types';
import { Search, MapPin, Save, X, ChevronLeft, ChevronRight, Building2, Zap, CheckCircle2, XCircle, SkipForward } from 'lucide-react';

export const GestionUbigeoView: React.FC = () => {
  const [clientes, setClientes] = useState<ClienteSimple[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClienteSimple | null>(null);

  const [departamentos, setDepartamentos] = useState<UbigeoSunat[]>([]);
  const [provincias, setProvincias] = useState<UbigeoSunat[]>([]);
  const [distritos, setDistritos] = useState<UbigeoSunat[]>([]);

  const [selectedDpto, setSelectedDpto] = useState('');
  const [selectedProv, setSelectedProv] = useState('');
  const [selectedDist, setSelectedDist] = useState('');
  const [ubigeoCode, setUbigeoCode] = useState('');

  const [saving, setSaving] = useState(false);
  const [loadingUbigeo, setLoadingUbigeo] = useState(false);

  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressData, setProgressData] = useState<ProcesoMasivoEvento | null>(null);
  const [processComplete, setProcessComplete] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const token = localStorage.getItem('toolkit_jwt');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const loadClientes = useCallback(async () => {
    try {
      const res = await fetch(`/api/ubigeo/clientes?search=${encodeURIComponent(searchTerm)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setClientes(data.data || []);
      }
    } catch (err) {
      console.error('Error cargando clientes:', err);
    }
  }, [searchTerm]);

  useEffect(() => {
    loadClientes();
    setCurrentPage(1);
  }, [searchTerm, loadClientes]);

  useEffect(() => {
    if (!isModalOpen) return;
    fetch(`/api/ubigeo/departamentos`, { headers })
      .then(r => r.json())
      .then(data => setDepartamentos(data.data || []))
      .catch(console.error);
  }, [isModalOpen]);

  const handleSelectCliente = async (cliente: ClienteSimple) => {
    setSelectedClient(cliente);
    setSelectedDpto('');
    setSelectedProv('');
    setSelectedDist('');
    setUbigeoCode('');
    setProvincias([]);
    setDistritos([]);
    setLoadingUbigeo(true);
    setIsModalOpen(true);

    try {
      const res = await fetch(`/api/ubigeo/cliente/${cliente.Codclie}`, { headers });
      if (res.ok) {
        const data = await res.json();
        const ub = data.data;
        if (ub && ub.UBIGEO) {
          setSelectedDpto(String(ub.dpto).padStart(2, '0'));
          setSelectedProv(String(ub.provincia).padStart(2, '0'));
          setSelectedDist(String(ub.distrito).padStart(2, '0'));
          setUbigeoCode(ub.UBIGEO || '');

          if (ub.dpto) {
            const provRes = await fetch(`/api/ubigeo/provincias/${String(ub.dpto).padStart(2, '0')}`, { headers });
            if (provRes.ok) {
              const provData = await provRes.json();
              setProvincias(provData.data || []);
            }
          }
          if (ub.dpto && ub.provincia) {
            const distRes = await fetch(`/api/ubigeo/distritos/${String(ub.dpto).padStart(2, '0')}/${String(ub.provincia).padStart(2, '0')}`, { headers });
            if (distRes.ok) {
              const distData = await distRes.json();
              setDistritos(distData.data || []);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error cargando ubigeo:', err);
    } finally {
      setLoadingUbigeo(false);
    }
  };

  const handleDptoChange = async (codDpto: string) => {
    setSelectedDpto(codDpto);
    setSelectedProv('');
    setSelectedDist('');
    setUbigeoCode('');
    setDistritos([]);

    if (!codDpto) {
      setProvincias([]);
      return;
    }

    try {
      const res = await fetch(`/api/ubigeo/provincias/${codDpto}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setProvincias(data.data || []);
      }
    } catch (err) {
      console.error('Error cargando provincias:', err);
    }
  };

  const handleProvChange = async (codProv: string) => {
    setSelectedProv(codProv);
    setSelectedDist('');
    setUbigeoCode('');

    if (!codProv || !selectedDpto) {
      setDistritos([]);
      return;
    }

    try {
      const res = await fetch(`/api/ubigeo/distritos/${selectedDpto}/${codProv}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setDistritos(data.data || []);
      }
    } catch (err) {
      console.error('Error cargando distritos:', err);
    }
  };

  const handleDistChange = (codDist: string) => {
    setSelectedDist(codDist);
    const found = distritos.find(d => d.cod_dist === codDist);
    setUbigeoCode(found?.ubigeo_6d || '');
  };

  const handleSave = async () => {
    if (!selectedClient || !ubigeoCode) return;
    setSaving(true);
    try {
      await fetch(`/api/ubigeo/cliente/${selectedClient.Codclie}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ruc_dni: selectedClient.Documento,
          dpto: selectedDpto,
          provincia: selectedProv,
          distrito: selectedDist,
          ubigeo: ubigeoCode
        })
      });
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error guardando ubigeo:', err);
    } finally {
      setSaving(false);
    }
  };

  const startMassAssignment = () => {
    if (eventSourceRef.current) eventSourceRef.current.close();
    setProgressData({ processed: 0, failed: 0, skipped: 0, total: 0, currentCliente: 'Iniciando...' } as ProcesoMasivoEvento);
    setProcessComplete(false);
    setShowProgressModal(true);

    const es = new EventSource('/api/ubigeo/asignar-masivo');
    eventSourceRef.current = es;

    es.addEventListener('progress', (e: MessageEvent) => {
      try { setProgressData(JSON.parse(e.data)); } catch {}
    });

    es.addEventListener('complete', (e: MessageEvent) => {
      try { setProgressData(JSON.parse(e.data)); } catch {}
      setProcessComplete(true);
      es.close();
      eventSourceRef.current = null;
      loadClientes();
    });

    es.addEventListener('error', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setProgressData((prev) => prev ? { ...prev, error: data.error } : { processed: 0, failed: 0, skipped: 0, total: 0, error: data.error } as ProcesoMasivoEvento);
      } catch {}
      setProcessComplete(true);
      es.close();
      eventSourceRef.current = null;
    });
  };

  const closeProgressModal = () => {
    if (eventSourceRef.current) { eventSourceRef.current.close(); eventSourceRef.current = null; }
    setShowProgressModal(false);
  };

  const progressPercent = progressData && progressData.total > 0
    ? Math.round(((progressData.processed + progressData.failed + progressData.skipped) / progressData.total) * 100)
    : 0;

  const totalPages = Math.ceil(clientes.length / itemsPerPage) || 1;
  const paginatedClientes = clientes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getNombreDpto = () => departamentos.find(d => d.cod_dpto === selectedDpto)?.nom_dpto || '';
  const getNombreProv = () => provincias.find(p => p.cod_prov === selectedProv)?.nom_prov || '';
  const getNombreDist = () => distritos.find(d => d.cod_dist === selectedDist)?.nom_dist || '';

  return (
    <div className="max-w-[1440px] mx-auto flex flex-col gap-6 animate-fade-in pb-12 select-none">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-surface-variant pb-5">
        <div>
          <h2 className="font-headline text-2xl font-bold text-on-surface flex items-center gap-2.5">
            <MapPin className="text-primary" size={26} />
            <span>Gestión de Ubigeos</span>
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">Asignación de Departamento, Provincia y Distrito a clientes</p>
        </div>
      </div>

      <div className="bg-surface-container-lowest p-4 rounded-xl border border-surface-variant shadow-sm flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-lg min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar cliente por razón social o documento..."
            className="w-full bg-surface border border-outline-variant rounded-lg pl-10 pr-4 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={startMassAssignment}
            disabled={processComplete && !showProgressModal}
            className="px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold hover:bg-surface-tint transition-colors flex items-center gap-1.5"
          >
            <Zap size={14} />
            Asignar Ubigeos Automáticos
          </button>
          <div className="text-xs font-bold text-outline">
            Total: <span className="text-primary">{clientes.length}</span> clientes
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container text-on-surface-variant text-xs font-bold uppercase tracking-wider border-b border-surface-variant">
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Razón Social</th>
                <th className="py-3 px-4">Documento</th>
                <th className="py-3 px-4 text-center">Ubigeo</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-surface-variant">
              {paginatedClientes.map((cliente, idx) => (
                <tr key={cliente.Codclie} className={`hover:bg-surface-container-low transition-colors cursor-pointer ${idx % 2 !== 0 ? 'bg-[#F1F3F5]' : 'bg-surface-container-lowest'}`}
                    onClick={() => handleSelectCliente(cliente)}>
                  <td className="py-3 px-4 font-mono text-xs font-bold text-primary">{cliente.Codclie}</td>
                  <td className="py-3 px-4 font-semibold text-on-surface">{cliente.Razon}</td>
                  <td className="py-3 px-4 text-xs text-outline font-mono">{cliente.Documento}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary-container text-on-primary-container">
                      <MapPin size={12} /> Asignar
                    </span>
                  </td>
                </tr>
              ))}
              {paginatedClientes.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-outline text-xs">No se encontraron clientes.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-surface-variant bg-surface flex justify-between items-center text-xs text-outline">
          <span>Página {currentPage} de {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)} className="p-1.5 rounded border border-outline-variant disabled:opacity-30 hover:bg-surface-container">
              <ChevronLeft size={16} />
            </button>
            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(c => c + 1)} className="p-1.5 rounded border border-outline-variant disabled:opacity-30 hover:bg-surface-container">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {showProgressModal && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-lg max-w-lg w-full p-6 animate-fade-in">
            <div className="flex items-start justify-between mb-4 pb-2 border-b border-surface-variant">
              <div>
                <h3 className="font-headline text-lg font-bold text-on-surface">Asignación Masiva de Ubigeos</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {progressData?.error ? 'Error en el proceso' :
                   processComplete ? 'Proceso finalizado' :
                   'Consultando API RUC de SUNAT...'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {!progressData?.error && (
                <div>
                  <div className="flex justify-between text-xs text-on-surface-variant mb-1.5">
                    <span>Progreso</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-surface-variant rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${processComplete ? 'bg-green-500' : 'bg-primary'}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {progressData?.error && (
                <div className="bg-error-container text-error p-3 rounded-lg text-xs flex items-start gap-2">
                  <XCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{progressData.error}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-surface-container rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-green-600 font-bold text-lg">
                    <CheckCircle2 size={16} />
                    {progressData?.processed ?? 0}
                  </div>
                  <div className="text-[10px] text-on-surface-variant mt-0.5">Procesados</div>
                </div>
                <div className="bg-surface-container rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-red-500 font-bold text-lg">
                    <XCircle size={16} />
                    {progressData?.failed ?? 0}
                  </div>
                  <div className="text-[10px] text-on-surface-variant mt-0.5">Fallidos</div>
                </div>
                <div className="bg-surface-container rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-outline font-bold text-lg">
                    <SkipForward size={16} />
                    {progressData?.skipped ?? 0}
                  </div>
                  <div className="text-[10px] text-on-surface-variant mt-0.5">Saltados</div>
                </div>
              </div>

              {progressData?.currentCliente && !processComplete && (
                <div className="bg-surface-container rounded-lg p-3">
                  <div className="text-xs text-on-surface-variant">Procesando:</div>
                  <div className="text-sm font-bold text-on-surface truncate">{progressData.currentCliente}</div>
                  {progressData.currentRuc && (
                    <div className="text-xs text-outline font-mono">{progressData.currentRuc}</div>
                  )}
                </div>
              )}

              {!progressData?.error && !processComplete && (
                <div className="flex items-center justify-center gap-2 text-xs text-outline">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Procesando...
                </div>
              )}

              {processComplete && progressData?.detalles && progressData.detalles.length > 0 && (
                <div>
                  <button
                    onClick={() => {
                      const text = progressData.detalles!.map(d =>
                        `[${d.estado.toUpperCase()}] ${d.cliente} (${d.ruc})${d.mensaje ? ': ' + d.mensaje : ''}`
                      ).join('\n');
                      navigator.clipboard.writeText(text);
                    }}
                    className="text-xs text-primary hover:underline mb-2 inline-block"
                  >
                    Copiar detalle al portapapeles
                  </button>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-surface-variant">
                {processComplete && (
                  <button
                    onClick={() => {
                      closeProgressModal();
                      setShowProgressModal(false);
                    }}
                    className="px-5 py-2 bg-primary text-on-primary rounded text-xs font-bold hover:bg-surface-tint transition-colors"
                  >
                    Cerrar
                  </button>
                )}
                {!processComplete && !progressData?.error && (
                  <button
                    onClick={() => {
                      closeProgressModal();
                      setShowProgressModal(false);
                    }}
                    className="px-4 py-2 border border-outline-variant rounded text-xs font-bold hover:bg-surface"
                  >
                    Cancelar
                  </button>
                )}
                {progressData?.error && (
                  <button
                    onClick={() => {
                      closeProgressModal();
                      setShowProgressModal(false);
                    }}
                    className="px-5 py-2 bg-primary text-on-primary rounded text-xs font-bold hover:bg-surface-tint transition-colors"
                  >
                    Cerrar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && selectedClient && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-lg max-w-xl w-full p-6 animate-fade-in">
            <div className="flex items-start justify-between mb-4 pb-2 border-b border-surface-variant">
              <div>
                <h3 className="font-headline text-lg font-bold text-on-surface">Asignar Ubigeo</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  <Building2 size={12} className="inline mr-1" />
                  {selectedClient.Razon} <span className="text-outline">({selectedClient.Documento})</span>
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-outline hover:text-error rounded transition-colors">
                <X size={20} />
              </button>
            </div>

            {loadingUbigeo ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1.5">Departamento</label>
                  <select
                    value={selectedDpto}
                    onChange={(e) => handleDptoChange(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-sm text-on-surface focus:border-primary focus:outline-none"
                  >
                    <option value="">-- Seleccionar Departamento --</option>
                    {departamentos.map(d => (
                      <option key={d.cod_dpto} value={d.cod_dpto}>{d.nom_dpto}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1.5">Provincia</label>
                  <select
                    value={selectedProv}
                    onChange={(e) => handleProvChange(e.target.value)}
                    disabled={!selectedDpto}
                    className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-sm text-on-surface focus:border-primary focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Seleccionar Provincia --</option>
                    {provincias.map(p => (
                      <option key={p.cod_prov} value={p.cod_prov}>{p.nom_prov}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1.5">Distrito</label>
                  <select
                    value={selectedDist}
                    onChange={(e) => handleDistChange(e.target.value)}
                    disabled={!selectedProv}
                    className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-sm text-on-surface focus:border-primary focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Seleccionar Distrito --</option>
                    {distritos.map(d => (
                      <option key={d.cod_dist} value={d.cod_dist}>{d.nom_dist}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-surface-container rounded-lg p-4 flex flex-col gap-2">
                  <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Resumen</div>
                  <div className="flex items-center gap-4 text-sm">
                    {selectedDpto && <span className="bg-primary-container text-on-primary-container px-2 py-0.5 rounded text-xs font-bold">{getNombreDpto()}</span>}
                    {selectedProv && <span className="bg-tertiary-container text-on-tertiary-container px-2 py-0.5 rounded text-xs font-bold">{getNombreProv()}</span>}
                    {selectedDist && <span className="bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded text-xs font-bold">{getNombreDist()}</span>}
                  </div>
                  {ubigeoCode && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-outline">UBIGEO:</span>
                      <span className="font-mono font-bold text-primary text-base">{ubigeoCode}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-surface-variant">
                  <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-outline-variant rounded text-xs font-bold hover:bg-surface">
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!ubigeoCode || saving}
                    className="px-5 py-2 bg-primary text-on-primary rounded text-xs font-bold hover:bg-surface-tint disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {saving ? (
                      <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Save size={14} />
                    )}
                    Guardar Ubigeo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
