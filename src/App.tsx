/**
 * @license
 * Tool Kit Enterprise Root Application
 * Plataforma Modular Empresarial (CODINSA S.A.C. Droguería / Tool Kit Platform)
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView } from './components/auth/LoginView';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { ClientsView } from './components/modules/ClientsView';
import { ProvidersView } from './components/modules/ProvidersView';
import { UsersView } from './components/modules/UsersView';
import { ReportsView } from './components/modules/ReportsView';
import { SettingsView } from './components/modules/SettingsView';
import { AuditView } from './components/modules/AuditView';
import { GestionUbigeoView } from './components/modules/GestionUbigeoView';
import { ProductsView } from './components/modules/ProductsView';
import { ProductsEditCodLabView } from './components/modules/ProductsEditCodLabView';
import { NisiraExportView } from './components/modules/NisiraExportView';
import { SqlModal } from './components/sql/SqlModal';

const MainLayout: React.FC = () => {
  const { token, isLoading } = useAuth();
  const [activeRoute, setActiveRoute] = useState('/dashboard');
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-semibold text-primary">Iniciando plataforma empresarial Tool Kit...</p>
      </div>
    );
  }

  // Si no hay token autenticado, mostramos la pantalla de inicio de sesión de CODINSA
  if (!token) {
    return <LoginView />;
  }

  // Resolución del módulo a renderizar
  const renderContent = () => {
    switch (activeRoute) {
      case '/dashboard': return <DashboardView onNavigateToModule={setActiveRoute} />;
      case '/clients': return <ClientsView />;
      case '/providers': return <ProvidersView />;
      case '/users': return <UsersView />;
      case '/reports': return <ReportsView />;
      case '/settings': return <SettingsView />;
      case '/settings/backups': return <SettingsView />;
      case '/settings/nisira-export': return <NisiraExportView />;
      case '/audit': return <AuditView />;
      case '/clients/ubigeo': return <GestionUbigeoView />;
      case '/products': return <ProductsView />;
      case '/products/edit-lab': return <ProductsEditCodLabView />;
      default: return <DashboardView onNavigateToModule={setActiveRoute} />;
    }
  };

  return (
    <div className="bg-background min-h-screen w-full flex font-sans text-on-surface overflow-x-hidden">
      
      {/* Menú lateral izquierdo */}
      <Sidebar 
        activeModulePath={activeRoute} 
        onSelectModule={(ruta) => {
          setActiveRoute(ruta);
          setMobileMenuOpen(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }} 
      />

      {/* Menú lateral flotante para dispositivos móviles */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 md:hidden flex">
          <div className="w-[280px] h-full bg-surface">
            <Sidebar 
              activeModulePath={activeRoute} 
              onSelectModule={(ruta) => {
                setActiveRoute(ruta);
                setMobileMenuOpen(false);
              }} 
            />
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)}></div>
        </div>
      )}

      {/* Contenedor de encabezado y área de trabajo */}
      <div className="flex-1 md:ml-[280px] flex flex-col min-h-screen">
        <Header 
          onToggleMobileMenu={() => setMobileMenuOpen(true)}
          onOpenSqlModal={() => setIsSqlModalOpen(true)}
        />

        <main className="flex-1 mt-16 p-4 md:p-8 overflow-y-auto">
          {renderContent()}
        </main>
      </div>

      {/* Visor DDL de Base de Datos */}
      {isSqlModalOpen && <SqlModal onClose={() => setIsSqlModalOpen(false)} />}

    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}

export default App;
