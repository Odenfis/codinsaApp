-- ==============================================================================
-- TOOL KIT - PLATAFORMA MODULAR EMPRESARIAL (MS SQL SERVER SCRIPT)
-- Arquitectura: Clean Architecture + Modular ERP Integration
-- Empresa: CODINSA S.A.C. Droguería / Tool Kit Enterprise
-- ==============================================================================

USE [master];
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'ToolKitEnterpriseDB')
BEGIN
    CREATE DATABASE [ToolKitEnterpriseDB];
END
GO

USE [ToolKitEnterpriseDB];
GO

-- ==============================================================================
-- 1. TABLAS DEL NÚCLEO DE SEGURIDAD Y MENÚ DINÁMICO
-- ==============================================================================

IF OBJECT_ID('dbo.Roles', 'U') IS NOT NULL DROP TABLE dbo.Roles;
CREATE TABLE dbo.Roles (
    id_rol INT IDENTITY(1,1) PRIMARY KEY,
    nombre_rol NVARCHAR(50) NOT NULL UNIQUE,
    descripcion NVARCHAR(200) NULL
);

IF OBJECT_ID('dbo.Usuarios', 'U') IS NOT NULL DROP TABLE dbo.Usuarios;
CREATE TABLE dbo.Usuarios (
    id_usuario INT IDENTITY(1,1) PRIMARY KEY,
    usuario NVARCHAR(50) NOT NULL UNIQUE,
    contrasena_hash NVARCHAR(255) NOT NULL,
    nombres NVARCHAR(100) NOT NULL,
    apellidos NVARCHAR(100) NOT NULL,
    email NVARCHAR(150) NOT NULL UNIQUE,
    id_rol INT NOT NULL FOREIGN KEY REFERENCES dbo.Roles(id_rol),
    avatar_url NVARCHAR(500) NULL,
    estado BIT DEFAULT 1 NOT NULL, -- 1: Activo, 0: Inactivo
    fecha_creacion DATETIME2 DEFAULT SYSDATETIME()
);

IF OBJECT_ID('dbo.Permisos', 'U') IS NOT NULL DROP TABLE dbo.Permisos;
CREATE TABLE dbo.Permisos (
    id_permiso INT IDENTITY(1,1) PRIMARY KEY,
    codigo_permiso NVARCHAR(50) NOT NULL UNIQUE,
    nombre_permiso NVARCHAR(100) NOT NULL,
    descripcion NVARCHAR(250) NULL
);

IF OBJECT_ID('dbo.Modulos', 'U') IS NOT NULL DROP TABLE dbo.Modulos;
CREATE TABLE dbo.Modulos (
    id_modulo INT IDENTITY(1,1) PRIMARY KEY,
    nombre_modulo NVARCHAR(80) NOT NULL,
    icono NVARCHAR(50) NOT NULL, -- Nombre de icono Lucide/Material
    ruta NVARCHAR(150) NOT NULL UNIQUE,
    orden INT DEFAULT 0,
    estado BIT DEFAULT 1 NOT NULL
);

IF OBJECT_ID('dbo.Roles_Modulos', 'U') IS NOT NULL DROP TABLE dbo.Roles_Modulos;
CREATE TABLE dbo.Roles_Modulos (
    id_rol INT NOT NULL FOREIGN KEY REFERENCES dbo.Roles(id_rol) ON DELETE CASCADE,
    id_modulo INT NOT NULL FOREIGN KEY REFERENCES dbo.Modulos(id_modulo) ON DELETE CASCADE,
    permiso_lectura BIT DEFAULT 1,
    permiso_escritura BIT DEFAULT 1,
    permiso_eliminacion BIT DEFAULT 0,
    permiso_exportar BIT DEFAULT 1,
    PRIMARY KEY (id_rol, id_modulo)
);

IF OBJECT_ID('dbo.Auditoria', 'U') IS NOT NULL DROP TABLE dbo.Auditoria;
CREATE TABLE dbo.Auditoria (
    id_auditoria BIGINT IDENTITY(1,1) PRIMARY KEY,
    id_usuario INT NULL FOREIGN KEY REFERENCES dbo.Usuarios(id_usuario),
    usuario NVARCHAR(100) NOT NULL,
    modulo NVARCHAR(80) NOT NULL,
    accion NVARCHAR(255) NOT NULL,
    detalles NVARCHAR(MAX) NULL,
    fecha DATETIME2 DEFAULT SYSDATETIME() NOT NULL,
    ip NVARCHAR(50) NULL
);

-- ==============================================================================
-- 2. TABLAS DE MÓDULOS DEL NEGOCIO (CLIENTES, PROVEEDORES, REPORTES)
-- ==============================================================================

