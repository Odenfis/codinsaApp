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

## 21. Adecuación oficial de Planilla Cobranza

**31/08/2026** — La Planilla Cobranza fue alineada al documento operativo `Formato Planilla.xlsx`.

- La respuesta del SP ahora incorpora `RucCliente`, `Lugar` y `Banco`, preservando códigos e identificadores como texto.
- Se versionó `sql/sp_Planilla_cobranza.sql` con el procedimiento actualizado y la columna adicional de RUC necesaria para separar cliente y documento cobrado.
- Se creó un modelo compartido de presentación para pantalla, Excel y PDF: localidad única/`VARIAS`, páginas de 15 documentos, depósitos (incluida transferencia), cheques y totales reconciliados.
- La vista conserva controles, tarjetas, colores y navegación actuales, pero el documento reproduce logo, cabecera, tabla operativa, leyenda, depósitos, cheques, resumen, firmas y observaciones.
- El Excel se genera como una única planilla imprimible horizontal, con imagen, celdas combinadas, bordes, fechas/importes tipados, fórmulas de totales y saltos de página.
- El PDF se genera en A4 horizontal con el mismo orden documental y cabeceras repetidas.
- Los archivos mantienen el nombre `Planilla_Cobranza_SERIE_NUMERO.xlsx|pdf`.
- **Validación:** TypeScript, lint, build y `git diff --check` ejecutados correctamente; se mantiene la advertencia informativa de tamaño de bundle.
- Estado: ✅

## 22. Ajuste de RUC, Lugar y logotipo en Planilla Cobranza

**31/08/2026** — Refinamiento visual y de datos posterior a la validación del formato oficial.

- El procedimiento versionado adopta el alias `c.Documento AS RUC`; la API normaliza `RUC` como texto y conserva compatibilidad temporal con el alias anterior `RucCliente`.
- Se amplió la columna Lugar en pantalla, Excel y PDF, recuperando espacio de forma proporcional desde Nombre y medios de pago para conservar el ancho A4 horizontal.
- Lugar incorpora separación interna y tooltip en la vista para evitar colisión visual con Tipo cuando contiene textos como `TRUJILLO, ALREDEDORES`.
- El logotipo oficial se recorta en memoria usando el canal alfa del PNG, sin modificar `assets/logotipo.png`, y se muestra con un tamaño mayor en los tres formatos.
- **Validación:** TypeScript, lint, build y `git diff --check` finalizaron correctamente. El bundle de Excel continúa cargándose bajo demanda.
- Estado: ✅

## 23. Corrección de proporción y flujo del PDF de Planilla Cobranza

**31/08/2026** — Corrección posterior a la revisión visual de los documentos exportados.

- El procesador del logotipo ahora expone sus dimensiones recortadas y relación de aspecto; Excel y PDF calculan el ancho desde una altura objetivo para impedir cualquier deformación.
- El resumen inferior del PDF se genera como una tabla única, evitando la superposición de etiquetas e importes.
- Depósitos y cheques se renderizan en una sola tabla coordinada, con columnas simétricas, encabezados repetibles y filas vacías cuando las cantidades difieren.
- Firmas, observaciones y numeración se posicionan a partir del final real de las tablas; los movimientos extensos pueden continuar en páginas adicionales sin invadir el cierre del documento.
- **Validación:** `npm run lint`, `npm run build` y `git diff --check` finalizaron correctamente; solo permanece la advertencia informativa preexistente sobre el tamaño del bundle.
- Estado: ✅

## 24. Separación de Transferencia en Planilla Cobranza

**01/09/2026** — Incorporación explícita de Transferencia en todo el formato operativo.

- Se aprovechó la columna `pd.Transferencia` ya expuesta por `sp_Planilla_cobranza`, la API y los tipos existentes; no fue necesario modificar el procedimiento almacenado ni el contrato del endpoint.
- El modelo compartido dejó de acumular Transferencia dentro de Depósito y ahora calcula `deposito`, `letra`, `transferencia` y `cheque` por separado. `Total cobrado` conserva la suma de Descuento + Efectivo + Depósito + Letra + Transferencia + Cheque.
- En la vista previa, **Transferencia** aparece entre **Letras** y **Cheque** dentro de Forma de Pago, incluyendo valores por documento, fila de totales y `TOTAL TRANSFERENCIA` en el resumen inferior.
- Depósitos, Transferencias y Cheques disponen de bloques independientes. Las transferencias muestran monto, número de operación, fecha y banco, y los registros con importe cero quedan excluidos del detalle.
- El Excel se amplió de `A:O` a `A:P`; se reajustaron anchos, celdas combinadas, fórmulas, área de impresión, resumen, firmas y observaciones para conservar la planilla horizontal imprimible.
- El PDF A4 horizontal incorpora la nueva columna y distribuye los tres bloques de movimientos de forma coordinada, manteniendo el flujo multipágina y evitando superposiciones con firmas, observaciones y numeración.
- Se conservaron el diseño, colores, logotipo, tipografía, paginación de 15 documentos y nombres `Planilla_Cobranza_SERIE_NUMERO.xlsx|pdf`.
- **Validación:** `npm run lint`, `npm run build` y `git diff --check` finalizaron correctamente; solo permanece la advertencia informativa preexistente sobre el tamaño del bundle.
- Estado: ✅

## 25. Dashboard con estadísticas reales de ventas y pedidos

**02/09/2026** — Las tres primeras tarjetas del dashboard dejaron de usar métricas simuladas y ahora consultan los procedimientos almacenados operativos de SQL Server.

- **Ventas del Mes:** ejecuta `[dbo].[sp_Estadistica_VentasMes]` con el mes y año actuales del servidor. Muestra `TotVentas` como importe PEN y `NroVentas` como cantidad de operaciones; el nombre del mes y el año aparecen en la tarjeta.
- **Ventas Mes Anterior:** ejecuta `[dbo].[sp_Estadistica_VentasMesAntes]` pasando el mes y año actuales. El procedimiento conserva su propia lógica de retroceso y la interfaz calcula la etiqueta correspondiente, incluido el cambio de enero a diciembre del año anterior.
- **Pedidos por Facturar:** ejecuta `[dbo].[sp_Estadistica_PedidosxFacturar]` sin parámetros y muestra `PedxFacturar`.
- El endpoint protegido `GET /api/dashboard/summary` ahora es asíncrono, utiliza parámetros `sql.Int`, normaliza nulos y valores numéricos, informa la hora real de actualización y devuelve un error controlado si SQL Server o un procedimiento falla.
- La interfaz formatea importes con `Intl.NumberFormat` para `es-PE` y moneda PEN, conserva correctamente los valores cero y muestra estados de carga/error sin afectar el resto del dashboard.
- Se conservaron sin cambios la cuarta tarjeta, los endpoints de actividad y transacciones, el gráfico, los accesos rápidos y la exportación existente.
- **Validación:** `npm run lint`, `npm run build` y `git diff --check` finalizaron correctamente.
- Estado: ✅

## 26. Refinamiento visual de las tarjetas KPI del dashboard

**02/09/2026** — Se mejoró la distribución vertical de las cuatro tarjetas KPI para separar con claridad el valor principal de su texto descriptivo.

- La altura uniforme de las tarjetas aumentó de `130px` a `150px`, conservando el padding, bordes, colores, sombras e iconografía existentes.
- Cada tarjeta quedó organizada en una cabecera y un bloque inferior que agrupa el valor con su descripción mediante una separación explícita de `8px`.
- Se ajustaron alturas de línea, alineación de iconos, cifras tabulares y comportamiento de textos largos para evitar desbordes en escritorio, tablet y móvil.
- El cambio es exclusivamente visual; no modifica procedimientos almacenados, endpoints, contratos, cálculos ni formatos de datos.
- **Validación:** `npm run lint`, `npm run build` y `git diff --check` finalizaron correctamente.
- Estado: ✅

## 27. Centrado vertical de los valores KPI del dashboard

**03/09/2026** — Se reorganizaron las cuatro tarjetas KPI para aprovechar mejor su espacio vertical y destacar las cifras principales.

- Cada tarjeta utiliza tres zonas consistentes: cabecera fija, valor principal dentro de una zona central flexible y descripción fija al pie.
- Los importes y cantidades permanecen alineados a la izquierda, pero ahora quedan centrados verticalmente en el espacio disponible entre la cabecera y el texto secundario.
- Se conservaron la altura de `150px`, los tamaños tipográficos, colores, iconos, bordes, sombras y comportamiento responsive existentes.
- Se agregaron controles de ancho y truncamiento para impedir que cifras o descripciones extensas desborden las tarjetas.
- El cambio es exclusivamente visual; no modifica procedimientos almacenados, endpoints, contratos, cálculos ni formatos de datos.
- **Validación:** `npm run lint`, `npm run build` y `git diff --check` finalizaron correctamente.
- Estado: ✅

## 28. Reportes / Almacén / Kardex de Productos

**22/09/2026** — Nuevo reporte mensual de inventario valorizado basado en `sp_KardexDelMesX`.

