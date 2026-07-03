import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Modulo } from '../../types';
import { 
  LayoutDashboard, 
  Users, 
  Network, 
  UserCheck, 
  BarChart3, 
  Settings, 
  ShieldCheck, 
  LifeBuoy, 
  ShieldAlert,
  FolderTree,
  MapPin,
  Package,
  List,
  PenLine,
  ChevronDown
} from 'lucide-react';

interface SidebarProps {
  activeModulePath: string;
  onSelectModule: (ruta: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeModulePath, onSelectModule }) => {
  const { user, menu, logout } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    setExpandedMenus(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderIcon = (iconName: string, className: string = 'w-5 h-5') => {
    switch (iconName) {
      case 'LayoutDashboard': return <LayoutDashboard className={className} />;
      case 'Users': return <Users className={className} />;
      case 'Network': return <Network className={className} />;
      case 'UserCheck': return <UserCheck className={className} />;
      case 'BarChart3': return <BarChart3 className={className} />;
      case 'Settings': return <Settings className={className} />;
      case 'ShieldCheck': return <ShieldCheck className={className} />;
      case 'MapPin': return <MapPin className={className} />;
      case 'Package': return <Package className={className} />;
      case 'List': return <List className={className} />;
      case 'PenLine': return <PenLine className={className} />;
      default: return <FolderTree className={className} />;
    }
  };

  const isParentActive = (mod: Modulo) => {
    if (activeModulePath === mod.ruta) return true;
    if (mod.children) return mod.children.some(c => activeModulePath === c.ruta);
    return false;
  };

  const renderMenuItem = (mod: Modulo) => {
    const hasChildren = mod.children && mod.children.length > 0;
    const isExpanded = expandedMenus.has(mod.id_modulo);
    const isActive = isParentActive(mod);

    return (
      <div key={mod.id_modulo}>
        <button
          onClick={() => {
            if (hasChildren) {
              toggleExpand(mod.id_modulo);
            } else {
              onSelectModule(mod.ruta);
            }
          }}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm transition-all duration-200 text-left ${
            isActive
              ? 'font-bold text-primary border-r-4 border-primary bg-primary-container/15 shadow-sm'
              : 'font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container-high'
          }`}
        >
          <span className={isActive ? 'text-primary shrink-0' : 'text-outline transition-colors shrink-0'}>
            {renderIcon(mod.icono)}
          </span>
          <span className="truncate flex-1">{mod.nombre_modulo}</span>
          {hasChildren && (
            <ChevronDown
              size={16}
              className={`shrink-0 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              } ${isActive ? 'text-primary' : 'text-outline'}`}
            />
          )}
        </button>

        {hasChildren && isExpanded && (
          <div className="ml-2 mt-1 flex flex-col gap-0.5 border-l-2 border-surface-variant pl-3">
            {mod.children!.map((child) => {
              const isChildActive = activeModulePath === child.ruta;
              return (
                <button
                  key={child.id_modulo}
                  onClick={() => onSelectModule(child.ruta)}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all duration-200 text-left ${
                    isChildActive
                      ? 'font-bold text-primary bg-primary-container/15 shadow-sm'
                      : 'font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container-high'
                  }`}
                >
                  <span className="shrink-0">
                    {renderIcon(child.icono, 'w-4 h-4')}
                  </span>
                  <span className="truncate">{child.nombre_modulo}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="hidden md:flex flex-col h-full py-6 bg-surface shadow-sm fixed left-0 top-0 w-[280px] z-20 border-r border-surface-variant select-none">
      <div className="px-6 mb-8 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container shrink-0 shadow-sm">
            <ShieldAlert size={22} />
          </div>
          <div className="overflow-hidden">
            <h1 className="font-headline text-xl font-bold text-primary truncate leading-tight">Tool Kit</h1>
            <p className="text-xs text-on-surface-variant font-medium truncate mt-0.5">
              {user?.rol || 'Enterprise Admin'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 flex flex-col gap-1 custom-scrollbar">
        <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-outline mb-1">
          Módulos del Sistema
        </div>

        {menu.map(renderMenuItem)}
      </div>

      <div className="px-6 mt-auto pt-6 flex flex-col gap-2 border-t border-surface-variant">
        <button 
          onClick={() => alert('Abriendo mesa de ayuda corporativa CODINSA S.A.C. (Soporte TI)...')}
          className="w-full flex items-center justify-center gap-3 bg-primary text-on-primary text-sm font-semibold py-2.5 px-4 rounded-lg shadow-sm hover:shadow transition-all hover:bg-surface-tint active:scale-[0.98]"
        >
          <LifeBuoy size={18} />
          <span>Support Ticket</span>
        </button>

        <button
          onClick={logout}
          className="w-full text-xs text-outline hover:text-error py-1.5 transition-colors text-center font-medium mt-1"
        >
          ← Cerrar Sesión actual
        </button>
      </div>
    </aside>
  );
};
