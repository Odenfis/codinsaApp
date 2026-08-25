/**
 * @license
 * Tool Kit Enterprise Users Module
 */

import React, { useState, useEffect } from 'react';
import { Usuario } from '../../types';
import { Search, Plus, Trash2, UserCheck, ShieldAlert } from 'lucide-react';

export const UsersView: React.FC = () => {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [usuario, setUsuario] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email, setEmail] = useState('');
  const [idRol, setIdRol] = useState(3);

  const token = localStorage.getItem('toolkit_jwt');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const loadUsers = async () => {
    const res = await fetch(`/api/users?search=${encodeURIComponent(searchTerm)}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setUsers(data.data || []);
    }
  };

  useEffect(() => { loadUsers(); }, [searchTerm]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/users', {
      method: 'POST', headers,
      body: JSON.stringify({ usuario, contrasena_hash: 'Simulado123!', nombres, apellidos, email, id_rol: Number(idRol), estado: true })
    });
    setIsModalOpen(false);
    loadUsers();
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Desactivar este usuario?')) {
      await fetch(`/api/users/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      loadUsers();
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto flex flex-col gap-6 animate-fade-in pb-12 select-none">
      <div className="flex justify-between items-center border-b pb-5">
        <div>
          <h2 className="font-headline text-2xl font-bold flex items-center gap-2">
            <UserCheck className="text-primary" size={26} /> Usuarios y Control de Acceso (RBAC)
          </h2>
          <p className="text-xs text-outline">Cuentas corporativas asociadas a roles de MS SQL Server</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-primary text-on-primary px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow">
          <Plus size={16} /> Registrar Usuario
        </button>
      </div>

      <div className="bg-surface-container-lowest p-4 rounded-xl border flex items-center gap-4 shadow-sm">
        <Search size={18} className="text-outline" />
        <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Buscar por usuario o correo..." className="w-full bg-transparent text-sm outline-none" />
      </div>

      <div className="bg-surface-container-lowest border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container text-xs font-bold uppercase tracking-wider border-b">
              <th className="py-3 px-4">Usuario</th>
              <th className="py-3 px-4">Nombres y Apellidos</th>
              <th className="py-3 px-4">Correo Electrónico</th>
              <th className="py-3 px-4">Rol Asignado</th>
              <th className="py-3 px-4 text-center">Baja</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-surface-variant">
            {users.map((u, idx) => (
              <tr key={u.id_usuario} className={idx%2!==0 ? 'bg-[#F1F3F5]' : ''}>
                <td className="py-3 px-4 font-mono text-xs font-bold text-primary">@{u.usuario}</td>
                <td className="py-3 px-4 font-semibold">{u.nombres} {u.apellidos}</td>
                <td className="py-3 px-4 text-xs text-outline">{u.email}</td>
                <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-primary-container/20 text-primary font-bold text-xs">{u.nombre_rol}</span></td>
                <td className="py-3 px-4 text-center"><button onClick={()=>handleDelete(u.id_usuario)} className="text-error hover:opacity-80"><Trash2 size={16}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-xl p-6 max-w-md w-full shadow-xl animate-fade-in border">
            <h3 className="font-headline font-bold text-lg mb-4">Registrar Cuenta Enterprise</h3>
            <form onSubmit={handleSave} className="flex flex-col gap-3">
              <input required placeholder="Username (ej: jramos)" value={usuario} onChange={e=>setUsuario(e.target.value)} className="border p-2 rounded text-xs" />
              <input required placeholder="Nombres" value={nombres} onChange={e=>setNombres(e.target.value)} className="border p-2 rounded text-xs" />
              <input required placeholder="Apellidos" value={apellidos} onChange={e=>setApellidos(e.target.value)} className="border p-2 rounded text-xs" />
              <input required type="email" placeholder="Correo electrónico corporativo" value={email} onChange={e=>setEmail(e.target.value)} className="border p-2 rounded text-xs" />
              <div>
                <label className="text-xs font-bold block mb-1">Rol de Plataforma:</label>
                <select value={idRol} onChange={e=>setIdRol(Number(e.target.value))} className="w-full border p-2 rounded text-xs">
                  <option value={1}>Enterprise Admin</option>
                  <option value={2}>Auditor Senior</option>
                  <option value={3}>Gestor Operativo</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-3"><button type="button" onClick={()=>setIsModalOpen(false)} className="px-3 py-1.5 border rounded text-xs font-bold">Cancelar</button><button type="submit" className="px-4 py-1.5 bg-primary text-on-primary rounded text-xs font-bold">Crear Cuenta</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