- Se agregó la navegación de tres niveles **Reportes → Almacén → Kardex de Productos**, con ruta `/reports/warehouse/product-kardex`, iconos propios y acceso para Administrador, Auditor Senior y Gestor Operativo mediante los módulos `19` y `20`.
- Se versionó el procedimiento proporcionado en `sql/sp_KardexDelMesX.sql` sin alterar su lógica interna.
- Nuevo endpoint protegido `GET /api/reportes/kardex-productos?mes=...&anio=...`:
  - Valida mes y año como enteros dentro de rangos permitidos.
  - Ejecuta `[dbo].[sp_KardexDelMesX]` con parámetros `sql.Int`.
  - Lee posteriormente `LibInvValorizado`, ya que el procedimiento carga la tabla pero no devuelve un conjunto de resultados.
  - Normaliza textos, cantidades e importes y devuelve periodo, registros y totales de saldo inicial, ingresos, salidas, saldo final y valor.
  - Registra la generación en auditoría.
- La ejecución y lectura se realizan en una transacción `SERIALIZABLE` protegida con `sp_getapplock`, evitando que dos solicitudes de la aplicación para meses diferentes mezclen el contenido de la tabla compartida `LibInvValorizado`.
- Nueva vista `ProductKardexReportView.tsx` con logotipo oficial en la cabecera superior izquierda, selectores de mes/año, estados de carga/error/sin resultados, seis tarjetas resumen, tabla responsive con scroll horizontal, código fijo y paginación de 20 productos.
- Exportación Excel profesional con `exceljs`: logo, título, periodo, fecha de generación, datos numéricos, formatos de cantidades/importes, autofiltro, encabezado congelado, totales y configuración de impresión horizontal.
- Exportación PDF A4 horizontal con logo, periodo, fecha/hora, encabezados repetidos, filas alternadas, totales y numeración `Página X de Y`.
- Nuevos tipos compartidos: `KardexProductoRow`, `KardexProductoTotals` y `KardexProductoResponse`.
- **Validación:** `npm run lint`, `npm run build` y `git diff --check` finalizaron correctamente. La ejecución real del SP queda para la prueba funcional con el periodo que seleccione el usuario, porque el procedimiento reemplaza el contenido global de `LibInvValorizado`.
- Estado: ✅

## 29. Reportes / Almacén / Stock Valorizado

**22/09/2026** — Nuevo reporte mensual por producto, lote y almacén basado en `[dbo].[sp_KardexDelMesD]`.

- Se agregó **Stock Valorizado** bajo **Reportes → Almacén**, con ruta `/reports/warehouse/valued-stock` y los mismos permisos de menú que Kardex de Productos (módulo `21`).
- El procedimiento proporcionado se versionó en `sql/sp_KardexDelMesD.sql`; su ejecución continúa llamando al auxiliar existente `sp_KardexDelMesD1`.
- El endpoint autenticado `GET /api/reportes/stock-valorizado?mes=...&anio=...` valida el periodo, ejecuta el SP y consulta `LibInvValorizadoD` dentro de una transacción `SERIALIZABLE` protegida con `sp_getapplock`. Devuelve saldos finales, movimientos asociados, cantidad de lotes y totales.
- Cada combinación producto/lote/almacén conserva su fila `Numero = 0` como saldo inicial y ordena los movimientos por `Numero`, igual que el cursor del SP. El saldo y valor final se toman del último movimiento, o de la fila inicial si no hubo movimientos. Los valores de distintas filas de un mismo lote no se suman.
- La vista incluye logo oficial, Mes/Año, tarjetas resumen, tabla adaptable paginada y detalle desplegable de movimientos por lote.
- Excel contiene hojas **Saldos finales** y **Movimientos**, con logo, datos numéricos, autofiltro y totales; PDF A4 horizontal contiene el resumen con logo, periodo, fecha, encabezados repetidos y paginación.
- Se agregaron los tipos `ValuedStockMovement`, `ValuedStockRow`, `ValuedStockTotals` y `ValuedStockResponse`, más pruebas del agrupamiento y totales.
- **Validación:** pruebas unitarias, TypeScript, build, `git diff --check` y revisión visual en escritorio/móvil. Una ejecución de agosto de 2026 dentro de una transacción revertida generó 1458 lotes y 1350 movimientos; el total calculado (`S/ 1,797,952.95` al formatear) coincidió con la consulta SQL de las últimas filas. Otro periodo sin movimientos conservó los saldos iniciales como finales. `LibInvValorizadoD` conservó sus 11 filas previas tras el `ROLLBACK`.
- Estado: ✅

## 30. Reportes / Almacén / Stock de Productos

**22/09/2026** — Reporte de existencias por producto y lote basado en `[dbo].[sp_Productos_SaldosStock]`.

- Se añadió **Stock de Productos** bajo **Reportes → Almacén**, con ruta `/reports/warehouse/product-stock` y los mismos permisos de los reportes de Almacén (módulo `22`).
- Se versionó el procedimiento proporcionado en `sql/sp_Productos_SaldosStock.sql`, sin modificar sus filtros ni cálculos. A diferencia de los kardex mensuales, no requiere Mes/Año y no reemplaza tablas: la consulta se carga al abrir la vista y puede actualizarse manualmente.
- El endpoint autenticado `GET /api/reportes/stock-productos` ejecuta el SP sin parámetros, normaliza códigos, textos, cantidades, PVF y vencimiento, devuelve fecha de consulta y audita la operación. La respuesta impide caché para reflejar el stock vigente.
- La vista mantiene el estándar de Almacén: logo oficial, resumen, tabla adaptable con scroll horizontal y paginación de 20 lotes, estados de carga/error/sin datos, Excel y PDF con logo y fecha de consulta.
- Por defecto se muestran **todas las filas devueltas por el SP**, incluidos lotes con stock cero o vencidos. Se añadieron búsqueda y filtros visibles de stock positivo y vencimiento; las tarjetas y exportaciones utilizan el mismo conjunto filtrado.
- El total de unidades suma el stock de los lotes visibles; `PVF` se presenta como precio unitario de venta y no se suma como valor de inventario.
- **Validación:** pruebas de filtros y resúmenes, consulta real con 1,478 lotes, 1,136 productos, 75,228 unidades y 42 lotes vencidos. Se verificó visualmente la vista en escritorio y móvil, incluida la combinación de stock positivo y vencidos (16 lotes). Lint, build y `git diff --check` finalizaron correctamente.
- Estado: ✅

## 31. Reportes / Ventas / Avance de Ventas

**23/09/2026** — Nuevo reporte mensual de ventas por laboratorio basado en `[dbo].[sp_Ventas_avanceCodinsa]`.

- Se agregó la navegación **Reportes → Ventas → Avance de Ventas**, con ruta `/reports/sales/sales-progress` y acceso para Administrador, Auditor Senior y Gestor Operativo mediante los módulos `23` y `24`.
- Se versionó el procedimiento proporcionado en `sql/sp_Ventas_avanceCodinsa.sql` sin modificar su consulta.
- Nuevos endpoints autenticados:
  - `GET /api/reportes/ventas/laboratorios` devuelve los 279 laboratorios disponibles, con códigos `CHAR(2)` normalizados y orden por descripción.
  - `GET /api/reportes/avance-ventas?labora=...&mes=...&anio=...` valida los tres parámetros, comprueba el laboratorio y ejecuta el procedimiento con `sql.Char(2)` y `sql.Int`.
- La API normaliza textos, fechas, cantidades e importes, conserva códigos e identificadores como texto, ordena el resultado y devuelve totales de líneas, clientes, documentos, unidades y venta.
- La vista incorpora logo oficial, combo buscable por nombre o código, Mes/Año, generación manual, cinco KPIs, búsqueda local, tabla de 16 columnas con RUC y Cliente fijos, paginación de 20 registros y estados de carga/error/sin resultados.
- Excel incluye logo, periodo, laboratorio, datos tipados, autofiltro, encabezados congelados y totales. PDF A3 horizontal incluye cabeceras repetidas, totales y paginación. Ambas exportaciones respetan el filtro visible.
- Se agregaron tipos compartidos, modelo de normalización/resumen/búsqueda y pruebas unitarias para códigos con ceros iniciales, fechas, totales, unicidad, filtros, parámetros inválidos y periodos vacíos.
- **Validación real:** laboratorio `65` (GABBLAN S.A.C.), septiembre de 2026: 17 líneas, 27 unidades y subtotal acumulado `803.108`, presentado como `S/ 803.11`. Los valores coincidieron con el resultado directo del SP. También se verificó la interfaz en móvil y escritorio.
- **Validación técnica:** pruebas unitarias, TypeScript, build y `git diff --check` finalizaron correctamente; permanece únicamente la advertencia informativa existente sobre tamaño del bundle.
- Estado: ✅

## 32. Reportes / Ventas / Precios con Márgenes

**24/09/2026** — Nuevo reporte de precios, costos y márgenes por laboratorio basado en `[dbo].[sp_Productos_PrecionMargenes]`.

