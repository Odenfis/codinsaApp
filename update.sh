#!/bin/bash
# =============================================================================
# update.sh - Actualización del Tool Kit Enterprise
# Compatible con Linux / macOS / Git Bash (Windows)
# =============================================================================

set -e

echo "============================================"
echo "Tool Kit Enterprise - Actualizando..."
echo "============================================"

cd "$(dirname "$0")"

# 1. Obtener últimos cambios
echo "[1/5] Descargando últimos cambios del repositorio..."
git pull origin main

# 2. Detener contenedores actuales
echo "[2/5] Deteniendo contenedores actuales..."
docker compose down

# 3. Reconstruir imagen
echo "[3/5] Reconstruyendo imagen Docker..."
docker compose build --no-cache

# 4. Iniciar nuevo contenedor
echo "[4/5] Iniciando nuevo contenedor..."
docker compose up -d

# 5. Limpiar imágenes antiguas
echo "[5/5] Limpiando imágenes antiguas..."
docker image prune -f

echo "============================================"
echo "¡Actualización completada!"
echo "La aplicación está corriendo en: http://localhost:3000"
echo "============================================"
