import fs from 'fs';
import path from 'path';
import { NisiraDirectConfig } from '../types';

const CONFIG_DIR = path.join(process.cwd(), 'config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'nisira-config.json');

const DEFAULT_CONFIG: NisiraDirectConfig = {
  destinationPath: 'X:\\FACTURACION_EDOC_CODINSA\\DBFCODINSA\\',
  lastExport: null,
  lastExportCount: null,
  lastExportStatus: null,
};

export class NisiraExportConfigManager {
  private config: NisiraDirectConfig;

  constructor() {
    this.config = this.load();
  }

  private load(): NisiraDirectConfig {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
      }
      this.save(DEFAULT_CONFIG);
      return { ...DEFAULT_CONFIG };
    } catch (err) {
      console.error('[NisiraConfig] Error loading config, using defaults:', err);
      return { ...DEFAULT_CONFIG };
    }
  }

  private save(config: NisiraDirectConfig): void {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    } catch (err) {
      console.error('[NisiraConfig] Error saving config:', err);
    }
  }

  getDestinationPath(): string {
    return process.env.NISIRA_EXPORT_DIR || this.config.destinationPath;
  }

  getConfig(): NisiraDirectConfig {
    return {
      ...this.config,
      destinationPath: this.getDestinationPath(),
    };
  }

  updateDestinationPath(destinationPath: string): NisiraDirectConfig {
    this.config.destinationPath = destinationPath;
    this.save(this.config);
    return this.getConfig();
  }

  setLastExport(status: 'success' | 'failed', count?: number): NisiraDirectConfig {
    this.config.lastExport = new Date().toISOString();
    this.config.lastExportStatus = status;
    if (count !== undefined && count !== null) this.config.lastExportCount = count;
    this.save(this.config);
    return this.getConfig();
  }
}