- Se agregó **Reportes → Ventas → Precios con Márgenes**, con ruta `/reports/sales/prices-margins` y acceso para Administrador, Auditor Senior y Gestor Operativo mediante el módulo `25`.
- Se versionó el procedimiento proporcionado en `sql/sp_Productos_PrecionMargenes.sql`, conservando su nombre y sus cálculos de PVF, costo con IGV y precios con incrementos de 10%, 15%, 20% y 25%.
- El endpoint autenticado `GET /api/reportes/precios-margenes?labora=...` valida el código `CHAR(2)`, comprueba el laboratorio, ejecuta el SP, normaliza los resultados, totaliza productos y stock y registra auditoría.
- La vista reutiliza el catálogo buscable de laboratorios de Ventas e incluye generación manual, búsqueda por código o producto, dos indicadores, tabla responsive de nueve columnas y paginación de 20 productos.
- Excel y PDF incluyen logo, laboratorio, fecha de generación, importes formateados y total de stock; ambas exportaciones respetan la búsqueda visible.
- Se agregaron tipos, modelo de filtrado/resumen y pruebas unitarias para validación, normalización, ordenamiento, valores inválidos, búsqueda sin tildes y resultados vacíos.
- **Validación real:** el laboratorio `65` (GABBLAN S.A.C.) devolvió 74 productos y 6,525 unidades; los códigos, stock, PVF, costo con IGV y cuatro precios con margen coincidieron con la salida del SP. También se comprobaron las respuestas HTTP 400 para laboratorio faltante e inexistente y la interfaz completa en escritorio y móvil.
- **Validación técnica:** las 15 pruebas unitarias del proyecto, TypeScript, build de producción y `git diff --check` finalizaron correctamente; permanece únicamente la advertencia informativa existente sobre tamaño del bundle.
- Estado: ✅

## 33. Reportes / Ventas / Registro de Ventas

**25/09/2026** — Nuevo registro contable de ventas por rango de fechas basado en `[dbo].[sp_ventas_registroVentas]`.

- Se agregó **Reportes → Ventas → Registro de Ventas**, con ruta `/reports/sales/sales-register` y acceso para Administrador, Auditor Senior y Gestor Operativo mediante el módulo `26`.
- Se versionó el procedimiento proporcionado en `sql/sp_ventas_registroVentas.sql`, limpiando únicamente los artefactos de formato del texto original y conservando su lógica contable.
- El endpoint autenticado `GET /api/reportes/registro-ventas?desde=...&hasta=...` valida fechas ISO reales y el orden del rango, ejecuta el SP con parámetros `SmallDateTime` y consulta posteriormente `t_registroVentas`.
- La ejecución y lectura se realizan en una transacción `SERIALIZABLE` protegida con `sp_getapplock`, evitando que solicitudes concurrentes con rangos diferentes mezclen el contenido de la tabla compartida.
- La API normaliza las 28 columnas, conserva códigos y cuentas como texto, ordena los comprobantes, calcula ocho totales contables, desactiva caché y registra la generación en auditoría.
- La vista incluye rango Del/Al, búsqueda por documento, cliente o glosa, cinco indicadores, las 28 columnas con identificadores fijos, scroll horizontal, paginación de 20 registros y estados de carga/error/sin resultados.
- Excel y PDF A3 horizontal incluyen logo, rango, fecha de generación, todas las columnas, totales, encabezados repetidos y paginación; ambos respetan la búsqueda visible.
- Se agregaron tipos, modelo de filtrado/resumen y pruebas unitarias para fechas inválidas, normalización, códigos con ceros iniciales, importes negativos, ordenamiento, búsqueda y resultados vacíos.
- **Corrección de generación:** el SP original convertía fechas a texto `dd/MM/yyyy` y después a `datetime` sin especificar estilo, lo que producía el error SQL 242 en sesiones configuradas como `mdy`. La llamada ahora establece `DATEFORMAT dmy` por compatibilidad inmediata y el SQL versionado compara valores `date` directamente, eliminando la conversión ambigua.
- **Ajuste visual:** la cabecera usa el mismo logo recortado, ancho responsive, separador vertical, espaciado y comportamiento de botones que Avance de Ventas y Precios con Márgenes.
- **Validación técnica:** las 20 pruebas unitarias, TypeScript, build de producción y `git diff --check` finalizaron correctamente; la validación funcional contra SQL Server y la prueba concurrente quedan pendientes porque la instancia configurada en `localhost:1433` no estuvo disponible.
- Estado: ✅

## 34. Reportes / Ventas / Reportes de Clientes por Vendedor

**25/09/2026** — Nuevo reporte de cartera de clientes asignada a vendedores basado en `[dbo].[sp_Clientes_xVendedor]`.

- Se agregó **Reportes → Ventas → Reportes de Clientes por Vendedor**, con ruta `/reports/sales/customers-by-salesperson` y acceso para Administrador, Auditor Senior y Gestor Operativo mediante el módulo `27`.
- Se versionó el procedimiento proporcionado en `sql/sp_Clientes_xVendedor.sql`, limpiando únicamente los artefactos HTML/Markdown y conservando su clasificación de clientes y relaciones de ubicación.
- El endpoint autenticado `GET /api/reportes/ventas/vendedores` devuelve exclusivamente empleados con `Tipo = 3`, ordenados por nombre y código.
- El endpoint autenticado `GET /api/reportes/clientes-vendedor?vende=...` valida un entero positivo, vuelve a comprobar que el empleado sea vendedor, ejecuta el SP con `sql.Int`, normaliza las 15 columnas y registra auditoría.
- La respuesta incluye vendedor, fecha de generación y resúmenes de clientes, clientes con UBIGEO, tipos A/B/C y límite de crédito acumulado.
- La vista mantiene el estándar visual de Ventas: logo recortado, combo buscable por código o nombre, generación manual, búsqueda local, seis indicadores, tabla responsive con tres columnas fijas y paginación de 20 clientes.
- Excel y PDF A3 horizontal incluyen las 15 columnas, vendedor, logo, fecha de generación, clasificación, límite total, encabezados repetidos y paginación; ambas exportaciones respetan la búsqueda visible.
- Se agregaron tipos, modelo y pruebas unitarias para parámetros inválidos, normalización, ordenamiento, clasificación, UBIGEO, límites, búsqueda sin tildes y resultados vacíos.
- **Validación técnica:** las 25 pruebas unitarias y TypeScript finalizaron correctamente. La ejecución real contra SQL Server queda pendiente porque la instancia configurada en `localhost:1433` no está accesible desde el entorno de herramientas.
- Estado: ✅

## 35. Reportes / Ventas / Ventas Mensuales o Trimestrales

**25/09/2026** — Nuevo reporte detallado de ventas por rango basado en `[dbo].[sp_Ventas_DelAl_codinsa]`.

- Se agregó **Reportes → Ventas → Ventas Mensuales o Trimestrales**, con ruta `/reports/sales/monthly-quarterly-sales` y acceso para Administrador, Auditor Senior y Gestor Operativo mediante el módulo `28`.
- Se versionó el procedimiento proporcionado en `sql/sp_Ventas_DelAl_codinsa.sql`, limpiando artefactos HTML/Markdown y reemplazando la conversión ambigua de fechas por comparaciones `date`.
- El endpoint autenticado `GET /api/reportes/ventas-mensuales-trimestrales?desde=...&hasta=...` valida fechas ISO reales, ejecuta el SP con `SmallDateTime` y `DATEFORMAT dmy`, normaliza 22 columnas y registra auditoría.
- La vista ofrece rango Del/Al libre y atajos para Mes actual, Mes anterior y Trimestre actual; incluye búsqueda, seis indicadores, tabla responsive con columnas identificadoras fijas y paginación de 20 líneas.
- Los indicadores y exportaciones se recalculan sobre el filtro visible: líneas, documentos, clientes y productos únicos, unidades y venta total.
- Excel y PDF A3 horizontal incluyen logo, rango, fecha de generación, las 22 columnas, datos tipados, totales, encabezados repetidos y paginación horizontal cuando es necesaria.
- Se agregaron tipos, modelo y pruebas unitarias para fechas inválidas, normalización case-insensitive, vencimientos nulos, códigos, importes negativos, ordenamiento, búsqueda, totales, periodos vacíos y los tres atajos.
- **Validación técnica:** las 31 pruebas unitarias y TypeScript finalizaron correctamente. La ejecución real contra SQL Server queda pendiente porque la instancia configurada en `localhost:1433` no está accesible desde el entorno de herramientas.
- Estado: ✅

## 36. Reportes / Ventas / Control Diario

**25/09/2026** — Nuevo reporte operativo de ventas del día basado en `[dbo].[sp_Ventas_ControlDia]`.

- Se agregó **Reportes → Ventas → Control Diario**, con ruta `/reports/sales/daily-control` y acceso para Administrador, Auditor Senior y Gestor Operativo mediante el módulo `29`.
- Se versionó el procedimiento proporcionado en `sql/sp_Ventas_ControlDia.sql`, limpiando los artefactos HTML/Markdown y reemplazando la conversión ambigua de texto por una comparación de valores `date`.
- El endpoint autenticado `GET /api/reportes/control-diario` no requiere ni admite parámetros. Ejecuta el SP con `DATEFORMAT dmy`, obtiene la fecha operativa de SQL Server en el mismo batch, desactiva caché y registra la consulta en auditoría.
- La API normaliza las 12 columnas sin depender de mayúsculas, conserva códigos, documentos, pedidos y facturas como texto, admite los campos opcionales de los `LEFT JOIN`, ordena el resultado y calcula seis indicadores.
- La vista carga automáticamente al abrirse y solo vuelve a consultar mediante **Actualizar reporte**. Muestra la fecha operativa de SQL Server, la hora de generación, búsqueda sin tildes, seis indicadores, tabla responsive con dos columnas fijas y paginación de 20 registros.
- Los indicadores y exportaciones se recalculan sobre el filtro visible: facturas, clientes, pedidos y vendedores únicos, subtotal y total con IGV.
- Excel y PDF A3 horizontal incluyen logo, fecha operativa, generación, las 12 columnas, totales, encabezados repetidos y paginación; ambos conservan únicamente las filas visibles por el filtro.
- Se agregaron tipos, modelo y pruebas unitarias para normalización case-insensitive, nulos, ceros iniciales, importes inválidos y negativos, ordenamiento, búsqueda sin tildes, conteos únicos, sumas y respuesta vacía.
- **Validación real:** la ejecución directa del SP devolvió la fecha operativa `25/09/2026`, dos recordsets y cero ventas para el día; la respuesta conservó la fecha y produjo correctamente los seis totales en cero.
- **Validación técnica:** las 35 pruebas unitarias, TypeScript, lint, build de producción y `git diff --check` finalizaron correctamente; permanece únicamente la advertencia informativa existente sobre tamaño del bundle.
- Estado: ✅

