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

---
*Última actualización: 22 de Julio, 2026*
