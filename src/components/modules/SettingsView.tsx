/**
 * @license
 * Tool Kit Enterprise Settings Module
 */

import React from 'react';
import { Settings as SettingsIcon, ShieldAlert, Check } from 'lucide-react';

export const SettingsView: React.FC = () => {
  return (
    <div className="max-w-[1440px] mx-auto flex flex-col gap-6 animate-fade-in pb-12 select-none">
      <div className="border-b pb-5">
        <h2 className="font-headline text-2xl font-bold flex items-center gap-2"><SettingsIcon className="text-primary" size={26}/> Configuración del Sistema & RBAC</h2>
        <p className="text-xs text-outline">Matriz de control de acceso basada en roles en MS SQL Server</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-lowest border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2 font-headline font-bold text-primary"><ShieldAlert size={18}/> Enterprise Admin</div>
          <p className="text-xs text-on-surface-variant mb-4">Acceso total sin restricciones a lectura, escritura, eliminación, configuración y ejecución de scripts SQL.</p>
          <div className="text-xs font-bold text-secondary flex items-center gap-1"><Check size={14}/> Acceso Universal Permitido</div>
        </div>

        <div className="bg-surface-container-lowest border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2 font-headline font-bold text-tertiary">Auditor Senior</div>
          <p className="text-xs text-on-surface-variant mb-4">Solo lectura transaccional e inspección de logs de auditoría y trazas IP. Exportación PDF habilitada.</p>
          <div className="text-xs font-bold text-outline">🔒 Modificación o Baja Bloqueada</div>
        </div>

        <div className="bg-surface-container-lowest border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2 font-headline font-bold text-secondary">Gestor Operativo</div>
          <p className="text-xs text-on-surface-variant mb-4">Administración comercial completa (Clientes y Proveedores). Generación de reportes operativos.</p>
          <div className="text-xs font-bold text-outline">⚙️ Configuración y Auditoría avanzada oculta</div>
        </div>
      </div>
    </div>
  );
};