## 37. Reportes / Compras / Registro de Compras

**25/09/2026** — Nuevo registro tributario de compras por rango basado en `[dbo].[sp_compras_registroCompras]`.

- Se agregó el módulo padre **Reportes → Compras** y su reporte **Registro de Compras**, con rutas `/reports/purchases` y `/reports/purchases/purchase-register`, y acceso para Administrador, Auditor Senior y Gestor Operativo mediante los módulos `30` y `31`.
- Se versionó el procedimiento proporcionado en `sql/sp_compras_registroCompras.sql`, conservando sus reglas contables y reemplazando las conversiones ambiguas de texto por comparaciones directas de valores `date`.
- El endpoint autenticado `GET /api/reportes/registro-compras?desde=...&hasta=...` valida fechas ISO reales y el orden del rango, ejecuta el SP con parámetros `SmallDateTime` y consulta posteriormente las 24 columnas de `t_RegistroCompras`.
- La ejecución y lectura usan una transacción `SERIALIZABLE` y `sp_getapplock` exclusivo con el recurso `CODINSA_REGISTRO_COMPRAS`, evitando que dos periodos simultáneos mezclen el contenido de la tabla compartida.
- La API normaliza las 24 columnas sin depender de mayúsculas, conserva códigos y documentos como texto, admite fechas y referencias nulas, ordena los comprobantes y calcula ocho totales tributarios.
- Se corrigió específicamente la interpretación de fechas SQL como UTC para impedir que una fecha almacenada cambie al día anterior al presentarse en la zona horaria de Lima.
- La vista mantiene el diseño corporativo: logo recortado, rango Del/Al, generación manual, búsqueda sin tildes, seis indicadores, tabla con cinco columnas fijas, scroll horizontal, paginación de 20 registros y estados de carga/error/sin resultados.
- Excel y PDF A3 horizontal incluyen logo, periodo, fecha de generación, las 24 columnas, totales, encabezados repetidos y paginación; ambos utilizan el conjunto filtrado visible.
- Se agregaron tipos, modelo y pruebas unitarias para fechas inválidas, normalización case-insensitive, nulos, ceros iniciales, importes inválidos y negativos, ordenamiento, búsqueda, totales y resultados vacíos.
- **Validación real:** el rango del 20 al 21 de julio de 2026 devolvió 2 comprobantes y un total de `S/ 3,004.62`. Una ejecución concurrente contra un periodo vacío produjo respectivamente 2 y 0 filas, sin cruces; ambas transacciones se revirtieron y `t_RegistroCompras` conservó sus 2 filas previas.
- **Validación técnica:** las 40 pruebas unitarias, TypeScript, lint, build de producción y `git diff --check` finalizaron correctamente; permanece únicamente la advertencia informativa existente sobre tamaño del bundle.
- Estado: ✅

## 38. Reportes / Cuentas / Historial del Cliente

**28/09/2026** — Nuevo reporte de documentos, amortizaciones y saldos basado en `[dbo].[sp_Historial_cliente]`.

- Se agregó **Reportes → Cuentas → Historial del Cliente**, con ruta `/reports/accounts/customer-history` y acceso para Administrador, Auditor Senior y Gestor Operativo mediante el módulo `32`.
- El selector autenticado busca hasta 50 clientes por RUC o razón social, sin distinguir tildes o mayúsculas, e incluye clientes activos e inactivos que tienen `tipoDoc = 'R'` y RUC numérico de 11 dígitos.
- El endpoint `POST /api/reportes/historial-cliente` recibe únicamente `Codclie`, vuelve a resolver y validar el RUC en SQL Server y ejecuta el procedimiento original sin modificarlo.
- La ejecución y lectura de `t_Historial_Cliente` usan una transacción `SERIALIZABLE`, timeout de 120 segundos y `sp_getapplock` exclusivo con el recurso `CODINSA_HISTORIAL_CLIENTE`, evitando cruces entre solicitudes simultáneas.
- La API normaliza las once columnas del historial, ordena por `Nro` e `Item`, calcula documentos, importe, amortizado y saldo solamente sobre las filas principales `Item = 1`, y registra cada generación en auditoría.
- La vista incorpora autocompletado con debounce, identificación de clientes inactivos, generación manual, cuatro indicadores, jerarquía visual documento–movimientos, estados de situación, tabla responsive y paginación de 20 filas.
- Excel y PDF horizontal incluyen logo, cliente, RUC, fecha de generación, datos tipados, jerarquía, totales, encabezados repetidos y paginación, con nombres `Historial_Cliente_RUC`.
- Se agregaron tipos y pruebas unitarias para validar `Codclie`, normalizar columnas case-insensitive, fechas, nulos, importes, ordenamiento y totales sin duplicar movimientos subordinados.
- **Validación técnica:** las 44 pruebas unitarias del proyecto, TypeScript, build de producción y `git diff --check` finalizaron correctamente; permanece únicamente la advertencia informativa existente sobre tamaño del bundle.
- La validación funcional contra SQL Server y la prueba concurrente real quedan pendientes porque la instancia configurada en `localhost:1433` no estuvo disponible desde el entorno de herramientas.
- Estado: ✅

## 39. Reportes / Dirección Técnica / Ventas Psicotrópicos

**01/10/2026** — Nuevo reporte por rango Del/Al basado en `[dbo].[sp_Ventas_psicotropicos]`.

- Se agregó **Reportes → Dirección Técnica → Ventas Psicotrópicos**, con módulos `33` y `34`, acceso para Administrador, Auditor Senior y Gestor Operativo, y rutas `/reports/technical-direction` y `/reports/technical-direction/psychotropic-sales`.
- Se versionó el procedimiento en `sql/sp_Ventas_psicotropicos.sql`, limpiando artefactos HTML/Markdown y sustituyendo las conversiones ambiguas por comparaciones `date` inclusivas. Se conservan joins, selección de productos desde `tablas.n_codtabla = 350`, conversión de cantidades y los signos originales de ventas y notas de crédito.
- **Esquema SQL comprobado:** el SP existe y `t_psicotropico` contiene 13 columnas. Los nombres físicos `Principo`, `Registro` y `Documento` se mapean a `Principio`, `RegistroSanitario` y `NumFactura` en la API.
- **Corrección de compatibilidad:** la tabla tenía `Ruc CHAR(2)`, mientras que `Clientes.Documento` es `VARCHAR(12)`. FF, Distrito y Dirección tampoco admitían los nulos posibles del SP. Se creó y aplicó en la instancia local el script idempotente `sql/t_psicotropico_compatibility.sql`, ampliando Ruc a `VARCHAR(12)` y permitiendo nulos en esos tres campos, sin reemplazar la tabla ni eliminar sus datos.
- **Despliegue en otras instancias:** comprobar el mismo esquema y aplicar el script de compatibilidad antes de usar el reporte. El SP corregido está versionado para instalación manual; la API no realiza DDL ni instala procedimientos durante las consultas. En la instancia local se conservó el SP original y se utiliza `DATEFORMAT dmy` para ejecutarlo.
- El endpoint autenticado `GET /api/reportes/ventas-psicotropicos?desde=...&hasta=...` valida fechas ISO reales, orden del rango y límites de `SmallDateTime` (01/01/1900–06/06/2079).
- La ejecución y lectura explícita de las 13 columnas usan una transacción `SERIALIZABLE`, timeout de 300 segundos y `sp_getapplock` exclusivo sobre `CODINSA_VENTAS_PSICOTROPICOS`, con espera máxima de 30 segundos. Se confirma al completar y se revierte ante fallos. Las ejecuciones externas deben adoptar el mismo bloqueo para coordinarse con la aplicación.
- La API normaliza columnas sin depender de mayúsculas, conserva identificadores y ceros iniciales como texto, presenta fechas ISO sin desplazarlas por zona horaria y ordena por fecha, documento, descripción y lote sin agrupar ni eliminar duplicados. Devuelve `data`, `total`, `totals`, `period` y `generatedAt`, desactiva caché y registra cada generación en auditoría.
- La vista mantiene el diseño corporativo, logo recortado, generación manual, rango inicial del primer día del mes hasta hoy, búsqueda sin tildes, descripción fija, scroll horizontal y paginación de 20 filas. Incluye estados inicial, carga, error, periodo vacío y búsqueda sin coincidencias.
- Los indicadores muestran registros, establecimientos únicos por RUC y cantidades reportadas separadas en TAB, GOT y sin FF. Los signos del SP se conservan; no se presentan como ventas netas ni se mezclan formas farmacéuticas en un total de unidades.
- Excel y PDF A3 horizontal incluyen logo, periodo, generación, las 13 columnas y resúmenes por FF. Exportan todas las filas filtradas, independientemente de la página visible, con nombres `Ventas_Psicotropicos_DESDE_al_HASTA`. Excel conserva textos, cantidades numéricas y fechas tipadas, con autofiltro y encabezados congelados; PDF conserva el orden de columnas, encabezados repetidos y paginación.
- **Validación SQL real:** SP original y SP versionado produjeron resultados idénticos para septiembre de 2026; también se comprobó un periodo de un día. Se verificaron solicitudes concurrentes de periodos distintos, aislamiento de una fila ficticia, rollback ante fallos y conservación del contenido previo. Los ajustes y la instalación temporal del SP usados en la comparación se revirtieron; únicamente el script de compatibilidad se aplicó después de esa prueba.
- **Límite de la validación real:** la selección de psicotrópicos en los datos actuales devolvió 0 ventas y 0 notas de crédito. La comparación con movimientos reales no vacíos de ambos tipos queda pendiente hasta contar con datos que satisfagan la selección del SP.
- **Validación visual y exportaciones:** se comprobó la aplicación en escritorio y móvil (390 px) sin desbordamiento de página. Una vista temporal con 25 filas ficticias, posteriormente retirada, permitió verificar paginación, búsqueda sin tildes, nulos, cantidades negativas y exportaciones. Excel filtrado contuvo las 12 filas esperadas y Excel desde página 2 contuvo las 25 filas completas; se comprobó RUC como texto, cantidad negativa numérica, fecha tipada y documento con ceros iniciales. El PDF filtrado se extrajo y renderizó para revisión de logo, orden de columnas, valores y paginación.
- **Validación HTTP:** sesión ausente devuelve 401; seis casos de parámetros inválidos devuelven 400; los dos rangos concurrentes válidos devuelven 200 y `Cache-Control: no-store`; el menú autenticado incluye la nueva categoría y el reporte.
- **Validación técnica:** 49 pruebas unitarias, TypeScript/lint, build de producción y `git diff --check` finalizaron correctamente. Permanece la advertencia informativa existente sobre tamaño del bundle.
- Estado: ✅ Implementado; validación con movimientos reales no vacíos pendiente.

