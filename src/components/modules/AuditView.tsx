/**
 * @license
 * Tool Kit Enterprise Audit Module
 */

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Download, Search } from 'lucide-react';
import { exportToExcel } from '../../utils/exportUtils';

export const AuditView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const token = localStorage.getItem('toolkit_jwt');

  useEffect(() => {
    fetch('/api/audit', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setLogs(d.data || []));
  }, []);

  return (
    <div className="max-w-[1440px] mx-auto flex flex-col gap-6 animate-fade-in pb-12 select-none">
      <div className="flex justify-between items-center border-b pb-5">
        <div>
          <h2 className="font-headline text-2xl font-bold flex items-center gap-2"><ShieldCheck className="text-primary" size={26}/> Logs de Auditoría & Trazabilidad</h2>
          <p className="text-xs text-outline">Registro inmutable de acciones, usuario e IP en SQL Server</p>
        </div>
        <button onClick={()=>exportToExcel(logs, 'ToolKit_Audit_Logs')} className="bg-primary text-on-primary px-4 py-2 rounded text-xs font-bold hover:bg-surface-tint flex items-center gap-1.5 shadow">
          <Download size={16}/> Exportar Logs
        </button>
      </div>

      <div className="bg-surface-container-lowest border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-surface-container text-xs font-bold uppercase tracking-wider border-b">
              <th className="py-3 px-4">ID Traza</th>
              <th className="py-3 px-4">Usuario</th>
              <th className="py-3 px-4">Módulo</th>
              <th className="py-3 px-4">Acción Auditada</th>
              <th className="py-3 px-4">Fecha / Timestamp</th>
              <th className="py-3 px-4">Dirección IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-variant">
            {logs.map((l, i) => (
              <tr key={l.id_auditoria || i} className={i%2!==0?'bg-[#F1F3F5]':''}>
                <td className="py-3 px-4 font-mono text-xs font-bold">{l.id_auditoria}</td>
                <td className="py-3 px-4 font-semibold text-primary">{l.usuario}</td>
                <td className="py-3 px-4 text-xs font-bold text-secondary">{l.modulo}</td>
                <td className="py-3 px-4">{l.accion}</td>
                <td className="py-3 px-4 text-xs font-mono text-outline">{l.fecha}</td>
                <td className="py-3 px-4 text-xs font-mono">{l.ip || '127.0.0.1'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
