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

## 8. Ocultamiento Temporal de Módulos (Actualizado)
- **Objetivo:** Limpiar el sidebar para mostrar solo los módulos en producción actual.
- **Módulos visibles actualmente:** Dashboard, Clientes (+ Gestión Ubigeos), Productos (+ Listado de Productos, + Editar Cod. Laboratorio) y **Configuración (+ Backups)**.
- **Módulos ocultos (visibles en el código pero no en el sidebar):**
    - Providers
    - Users
    - Reports
    - Audit
- **Mecanismo:** Se cambió la propiedad `estado: true` → `estado: false` en `database.ts` para los módulos ocultos. El `Sidebar.tsx` ya filtra por `mod.estado`, por lo que `false` los excluye automáticamente sin eliminar código ni rutas.
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

## 10. Módulo de Edición de Código de Laboratorio (CodLab)
- **Objetivo:** Permitir la edición masiva e inline del campo `CodLab` (VARCHAR 50) de `[dbo].[Productos]`, un código textual proveniente de documentos físicos, independiente de la tabla `Laboratorios`.
- **Sidebar:**
  - Nuevo submenú **"Editar Cod. Laboratorio"** (`icono: PenLine`) bajo Productos, con ruta `/products/edit-lab`.
  - Icono `PenLine` registrado en el resolver dinámico del `Sidebar.tsx`.
  - Módulo `id_modulo: 11` agregado a `rolesModulos` para Enterprise Admin y Gestor Operativo.
- **Nuevo Endpoint Backend:**
  - `PUT /api/productos/:codpro/codlab` — Actualiza `CodLab` del producto en SQL Server y registra auditoría en `db.addAuditLog`.
- **Nuevo Componente Frontend (`ProductsEditCodLabView.tsx`):**
  - Tabla paginada con columnas: Código, Nombre, Línea, Stock, Costo, P. Venta, Laboratorio (descripción referencial) y **CodLab como input de texto editable**.
  - **Auto-save en blur:** Al salir del campo (Tab o click fuera), guarda automáticamente vía PUT.
  - **Enter → guarda y avanza:** Al presionar Enter, guarda el valor y enfoca el input de la fila siguiente — flujo continuo sin mouse.
  - **Optimistic update:** El valor se actualiza en la UI inmediatamente al escribir.
  - **Feedback visual:** Spinner durante el guardado, checkmark verde (✓) por 1.5s al confirmar.
  - **Protección contra doble guardado:** `saveInProgress` ref evita llamadas concurrentes al API para el mismo producto.
  - Mismos filtros (búsqueda por nombre, línea, laboratorio), paginación y exportación Excel/PDF que la vista de listado.
- **Corrección:** La columna "Laboratorio" usa directamente `lab_descripcion` del JOIN de la API (independiente de `CodLab`), eliminando la función `getLabDesc` que incorrectamente buscaba laboratorios usando `CodLab` como clave.
- **Ruta registrada en `App.tsx`:** `case '/products/edit-lab'` → `ProductsEditCodLabView`.

## 11. Módulo de Configuración y Backups Automáticos
- **Objetivo:** Reactivar el módulo Settings renombrándolo a **"Configuración"** con un sub-módulo **"Backups"** para gestionar backups automáticos de la base de datos COINSA directamente desde la interfaz web.
- **Sidebar:**
  - `id_modulo: 6`: Renombrado `'Settings'` → `'Configuración'`, `estado: false` → `true`.
  - Nuevo submenú **"Backups"** (`icono: HardDrive`) con ruta `/settings/backups`.
  - Icono `HardDrive` registrado en el resolver dinámico del `Sidebar.tsx`.
  - `id_modulo: 12` agregado a `rolesModulos` para Enterprise Admin.
  - Ruta `/settings/backups` registrada en `App.tsx` apuntando a `SettingsView`.
- **Nuevos Archivos Backend:**
  - **`src/backend/backupConfig.ts`** — Clase `BackupConfigManager` que persiste la configuración en `config/backup-config.json` (ruta destino, hora, enable/disable, estado del último backup).
  - **`src/backend/backup/backupScheduler.ts`** — Clase `BackupScheduler` que:
    - Usa `node-cron` para programar el backup a la hora configurada.
    - Ejecuta `BACKUP DATABASE [COINSA] TO DISK` via el pool `mssql`.
    - Limpia backups > 30 días con `xp_delete_file` post-backup.
    - Métodos `start()`, `stop()`, `restart()` para control del scheduler.