## 40. Reportes / Dirección Técnica / Compras Psicotrópicos

**02/10/2026** — Reporte de compras por rango Del/Al basado en `[dbo].[sp_Compras_psicotropicos]`, siguiendo el diseño de Ventas Psicotrópicos.

- Se agregó **Reportes → Dirección Técnica → Compras Psicotrópicos**, módulo `35`, ruta `/reports/technical-direction/psychotropic-purchases`, para Administrador, Auditor Senior y Gestor Operativo.
- **Esquema real comprobado en SQL Server:** `t_psicotropico1` contiene `Principio VARCHAR(200) NULL`, `Concentracion VARCHAR(200) NULL`, `Descripcion VARCHAR(70) NOT NULL`, `FF VARCHAR(5) NOT NULL`, `NroFactura CHAR(20) NULL`, `Proveedor VARCHAR(60) NOT NULL`, `fecha SMALLDATETIME NOT NULL`, `Cantidad DECIMAL NULL` y `lote CHAR(15) NOT NULL`. Los campos de origen de descripción, proveedor y lote coinciden en longitud y no admiten nulos.
- Se versionó el SP en `sql/sp_Compras_psicotropicos.sql`, con columnas de inserción explícitas y comparación inclusiva de fechas `date`. Conserva joins, selección desde `tablas.n_codtabla = 350`, prioridad TAB/GOT, `Doccom.Eliminado = 0` y cantidades multiplicadas por conversión. **No incluye notas de crédito**.
- **Instalación SQL pendiente y explícita:** ejecutar `sql/t_psicotropico1_compatibility.sql` para permitir `FF NULL`, necesario porque el CASE del SP puede devolver NULL; después instalar el SP versionado. El script comprueba el tipo esperado, es idempotente y conserva los datos. Las pruebas temporales se revirtieron: la instancia local mantiene el SP original y `FF NOT NULL`. La API no instala procedimientos ni ejecuta DDL.
- Endpoint autenticado `GET /api/reportes/compras-psicotropicos?desde=...&hasta=...`: valida fechas ISO reales, orden y límites de SmallDateTime. Ejecuta el SP original con `DATEFORMAT dmy` y lee explícitamente las nueve columnas dentro de una transacción `SERIALIZABLE`, timeout de 300 segundos y bloqueo exclusivo `CODINSA_COMPRAS_PSICOTROPICOS` con espera de 30 segundos. Confirma al completar y revierte ante errores; las ejecuciones externas deben adoptar el mismo bloqueo.
- La respuesta contiene `data`, `total`, `totals`, `period` y `generatedAt`; preserva documentos como texto, cantidades con signo, fechas sin desplazamiento por zona horaria y duplicados. Ordena por fecha, factura, descripción y lote, desactiva caché y registra auditoría.
- Vista de generación manual con rango inicial del primer día del mes hasta hoy, logo corporativo, búsqueda sin tildes, descripción fija, scroll horizontal, paginación de 20 filas y estados inicial/carga/error/periodo vacío/sin coincidencias. Muestra registros, facturas únicas, proveedores únicos por razón social normalizada y cantidades separadas en TAB, GOT y sin FF.
- Excel y PDF A3 horizontal exportan todas las filas filtradas, las nueve columnas, logo, periodo efectivamente consultado, generación y resúmenes; nombres `Compras_Psicotropicos_DESDE_al_HASTA`. Excel conserva documentos como texto, cantidades numéricas y fechas tipadas, autofiltro y encabezados congelados. PDF distribuye las columnas dentro del ancho útil, repite encabezados y pagina.
- **Validación SQL real:** SP original y versionado produjeron resultados idénticos para septiembre de 2026, un solo día y un periodo vacío. Dos consultas concurrentes finalizaron sin cruces; se comprobó rollback ante fallo intencional y conservación exacta de los datos, el procedimiento original y el esquema. Todos los cambios SQL de prueba se revirtieron.
- **Límite funcional:** los datos actuales contienen **0 movimientos de compra que satisfagan la selección del SP**. Sigue pendiente validar con compras reales no vacías y filas sin FF después de instalar la compatibilidad.
- **Validación HTTP real:** 401 sin sesión; seis casos de fechas inválidas devuelven 400; dos rangos concurrentes válidos devuelven 200, `Cache-Control: no-store` y totales vacíos correctos. El menú autenticado incluye el reporte.
- **Validación automatizada de exportaciones:** se invocaron las funciones de exportación con 25 filas ficticias y un subconjunto de 12, interceptando únicamente descarga, logo y guardado de PDF en un arnés temporal. Excel conservó las filas esperadas, nueve encabezados, factura con ceros iniciales, cantidad negativa numérica, fecha tipada, autofiltro y nombre del archivo. Ambos PDF se generaron sin advertencias de ancho. Esta prueba no sustituye la revisión visual ni la verificación de paginación desde la interfaz.
- **Validación visual pendiente:** el navegador integrado falló al crear la pestaña; no se verificó escritorio/móvil, paginación desde página 2 ni recorte del logo en navegador.
- **Validación técnica:** 55 pruebas unitarias, TypeScript/lint, build y `git diff --check` correctos. Se mantiene la advertencia informativa existente del tamaño del bundle.
- Estado: ✅ Código implementado; instalación SQL, revisión visual y validación con compras reales no vacías pendientes.

## 41. Reportes / Dirección Técnica / Balance Psicotrópico

**02/10/2026** — Reporte por fechas Del/Al basado en `[dbo].[sp_KardexPsicotropico]`.

