/**
 * @license
 * Tool Kit Enterprise - Gestor de configuración del módulo Actualización ERP
 * Persiste la config activa + historial (máx. 20) en config/erp-update-config.json
 */

import fs from 'fs';
import path from 'path';
import { ErpUpdateConfig } from '../types';

const CONFIG_DIR = path.join(process.cwd(), 'config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'erp-update-config.json');
const HISTORIAL_MAX = 20;

const DEFAULT_CONFIG: ErpUpdateConfig = {
  driveId: '',
  driveUrl: '',
  zipName: 'actualizacionERP.zip',
  sha256: null,
  nota: null,
  actualizadoPor: null,
  fechaActualizacion: null,
};

interface ErpUpdateFile {
  config: Partial<ErpUpdateConfig>;
  historial?: ErpUpdateConfig[];
}

export class ErpUpdateConfigManager {
  private config: ErpUpdateConfig;
  private historial: ErpUpdateConfig[];

  constructor() {
    const loaded = this.load();
    this.config = loaded.config;
    this.historial = loaded.historial;
  }

  private load(): { config: ErpUpdateConfig; historial: ErpUpdateConfig[] } {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) as ErpUpdateFile;
        return {
          config: { ...DEFAULT_CONFIG, ...(raw.config ?? {}) },
          historial: Array.isArray(raw.historial) ? raw.historial : [],
        };
      }
      this.persist(DEFAULT_CONFIG, []);
      return { config: { ...DEFAULT_CONFIG }, historial: [] };
    } catch (err) {
      console.error('[ErpUpdateConfig] Error loading config, using defaults:', err);
      return { config: { ...DEFAULT_CONFIG }, historial: [] };
    }
  }

  private persist(config: ErpUpdateConfig, historial: ErpUpdateConfig[]): void {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      fs.writeFileSync(
        CONFIG_FILE,
        JSON.stringify({ config, historial } satisfies ErpUpdateFile, null, 2),
        'utf-8'
      );
    } catch (err) {
      console.error('[ErpUpdateConfig] Error saving config:', err);
    }
  }

  getConfig(): ErpUpdateConfig {
    return { ...this.config };
  }

  getHistorial(): ErpUpdateConfig[] {
    return this.historial.map(h => ({ ...h }));
  }

  tieneConfigActiva(): boolean {
    return Boolean(this.config.driveId);
  }

  update(params: {
    driveId: string;
    driveUrl: string;
    zipName: string;
    sha256: string | null;
    nota: string | null;
    actualizadoPor: string | null;
  }): ErpUpdateConfig {
    const nueva: ErpUpdateConfig = {
      ...params,
      fechaActualizacion: new Date().toISOString(),
    };
    // La config anterior pasa al historial (si existía y es distinta)
    if (this.tieneConfigActiva()) {
      this.historial.unshift({ ...this.config });
      this.historial = this.historial.slice(0, HISTORIAL_MAX);
    }
    this.config = nueva;
    this.persist(this.config, this.historial);
    return this.getConfig();
  }
}
