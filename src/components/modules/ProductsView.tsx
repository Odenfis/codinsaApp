import React, { useState, useEffect } from 'react';
import { Producto, Linea, Laboratorio } from '../../types';
import { exportToExcel, exportToPdf } from '../../utils/exportUtils';
import { Search, Package, FileSpreadsheet, FileText, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

export const ProductsView: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [laboratorios, setLaboratorios] = useState<Laboratorio[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLinea, setSelectedLinea] = useState('');
  const [selectedLab, setSelectedLab] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const token = localStorage.getItem('toolkit_jwt');
  const headers = { Authorization: `Bearer ${token}` };

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

    fetch(`/api/productos?${params.toString()}`, { headers })
      .then(r => r.json())
      .then(d => {
        setProductos(d.data || []);
        setCurrentPage(1);
      })
      .catch(console.error);
  }, [searchTerm, selectedLinea, selectedLab]);

  const totalPages = Math.ceil(productos.length / itemsPerPage) || 1;
  const paginatedProductos = productos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportExcel = () => exportToExcel(productos, 'ToolKit_Productos_ERP', 'Maestro Productos');

  const exportPdf = () => {
    const head = ['Código', 'Cód. Barra', 'Nombre', 'Línea', 'Stock', 'Costo', 'P. Venta', 'Laboratorio'];
    const rows = productos.map(p => [
      p.CodPro, p.CodBar || '-', p.Nombre, p.linea_descripcion || '-',
      p.Stock, p.Costo, p.PventaMa, p.lab_descripcion || '-'
    ]);
    exportToPdf('Reporte Maestro de Productos', head, rows, 'ToolKit_Maestro_Productos');
  };

  return (
    <div className="max-w-[1440px] mx-auto flex flex-col gap-6 animate-fade-in pb-12 select-none">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-surface-variant pb-5">
        <div>
          <h2 className="font-headline text-2xl font-bold text-on-surface flex items-center gap-2.5">
            <Package className="text-primary" size={26} />
            <span>Listado de Productos</span>
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">Catálogo de productos con filtros por línea y laboratorio</p>
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

        <div className="flex items-center gap-3">
          <Filter size={16} className="text-outline" />
          <select
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

      <div className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container text-on-surface-variant text-xs font-bold uppercase tracking-wider border-b border-surface-variant">
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Cód. Barra</th>
                <th className="py-3 px-4">Nombre</th>
                <th className="py-3 px-4">Línea</th>
                <th className="py-3 px-4 text-right">Stock</th>
                <th className="py-3 px-4 text-right">Costo</th>
                <th className="py-3 px-4 text-right">P. Venta</th>
                <th className="py-3 px-4">Laboratorio</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-surface-variant">
              {paginatedProductos.map((p, idx) => (
                <tr key={p.CodPro} className={`hover:bg-surface-container-low transition-colors ${idx % 2 !== 0 ? 'bg-[#F1F3F5]' : 'bg-surface-container-lowest'}`}>
                  <td className="py-3 px-4 font-mono text-xs font-bold text-primary">{p.CodPro}</td>
                  <td className="py-3 px-4 text-xs text-outline font-mono">{p.CodBar || '-'}</td>
                  <td className="py-3 px-4 font-semibold text-on-surface max-w-[300px] truncate">{p.Nombre}</td>
                  <td className="py-3 px-4 text-xs text-on-surface-variant">{p.linea_descripcion || '-'}</td>
                  <td className="py-3 px-4 text-right font-mono text-xs">{p.Stock}</td>
                  <td className="py-3 px-4 text-right font-mono text-xs">{p.Costo?.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right font-mono text-xs font-bold text-primary">{p.PventaMa?.toFixed(2)}</td>
                  <td className="py-3 px-4 text-xs text-outline">{p.lab_descripcion || '-'}</td>
                </tr>
              ))}
              {paginatedProductos.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-outline text-xs">No se encontraron productos con los filtros seleccionados.</td></tr>
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
    </div>
  );
};