- Se agregó **Reportes → Dirección Técnica → Balance Psicotrópico**, módulo `36`, ruta `/reports/technical-direction/psychotropic-balance`, después de Compras y para Administrador, Auditor Senior y Gestor Operativo.
- **Esquema SQL comprobado:** `LibBalPsicotropico` contiene 12 columnas; código CHAR(10), principio/concentración VARCHAR(200), descripción VARCHAR(70), FF VARCHAR(5), laboratorio VARCHAR(150), lote CHAR(15), vencimiento SMALLDATETIME y cuatro cantidades INT. FF, vencimiento y cantidades admiten NULL.
- Se versionó el SP instalado en `sql/sp_KardexPsicotropico.sql`, limpiando formato sin modificar fórmulas, joins, reconstrucción histórica, selección de lotes ni eliminación de filas con los cuatro saldos en cero. Se conservaron expresamente los tipos INT y la fórmula de SaldoActual que aplica la conversión solo a los egresos. No se realizaron cambios persistentes del SP ni del esquema; la API no instala SQL.
- Endpoint autenticado `GET /api/reportes/balance-psicotropico?desde=...&hasta=...`: valida fechas ISO reales, orden y límites 1900-01-01–2079-06-05, reservando el día siguiente usado internamente por el SP. Consulta la fecha actual de SQL Server y devuelve 400 ante una fecha Al futura **antes de ejecutar el procedimiento**.
- Se envían `fechaIni` y `fechaFin` como `sql.Date`. Ejecución y lectura explícita de las 12 columnas dentro de una transacción SERIALIZABLE, timeout de 300 segundos y bloqueo exclusivo `CODINSA_BALANCE_PSICOTROPICO` con espera de 30 segundos. Se confirma al completar y se revierte ante fallos; los procesos externos deben adoptar el mismo bloqueo.
- La API devuelve `data`, `total`, `totals`, `period`, `operationalDate` y `generatedAt`, desactiva caché y registra auditoría. Conserva códigos y lotes como texto, fechas sin desplazamiento horario, enteros, signos y cantidades nulas; ordena por descripción, código y lote sin agrupar ni quitar filas.
- La igualdad `SaldoAnterior + Ingresos − Egresos = SaldoActual` se usa únicamente para clasificar filas correctas, discrepantes o incompletas. No reemplaza los valores originales. Los resúmenes cuentan registros, productos y combinaciones producto–lote y suman cada cantidad disponible separadamente por TAB, GOT y sin FF.
- Vista corporativa con logo, generación manual, rango inicial del primer día del mes hasta hoy, búsqueda sin tildes, descripción fija, scroll horizontal y paginación de 20 filas. Muestra fecha operativa, periodo consultado, advertencias recalculadas sobre el filtro y filas afectadas destacadas; explica que el histórico se reconstruye desde el saldo actual.
- Excel y PDF A3 horizontal exportan todas las filas filtradas, las 12 columnas, logo, periodo, generación, advertencias y resúmenes por FF, con nombres `Balance_Psicotropico_DESDE_al_HASTA`. Excel conserva textos, fechas y cantidades tipadas, nulos vacíos, autofiltro y encabezados congelados. PDF repite encabezados y pagina; se evita dibujar dos veces la cabecera cuando el resumen comparte página con el detalle.
- **Validación SQL real:** original y versión limpia produjeron resultados idénticos para septiembre de 2026, un solo día y un rango de 1900. Los tres devolvieron 18 filas, ya que el SP reconstruye balances desde el saldo actual incluso en rangos sin movimientos. Dos consultas concurrentes finalizaron sin cruces; se comprobó rollback ante fallo intencional y conservación de los datos previos, SP y esquema. Todas las operaciones SQL temporales se revirtieron.
- **Contraste con fuentes:** las 18 filas coinciden con saldos por producto–lote, conversión y vencimiento de las tablas fuente. Hay 27 productos elegibles, 25 con conversión distinta de uno. En septiembre hasta hoy no hay movimientos de entrada/salida elegibles. El reporte real contiene 18 filas, 17 productos y **16 discrepancias**, conservadas y advertidas en pantalla.
- **Validación HTTP real:** 401 sin sesión, seis rangos inválidos con 400, fecha futura con 400 y tabla intacta, dos rangos concurrentes con 200/`no-store`, fecha operativa y 18 filas correctas. El menú autenticado incluye el reporte.
- **Validación visual:** se revisaron escritorio y emulación móvil a 390 px en Chrome. Una vista temporal de 25 filas ficticias permitió verificar página 2 (filas 21–25), búsqueda ACIDO → 12 filas, nulos y saldo negativo. Excel descargado desde página 2 conservó las 25 filas completas; los archivos filtrados conservaron las 12 filas. Se comprobaron resúmenes por FF, 12 encabezados, códigos con ceros iniciales, fechas tipadas, nulos vacíos, cantidad negativa, autofiltro, congelación y advertencias. La vista temporal fue retirada y no se insertaron esos datos en SQL Server.
- **PDF:** se extrajo y renderizó la descarga real para comprobar logo, columnas, advertencias, datos y resumen. Tras corregir la doble cabecera, un arnés temporal comprobó los PDF finales con 25, 12 y 100 filas; el último produjo tres páginas, con numeración y encabezados únicos por página. Se revisaron visualmente la primera y última páginas renderizadas. El Mac se bloqueó durante la última comprobación del navegador; la versión final de PDF se verificó con el arnés, sin una nueva descarga desde Chrome.
- **Límite de validación real:** ingresos/egresos no vacíos, lotes agotados y vencimientos nulos quedan pendientes con datos SQL que representen esos casos; su normalización y presentación se comprobaron mediante pruebas unitarias y datos ficticios.
- **Validación técnica:** 64 pruebas unitarias, TypeScript/lint, build y `git diff --check` correctos. Se mantiene la advertencia informativa existente del tamaño del bundle. Servidor de pruebas cerrado; puerto 3000 libre.
- Estado: ✅ Implementado y validado con saldos reales; casos de movimientos y lotes indicados pendientes por disponibilidad de datos.

---
*Última actualización: 2 de Octubre, 2026*

## 42. Kardex de Productos — presentación por laboratorio

**02/10/2026** — Se reemplazó la tabla plana por el Libro de Inventario Permanente Valorizado, según la referencia del cliente.

- Pantalla, Excel y PDF presentan ocho columnas: Código, Producto, Unidad de medida, Saldo inicial, Ingresos, Salidas, Saldo final y Valor; Cód. SUNAT y Costo permanecen en la respuesta de la API.
- La consulta mensual conserva el SP, sus cálculos, permisos, auditoría, transacción SERIALIZABLE y bloqueo existentes. Se añadieron LaboratorioCodigo y Laboratorio mediante LEFT JOIN del prefijo de dos caracteres de codpro con Laboratorios.CodLab. La consulta rechaza códigos de laboratorio duplicados para impedir multiplicación de filas; productos sin correspondencia se mantienen en “Sin laboratorio”.
- Un modelo compartido ordena por laboratorio/producto/código y calcula subtotales y total general sin consolidar filas. La pantalla conserva 20 productos por página; repite el laboratorio cuando continúa y muestra su subtotal completo al terminar el grupo.
- Cabecera con logo habitual arriba a la izquierda, título del libro, periodo Del/Al del resultado, razón social, RUC y establecimiento aprobados por el cliente. Se retiró la fecha/hora de generación visible únicamente de este reporte.
- Excel: una hoja con grupos y subtotales, códigos como texto, cantidades/importes numéricos, encabezados congelados, sin autofiltro plano e impresión A4 vertical. PDF A4 vertical: nombres completos con ajuste de línea, encabezados repetidos, laboratorio continuado, numeración Página X de Y y reserva de espacio para evitar encabezados de laboratorio aislados. Se conservan nombres Kardex_Productos_MM_AAAA.
- **SQL Server:** catálogo sin códigos duplicados. Comparación de lectura sobre las 1.100 filas inicialmente disponibles: la relación conservó exactamente filas y totales (saldo inicial 83.119; ingresos 266; salidas 10.060; saldo final 73.325; valor 1.726.858,20). Ninguna de esas filas carecía de laboratorio; no se modificó el procedimiento ni el esquema.
- **Validación funcional:** consulta real de octubre de 2026 con 1.072 productos. Revisión de escritorio y móvil emulado a 390 px, continuación/subtotal en página 2 y scroll horizontal hasta cantidades y valor. Se corrigió la superposición del código fijo sobre la cabecera general al desplazar verticalmente.
- **Exportaciones:** descargadas desde página 2 y verificadas con los 1.072 productos, ocho columnas, tipos de Excel, subtotales y total general. PDF de 27 páginas: extracción de texto, encabezados/numeración en todas las páginas, revisión visual de cabecera, detalle y cierre, sin Generado. Arnés adicional de 85 productos verificó códigos con ceros iniciales, decimales negativos, laboratorio ausente y descripciones largas; PDF de tres páginas.
- **Pruebas:** 68 pruebas del proyecto aprobadas, incluidas cuatro nuevas de agrupación, paginación, límites entre grupos, vacío y periodo. TypeScript, build y git diff --check aprobados; permanece la advertencia existente del tamaño de bundles.
- **Límites:** laboratorio ausente, cantidades negativas y descripción excepcionalmente larga se verificaron con datos sintéticos porque el conjunto real no cubría todos esos casos. No se realizó impresión física; se verificó la configuración de impresión y el PDF renderizado.
- Se preservaron los cambios anteriores de Dirección Técnica. Servidor de pruebas cerrado al finalizar.
- Estado: ✅


## 43. Balance Psicotrópico — corrección de conversión y período DEL / AL

**03/10/2026** — Se alineó el SP versionado con la corrección proporcionada para aplicar la conversión al saldo final completo.

