import fs from 'fs';
import path from 'path';
import { BackupConfig } from '../types';

const CONFIG_DIR = path.join(process.cwd(), 'config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'backup-config.json');

const DEFAULT_CONFIG: BackupConfig = {
  enabled: false,
  destinationPath: 'C:\\Backups\\COINSA\\',
  time: '20:00',
  lastBackup: null,
  lastBackupSize: null,
  lastBackupStatus: null,
};

export class BackupConfigManager {
  private config: BackupConfig;

  constructor() {
    this.config = this.load();
  }

  private load(): BackupConfig {
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
      console.error('[BackupConfig] Error loading config, using defaults:', err);
      return { ...DEFAULT_CONFIG };
    }
  }

  private save(config: BackupConfig): void {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    } catch (err) {
      console.error('[BackupConfig] Error saving config:', err);
    }
  }

  getConfig(): BackupConfig {
    return { ...this.config };
  }

  updateConfig(partial: Partial<BackupConfig>): BackupConfig {
    this.config = { ...this.config, ...partial };
    this.save(this.config);
    return this.getConfig();
  }

  setLastBackup(status: 'success' | 'failed', size?: string): BackupConfig {
    this.config.lastBackup = new Date().toISOString();
    this.config.lastBackupStatus = status;
    if (size) this.config.lastBackupSize = size;
    this.save(this.config);
    return this.getConfig();
  }
}
