@echo off
:: =============================================================================
:: update.bat - Actualización del Tool Kit Enterprise
:: Ejecutar como Administrador en Windows
:: =============================================================================
:: Uso:
::   Simplemente hacer doble clic o ejecutar: .\update.bat
:: =============================================================================

echo ============================================
echo Tool Kit Enterprise - Actualizando...
echo ============================================

:: Ir a la carpeta del proyecto (ajustar si es necesario)
cd /d "%~dp0"

:: 1. Obtener últimos cambios del repositorio
echo [1/5] Descargando ultimos cambios del repositorio...
git pull origin main
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] No se pudo descargar los cambios. Verifique la conexion a internet.
    pause
    exit /b 1
)

:: 2. Detener contenedores actuales
echo [2/5] Deteniendo contenedores actuales...
docker compose down

:: 3. Reconstruir imagen sin cache
echo [3/5] Reconstruyendo imagen Docker...
docker compose build --no-cache
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Fallo la construccion de la imagen Docker.
    pause
    exit /b 1
)

:: 4. Iniciar nuevo contenedor
echo [4/5] Iniciando nuevo contenedor...
docker compose up -d

:: 5. Limpiar imagenes antiguas
echo [5/5] Limpiando imagenes antiguas...
docker image prune -f

echo ============================================
echo ¡Actualizacion completada!
echo La aplicacion esta corriendo en: http://localhost:3000
echo ============================================

pause
