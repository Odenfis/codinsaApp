/**
 * @license
 * Tool Kit Enterprise SQL Architecture Modal
 */

import React from 'react';
import { X, Download, Database, Code, CheckCircle } from 'lucide-react';

export const SqlModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const handleDownloadSql = () => {
    window.open('/api/sql-script', '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none animate-fade-in">
      <div className="bg-surface-container-lowest rounded-2xl max-w-4xl w-full border border-surface-variant shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Encabezado */}
        <div className="p-6 border-b border-surface-variant flex justify-between items-center bg-surface">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary-container flex items-center justify-center text-on-secondary-container shadow-sm">
              <Database size={22} />
            </div>
            <div>
              <h3 className="font-headline text-xl font-bold text-on-surface">Arquitectura MS SQL Server (Clean Architecture)</h3>
              <p className="text-xs text-outline">Script DDL transaccional, roles, permisos e integraciones ERP</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-outline hover:text-error rounded-lg hover:bg-surface-container transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-on-surface bg-[#1E2324] text-[#A2F0F0] custom-scrollbar">
          <pre className="whitespace-pre-wrap leading-relaxed">
{`-- ==============================================================================
-- TOOL KIT - PLATAFORMA MODULAR EMPRESARIAL (MS SQL SERVER SCRIPT)
-- Arquitectura: Clean Architecture + Modular ERP Integration
-- Empresa: CODINSA S.A.C. Droguería / Tool Kit Enterprise
-- ==============================================================================

USE [master];
GO

CREATE DATABASE [ToolKitEnterpriseDB];
GO

USE [ToolKitEnterpriseDB];
GO

CREATE TABLE dbo.Roles (
    id_rol INT IDENTITY(1,1) PRIMARY KEY,
    nombre_rol NVARCHAR(50) NOT NULL UNIQUE,
    descripcion NVARCHAR(200) NULL
);

CREATE TABLE dbo.Usuarios (
    id_usuario INT IDENTITY(1,1) PRIMARY KEY,
    usuario NVARCHAR(50) NOT NULL UNIQUE,
    contrasena_hash NVARCHAR(255) NOT NULL,
    nombres NVARCHAR(100) NOT NULL,
    apellidos NVARCHAR(100) NOT NULL,
    email NVARCHAR(150) NOT NULL UNIQUE,
    id_rol INT NOT NULL FOREIGN KEY REFERENCES dbo.Roles(id_rol),
    avatar_url NVARCHAR(500) NULL,
    estado BIT DEFAULT 1 NOT NULL,
    fecha_creacion DATETIME2 DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.Modulos (
    id_modulo INT IDENTITY(1,1) PRIMARY KEY,
    nombre_modulo NVARCHAR(80) NOT NULL,
    icono NVARCHAR(50) NOT NULL,
    ruta NVARCHAR(150) NOT NULL UNIQUE,
    orden INT DEFAULT 0,
    estado BIT DEFAULT 1 NOT NULL
);

CREATE TABLE dbo.Roles_Modulos (
    id_rol INT NOT NULL FOREIGN KEY REFERENCES dbo.Roles(id_rol) ON DELETE CASCADE,
    id_modulo INT NOT NULL FOREIGN KEY REFERENCES dbo.Modulos(id_modulo) ON DELETE CASCADE,
    permiso_lectura BIT DEFAULT 1,
    permiso_escritura BIT DEFAULT 1,
    permiso_eliminacion BIT DEFAULT 0,
    permiso_exportar BIT DEFAULT 1,
    PRIMARY KEY (id_rol, id_modulo)
);

CREATE TABLE dbo.Clientes (
    id_cliente INT IDENTITY(1,1) PRIMARY KEY,
    codigo_ruc NVARCHAR(20) NOT NULL UNIQUE,
    razon_social NVARCHAR(200) NOT NULL,
    contacto NVARCHAR(150) NULL,
    telefono NVARCHAR(30) NULL,
    email NVARCHAR(150) NULL,
    direccion NVARCHAR(300) NULL,
    categoria NVARCHAR(50) DEFAULT 'Estándar',
    estado BIT DEFAULT 1 NOT NULL,
    fecha_registro DATETIME2 DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.Proveedores (
    id_proveedor INT IDENTITY(1,1) PRIMARY KEY,
    codigo_ruc NVARCHAR(20) NOT NULL UNIQUE,
    razon_social NVARCHAR(200) NOT NULL,
    rubro NVARCHAR(100) NOT NULL,
    contacto NVARCHAR(150) NULL,
    telefono NVARCHAR(30) NULL,
    email NVARCHAR(150) NULL,
    condicion_pago NVARCHAR(50) DEFAULT 'Contado',
    calificacion DECIMAL(3,1) DEFAULT 5.0,
    estado BIT DEFAULT 1 NOT NULL
);

-- SEEDING INICIAL DE MÓDULOS DE TOOL KIT PLATFORM
INSERT INTO dbo.Modulos VALUES
('Dashboard', 'LayoutDashboard', '/dashboard', 1, 1),
('Clients', 'Users', '/clients', 2, 1),
('Providers', 'Network', '/providers', 3, 1),
('Users', 'UserCheck', '/users', 4, 1),
('Reports', 'BarChart3', '/reports', 5, 1),
('Settings', 'Settings', '/settings', 6, 1),
('Audit', 'ShieldCheck', '/audit', 7, 1);
GO`}
          </pre>
        </div>

        {/* Pie */}
        <div className="p-4 bg-surface border-t border-surface-variant flex justify-between items-center text-xs">
          <div className="flex items-center gap-2 text-primary font-bold">
            <CheckCircle size={16} />
            <span>Script compatible con SQL Server 2019 / Azure SQL Database</span>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 border border-outline-variant rounded-lg font-bold hover:bg-surface-container">
              Cerrar
            </button>
            <button onClick={handleDownloadSql} className="px-4 py-2 bg-primary text-on-primary rounded-lg font-bold hover:bg-surface-tint flex items-center gap-1.5 shadow">
              <Download size={16} /> Descargar Archivo .SQL
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
