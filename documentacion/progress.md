# Registro de Avances del Proyecto - Tool Kit Platform

Este documento registra los hitos técnicos alcanzados durante la implementación de la conexión a base de datos y el sistema de autenticación.

## 1. Infraestructura de Datos
- **Conexión a Base de Datos:** Se implementó la conexión a **SQL Server 2022 (Docker)** utilizando la librería `mssql`.
- **Configuración de Entorno:** Se creó un archivo `.env` para la gestión segura de credenciales:
    - `DB_SERVER`: localhost,1434
    - `DB_USER`: sa
    - `DB_PASSWORD`: Sedim2026
    - `DB_NAME`: COINSA
    - `SESSION_SECRET`: Clave para firma de cookies de sesión.

## 2. Sistema de Seguridad y Encriptación
- **Algoritmo Personalizado:** Se implementó la lógica de encriptación/desencriptación basada en el valor ASCII del carácter y su posición (1-indexed).
    - **Encriptar:** `ASCII(char) + posicion`
    - **Desencriptar:** `ASCII(char) - posicion`
- **Gestión de Sesiones:** Se migró la autenticación de un modelo basado en Tokens JWT a un modelo de **Sesiones de Servidor** utilizando `express-session`, mejorando el control de estado y la seguridad en el lado del servidor.

## 3. Desarrollo del Backend (API)
- **Autenticación:**
    - Actualización de `/api/auth/login` para validar credenciales contra la tabla `[dbo].[Usuarios]`.
    - Implementación de la desencriptación del password almacenado en DB para su comparación.
    - **Mensaje de error unificado:** Se cambió la respuesta del login para devolver `"Usuario o contraseña incorrectos."` tanto si el usuario no existe como si la contraseña es incorrecta, previniendo **enumeración de usuarios**.
- **Protección de Rutas:**
    - Refactorización de `authMiddleware` para validar la sesión activa en `req.session.user` en lugar de buscar un token en los headers.
- **Nuevos Endpoints:**
    - `/api/session`: Para verificar el estado de autenticación actual.
    - `/api/auth/logout`: Para destruir la sesión del servidor y limpiar cookies.
    - `/api/auth/users`: Endpoint público para obtener lista de usuarios activos desde `[dbo].[Usuarios]` para el combobox del login.
- **Repositorio de Usuarios (`UserRepository.getAll`):**
    - Migración de consulta mock (`db.usuarios`) a consulta real contra SQL Server (`SELECT [Usuario] FROM [dbo].[Usuarios]`).

## 4. Integración del Frontend
- **Gestión de Estado (`AuthContext.tsx`):**
    - Eliminación de la dependencia de `localStorage` para el token JWT.
    - Sincronización del estado del usuario con la sesión del servidor.
    - Carga del menú de módulos dinámicos basándose en el usuario autenticado.
    - **Fix crítico:** Se eliminó `setIsLoading(true/false)` de la función `login()` para evitar que `MainLayout` desmonte el `LoginView` durante el proceso de autenticación, lo que causaba pérdida del estado de error y reinicio de campos.
    - **Manejo robusto de errores:** `try/catch` interno en `res.json()` para evitar crash si la respuesta no es JSON válido, con fallback a mensaje por defecto.
- **Flujo de Usuario:** Sincronización de la vista `LoginView.tsx` con el nuevo flujo de respuesta del backend.
- **Mejoras en LoginView.tsx:**
    - **Combobox de Usuarios:** Reemplazo del input simple por un combobox personalizado con:
        - Carga dinámica de usuarios desde `/api/auth/users` (tabla `[dbo].[Usuarios]`).
        - Búsqueda/filtro en tiempo real mientras se escribe.
        - Lista desplegable con icono `ChevronDown` animado.
        - Cierre automático al seleccionar o hacer click fuera.
        - Mensaje "No se encontraron usuarios" cuando el filtro no coincide.
    - **Visibilidad de Contraseña:** Toggle para mostrar/ocultar contraseña con iconos `Eye`/`EyeOff`.
    - **Campos Limpios:** Eliminación de valores por defecto para vista limpia inicial.
    - **Validación inline por campo:**
        - Estados de error independientes (`usernameError`, `passwordError`).
        - Estilos de error: borde rojo (`border-error`), focus ring rojo.
        - Mensajes de error específicos bajo cada campo.
        - Limpieza automática al escribir.
        - Atributos de accesibilidad (`aria-invalid`, `aria-describedby`, `role="alert"`).
    - **Detección local de contraseña incorrecta:**
        - Al fallar el login, se verifica si el usuario existe en la lista local `users[]` (cargada de la BD).
        - Si existe → mensaje específico **"Contraseña incorrecta"** en el campo.
        - Si no existe → mensaje **"Usuario no encontrado"** en el campo.
        - El banner global sigue mostrando mensaje genérico por seguridad.
    - **Animación Shake:** El campo de contraseña tiembla al recibir un error (vía CSS keyframe + clase `animate-shake`).