IF OBJECT_ID('dbo.Clientes', 'U') IS NOT NULL DROP TABLE dbo.Clientes;
CREATE TABLE dbo.Clientes (
    id_cliente INT IDENTITY(1,1) PRIMARY KEY,
    codigo_ruc NVARCHAR(20) NOT NULL UNIQUE,
    razon_social NVARCHAR(200) NOT NULL,
    contacto NVARCHAR(150) NULL,
    telefono NVARCHAR(30) NULL,
    email NVARCHAR(150) NULL,
    direccion NVARCHAR(300) NULL,
    categoria NVARCHAR(50) DEFAULT 'Estándar', -- 'VIP', 'Mayorista', 'Estándar'
    estado BIT DEFAULT 1 NOT NULL,
    fecha_registro DATETIME2 DEFAULT SYSDATETIME()
);

IF OBJECT_ID('dbo.Proveedores', 'U') IS NOT NULL DROP TABLE dbo.Proveedores;
CREATE TABLE dbo.Proveedores (
    id_proveedor INT IDENTITY(1,1) PRIMARY KEY,
    codigo_ruc NVARCHAR(20) NOT NULL UNIQUE,
    razon_social NVARCHAR(200) NOT NULL,
    rubro NVARCHAR(100) NOT NULL,
    contacto NVARCHAR(150) NULL,
    telefono NVARCHAR(30) NULL,
    email NVARCHAR(150) NULL,
    condicion_pago NVARCHAR(50) DEFAULT 'Contado', -- 'Contado', 'Crédito 30 días', etc.
    calificacion DECIMAL(3,1) DEFAULT 5.0,
    estado BIT DEFAULT 1 NOT NULL,
    fecha_registro DATETIME2 DEFAULT SYSDATETIME()
);

IF OBJECT_ID('dbo.ReportesGenerados', 'U') IS NOT NULL DROP TABLE dbo.ReportesGenerados;
CREATE TABLE dbo.ReportesGenerados (
    id_reporte INT IDENTITY(1,1) PRIMARY KEY,
    titulo NVARCHAR(150) NOT NULL,
    tipo NVARCHAR(50) NOT NULL, -- 'Financiero', 'Operativo', 'Auditoría', 'Inventario'
    formato NVARCHAR(20) NOT NULL, -- 'PDF', 'EXCEL'
    generado_por NVARCHAR(100) NOT NULL,
    tamano_kb INT DEFAULT 128,
    fecha_generacion DATETIME2 DEFAULT SYSDATETIME()
);

IF OBJECT_ID('dbo.TransaccionesRecientes', 'U') IS NOT NULL DROP TABLE dbo.TransaccionesRecientes;
CREATE TABLE dbo.TransaccionesRecientes (
    id_transaccion NVARCHAR(50) PRIMARY KEY, -- Ej: TRX-8923
    entidad_codigo NVARCHAR(10) NOT NULL, -- Ej: AC
    entidad_nombre NVARCHAR(150) NOT NULL, -- Ej: Alpha Corp
    accion NVARCHAR(150) NOT NULL, -- Ej: Actualización de perfil
    fecha_texto NVARCHAR(80) NOT NULL, -- Ej: Hoy, 10:23 AM
    estado NVARCHAR(30) NOT NULL -- 'COMPLETADO', 'PROCESANDO', 'FALLIDO'
);

-- ==============================================================================
-- 3. SEEDING DE DATOS INICIALES (BASADO EN DISEÑO ADJUNTO)
-- ==============================================================================

-- Roles
INSERT INTO dbo.Roles (nombre_rol, descripcion) VALUES
('Enterprise Admin', 'Acceso total y control de módulos empresariales e integraciones'),
('Auditor Senior', 'Supervisión de transacciones, logs de auditoría y reportes'),
('Gestor Operativo', 'Administración de Clientes, Proveedores y generación de reportes');

-- Modulos (Coincidentes exactamente con el sidebar adjunto)
INSERT INTO dbo.Modulos (nombre_modulo, icono, ruta, orden) VALUES
('Dashboard', 'LayoutDashboard', '/dashboard', 1),
('Clients', 'Users', '/clients', 2),
('Providers', 'Network', '/providers', 3),
('Users', 'UserCheck', '/users', 4),
('Reports', 'BarChart3', '/reports', 5),
('Settings', 'Settings', '/settings', 6),
('Audit', 'ShieldCheck', '/audit', 7);

-- Roles_Modulos (Enterprise Admin tiene acceso a todo)
INSERT INTO dbo.Roles_Modulos (id_rol, id_modulo, permiso_lectura, permiso_escritura, permiso_eliminacion, permiso_exportar)
SELECT 1, id_modulo, 1, 1, 1, 1 FROM dbo.Modulos;

-- Gestor Operativo no ve Configuración ni Auditoría avanzada
INSERT INTO dbo.Roles_Modulos (id_rol, id_modulo, permiso_lectura, permiso_escritura, permiso_eliminacion, permiso_exportar)
SELECT 3, id_modulo, 1, 1, 0, 1 FROM dbo.Modulos WHERE ruta IN ('/dashboard', '/clients', '/providers', '/reports');

-- Auditor ve todo en lectura
INSERT INTO dbo.Roles_Modulos (id_rol, id_modulo, permiso_lectura, permiso_escritura, permiso_eliminacion, permiso_exportar)
SELECT 2, id_modulo, 1, 0, 0, 1 FROM dbo.Modulos;

