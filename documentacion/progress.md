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

## 6. Infraestructura de Despliegue (Docker)
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
*Última actualización: 26 de Junio, 2026*