- **Nuevos Endpoints Backend:**
  - `GET /api/config/backup` — Obtiene la configuración actual de backups.
  - `PUT /api/config/backup` — Guarda configuración y reprograma el scheduler vía `restart()`.
  - `POST /api/backup/run` — Ejecuta backup manual bajo demanda.
  - Todos protegidos con `authMiddleware` y registran en auditoría.
- **Nuevo Componente Frontend (`SettingsView.tsx`):**
  - **Reescritura completa** del antiguo `SettingsView.tsx` con interfaz de configuración de backups.
  - **Toggle switch** para activar/desactivar backups automáticos (con feedback visual).
  - **Input de texto** para ruta de destino en el servidor SQL Server.
  - **Select** con opciones de hora (7:00 PM a 3:00 AM).
  - **Panel de estado** con información del último backup (fecha, estado, tamaño).
  - **Botones:** "Guardar configuración" y "Ejecutar backup ahora".
  - **Alertas** de éxito/error con temporizador de 4 segundos.
  - Sección informativa con detalles del backup (formato .bak, retención 30 días, etc.).
  - **Carga inicial:** Spinner mientras se obtiene la configuración del backend.
- **Infraestructura y Despliegue:**
  - Dependencias agregadas: `node-cron` + `@types/node-cron`.
  - Nuevo volumen en `docker-compose.yml`: `./config:/app/config` para persistir `backup-config.json`.
  - `config/` agregado a `.gitignore` (excepto `.gitkeep`) para evitar commits del archivo autogenerado.
  - `README-DEPLOY.md` actualizado sección 5 con instrucciones del módulo de backups.
- **Tipos TypeScript nuevos:**
  - `BackupConfig` — Interfaz con `enabled`, `destinationPath`, `time`, `lastBackup`, `lastBackupSize`, `lastBackupStatus`.

## 12. Asignación Masiva de Ubigeos vía API RUC (Nuevo)
- **Objetivo:** Automatizar la asignación de ubigeos a clientes que ya tienen RUC en la tabla `[dbo].[Clientes]` pero aún no tienen registro en `[dbo].[t_Clientes_ubigeo]`, eliminando la dependencia de la asignación manual por operadores.
- **API Externa:** Se integró `https://miapi.cloud/v1/ruc/{ruc}` con autenticación Bearer token.
  - El token se almacena en `.env` como `API_RUC_TOKEN` (agregado también a `.env.example`).
  - La API devuelve `domiciliado.ubigeo` (código de 6 dígitos) que se mapea directamente a `Ubigeos_SUNAT.ubigeo_6d`.
- **Nuevo Endpoint Backend (SSE - Server-Sent Events):**
  - `GET /api/ubigeo/asignar-masivo` — Endpoint protegido con `authMiddleware` que:
    1. Consulta clientes con `Documento` (RUC) no vacío que **no existen** en `t_Clientes_ubigeo`.
    2. Procesa en lotes de **3 concurrentes** (`Promise.all` con límite de concurrencia).
    3. Por cada RUC: llama a la API externa → busca en `Ubigeos_SUNAT` por `ubigeo_6d` → hace upsert en `t_Clientes_ubigeo`.
    4. Emite eventos SSE en vivo: `progress` (con processed/failed/skipped/total) y `complete` (con detalle completo).
    5. Registra en auditoría el resultado de la asignación masiva.
- **Nuevo Componente Frontend (`GestionUbigeoView.tsx`):**
  - Botón **"Asignar Ubigeos Automáticos"** con icono `Zap` en la barra de búsqueda.
  - Modal de progreso con:
    - **Barra de progreso** animada con porcentaje.
    - **Contadores en vivo**: Procesados (verde ✅), Fallidos (rojo ❌), Saltados (gris ⏭️).
    - **Cliente actual** mostrado en tiempo real mientras se procesa.
    - **Spinner** animado durante el proceso.
    - Al finalizar: botón **"Copiar detalle al portapapeles"** con resumen texto de cada RUC procesado/fallido/saltado.
    - Auto-refresh de la tabla de clientes al completar.
  - Manejo de desconexión: `EventSource` con listener `error` para capturar fallos de red.
- **Tipos TypeScript nuevos:**
  - `ApiRucResponse` — Mapea la respuesta de la API RUC externa.
  - `ProcesoMasivoEvento` — Interfaz para los eventos SSE de progreso.
- **Archivos modificados:**
  - `.env` y `.env.example` — Nueva variable `API_RUC_TOKEN`.
  - `src/types/index.ts` — Nuevas interfaces.
  - `server.ts` — Nuevo endpoint SSE (~110 líneas).
  - `GestionUbigeoView.tsx` — Botón + modal de progreso (~160 líneas agregadas).
