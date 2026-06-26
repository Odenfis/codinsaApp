/**
 * @license
 * Tool Kit Enterprise Providers Module
 * Proveedores Farmacéuticos & Logísticos (CRUD con MS SQL Server Mock REST)
 */

import React, { useState, useEffect } from 'react';
import { Proveedor } from '../../types';
import { exportToExcel, exportToPdf } from '../../utils/exportUtils';
import { Search, Plus, Edit2, Trash2, FileSpreadsheet, FileText, Network, Star, ChevronLeft, ChevronRight } from 'lucide-react';

export const ProvidersView: React.FC = () => {
  const [providers, setProviders] = useState<Proveedor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProv, setEditingProv] = useState<Proveedor | null>(null);

  const [ruc, setRuc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [rubro, setRubro] = useState('');
  const [contacto, setContacto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [condicionPago, setCondicionPago] = useState('Contado');
  const [calificacion, setCalificacion] = useState('5.0');

  const token = localStorage.getItem('toolkit_jwt');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const loadProviders = async () => {
    try {
      const res = await fetch(`/api/providers?search=${encodeURIComponent(searchTerm)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setProviders(data.data || []);
      }
    } catch (err) {
      console.error('Error REST API proveedores:', err);
    }
  };

  useEffect(() => {
    loadProviders();
    setCurrentPage(1);
  }, [searchTerm]);

  const handleOpenModal = (prov?: Proveedor) => {
    if (prov) {
      setEditingProv(prov);
      setRuc(prov.codigo_ruc);
      setRazonSocial(prov.razon_social);
      setRubro(prov.rubro);
      setContacto(prov.contacto || '');
      setTelefono(prov.telefono || '');
      setEmail(prov.email || '');
      setCondicionPago(prov.condicion_pago);
      setCalificacion(prov.calificacion.toString());
    } else {
      setEditingProv(null);
      setRuc('');
      setRazonSocial('');
      setRubro('Medicamentos y Fármacos');
      setContacto('');
      setTelefono('');
      setEmail('');
      setCondicionPago('Contado');
      setCalificacion('5.0');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruc.trim() || !razonSocial.trim()) return;
    const payload = { codigo_ruc: ruc, razon_social: razonSocial, rubro, contacto, telefono, email, condicion_pago: condicionPago, calificacion: Number(calificacion), estado: true };
    if (editingProv) {
      await fetch(`/api/providers/${editingProv.id_proveedor}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
    } else {
      await fetch('/api/providers', { method: 'POST', headers, body: JSON.stringify(payload) });
    }
    setIsModalOpen(false);
    loadProviders();
  };

  const handleDelete = async (id: number, nombre: string) => {
    if (confirm(`¿Confirma dar de baja al proveedor "${nombre}"?`)) {
      await fetch(`/api/providers/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      loadProviders();
    }
  };

  const totalPages = Math.ceil(providers.length / itemsPerPage) || 1;
  const paginatedProviders = providers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportExcel = () => exportToExcel(providers, 'ToolKit_Proveedores_ERP', 'Red Proveedores');
  const exportPdf = () => {
    const head = ['ID', 'RUC', 'Razón Social', 'Rubro', 'Cond. Pago', 'Calificación'];
    const rows = providers.map(p => [p.id_proveedor, p.codigo_ruc, p.razon_social, p.rubro, p.condicion_pago, `${p.calificacion} / 5.0`]);
    exportToPdf('Directorio Maestro de Proveedores CODINSA', head, rows, 'ToolKit_Proveedores_Reporte');
  };

  return (
    <div className="max-w-[1440px] mx-auto flex flex-col gap-6 animate-fade-in pb-12 select-none">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-surface-variant pb-5">
        <div>
          <h2 className="font-headline text-2xl font-bold text-on-surface flex items-center gap-2.5">
            <Network className="text-secondary" size={26} />
            <span>Red de Proveedores</span>
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">Control de abastecimiento e insumos de droguería</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button onClick={exportExcel} className="bg-secondary-container text-on-secondary-container px-3 py-2 rounded-lg text-xs font-bold hover:opacity-90 flex items-center gap-1.5 shadow-sm">
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button onClick={exportPdf} className="bg-tertiary-container text-on-tertiary-container px-3 py-2 rounded-lg text-xs font-bold hover:opacity-90 flex items-center gap-1.5 shadow-sm">
            <FileText size={16} /> PDF
          </button>
          <button onClick={() => handleOpenModal()} className="bg-primary text-on-primary px-4 py-2 rounded-lg text-xs font-semibold hover:bg-surface-tint flex items-center gap-1.5 shadow">
            <Plus size={16} /> Nuevo Proveedor
          </button>
        </div>
      </div>

      <div className="bg-surface-container-lowest p-4 rounded-xl border border-surface-variant shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Laboratorio, Rubro o RUC..."
            className="w-full bg-surface border border-outline-variant rounded-lg pl-10 pr-4 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
          />
        </div>
        <div className="text-xs font-bold text-outline">
          Total: <span className="text-primary">{providers.length}</span> proveedores
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container text-on-surface-variant text-xs font-bold uppercase tracking-wider border-b border-surface-variant">
                <th className="py-3 px-4">RUC</th>
                <th className="py-3 px-4">Laboratorio / Razón Social</th>
                <th className="py-3 px-4">Rubro</th>
                <th className="py-3 px-4">Contacto comercial</th>
                <th className="py-3 px-4">Condición pago</th>
                <th className="py-3 px-4">Calificación</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-surface-variant">
              {paginatedProviders.map((p, idx) => (
                <tr key={p.id_proveedor} className={`hover:bg-surface-container-low transition-colors ${idx % 2 !== 0 ? 'bg-[#F1F3F5]' : 'bg-surface-container-lowest'}`}>
                  <td className="py-3 px-4 font-mono text-xs font-bold text-primary">{p.codigo_ruc}</td>
                  <td className="py-3 px-4 font-semibold text-on-surface">{p.razon_social}</td>
                  <td className="py-3 px-4 text-xs font-medium text-secondary">{p.rubro}</td>
                  <td className="py-3 px-4 text-xs text-outline">{p.contacto || '-'} ({p.telefono})</td>
                  <td className="py-3 px-4 text-xs font-mono">{p.condicion_pago}</td>
                  <td className="py-3 px-4 flex items-center gap-1 text-xs font-bold text-secondary">
                    <Star size={14} className="fill-secondary text-secondary" />
                    <span>{p.calificacion}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleOpenModal(p)} className="p-1.5 text-outline hover:text-primary rounded"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(p.id_proveedor, p.razon_social)} className="p-1.5 text-outline hover:text-error rounded"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-surface-variant bg-surface flex justify-between items-center text-xs text-outline">
          <span>Página {currentPage} de {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)} className="p-1.5 rounded border border-outline-variant disabled:opacity-30"><ChevronLeft size={16} /></button>
            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(c => c + 1)} className="p-1.5 rounded border border-outline-variant disabled:opacity-30"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-lg max-w-lg w-full p-6 animate-fade-in">
            <h3 className="font-headline text-lg font-bold mb-4 pb-2 border-b border-surface-variant">{editingProv ? 'Editar Proveedor' : 'Registrar Proveedor'}</h3>
            <form onSubmit={handleSave} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold">RUC *</label><input required value={ruc} onChange={e=>setRuc(e.target.value)} maxLength={11} className="w-full border rounded p-2 text-xs font-mono" /></div>
                <div><label className="text-xs font-bold">Calificación</label><input type="number" step="0.1" max="5" min="1" value={calificacion} onChange={e=>setCalificacion(e.target.value)} className="w-full border rounded p-2 text-xs" /></div>
              </div>
              <div><label className="text-xs font-bold">Razón Social *</label><input required value={razonSocial} onChange={e=>setRazonSocial(e.target.value)} className="w-full border rounded p-2 text-xs" /></div>
              <div><label className="text-xs font-bold">Rubro o Línea Biomédica</label><input value={rubro} onChange={e=>setRubro(e.target.value)} className="w-full border rounded p-2 text-xs" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold">Contacto</label><input value={contacto} onChange={e=>setContacto(e.target.value)} className="w-full border rounded p-2 text-xs" /></div>
                <div><label className="text-xs font-bold">Teléfono</label><input value={telefono} onChange={e=>setTelefono(e.target.value)} className="w-full border rounded p-2 text-xs" /></div>
              </div>
              <div><label className="text-xs font-bold">Condición de pago</label><select value={condicionPago} onChange={e=>setCondicionPago(e.target.value)} className="w-full border rounded p-2 text-xs"><option>Contado</option><option>Crédito 30 días</option><option>Crédito 45 días</option><option>Crédito 60 días</option></select></div>
              <div className="flex justify-end gap-2 mt-4 pt-3 border-t"><button type="button" onClick={()=>setIsModalOpen(false)} className="px-3 py-1.5 border rounded text-xs font-bold">Cancelar</button><button type="submit" className="px-4 py-1.5 bg-primary text-on-primary rounded text-xs font-bold">Guardar</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
