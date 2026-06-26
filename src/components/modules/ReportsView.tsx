/**
 * @license
 * Tool Kit Enterprise Reports Module
 */

import React, { useState, useEffect } from 'react';
import { Reporte } from '../../types';
import { BarChart3, Download, Plus, Trash2, FileSpreadsheet, FileText } from 'lucide-react';
import { exportToExcel, exportToPdf } from '../../utils/exportUtils';

export const ReportsView: React.FC = () => {
  const [reports, setReports] = useState<Reporte[]>([]);
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('Financiero');
  const [formato, setFormato] = useState<'PDF' | 'EXCEL'>('PDF');

  const token = localStorage.getItem('toolkit_jwt');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const loadReports = async () => {
    const res = await fetch('/api/reports', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setReports((await res.json()).data || []);
  };

  useEffect(() => { loadReports(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    await fetch('/api/reports', {
      method: 'POST', headers,
      body: JSON.stringify({ titulo, tipo, formato, tamano_kb: Math.floor(Math.random()*2000)+300 })
    });
    setTitulo('');
    loadReports();
  };

  const handleDownload = (rep: Reporte) => {
    if (rep.formato === 'PDF') {
      exportToPdf(rep.titulo, ['Módulo', 'Registro Auditoría', 'Métrica'], [['ERP Ventas', 'Sincronizado', '100%'], ['Almacén Droguería', 'Estable', 'OK']], 'ToolKit_Rep');
    } else {
      exportToExcel([{ Modulo: 'ERP', Estado: 'Activo' }], 'ToolKit_Rep_XLSX');
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto flex flex-col gap-6 animate-fade-in pb-12 select-none">
      <div className="border-b pb-5">
        <h2 className="font-headline text-2xl font-bold flex items-center gap-2"><BarChart3 className="text-secondary" size={26}/> Centro de Reportes Gerenciales</h2>
        <p className="text-xs text-outline">Generación de balances en formato PDF y hojas de cálculo MS Excel</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-lowest border rounded-xl p-5 shadow-sm h-fit">
          <h3 className="font-headline font-bold mb-3">Generar Nuevo Consolidado</h3>
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <input required placeholder="Título (ej: Balance Q2 2024)" value={titulo} onChange={e=>setTitulo(e.target.value)} className="border p-2 rounded text-xs" />
            <select value={tipo} onChange={e=>setTipo(e.target.value)} className="border p-2 rounded text-xs"><option>Financiero</option><option>Operativo</option><option>Auditoría</option><option>Inventario</option></select>
            <select value={formato} onChange={e=>setFormato(e.target.value as any)} className="border p-2 rounded text-xs"><option value="PDF">Documento PDF</option><option value="EXCEL">MS Excel XLSX</option></select>
            <button type="submit" className="bg-primary text-on-primary py-2 rounded text-xs font-bold hover:bg-surface-tint mt-1">Generar e Indexar</button>
          </form>
        </div>

        <div className="md:col-span-2 bg-surface-container-lowest border rounded-xl p-5 shadow-sm">
          <h3 className="font-headline font-bold mb-3">Historial de Reportes Generados</h3>
          <div className="flex flex-col divide-y">
            {reports.map(rep => (
              <div key={rep.id_reporte} className="py-3 flex justify-between items-center text-sm">
                <div className="flex items-center gap-3">
                  {rep.formato === 'PDF' ? <FileText className="text-error shrink-0" size={20}/> : <FileSpreadsheet className="text-secondary shrink-0" size={20}/>}
                  <div>
                    <div className="font-bold">{rep.titulo}</div>
                    <div className="text-xs text-outline font-medium">{rep.tipo} • {rep.generado_por} • {rep.fecha_generacion}</div>
                  </div>
                </div>
                <button onClick={()=>handleDownload(rep)} className="bg-surface-container px-3 py-1.5 rounded text-xs font-bold hover:bg-primary hover:text-on-primary transition-colors flex items-center gap-1.5">
                  <Download size={14}/> Descargar ({rep.tamano_kb} KB)
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