- `sql/sp_KardexPsicotropico.sql` conserva `CREATE OR ALTER`, parámetros DATE, períodos inclusivos, reconstrucción histórica, joins, selección de lotes y eliminación de filas con cuatro cantidades en cero. `SaldoActual` ahora multiplica por conversión la expresión completa; equivale a `(saldo actual + salidas posteriores − entradas posteriores) × conversión`.
- **Estado encontrado:** la definición instalada en SQL Server local ya contenía los paréntesis corregidos. Por ello, los resultados anteriores a esta instalación también tenían cero discrepancias; las 16 discrepancias documentadas el 02/10 corresponden a la versión anterior y no al estado encontrado hoy. Se guardó la definición previa en `sql/backups/sp_KardexPsicotropico_before_2026-10-03.sql` y se instaló persistentemente la versión corregida del repositorio tras validar. No se modificó el esquema ni se agregó instalación automática en la API.
- Pantalla, Excel y PDF comparten una explicación: saldo anterior al inicio de DEL, saldo actual al cierre de AL e ingresos/egresos incluyendo ambos días. Se conservan advertencias, contrato API, bloqueo exclusivo y transacción. La fila de explicación de Excel se amplió para mantener el texto legible.
- **SQL real:** septiembre completo, 03/10 como día único y 30/09–03/10 devolvieron 18 filas sin discrepancias; las demás columnas coinciden con la definición previa. Las 27 conversiones configuradas son enteras (1, 5, 10, 20, 30, 50 o 100), sin conversiones fraccionarias actuales. El contraste independiente con saldos, conversiones y vencimientos produjo cero diferencias.
- **Casos controlados en SQL Server:** se ejecutó la misma definición del SP contra tablas temporales dentro de una transacción revertida. Se comprobaron conversión 10, entradas/salidas durante el rango, movimientos posteriores, inicio a medianoche, fin a las 23:59:59, exclusión del día anterior, separación del día siguiente, rango entre meses y día único, lote agotado sin saldo/vencimiento, saldo negativo y eliminación del lote en cero. Caso activo: saldo anterior 70, ingresos 30, egresos 20 y cierre 80. La definición original se restauró y verificó por rollback antes de instalar la versión final.
- **Servicio real después de instalar:** dos ejecuciones concurrentes del batch de producción para 30/09–02/10 y 03/10–03/10 produjeron 18 filas, períodos independientes y cero discrepancias. Un fallo SQL intencional revirtió la ejecución y conservó exactamente el contenido previo de la tabla de resultados.
- **Pantalla autenticada:** se comprobó generación del rango inicial 01/10–03/10, 18 registros, 17 productos, explicación del período y resúmenes TAB 9,280, GOT 22 y sin FF 116, con ingresos/egresos cero. No hay movimientos elegibles reales desde septiembre hasta hoy; los casos con movimientos se validaron mediante tablas temporales, sin alterar datos de negocio.
- **Exportaciones:** arnés temporal de las funciones de producción con 100 filas; Excel verificado con códigos de ceros iniciales, cantidades numéricas, autofiltro de las 100 filas y explicación del período. PDF de tres páginas extraído y renderizado; primera y última páginas revisadas visualmente con explicación, encabezados únicos y totales correctos. El arnés sustituyó solo la carga de logo y la descarga del navegador. La captura de descarga desde el navegador autenticado agotó el tiempo de espera, por lo que no se afirma validación de ese mecanismo en esta sesión. Tampoco se repitió la paginación visual con datos ficticios ni la validación HTTP completa de errores; sus pruebas unitarias y la cobertura previa se mantienen.
- **Validación técnica:** 69 pruebas completas pasan, incluidas las 10 pruebas actuales del Balance y la nueva regresión para la respuesta corregida, así como TypeScript, build y `git diff --check`. El build conserva la advertencia existente de tamaño de bundle. Se dejó intacto el servidor local que ya estaba ejecutándose.
- **Límite conservado:** cantidades INT; futuras conversiones o cantidades fraccionarias pueden truncarse y deberán revisarse antes de migrar a decimales. La reconstrucción depende de coherencia entre el saldo actual y las transacciones hasta hoy.
- Estado: ✅ SP del repositorio e instancia local alineados, cálculo y exportaciones verificados.

## 44. Gestión Ubigeos — resumen en tabla y filtro por asignación

**15/10/2026** — Se agregó la columna **Ubigeo actual** entre Documento y Ubigeo, con el resumen `Departamento / Provincia / Distrito`, sin código ni dirección y con ajuste de línea.

- `GET /api/ubigeo/clientes` conserva `{ data: [...] }` y ahora incluye `ubigeo`, `departamento`, `provincia` y `distrito` como campos anulables. Resuelve los nombres con LEFT JOIN al catálogo SUNAT por el código UBIGEO, sin consultas individuales por cliente ni conversiones numéricas que pierdan ceros iniciales. Ordena por razón social y código.
- Selector **Estado de ubigeo** junto al buscador: Todos (inicial), Sin ubigeo y Con ubigeo. Sin ubigeo incluye clientes sin registro asociado o con UBIGEO nulo, vacío o compuesto de espacios. Un código no vacío ausente del catálogo muestra **Ubigeo no identificado** y pertenece a Con ubigeo.
- El filtro se aplica antes de paginar, se combina con la búsqueda por razón social/documento y actualiza el contador. Se mantienen ocho clientes por página; cambiar búsqueda o estado vuelve a la primera página y una recarga ajusta la página si queda fuera de rango.
- El guardado comprueba el estado HTTP: ante errores conserva el modal y muestra el mensaje; al guardar correctamente recarga el listado conservando búsqueda y filtro. Se descartan respuestas antiguas de búsquedas y se muestra un aviso si falla la recarga. Las recargas al finalizar los procesos RUC/DNI usan la búsqueda vigente y conservan el filtro; los procesos masivos mantienen su alcance previo.
- **Validación SQL de solo lectura:** consulta ampliada ejecutada sobre 7,122 clientes reales; cero claves CODIGO duplicadas en las asignaciones. Casos sintéticos mediante CTE verificaron ausencia de registro, nulo, vacío, espacios, código `010102` con ceros iniciales, código desconocido y búsqueda por documento. No se modificaron datos ni esquema.
- **Validación de interfaz aislada con datos ficticios:** tres estados, búsqueda combinada, paginación, resultados vacíos, error HTTP al guardar con modal abierto, reintento exitoso, actualización del resumen y desaparición de pendientes. Se verificaron respuestas de búsqueda fuera de orden, recargas tras eventos de finalización RUC/DNI simulados y ajuste desde página 2 a página 1. Revisión visual en escritorio y a 390 px: controles ajustados y scroll horizontal contenido en la tabla, sin desbordamiento de página. No se ejecutaron asignaciones reales ni llamadas a las APIs externas.
- **Validación técnica:** `npm run lint`, `npm run build` y `git diff --check` correctos. Se mantiene la advertencia existente de tamaño del bundle.
- **Refinamiento visual del selector (15/10/2026):** borde suave, esquinas redondeadas, sombra discreta, flecha propia y estados hover/foco en el color primario. Se conserva el select nativo, la etiqueta accesible y la lógica del filtro. Revisión visual y las tres opciones verificadas en la vista aislada; TypeScript, build y `git diff --check` correctos.

## 45. Productos — tres códigos editables con confirmación por producto

**15/10/2026** — El módulo **Productos → Editar Cod. Laboratorio** incorpora las columnas **Cod. anterior** (`Productos.CodLab`), **Cod. SUNAT** (`Productos.Codlab1`) y **Cod. laboratorio** (`Productos.Codlabo`), después de la descripción referencial de Laboratorio.

- Los tres campos existentes son VARCHAR(50) anulables; no se modificó el esquema. `GET /api/productos` agrega los alias `CodLab1` y `CodLabo`, incluidos también en `Producto`.
- Se sustituyó el guardado automático por borradores independientes por producto. Tab cambia de campo y Enter avanza al siguiente producto visible en la misma columna sin guardar. Las celdas modificadas se destacan; Guardar y Descartar se habilitan con cambios pendientes. Los borradores permanecen al cambiar página o filtros dentro del módulo y se eliminan al descartarlos o guardarlos correctamente.
- Guardar abre un diálogo nativo accesible con producto, código y únicamente los campos modificados: valor anterior y valor nuevo; los vacíos se muestran como **Sin código**. Cerrar, Escape o Seguir editando conservan el borrador. Solo Confirmar cambios envía la actualización. El envío bloquea la fila y la confirmación repetida; ante errores mantiene el modal y permite reintentar; tras el éxito muestra confirmación y actualiza los valores guardados.
- Nuevo endpoint autenticado `PATCH /api/productos/:codpro/codigos`, cuerpo `{ cambios: { CodLab?, CodLab1?, CodLabo? } }`. Exige al menos un campo permitido, texto hasta 50 caracteres o null; convierte texto vacío en null y conserva ceros iniciales. Una sola sentencia UPDATE parametrizada guarda todos los códigos solicitados y devuelve los tres valores, preservando los omitidos. Responde 400 ante validación inválida, 404 si no existe el producto y 500 ante fallo SQL. Registra auditoría de los campos modificados y conserva el PUT anterior por compatibilidad.
- Excel mantiene los demás datos y presenta los tres encabezados nuevos como texto. PDF incorpora las tres columnas y usa orientación horizontal con fuente de 7 puntos mediante opciones locales del exportador; sus valores por defecto se conservan para los demás módulos. Ambos exportan todos los resultados filtrados con valores confirmados, excluyendo borradores pendientes. Se mantienen filtros, diez productos por página y scroll horizontal dentro de la tabla.
- **Validación técnica:** 76 pruebas pasan, incluidas siete nuevas de validación del contrato y construcción SQL segura; `npm run lint`, `npm run build` y `git diff --check` correctos. El build conserva la advertencia previa de tamaño del bundle.
- **Validación SQL:** lectura real del listado con ambos alias y comprobación de ausencia de triggers activos en Productos local. El handler real de PATCH se ejecutó contra una tabla temporal dentro de una transacción revertida: 400/404/500/200, códigos parciales y los tres juntos, null, ceros iniciales y auditoría. Una restricción SQL fallida comprobó que no se guardan cambios parciales. No se modificaron productos reales.
- **Validación de interfaz con datos ficticios:** Enter y Tab sin escrituras, revisión de tres cambios, cancelación y Escape, descarte, borradores entre páginas y filtros, búsqueda y laboratorio sin resultados, bloqueo durante envío, error HTTP con reintento y persistencia confirmada tras recargar el entorno simulado. Modal revisado en escritorio y a 390 px, sin desbordamiento horizontal de la página.
- **Exportaciones:** archivos generados desde el componente y exportadores reales con doce productos ficticios y borradores pendientes; se sustituyó únicamente la descarga final por captura local para inspección. Excel verificado con doce filas, encabezados, valores confirmados y códigos de texto; PDF extraído y renderizado con las diez columnas legibles en horizontal y sin borradores. No se validó el mecanismo de descarga final del navegador ni un guardado sobre productos de negocio.

## 46. Reportes Mes Laboratorios — pantalla y SP corregido para instalación manual

