/**
 * @license
 * Tool Kit Enterprise Header
 */

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Search, Bell, Calendar, Menu, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
  onOpenSqlModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu, onOpenSqlModal }) => {
  const { user } = useAuth();

  return (
    <header className="bg-surface shadow-sm flex justify-between items-center px-6 w-full fixed top-0 right-0 md:w-[calc(100%-280px)] h-16 z-10 border-b border-surface-variant select-none">
      
      {/* Área de Logo / Botón Menú Móvil */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onToggleMobileMenu}
          className="md:hidden p-1.5 text-on-surface-variant hover:bg-surface-container rounded-lg"
        >
          <Menu size={22} />
        </button>

        <div className="hidden md:flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-md border border-outline-variant/60 text-xs font-mono text-on-surface-variant">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
          <span>MS SQL Server: CONECTADO (Local)</span>
        </div>
      </div>

      {/* Barra de Búsqueda Global */}
      <div className="hidden md:flex flex-1 max-w-md mx-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline shrink-0" size={18} />
        <input
          type="text"
          placeholder="Buscar registros, transacciones o entidades..."
          className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg pl-10 pr-4 py-2 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200 focus:outline-none"
        />
      </div>

      {/* Acciones e Indicadores */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onOpenSqlModal}
          title="Ver Script SQL Server & Modelo Entidad-Relación"
          className="hidden sm:flex items-center gap-1.5 bg-secondary-container text-on-secondary-container text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm hover:opacity-90 transition-opacity"
        >
          <ShieldCheck size={16} />
          <span>Arquitectura SQL</span>
        </button>

        <button className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors relative">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error"></span>
        </button>

        <button className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
          <Calendar size={20} />
        </button>

        <div className="h-8 w-[1px] bg-outline-variant mx-1 hidden md:block"></div>

        {/* Perfil del Usuario */}
        <div className="flex items-center gap-2.5 pl-1">
          <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold overflow-hidden border border-primary/20 shadow-sm">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span>{user?.nombres?.charAt(0)}{user?.apellidos?.charAt(0)}</span>
            )}
          </div>
          <div className="hidden lg:block text-left leading-tight">
            <span className="text-sm font-semibold text-on-surface block truncate max-w-[120px]">
              {user?.nombres} {user?.apellidos}
            </span>
            <span className="text-[11px] text-outline truncate block">
              {user?.usuario}
            </span>
          </div>
        </div>
      </div>

    </header>
  );
};
