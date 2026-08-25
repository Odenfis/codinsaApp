/**
 * @license
 * Tool Kit Enterprise Clients Module
 * Listado, Búsqueda, Paginación, Crear, Editar, Eliminar, Exportar Excel/PDF
 */

import React, { useState, useEffect } from 'react';
import { Cliente } from '../../types';
import { exportToExcel, exportToPdf } from '../../utils/exportUtils';
import { Search, Plus, Edit2, Trash2, FileSpreadsheet, FileText, ChevronLeft, ChevronRight, Building2, CheckCircle, XCircle } from 'lucide-react';

export const ClientsView: React.FC = () => {
  const [clients, setClients] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);

  // Form state
  const [ruc, setRuc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [contacto, setContacto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [categoria, setCategoria] = useState<'VIP' | 'Mayorista' | 'Estándar'>('Estándar');

  const token = localStorage.getItem('toolkit_jwt');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const loadClients = async () => {
    try {
      const res = await fetch(`/api/clients?search=${encodeURIComponent(searchTerm)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setClients(data.data || []);
      }
    } catch (err) {
      console.error('Error REST API clientes:', err);
    }
  };

  useEffect(() => {
    loadClients();
    setCurrentPage(1);
  }, [searchTerm]);

  const handleOpenModal = (client?: Cliente) => {
    if (client) {
      setEditingClient(client);
      setRuc(client.codigo_ruc);
      setRazonSocial(client.razon_social);
      setContacto(client.contacto || '');
      setTelefono(client.telefono || '');
      setEmail(client.email || '');
      setDireccion(client.direccion || '');
      setCategoria(client.categoria);
    } else {
      setEditingClient(null);
      setRuc('');
      setRazonSocial('');
      setContacto('');
      setTelefono('');
      setEmail('');
      setDireccion('');
      setCategoria('Estándar');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruc.trim() || !razonSocial.trim()) {
      alert('RUC y Razón Social son obligatorios.');
      return;
    }
    const payload = { codigo_ruc: ruc, razon_social: razonSocial, contacto, telefono, email, direccion, categoria, estado: true };
    try {
      if (editingClient) {
        await fetch(`/api/clients/${editingClient.id_cliente}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
      } else {
        await fetch('/api/clients', { method: 'POST', headers, body: JSON.stringify(payload) });
      }
      setIsModalOpen(false);
      loadClients();
    } catch (err) {
      alert('Error guardando cliente.');
    }
  };

  const handleDelete = async (id: number, nombre: string) => {
    if (confirm(`¿Confirma eliminar el cliente "${nombre}"?`)) {
      await fetch(`/api/clients/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      loadClients();
    }
  };

  // Pagination
  const totalPages = Math.ceil(clients.length / itemsPerPage) || 1;
  const paginatedClients = clients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportExcel = () => exportToExcel(clients, 'ToolKit_Clientes_ERP', 'Cartera Clientes');
  const exportPdf = () => {
    const head = ['ID', 'RUC', 'Razón Social', 'Contacto', 'Categoría', 'Estado'];
    const rows = clients.map(c => [c.id_cliente, c.codigo_ruc, c.razon_social, c.contacto || '-', c.categoria, c.estado ? 'Activo' : 'Inactivo']);
    exportToPdf('Reporte Maestro de Clientes - SQL Server', head, rows, 'ToolKit_Maestro_Clientes');
  };

  return (
    <div className="max-w-[1440px] mx-auto flex flex-col gap-6 animate-fade-in pb-12 select-none">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-surface-variant pb-5">
        <div>
          <h2 className="font-headline text-2xl font-bold text-on-surface flex items-center gap-2.5">
            <Building2 className="text-primary" size={26} />
            <span>Gestión de Clientes</span>
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">Administración comercial en base de datos corporativa</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button onClick={exportExcel} className="bg-secondary-container text-on-secondary-container px-3 py-2 rounded-lg text-xs font-bold hover:opacity-90 flex items-center gap-1.5 shadow-sm">
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button onClick={exportPdf} className="bg-tertiary-container text-on-tertiary-container px-3 py-2 rounded-lg text-xs font-bold hover:opacity-90 flex items-center gap-1.5 shadow-sm">
            <FileText size={16} /> PDF
          </button>
          <button onClick={() => handleOpenModal()} className="bg-primary text-on-primary px-4 py-2 rounded-lg text-xs font-semibold hover:bg-surface-tint flex items-center gap-1.5 shadow">
            <Plus size={16} /> Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-surface-container-lowest p-4 rounded-xl border border-surface-variant shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Razón Social, RUC o Nombre de Contacto..."
            className="w-full bg-surface border border-outline-variant rounded-lg pl-10 pr-4 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
          />
        </div>
        <div className="text-xs font-bold text-outline">
          Total: <span className="text-primary">{clients.length}</span> registros
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container text-on-surface-variant text-xs font-bold uppercase tracking-wider border-b border-surface-variant">
                <th className="py-3 px-4">RUC</th>
                <th className="py-3 px-4">Razón Social</th>
                <th className="py-3 px-4">Contacto</th>
                <th className="py-3 px-4">Teléfono / Email</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-surface-variant">
              {paginatedClients.map((client, idx) => (
                <tr key={client.id_cliente} className={`hover:bg-surface-container-low transition-colors ${idx % 2 !== 0 ? 'bg-[#F1F3F5]' : 'bg-surface-container-lowest'}`}>
                  <td className="py-3 px-4 font-mono text-xs font-bold text-primary">{client.codigo_ruc}</td>
                  <td className="py-3 px-4 font-semibold text-on-surface">{client.razon_social}</td>
                  <td className="py-3 px-4 text-on-surface-variant text-xs">{client.contacto || '-'}</td>
                  <td className="py-3 px-4 text-xs text-outline">
                    <div>{client.telefono || '-'}</div>
                    <div className="text-[11px] text-primary truncate max-w-[180px]">{client.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      client.categoria === 'VIP' ? 'bg-primary-fixed text-on-primary-fixed' :
                      client.categoria === 'Mayorista' ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 'bg-surface-variant text-on-surface-variant'
                    }`}>
                      {client.categoria}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center flex items-center justify-center gap-2">
                    <button onClick={() => handleOpenModal(client)} className="p-1.5 text-outline hover:text-primary hover:bg-surface-container rounded transition-colors" title="Editar">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(client.id_cliente, client.razon_social)} className="p-1.5 text-outline hover:text-error hover:bg-error-container rounded transition-colors" title="Eliminar">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedClients.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-outline text-xs">No se encontraron clientes coincidentes.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
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

      {/* Modal CRUD */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-lg max-w-lg w-full p-6 animate-fade-in">
            <h3 className="font-headline text-lg font-bold text-on-surface mb-4 pb-2 border-b border-surface-variant">
              {editingClient ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
            </h3>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1">RUC *</label>
                  <input required type="text" maxLength={11} value={ruc} onChange={e => setRuc(e.target.value)} className="w-full bg-surface border border-outline-variant rounded p-2 text-xs font-mono" placeholder="20512345678" />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1">Categoría</label>
                  <select value={categoria} onChange={e => setCategoria(e.target.value as any)} className="w-full bg-surface border border-outline-variant rounded p-2 text-xs">
                    <option value="Estándar">Estándar</option>
                    <option value="Mayorista">Mayorista</option>
                    <option value="VIP">VIP</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface block mb-1">Razón Social *</label>
                <input required type="text" value={razonSocial} onChange={e => setRazonSocial(e.target.value)} className="w-full bg-surface border border-outline-variant rounded p-2 text-xs" placeholder="Empresa S.A.C." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1">Contacto</label>
                  <input type="text" value={contacto} onChange={e => setContacto(e.target.value)} className="w-full bg-surface border border-outline-variant rounded p-2 text-xs" />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1">Teléfono</label>
                  <input type="text" value={telefono} onChange={e => setTelefono(e.target.value)} className="w-full bg-surface border border-outline-variant rounded p-2 text-xs" placeholder="+51 987..." />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface block mb-1">Email Corporativo</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-surface border border-outline-variant rounded p-2 text-xs" />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface block mb-1">Dirección Fiscal</label>
                <input type="text" value={direccion} onChange={e => setDireccion(e.target.value)} className="w-full bg-surface border border-outline-variant rounded p-2 text-xs" />
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-surface-variant">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-outline-variant rounded text-xs font-bold hover:bg-surface">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-primary text-on-primary rounded text-xs font-bold hover:bg-surface-tint">Guardar Registro</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