- **Sin nuevas dependencias:** Usa `EventSource` nativo del navegador y SSE nativo de HTTP/Express.

## 13. Fix: Token API RUC en despliegue Docker
- **Problema:** El cliente reportó que todas las consultas RUC fallaban con `API responded 401` durante la asignación masiva de ubigeos.
- **Causa raíz:** El token `API_RUC_TOKEN` en `.env` había agotado su cuota de consultas en `miapi.cloud`. Además, en despliegue Docker el contenedor no recibía la variable porque:
  - `docker-compose.yml` no incluía `API_RUC_TOKEN` en la sección `environment`.
  - `.env` estaba excluido vía `.dockerignore` y no existía en el servidor del cliente.
- **Solución aplicada en `docker-compose.yml`:**
  - Se agregó `API_RUC_TOKEN=d97f7abd-3a43-4c6c-b7e9-9e1e84b9e919` hardcodeado en `environment` (solución temporal para proceso único, luego se recomienda usar `${API_RUC_TOKEN}` con un `.env` en el servidor).
- **Lección:** En despliegues Docker, las variables de entorno deben declararse explícitamente en `docker-compose.yml`. El archivo `.env` local del desarrollo no se transfiere automáticamente al contenedor en producción.

## 14. Asignación Masiva de Ubigeos vía API DNI (Nuevo)
- **Objetivo:** Extender la asignación automática de ubigeos a clientes con **DNI** (8 dígitos) en `[dbo].[Clientes]`, sin afectar los registros RUC ya procesados en `[dbo].[t_Clientes_ubigeo]`.
- **API Externa:** Se integró `https://miapi.cloud/v1/dni/{dni}` — mismo dominio, mismo `API_RUC_TOKEN` que el endpoint RUC.
  - La respuesta tiene estructura idéntica para ubigeo: `success → datos → domiciliado → ubigeo`.
  - El DNI se distingue del RUC por **longitud**: 8 dígitos = DNI, 11 dígitos = RUC.
- **Nuevo Endpoint Backend (SSE):**
  - `GET /api/ubigeo/asignar-masivo-dni` — Endpoint protegido con `authMiddleware` que:
    1. Consulta clientes con `LEN(Documento) = 8` que **no existen** en `t_Clientes_ubigeo`.
    2. Procesa en lotes de **3 concurrentes** (misma estrategia que RUC).
    3. Por cada DNI: llama a la API externa → busca en `Ubigeos_SUNAT` por `ubigeo_6d` → hace upsert en `t_Clientes_ubigeo`.
    4. Emite eventos SSE en vivo: `progress` y `complete`.
    5. Registra en auditoría con etiqueta "Asignación masiva DNI".
- **Modificación Frontend (`GestionUbigeoView.tsx`):**
  - Botón existente renombrado de "Asignar Ubigeos Automáticos" → **"Asignar Ubigeos RUC"**.
  - Nuevo botón **"Asignar Ubigeos DNI"** con icono `User` en la barra de búsqueda.
  - Nueva función `startMassAssignmentDni()` que conecta al endpoint SSE de DNI.
  - **Reutiliza el mismo modal de progreso** (barra, contadores, copiar detalle).
- **Compatibilidad con el proceso RUC existente (garantizada):**
  - `LEN(Documento) = 8` filtra exclusivamente DNI — los RUC (11 dígitos) no se seleccionan.
  - `NOT EXISTS` en `t_Clientes_ubigeo` excluye clientes ya procesados (todos los RUC).
  - El código del endpoint RUC no fue modificado — proceso completamente aislado.
- **Tipos TypeScript nuevos:**
  - `ApiDniResponse` — Mapea la respuesta de la API DNI externa con campos `dni`, `nombres`, `ape_paterno`, `ape_materno` y `domiciliado.ubigeo`.
- **Archivos modificados:**
  - `src/types/index.ts` — Nueva interfaz `ApiDniResponse`.
  - `server.ts` — Nuevo endpoint SSE (~110 líneas).
  - `GestionUbigeoView.tsx` — Botón DNI + función `startMassAssignmentDni`.
- **Sin nuevas dependencias:** Mismo `EventSource`, mismo `API_RUC_TOKEN`, misma lógica de upsert reutilizada.