## 5. Validación y Pruebas
- **Caso de Prueba Exitoso:**
    - **Usuario:** `Administrador`
    - **Password en DB:** `1836`
    - **Password de Acceso (Calculado):** `0602`
- **Resultado:** Acceso concedido, creación de sesión exitosa y carga correcta de los módulos del sistema.
- **Flujo de error verificado:** Contraseña incorrecta → mensaje "Contraseña incorrecta" inline + shake + banner genérico, sin pérdida de datos del formulario.

## 6. Módulo de Gestión de Ubigeos (Nuevo)
- **Objetivo:** Asignar Departamento, Provincia y Distrito (UBIGEO SUNAT) a cada cliente de la tabla `[dbo].[Clientes]`, almacenando la relación en `[dbo].[t_Clientes_ubigeo]`.
- **Catálogo SUNAT (`Ubigeos_SUNAT`):**
    - Nueva tabla de referencia con la jerarquía completa de **25 departamentos, ~196 provincias y ~1874 distritos** del Perú.
    - Columnas: `cod_dpto` (CHAR 2), `nom_dpto`, `cod_prov` (CHAR 2), `nom_prov`, `cod_dist` (CHAR 2), `nom_dist`, `ubigeo_6d` (CHAR 6, PK).
    - Seed SQL creado en `sql/ubigeos_seed.sql` con datos oficiales SUNAT actualizados al 2026.
- **Sidebar:**
    - Renombrado "Clients" → **"Clientes"** con submenú expandible **"Gestión Ubigeos"** (`MapPin`).
    - El `Sidebar.tsx` ahora soporta submenús: al hacer click en un módulo padre con hijos, expande/colapsa los sub-items animadamente.
    - Iconos registrados para `MapPin` en el resolver de iconos dinámicos.
- **Nuevos Endpoints Backend (`/api/ubigeo/*`):**
    - `GET /api/ubigeo/departamentos` — Departamentos desde `Ubigeos_SUNAT`.
    - `GET /api/ubigeo/provincias/:dpto` — Provincias filtradas por código de departamento.
    - `GET /api/ubigeo/distritos/:dpto/:prov` — Distritos filtrados con su `ubigeo_6d`.
    - `GET /api/ubigeo/clientes` — Lista de clientes desde `[dbo].[Clientes]` con búsqueda.
    - `GET /api/ubigeo/cliente/:codclie` — Obtiene el ubigeo actual del cliente desde `[dbo].[t_Clientes_ubigeo]`.
    - `PUT /api/ubigeo/cliente/:codclie` — Upsert: inserta o actualiza el ubigeo del cliente.
- **Nuevo Componente Frontend (`GestionUbigeoView.tsx`):**
    - Tabla paginada con todos los clientes (búsqueda por razón social o documento).
    - Modal de asignación con **3 combos anidados**: Departamento → Provincia → Distrito.
    - Al seleccionar un departamento, se cargan sus provincias; al seleccionar provincia, se cargan sus distritos.
    - El código **UBIGEO de 6 dígitos** se autocompleta al elegir el distrito.
    - Panel de resumen visual con los nombres seleccionados y el código UBIGEO.
    - Al guardar, se persiste en `[dbo].[t_Clientes_ubigeo]` con `CODIGO = Codclie`, `UBIGEO = NUBIGEO`.
- **Fix: Formulario de asignación no reflejaba valores existentes:**
    - **Problema:** Al editar un cliente con ubigeo ya registrado, los selects del modal aparecían vacíos aunque el resumen mostraba los nombres correctamente.
    - **Causa raíz:** La tabla `[dbo].[t_Clientes_ubigeo` almacena `dpto`, `provincia`, `distrito` como `INT`. Al guardar `'01'`, SQL Server lo convierte a `1`. Al recuperarlo, `.toString()` devolvía `'1'` pero las options del select usan `'01'` → sin match visual.
    - **Solución:** Se agregó `padStart(2, '0')` al cargar los valores desde la BD (`GestionUbigeoView.tsx:71-73`) y se cambiaron los input types del PUT endpoint a `sql.Int` con `parseInt()` (`server.ts`).
- **Tipos TypeScript nuevos:**
    - `UbigeoSunat` — Representa un registro del catálogo SUNAT.
    - `ClienteUbigeo` — Representa la relación cliente-ubigeo en `t_Clientes_ubigeo`.
    - `ClienteSimple` — Vista ligera del cliente (Codclie, Razon, Documento).
    - `children?: Modulo[]` agregado a la interfaz `Modulo` para soporte de submenús.

