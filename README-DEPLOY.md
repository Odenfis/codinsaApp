# Guía de Despliegue - Tool Kit Enterprise Platform

## Requisitos del Servidor Cliente

- ✅ **Windows** (10/11/Server 2019+)
- ✅ **Docker Desktop** instalado y corriendo
- ✅ **SQL Server 2022** nativo instalado y funcionando
- ✅ **Git** instalado (Git Bash o PowerShell)
- ✅ **Puerto 3000** libre en el firewall

---

## 1. Instalación Inicial (Solo la primera vez)

### 1.1 Verificar SQL Server

Asegúrate de que SQL Server acepte conexiones TCP/IP:

1. Abre **SQL Server Configuration Manager**
2. Ve a **SQL Server Network Configuration > Protocols for MSSQLSERVER**
3. Asegúrate de que **TCP/IP** esté **Enabled**
4. En propiedades de TCP/IP > **IP Addresses**, verifica que **TCP Port** sea **1433**
5. Reinicia el servicio SQL Server si hiciste cambios

Verifica que el usuario `Coinsa` exista y tenga acceso a la base de datos `COINSA`:

```sql
-- En SQL Server Management Studio
USE [master];
GO
CREATE LOGIN [Coinsa] WITH PASSWORD = '2026';
GO
USE [COINSA];
GO
CREATE USER [Coinsa] FOR LOGIN [Coinsa];
GO
EXEC sp_addrolemember N'db_owner', N'Coinsa';
GO
```

### 1.2 Clonar el Repositorio

```powershell
# Abrir PowerShell o Git Bash
cd C:\
git clone <URL_DEL_REPOSITORIO> toolkit
cd toolkit
```

### 1.3 Verificar Docker

```powershell
docker --version
docker compose version
```

Debe mostrar las versiones sin errores.

### 1.4 Probar Conexión SQL desde Docker (Opcional pero recomendado)

```powershell
# Probar que Docker puede alcanzar SQL Server del host
docker run --rm alpine/socat - tcp:host.docker.internal:1433
```

Si ves una conexión abierta (o no falla inmediatamente), la comunicación funciona.

### 1.5 Construir e Iniciar la Aplicación

```powershell
docker compose build --no-cache
docker compose up -d
```

### 1.6 Verificar que Funciona

```powershell
# Ver logs de la aplicación
docker compose logs -f toolkit-app
```

Espera unos segundos y abre tu navegador en: **http://localhost:3000**

Deberías ver la pantalla de login de Tool Kit Enterprise.

---

## 2. Actualizaciones Futuras (Cada vez que quieras actualizar)

Cuando recibas una notificación de nueva versión, solo ejecuta:

### Opción A: Script automático (Recomendado)

```powershell
# En PowerShell (como Administrador)
.\update.bat
```

### Opción B: Manual paso a paso

```powershell
cd C:\toolkit
git pull origin main
docker compose down
docker compose build --no-cache
docker compose up -d
docker image prune -f
```

---

## 3. Comandos Útiles de Docker

| Acción | Comando |
|--------|---------|
| Ver estado del contenedor | `docker ps` |
| Ver logs en vivo | `docker compose logs -f` |
| Detener aplicación | `docker compose down` |
| Iniciar aplicación | `docker compose up -d` |
| Reiniciar aplicación | `docker compose restart` |
| Ver espacio usado | `docker system df` |

---

## 4. Solución de Problemas

### "No se puede conectar a SQL Server"

```powershell
# Verificar que SQL Server está corriendo
net start | findstr "SQL"
# Verificar que TCP/IP está habilitado
# Revisar firewall: permitir puerto 1433
```

### "La página no carga"

```powershell
# Ver logs del contenedor
docker compose logs toolkit-app
```

### "Error al hacer git pull"

```powershell
# Si hay cambios locales sin commitear:
git stash
git pull origin main
git stash pop
```

### "Puerto 3000 ya está en uso"

```powershell
# Cambiar el puerto en docker-compose.yml
# Ejemplo: "8080:3000" → la app quedará en http://localhost:8080
```

---

## 5. Mantenimiento de Base de Datos

El cliente mantiene su propio SQL Server. Recomendaciones:

- **Backups automáticos**: Configurar en SQL Server Agent
- **No modificar estructura**: Los cambios de schema los gestiona el desarrollador
- **Credenciales**: No cambiar usuario/contraseña sin avisar

---

## 6. Seguridad

- 🔒 **Nunca compartir** el archivo `.env` con las credenciales
- 🔒 **Cambiar** `SESSION_SECRET` por una clave segura (generada aleatoriamente)
- 🔒 **Firewall**: Solo exponer puerto 3000 si es necesario (acceso local recomendado)
- 🔒 **HTTPS**: Para producción externa, usar Nginx/IIS como reverse proxy

---

*Documento generado para despliegue del cliente - Tool Kit Enterprise Platform*