## 15. Módulo Nisira Export (Nuevo)
- **Objetivo:** Exportar los datos de la tabla `[dbo].[tablaNisira]` (~80 campos) a un archivo **.dbf** (dBase III) para interoperabilidad con sistemas SUNAT y sistemas contables legacy.
- **Sidebar:**
  - Nuevo submenú **"Nisira Export"** (`icono: FileDown`) bajo Configuración, con ruta `/settings/nisira-export`.
  - Icono `FileDown` registrado en el resolver dinámico del `Sidebar.tsx`.
  - Módulo `id_modulo: 13` agregado a `rolesModulos` para Enterprise Admin.
- **Nueva Dependencia:**
  - `dbffile` v1.12.0 — Librería para crear archivos .dbf (dBase III/IV/FoxPro) desde Node.js.
- **Nuevos Archivos:**
  - **`src/types/nisira.ts`** — Interface `TablaNisira` con los ~80 campos de la tabla + `NisiraExportResponse`.
  - **`src/backend/services/NisiraExportService.ts`** — Service que:
    - Consulta `SELECT * FROM [dbo].[tablaNisira]` via pool `mssql`.
    - Define field descriptors para cada columna (tipo C, N, D según corresponda).
    - Convierte valores numéricos (`BIGINT`, `DECIMAL`, `INT`) de `string` a `Number` para compatibilidad con `dbffile`.
    - Convierte fechas (`DATE`) a objetos `Date` de JavaScript.
    - Genera archivo .dbf temporal en `os.tmpdir()` con nombre `NisiraExport_YYYYMMDD_HHMMSS.dbf`.
    - Limpia el archivo temporal post-descarga.
  - **`src/components/modules/NisiraExportView.tsx`** — Vista con:
    - Botón **"Exportar a DBF"** que primero consulta el conteo de registros.
    - Modal de confirmación mostrando la cantidad de registros a exportar.
    - Descarga del archivo .dbf vía `GET /api/nisira/export` (el navegador muestra el diálogo "Guardar como").
    - Alertas de éxito/error con iconos `CheckCircle`/`XCircle`.
    - Panel informativo con detalles del formato y la tabla origen.
- **Nuevo Endpoint Backend:**
  - `GET /api/nisira/export?count=true` — Retorna `{ success, count }` con el total de registros.
  - `GET /api/nisira/export` — Genera el archivo .dbf y lo envía como `res.download()`.
  - Protegido con `authMiddleware`, registra en auditoría con la cantidad de registros exportados.
- **Bugs encontrados y corregidos durante desarrollo:**
  - **`expected a number`:** Los campos `BIGINT`, `DECIMAL` e `INT` llegaban como `string` desde SQL Server. Se agregó conversión a `Number` en `mapRecord()` basada en los field descriptors de tipo `N`.
  - **`EEXIST: file already exists`:** El nombre del archivo temporal solo usaba la fecha, generando conflictos en exportaciones同一 día. Se agregó timestamp (`HHMMSS`) al nombre y limpieza previa con `fs.existsSync` + `fs.unlinkSync`.
- **Archivos modificados:**
  - `src/types/index.ts` — Re-export de `TablaNisira` y `NisiraExportResponse`.
  - `server.ts` — Nuevo endpoint `GET /api/nisira/export` (~25 líneas).
  - `src/backend/db/database.ts` — Módulo `id_modulo: 13` agregado a Configuración y a `rolesModulos[1]`.
  - `src/components/layout/Sidebar.tsx` — Import + case para `FileDown`.
  - `src/App.tsx` — Import + ruta `'/settings/nisira-export'` → `NisiraExportView`.
- **Prueba de exportación exitosa:**
  - 10 registros exportados, 86 campos, archivo .dbf de 38,607 bytes.
  - Formato dBase III (cabecera `0x03`) válido y readable por `DBFFile.open()`.
  - Valores numéricos, fechas y strings correctamente mapeados.

## 16. Nisira Export: Ejecución previa del SP `sp_Exporta_Nisira`
- **Objetivo:** Permitir que, antes de exportar la tabla Nisira, el sistema ejecute el stored procedure `[dbo].[sp_Exporta_Nisira]` con los parámetros **Día, Mes y Año** (tal como requiere el SP) para que regenere los datos de `[dbo].[tablaNisira]` con las facturas, boletas, notas de crédito y guías de la fecha indicada.
- **Flujo definido (2 pasos):**
  1. **1 · Generar tabla Nisira (Ejecutar SP):** El usuario ingresa Día / Mes / Año y presiona "Ejecutar SP y generar tabla". Al terminar, mostrará la cantidad de registros generados y abrirá automáticamente el modal de confirmación de exportación.
  2. **2 · Exportar a DBF:** Botón existente, exporta el contenido actual de `[dbo].[tablaNisira]` a `.dbf`.