**15/10/2026** — Nuevo módulo **Reportes → Ventas → Reportes Mes Laboratorios**, ruta `/reports/sales/monthly-laboratories`, con los mismos tres perfiles de los reportes de Ventas.

- Selección inicial del mes/año de Lima, generación manual, resumen de quince laboratorios, selector buscable, detalle con columnas propias, búsqueda sin distinguir tildes/mayúsculas y veinte filas por página. Cambiar de laboratorio, buscar o paginar no ejecuta el SP. El período efectivamente generado permanece visible aunque se cambien los controles; incluye estados de carga, error, período vacío y búsqueda sin coincidencias.
- `POST /api/reportes/mes-laboratorios` autenticado y sin caché: mes/año enteros (1–12 / 1900–2100), registro fijo de tablas, comprobación previa de versión y esquema, transacción SERIALIZABLE y bloqueo exclusivo `CODINSA_LABORATORIOS_REPORTES` con espera de 30 segundos. Timeout de 300 segundos por consulta. Ejecuta el SP una sola vez, lee quince conjuntos con columnas explícitas, construye todos los resultados antes de confirmar y revierte ante fallo. Auditoría con usuario, período y cantidad de filas. No acepta nombres de tabla ni ejecuta DDL.
- Se conservan filas duplicadas, códigos de texto con ceros iniciales, decimales, nulos y signos. Orden por fecha, documento, producto y código. Totales de Cantidad y Total; los precios unitarios no se suman y los importes se denominan **Total reportado**, sin atribuirles el concepto de ventas netas.
- Excel completo con quince hojas, incluso laboratorios vacíos; Excel y PDF individuales con todas las coincidencias, independientemente de la página visible. Columnas variables, códigos de texto, cantidades/importes numéricos y período. PDF A3 horizontal, encabezados repetidos, ajuste de texto y numeración.
- **Archivos SQL:** copia original íntegra en `sql/backups/sp_Laboratorios_reportes_original.sql`; corregido en `sql/sp_Laboratorios_reportes.sql`, con CREATE OR ALTER, NOCOUNT y marcador V2. Las treinta inserciones usan `@mes AS Mes` y listas explícitas. IQFarma asigna Ubigeo/fecha/NroDoc/Codven por nombre, independientemente del orden físico. Comparación automatizada verifica que las expresiones, cálculos, joins y filtros permanecen intactos. No hay migraciones ni cambios de tablas.
- **Documentación:** `documentacion/sp_Laboratorios_reportes_cambios.md` explica los dos errores, ejemplos antes/después, matriz de quince tablas, metadatos y respaldo/instalación/restauración manual en el cliente. Los llamadores externos deben coordinarse con el mismo bloqueo y envolver la ejecución en una transacción.
- **SQL local con rollback:** el original instalado fue rechazado por la comprobación de versión. Se aplicó temporalmente el corregido dentro de una transacción, se ejecutó el batch real para octubre de 2026 y se leyeron las quince tablas (cero movimientos elegibles). Tras rollback se comprobó igualdad exacta de la definición instalada y del contenido previo de las quince tablas. **No quedó instalado permanentemente el SP corregido.**
- **Casos SQL sintéticos:** mismo cuerpo del SP y consultas de lectura redirigidos a fixtures temporales con ventas y notas de crédito de los quince laboratorios: treinta filas, cantidad 1 e importe 10 por laboratorio, precios/descuentos y signos conservados. Se verificaron mes entero, códigos con ceros iniciales, ubicación nula, asignaciones IQFarma y representante Qualis. Dos generaciones concurrentes de octubre/septiembre respetaron el bloqueo y devolvieron períodos independientes; un fallo intencional en el quinto laboratorio revirtió todas las sustituciones. Todas las transacciones fueron revertidas y los fixtures temporales desaparecieron al cerrar las conexiones.
- **Contrato API:** arnés del handler real con dependencias controladas verificó respuestas 400, 503 (SP original), 409 (bloqueo), 500 (fallo SQL/resultados incompletos) y 200; sin caché, sin ejecución con parámetros inválidos, rollback ante fallos y commit/auditoría únicamente tras construir un resultado completo. No se instaló V2 permanentemente para probar el circuito HTTP autenticado completo.
- **Pantalla aislada con datos ficticios:** apertura sin ejecución, aviso de instalación manual, generación, selección IQFarma/Qualis, búsqueda, veinte filas por página y navegación, período efectivo independiente del selector y estados vacíos. Revisión visual en escritorio y a 390 px, con controles adaptados y scroll horizontal contenido en ambas tablas, sin desbordamiento de página.
- **Exportaciones:** builders reales verificados con quince hojas, columnas específicas, códigos de texto, cantidades numéricas, laboratorio individual con ochenta filas y período vacío. PDF de cuatro páginas extraído/renderizado y revisado visualmente en primera y última página, con encabezados repetidos y texto largo ajustado. Se comprobó el contenido generado; no se validó la descarga final del navegador ni la impresión física.
- **Validación técnica:** 83 pruebas del proyecto aprobadas, incluidas siete nuevas de este reporte; `npm run lint`, `npm run build` y `git diff --check` correctos. Persiste la advertencia previa de tamaño del bundle.
- **Estado:** ✅ Implementado y preparado. Hasta instalar manualmente V2, Generar reporte explica la dependencia y no ejecuta el procedimiento original. Pendiente comparar e instalar en el cliente después de respaldar su definición y comprobar el esquema.


### Actualización V3 — mes en letras (15/10/2026)

Esta actualización reemplaza el contrato `Mes INT` y el estado de instalación V2 descritos arriba; las verificaciones anteriores se conservan como historial.

- Metadatos SQL Server confirmados: `Mes CHAR(15)` en las quince tablas. V3 restaura `@nmes AS Mes` en las treinta inserciones, conserva `SETIEMBRE` y corrige `NOCIEMBRE` a `NOVIEMBRE`.
- Conserva todas las listas explícitas, incluido `Distrito, Ubigeo, fecha, NroDoc, Codven` en las dos inserciones IQFarma, y los cálculos, filtros, signos, joins y orígenes de código originales. El respaldo original permanece intacto.
- Marcador `CODINSA_LABORATORIOS_REPORTES_V3`; preflight exige `Mes CHAR` de al menos diez caracteres. El endpoint conserva parámetros y período numéricos; `data[].Mes` es texto limpio en mayúsculas y se valida contra el período. Rechaza nombres incorrectos, números y nulos antes de confirmar.
- Selector, encabezados y validación comparten los doce nombres (`Setiembre`). La columna Mes es textual y más ancha para pantalla, Excel y PDF. Se conservan el período efectivamente generado, la transacción, bloqueo, lectura de quince tablas y rollback.
- **Pruebas técnicas:** 86 pruebas aprobadas (diez del reporte); TypeScript, build y revisión de diferencias correctos. Persiste la advertencia de tamaño del bundle.
- **SQL real y fixtures:** `scripts/verifyMonthlyLaboratoriesReport.ts` instala V3 temporalmente dentro de una transacción, rechaza la versión anterior y los tipos INT/CHAR(9), genera octubre de 2026 sin movimientos y revierte. Compara exactamente la definición y contenido de las quince tablas antes/después. Fixtures temporales de doce meses y quince laboratorios (360 filas de ventas/notas de crédito), campos IQFarma, códigos, precios, Qualis, ubicación nula, rollback tras fallo en el quinto laboratorio y concurrencia de octubre/setiembre aprobados. No quedaron cambios permanentes en SQL Server.
- **Pantalla y exportaciones V3:** componente real aislado con fixtures: mes en letras, veinte filas, selección IQFarma, paginación y período generado independiente del selector; escritorio y móvil de 390 px sin desbordamiento. Builders reales de Excel completo/individual y PDF para setiembre, noviembre y diciembre. XLSX reabiertos: quince hojas, 45 meses textuales por hoja; PDF de dos páginas por período con nombres correctos, diciembre renderizado y revisado. No se probó descarga final, impresión física ni HTTP autenticado con instalación permanente.
- **Despliegue:** V3 preparado para instalación manual, sin migraciones. Pendiente respaldar/comparar/instalar en el cliente y contrastar movimientos reales con su ERP.

### Ajuste visual del logo — 21/10/2026

- El encabezado de Reportes Mes Laboratorios utiliza `loadTrimmedLogoDataUrl`, siguiendo el patrón de Stock Valorizado: elimina márgenes transparentes y muestra el logo con ancho de 150 px en móvil, 190 px desde `sm` y alto de 62 px, conservando proporción y alineación izquierda.
- Se mantiene el logo original como respaldo si falla el procesamiento y se evita actualizar el estado después de desmontar la vista. El encabezado incorpora `min-w-0` y el logo `shrink-0` para permitir el ajuste del título sin comprimir la imagen. Se conservan título, subtítulo, separador y botones; no cambian API, SQL ni exportaciones.
- **Validación:** `npm run lint`, `npm run build` y `git diff --check` correctos; persiste la advertencia existente de tamaño del bundle. Revisión del encabezado inicial en navegador autenticado y móvil de 390 px. Mediciones DOM a 390 y 1280 px confirman logo recortado de 150 × 62 y 190 × 62 px respectivamente, sin desbordamiento horizontal de página. Las clases y el procesamiento coinciden con Stock Valorizado.
- **Pendiente:** comprobación visual después de generar datos; no se ejecutó el procedimiento SQL para este ajuste de presentación.