## 7. Módulo de Productos (Nuevo)
- **Objetivo:** Visualizar el catálogo de productos desde `[dbo].[Productos]` con filtros por nombre, línea y laboratorio, más exportación a Excel y PDF.
- **Sidebar:**
    - Nuevo módulo **"Productos"** (`icono: Package`) con submenú **"Listado de Productos"**, insertado entre Clientes y Providers.
    - Iconos `Package` y `List` registrados en el resolver dinámico del `Sidebar.tsx`.
- **Filtros disponibles:**
    - **Búsqueda por nombre:** Filtro textual sobre `Productos.Nombre` vía `LIKE '%texto%'`.
    - **Línea:** Combo poblado desde `[dbo].[Lineas]` (CodLinea, Descripcion), filtra por `Clinea`.
    - **Laboratorio:** Combo poblado desde `[dbo].[Laboratorios]` (CodLab, Descripcion), filtra por `LEFT(CodPro, 2) = LEFT(CodLab, 2)`.
- **Nuevos Endpoints Backend (`/api/productos/*`):**
    - `GET /api/productos` — Lista productos con joins a `Lineas` y `Laboratorios`, filtros opcionales vía query params (`search`, `linea`, `lab`), solo registros no eliminados (`Eliminado = 0`).
    - `GET /api/productos/lineas` — Lista de líneas para el dropdown.
    - `GET /api/productos/laboratorios` — Lista de laboratorios para el dropdown.
- **Nuevo Componente Frontend (`ProductsView.tsx`):**
    - Tabla responsiva paginada (10 items/página) con columnas: Código, Cód. Barra, Nombre, Línea, Stock, Costo, P. Venta, Laboratorio.
    - Barra de filtros combinada (búsqueda + combo Línea + combo Laboratorio) con actualización automática al cambiar cualquier filtro.
    - Botones de exportación: **Excel** (`xlsx`) y **PDF** (`jspdf` + `jspdf-autotable`) reutilizando `exportUtils`.
    - Los datos se consultan directamente desde SQL Server real (no mock), siguiendo el mismo patrón que los endpoints de Ubigeo.
- **Tipos TypeScript nuevos:**
    - `Producto` — Mapea la tabla `[dbo].[Productos]` con campos adicionales `linea_descripcion` y `lab_descripcion`.
    - `Linea` — Para el filtro de líneas.
    - `Laboratorio` — Para el filtro de laboratorios.

## 8. Ocultamiento Temporal de Módulos
- **Objetivo:** Limpiar el sidebar para mostrar solo los módulos en producción actual: Dashboard, Clientes (+ Gestión Ubigeos) y Productos (+ Listado de Productos).
- **Módulos ocultos (visibles en el código pero no en el sidebar):**
    - Providers
    - Users
    - Reports
    - Settings
    - Audit
- **Mecanismo:** Se cambió la propiedad `estado: true` → `estado: false` en `database.ts` para los 5 módulos. El `Sidebar.tsx` ya filtra por `mod.estado`, por lo que `false` los excluye automáticamente sin eliminar código ni rutas.
- **Restauración:** Para volver a mostrarlos, cambiar `estado: false` → `estado: true` en los mismos módulos de `database.ts`. No requiere ningún otro cambio.

## 9. Infraestructura de Despliegue (Docker)
- **Objetivo:** Facilitar despliegues y actualizaciones en servidor Windows del cliente con SQL Server 2022 nativo.
- **Arquitectura:** Solo contenedor de aplicación (app Node.js) + SQL Server nativo externo (no dockerizado).
- **Archivos creados para despliegue:**
    - `Dockerfile`: Multi-stage build (Node 20 Alpine) con healthcheck HTTP.
    - `docker-compose.yml`: Servicio `toolkit-app` con variables de entorno para conexión a SQL Server nativo del cliente mediante `host.docker.internal`.
    - `.env.example`: Plantilla con credenciales del cliente (no se sube al repo, el cliente la copia como `.env`).
    - `.dockerignore`: Excluye `node_modules`, `.env`, documentación.
    - `update.bat`: Script de actualización automática para Windows (doble clic).
    - `update.sh`: Script de actualización automática para Linux/Mac/Git Bash.
    - `README-DEPLOY.md`: Guía completa con requisitos, instalación inicial, actualizaciones, solución de problemas y seguridad.
- **Flujo de actualización:**
    1. Desarrollador hace `git push` al repositorio.
    2. Cliente ejecuta `update.bat` (o `update.sh`).
    3. Script ejecuta: `git pull` → `docker compose down` → `docker compose build --no-cache` → `docker compose up -d` → `docker image prune -f`.
    4. Aplicación actualizada corriendo en `http://localhost:3000`.
- **Requisitos del cliente:** Docker Desktop, SQL Server 2022 con TCP/IP habilitado, Git.

---
*Última actualización: 29 de Junio, 2026*