- **Nuevo Endpoint Backend:**
  - `POST /api/nisira/generar` — Ejecuta `sp_Exporta_Nisira` mediante `pool.request().input('dia', sql.Int)... .execute()`, valida Día (1-31), Mes (1-12) y Año (2000-2100), responde `{ success, count }` y registra en auditoría la fecha y cantidad generada. Ante fallo a mitad (el SP hace `delete` + inserts), devuelve un error claro avisando que la tabla pudo quedar incompleta.
- **Nueva función en el Service (`NisiraExportService.ts`):**
  - `runNisiraSp(dia, mes, anio)` — Ejecuta `EXEC [dbo].[sp_Exporta_Nisira]` con inputs tipados `sql.Int` y devuelve el conteo real de la tabla tras la ejecución.
- **Modificación Frontend (`NisiraExportView.tsx`):**
  - Nueva tarjeta **"1 · Generar tabla Nisira (Ejecutar SP)"** con tres inputs numéricos **Día / Mes / Año** prellenados con la fecha actual y botón con spinner mientras corre el SP.
  - La tarjeta existente de exportación pasó a llamarse **"2 · Exportar a DBF"**.
  - Panel de información actualizado con el nuevo flujo.
- **Compatibilidad:** La exportación (`GET /api/nisira/export`) no fue modificada; si se usa sin generar, exporta el contenido actual de la tabla.
- **Sin dependencias nuevas:** El SP no se modifica; solo se invoca con parámetros tipados.