-- Usuarios Iniciales (Password: Admin123! en hash BCrypt simulado)
INSERT INTO dbo.Usuarios (usuario, contrasena_hash, nombres, apellidos, email, id_rol, avatar_url, estado) VALUES
('admin', '$2b$10$X7hB1...hashedPasswordAdmin123!', 'William', 'Moncada', 'wmoncada@tecsup.edu.pe', 1, 'https://lh3.googleusercontent.com/aida-public/AB6AXuAkdmjPTRkHU9YE47QzpWuGyTRlaWhsQZADCN8JEpA8ixMjmyCf8sBX5asL1QI9ps1pRNncmzryYw7bgD1F3mTLCVVjQKO6vXlBFOPgximunVyPrrdqGUeDqCW47ThkxIuIaBZWtigWXyB8DA3FOdz0K9v-pLVhJVPF8euE7KQ2ky6MfxZMaDIOgzVHhD4aylCEPcoSeIMUN7W04CjrDSKX2tIlBEw7yc6KSFtLyglWfph4TS_QeUxLD2CP6FiWo1pGF6aNtDPS8uN3', 1),
('carlos.operador', '$2b$10$X7hB1...hashedPassword123', 'Carlos', 'Mendoza', 'cmendoza@codinsa.com.pe', 3, NULL, 1),
('ana.auditora', '$2b$10$X7hB1...hashedPassword123', 'Ana', 'Torres', 'atorres@codinsa.com.pe', 2, NULL, 1);

-- Clientes iniciales
INSERT INTO dbo.Clientes (codigo_ruc, razon_social, contacto, telefono, email, direccion, categoria) VALUES
('20512345678', 'Alpha Corp S.A.C.', 'Roberto Gómez', '+51 987 654 321', 'contacto@alphacorp.com', 'Av. Javier Prado Este 1234, San Isidro, Lima', 'VIP'),
('20498765432', 'Zeta Industries S.A.', 'Elena Rostova', '+51 912 345 678', 'ventas@zetaindustries.pe', 'Calle Los Laureles 450, Miraflores, Lima', 'Mayorista'),
('20600112233', 'Global Logistics Perú', 'Marco Aurelio', '+51 955 443 322', 'logistica@globalpe.com', 'Av. Elmer Faucett 2800, Callao', 'VIP'),
('20100200300', 'Farmacéutica Andina S.A.', 'Patricia Salas', '+51 1 442 1234', 'psalas@farmandina.com', 'Av. República de Panamá 3500, Surquillo', 'Mayorista'),
('20556677889', 'Clínica San Borja S.A.C.', 'Dr. Hernán Silva', '+51 988 112 233', 'hsilva@clinicasanborja.pe', 'Av. Guardia Civil 400, San Borja', 'VIP');

-- Proveedores iniciales
INSERT INTO dbo.Proveedores (codigo_ruc, razon_social, rubro, contacto, telefono, email, condicion_pago, calificacion) VALUES
('20100012345', 'Laboratorios Roche Perú', 'Medicamentos Oncológicos', 'Claudia Ramos', '+51 1 611 2233', 'cramos@roche.com', 'Crédito 45 días', 4.9),
('20200054321', 'Pfizer S.A. Perú', 'Productos Farmacéuticos', 'Fernando Soto', '+51 1 500 1000', 'fsoto@pfizer.com', 'Crédito 30 días', 4.8),
('20334455667', 'Bayer S.A.', 'Insumos Médicos', 'Gabriela Mistral', '+51 999 888 777', 'gmistral@bayer.com', 'Contado', 5.0),
('20445566778', 'Medtech Supplies S.A.C.', 'Equipos Biomédicos', 'Hugo Sánchez', '+51 944 332 211', 'hsanchez@medtech.pe', 'Crédito 60 días', 4.6);

-- Transacciones Recientes del Dashboard (idénticas al diseño adjunto)
INSERT INTO dbo.TransaccionesRecientes VALUES
('TRX-8923', 'AC', 'Alpha Corp', 'Actualización de perfil', 'Hoy, 10:23 AM', 'COMPLETADO'),
('TRX-8922', 'ZI', 'Zeta Industries', 'Sincronización API', 'Hoy, 09:45 AM', 'PROCESANDO'),
('TRX-8921', 'GL', 'Global Logistics', 'Carga masiva de datos', 'Ayer, 16:30 PM', 'FALLIDO');

-- Reportes iniciales
INSERT INTO dbo.ReportesGenerados (titulo, tipo, formato, generado_por, tamano_kb) VALUES
('Reporte Consolidado Mensual - Mayo 2024', 'Financiero', 'PDF', 'William Moncada', 2450),
('Inventario de Lotes Críticos - Droguería', 'Inventario', 'EXCEL', 'Carlos Mendoza', 840),
('Auditoria de Accesos y Permisos Q2', 'Auditoría', 'PDF', 'Ana Torres', 1120);

GO