## 17. Nisira Export Direct (Nuevo)
- **Objetivo:** Exportar la tabla `[dbo].[tablaNisira]` a un archivo **.dbf** directamente en la **carpeta compartida de red** del cliente (`X:\FACTURACION_EDOC_CODINSA\DBFCODINSA\`, share `contasoft`), sin descargar por el navegador. Esto permite que el otro sistema/operador lea el archivo desde esa carpeta. Se mantiene el **Nisira Export** genérico (descarga) intacto para uso en otras PCs/OS.
- **Sidebar:**
  - Nuevo submenú **"Nisira Export Direct"** (`icono: FolderOutput`) bajo Configuración, con ruta `/settings/nisira-export-direct`.
  - Icono `FolderOutput` registrado en el resolver dinámico del `Sidebar.tsx`.
  - Módulo `id_modulo: 14` agregado a `rolesModulos` para Enterprise Admin.
- **Nuevo archivo de configuración (`src/backend/nisiraConfig.ts`):**
  - Clase `NisiraExportConfigManager` que persiste la configuración en `config/nisira-config.json` (mismo patrón que `BackupConfigManager`).
  - Campo `destinationPath` con default `X:\FACTURACION_EDOC_CODINSA\DBFCODINSA\`.
  - **Precedencia de la ruta:** variable de entorno `NISIRA_EXPORT_DIR` (para Docker, que ve el punto de montaje `/app/nisira-export`) sobre el config file (para Windows nativo).
  - Registro del último export (`lastExport`, `lastExportCount`, `lastExportStatus`).
- **Refactor del Service (`NisiraExportService.ts`):**
  - Extracción de la generación del .dbf a la función reutilizable `buildNisiraDbf(records, targetPath)`.
  - Nueva función `getNisiraRecords()` (consulta única de `SELECT *`).
  - Nueva función `exportNisiraToDbfDirect(destDir)`:
    - Valida que la ruta destino exista; si no → error claro *"La ruta destino no existe o no es accesible desde el servidor"*.
    - Genera el archivo `NisiraExport_YYYYMMDD_HHMMSS.dbf` directamente en la ruta.
    - Retorna `{ filePath, count, filename }`.
- **Nuevos Endpoints Backend:**
  - `GET /api/nisira/direct-config` — Obtiene la configuración actual (con override de env).
  - `PUT /api/nisira/direct-config` — Guarda `destinationPath` (validación no vacío) y registra en auditoría.
  - `POST /api/nisira/export-direct` — Ejecuta `exportNisiraToDbfDirect` con la ruta configurada, registra el último export y audita con la ruta y cantidad.
  - Todos protegidos con `authMiddleware`.
- **Nuevo Componente Frontend (`NisiraExportDirectView.tsx`):**
  - Mismo flujo de 2 pasos que Nisira Export: tarjeta **"1 · Generar tabla Nisira (Ejecutar SP)"** (Día/Mes/Año) y tarjeta **"2 · Exportar directo a ruta"**.
  - **Input editable de ruta destino** (cargado desde la config) con botón **Guardar** (`PUT /api/nisira/direct-config`).
  - Botón **"Exportar directo a ruta"** → modal de confirmación mostrando la ruta destino y el conteo → `POST /api/nisira/export-direct`.
  - Feedback de éxito con la ruta completa y cantidad; panel informativo del formato y la ruta destino.
  - Textos informativos referenciando la ruta compartida de red **`X:\FACTURACION_EDOC_CODINSA\DBFCODINSA\`** (share `contasoft`) y el montaje en Docker sobre `C:\contasoft\FACTURACION_EDOC_CODINSA\DBFCODINSA`.
- **Despliegue Docker (`docker-compose.yml`):**
  - Nueva variable `NISIRA_EXPORT_DIR=/app/nisira-export`.
  - **Topología confirmada con el cliente:** la app corre en la misma `SERVER` que comparte `contasoft`. La letra `X:` es el share `contasoft` mapeado, cuya carpeta física local es `C:\contasoft` (obtenido con `net share contasoft`).
  - Nuevo volumen: `- C:/contasoft/FACTURACION_EDOC_CODINSA/DBFCODINSA:/app/nisira-export` — monta la carpeta local detrás del share, por lo que el `.dbf` queda disponible en `X:\FACTURACION_EDOC_CODINSA\DBFCODINSA\` desde cualquier PC con el share mapeado.
  - **Sin scripts ni tareas programadas:** al montar el folder local físico directamente, Windows expone los archivos al share de red automáticamente.
  - Requisito previo: crear `C:\contasoft\FACTURACION_EDOC_CODINSA\DBFCODINSA` antes del `docker compose up -d`.
- **Archivos modificados:**
  - `src/backend/services/NisiraExportService.ts` — Refactor + `exportNisiraToDbfDirect`.
  - `src/backend/nisiraConfig.ts` — Nuevo config manager.
  - `src/types/nisira.ts` — Nueva interfaz `NisiraDirectConfig`.
  - `src/types/index.ts` — Re-export de `NisiraDirectConfig`.
  - `server.ts` — 3 endpoints nuevos (~75 líneas).
  - `src/backend/db/database.ts` — Módulo `id_modulo: 14` + `rolesModulos[1]`.
  - `src/components/layout/Sidebar.tsx` — Import + case para `FolderOutput`.
  - `src/App.tsx` — Import + ruta `'/settings/nisira-export-direct'`.
  - `docker-compose.yml` — Env + volumen de montaje.
  - `README-DEPLOY.md` — Sección 5.3 reescrita (topología, verificación con `net share contasoft`, requisitos previos y pasos de prueba).
- **Despliegue pendiente con el cliente (pasos a realizar en la PC `SERVER`):**
  1. Crear `C:\contasoft\FACTURACION_EDOC_CODINSA\DBFCODINSA` si no existe.
  2. `git pull` + ejecutar `update.bat` (o `update.sh`).
  3. Verificar montaje: `docker compose exec toolkit-app ls /app/nisira-export` debe listar la carpeta.
  4. En la app → `Configuración > Nisira Export Direct`: ejecutar el SP y "Exportar directo a ruta"; confirmar que el `.dbf` aparece en `X:\FACTURACION_EDOC_CODINSA\DBFCODINSA\`.
- **Sin dependencias nuevas:** Reutiliza `dbffile`, `authMiddleware` y el patrón de config existente. Sin scripts ni tareas programadas de Windows.

## 18. Módulo Actualización ERP (Nuevo)

**24/08/2026** — Nuevo submódulo "Actualización ERP" dentro de Configuración (configurador + descarga del instalador en una sola vista).

- **Objetivo:** distribuir a los clientes la actualización del Sistema ERP Nube sin intervención técnica manual. El administrador pega el enlace de Google Drive del ZIP (+ SHA256 opcional) y descarga un `.bat` generado dinámicamente que hace todo en la PC del cliente.
- **Plantilla autocontenida `updates/Actualizar_ERP_Nube.bat` (ASCII + CRLF):**
  - Auto-elevación admin vía PowerShell (`fltmc` + `Start-Process -Verb RunAs`).
  - Descarga desde Google Drive con `curl.exe` (fallback `Invoke-WebRequest`, URL pública con `confirm=t`).
  - Validación SHA256 con `certutil` — **opcional**: si `@@ZIP_SHA256@@` va vacío se omite (queda chequeo de tamaño > 1MB).
  - Extracción con `tar.exe` (fallback `Expand-Archive`), cierre de procesos `COD_*.exe` (`taskkill`), copia de EXE al Escritorio real del usuario (OneDrive-safe) y DLLs a `C:\Windows\SysWOW64`, registro con `regsvr32.exe /s`.
  - Archivos de este sistema: `COD_ALMACEN/COD_COMPRAS/COD_CUENTAS/COD_SEGURIDAD/COD_VENTAS.exe` al Escritorio; `CodEstadisticas/CodInstall/CodMaestros/CodProcesos/CodSeguridad.dll` a SysWOW64.
  - Log en `%TEMP%\codinsa_instalador.log`, resumen OK/ERRORES, limpieza. Requiere Windows 10 (1803+)/11 de 64 bits. Mensajes con guiones en lugar de paréntesis dentro de bloques `if` (evita cierres prematuros de bloques).
  - Marcadores reemplazados por el servidor en cada descarga: `@@DRIVE_ID@@`, `@@ZIP_NAME@@`, `@@ZIP_SHA256@@`.
- **Persistencia (JSON, patrón del proyecto):** nuevo `ErpUpdateConfigManager` (`src/backend/erpUpdateConfig.ts`) sobre `config/erp-update-config.json` (volumen Docker ya montado). Guarda config activa + historial (máx. 20). Interfaz `ErpUpdateConfig` en `src/types/index.ts`.
- **Backend (`server.ts`, sección 3h):**
  - `GET /api/config/erp-update` — config activa + historial.
  - `PUT /api/config/erp-update` — extrae el ID del enlace con regex que soporta `/file/d/ID`, `?id=ID` y `/d/ID`; valida ID `[A-Za-z0-9_-]{10,}`, SHA256 hex-64 opcional y nombre ZIP sanitizado (default `actualizacionERP.zip`); guarda + push al historial + auditoría `'Actualización ERP'`.
  - `GET /api/updates/actualizar-erp` — sustituye marcadores y sirve el .bat como attachment (`Content-Disposition`); 400 si no hay config vigente; audita cada descarga. Todos con `authMiddleware`.
- **Frontend:**
  - Módulo `{ id_modulo: 15, 'Actualización ERP', icono 'CloudDownload', ruta '/settings/erp-update', orden 4 }` como child de Configuración; solo en `rolesModulos[1]`.
  - Nueva vista `ErpUpdateView.tsx`: formulario (enlace Drive, SHA256 opcional, nombre ZIP, nota), tarjeta "Instalador para clientes" con botón de descarga (ancla directa, sesión vía cookie; deshabilitado sin config), tabla de historial e instrucciones para el cliente.
  - `Sidebar.tsx` (icono) y `App.tsx` (ruta) actualizados.
- **Dockerfile:** `COPY --from=builder /app/updates ./updates` para que la plantilla exista en la imagen de producción.
- **Sin migración BD ni dependencias nuevas.**
- **Pendiente de prueba en PC cliente Windows real** (descarga Drive, validación hash, copias y registro regsvr32).
- Estado: 🔶

## 19. Reportes / Cuentas / Reporte de Cobranzas

**30/08/2026** — Nuevo reporte operativo basado en `sp_Cobranzas_reporte`.

- **Navegación y permisos:**
  - Se reactivó y renombró el módulo oculto `Reports` como **Reportes**, ubicado inmediatamente debajo de Productos.
  - Se implementó navegación recursiva de tres niveles: **Reportes → Cuentas → Reporte de Cobranzas**.
  - Nueva ruta `/reports/accounts/collections`, disponible para Administrador, Auditor Senior y Gestor Operativo mediante los módulos `16` y `17`.
  - El sidebar también fue corregido para funcionar dentro del menú móvil.
- **Backend y procedimiento almacenado:**
  - Nuevo endpoint protegido `GET /api/reportes/cobranzas?desde=YYYY-MM-DD&hasta=YYYY-MM-DD`.
  - Valida fechas obligatorias, fechas calendario reales y que `desde` no sea posterior a `hasta`.
  - Ejecuta exclusivamente `[dbo].[sp_Cobranzas_reporte]` con parámetros SQL, sin modificar ni reproducir la consulta del SP.
  - La ejecución usa `SET DATEFORMAT dmy` y transforma las fechas a `dd/MM/yyyy`, tal como requiere el procedimiento existente.
  - Normaliza importes nulos y devuelve registros, cantidad total y sumatorias de Importe, Pago anterior, Nota de crédito, Descuento, Efectivo, Depósito, Letra, Transferencia, Cheque, Total y Saldo.
  - `NroOperacion` permanece como identificador y el campo `Total` se respeta exactamente como lo devuelve el SP.
- **Interfaz (`CollectionsReportView`):**
  - Rango inicial desde el primer día del mes actual hasta hoy; la consulta solo se ejecuta al pulsar **Generar reporte**.
  - Estados diferenciados de carga, error, rango inválido y consulta sin resultados.
  - Resumen con registros encontrados y total general cobrado en formato `es-PE` / PEN.
  - Tabla con las 17 columnas del procedimiento y paginación de 20 registros; las exportaciones siempre utilizan todos los resultados.
  - Botones Excel/PDF deshabilitados hasta disponer de información válida.
- **Exportaciones profesionales:**
  - XLSX con hoja **Reporte de Cobranzas**, datos numéricos y fechas tipados, autofiltro, fila superior congelada, anchos configurados y fila final de totales.
  - PDF A3 horizontal con encabezados repetidos, filas alternadas y tabla compacta para todas las columnas.
  - Cada página PDF muestra `COMPAÑIA DISTRIBUIDORA AMERICANA S.A.C.`, rango, fecha/hora y numeración `Página X de Y`; la última fila contiene los totales monetarios.
  - Archivos nombrados `Reporte_Cobranzas_DESDE_al_HASTA.xlsx|pdf`.
- **Corrección visual responsive:**
  - Se añadieron límites `min-w-0` / `max-w-full` al layout y al reporte para impedir que la tabla ensanche y recorte toda la página.
  - La tabla dispone de scroll horizontal propio, visible y táctil, con indicador de desplazamiento.
  - **Documento** y **Razón social** permanecen fijos mientras se recorren las columnas monetarias.
  - Filtros, rango consultado, tarjetas y paginación se reorganizan sin perder el borde derecho en escritorio, tablet o móvil.
- **Tipos y archivos principales:**
  - Nuevos tipos `CobranzaReporteRow`, `CobranzaReporteTotals` y `CobranzaReporteResponse`.
  - Componentes y utilidades centrales: `CollectionsReportView.tsx`, `server.ts`, `exportUtils.ts`, `Sidebar.tsx` y `App.tsx`.
- **Validación:** `npm run lint`, `npm run build` y `git diff --check` finalizaron correctamente. El build mantiene únicamente la advertencia informativa preexistente sobre tamaño del bundle.
- Estado: ✅

## 20. Reportes / Cuentas / Planilla Cobranza

**30/08/2026** — Nuevo documento operativo basado en `sp_Planilla_cobranza`.

- Se agregó **Planilla Cobranza** como segundo reporte de Cuentas, con ruta `/reports/accounts/collection-sheet` y acceso para los tres roles operativos del módulo Reportes.
- Selectores dependientes de Serie y Número cargados desde `PlanC_cobranza`; los números muestran fecha y vendedor para facilitar su identificación.
- Nuevos endpoints protegidos:
  - `GET /api/reportes/planillas-cobranza/series` — series disponibles sin espacios residuales de `CHAR(4)`.
  - `GET /api/reportes/planillas-cobranza/numeros?serie=...` — números de la serie ordenados por fecha descendente, con vendedor.
  - `GET /api/reportes/planilla-cobranza?serie=...&numero=...` — genera el documento ejecutando el SP con parámetros `Char(4)` y `Char(8)` sin modificar el procedimiento.
- La respuesta se normaliza en encabezado, detalle y totales. Los campos `CHAR` se limpian, los importes nulos se convierten en cero y `NotaCred` se conserva como referencia textual.
- Se conserva el `Total` parcial devuelto por el SP y se agrega `TotalGeneral`, calculado con Descuento + Efectivo + Depósito + Letra + Transferencia + Cheque.
- Nueva vista tipo documento A4 con membrete, Serie–Número, vendedor, fechas, forma de pago, documentos, referencias, resumen por medios de pago, total general y espacios de firma.
- PDF A4 vertical multipágina con encabezados repetidos, referencias, numeración, resumen final y firmas.
- XLSX con hojas **Planilla** y **Detalle**, fechas/importes tipados, autofiltro, fila congelada, anchos de columna y totales.
- Nuevos tipos `PlanillaCobranzaHeader`, `PlanillaCobranzaItem`, `PlanillaCobranzaTotals`, `PlanillaCobranzaResponse` y tipos para selectores.
- Archivos principales: `CollectionSheetView.tsx`, `server.ts`, `exportUtils.ts`, `database.ts`, `Sidebar.tsx`, `App.tsx` y `types/index.ts`.
- **Validación:** `npm run lint`, `npm run build` y `git diff --check` finalizaron correctamente. Se conserva únicamente la advertencia informativa preexistente sobre tamaño del bundle.
- Estado: ✅

---
*Última actualización: 30 de Agosto, 2026*
