import cron from 'node-cron';
import { getDbPool, sql } from '../../db';
import { BackupConfigManager } from '../backupConfig';

export class BackupScheduler {
  private task: cron.ScheduledTask | null = null;
  private configManager: BackupConfigManager;

  constructor(configManager: BackupConfigManager) {
    this.configManager = configManager;
  }

  async executeBackup(): Promise<void> {
    const config = this.configManager.getConfig();
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '-');
    const timeStr = now.toTimeString().slice(0, 5).replace(/:/g, '');
    const filename = `COINSA_${dateStr}_${timeStr}.bak`;
    const fullPath = `${config.destinationPath}${filename}`;

    console.log(`[BackupScheduler] Starting backup to: ${fullPath}`);

    try {
      const pool = await getDbPool();

      await pool.request()
        .input('path', sql.NVarChar, fullPath)
        .query(`
          BACKUP DATABASE [COINSA]
          TO DISK = @path
          WITH FORMAT, NAME = N'Backup automatico COINSA'
        `);

      console.log(`[BackupScheduler] Backup completed: ${fullPath}`);
      this.configManager.setLastBackup('success');
    } catch (err: any) {
      console.error('[BackupScheduler] Backup failed:', err);
      this.configManager.setLastBackup('failed');
    }
  }

  async cleanupOldBackups(): Promise<void> {
    const config = this.configManager.getConfig();
    try {
      const pool = await getDbPool();
      await pool.request()
        .input('folder', sql.NVarChar, config.destinationPath)
        .input('extension', sql.NVarChar, 'BAK')
        .input('cutoff', sql.DateTime, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .query(`
          DECLARE @cutoff DATETIME = @cutoff;
          EXECUTE master.dbo.xp_delete_file 0, @folder, @extension, @cutoff;
        `);
      console.log('[BackupScheduler] Old backups cleaned (older than 30 days)');
    } catch (err: any) {
      console.warn('[BackupScheduler] Cleanup skipped (xp_delete_file may not be available):', err.message);
    }
  }

  start(): void {
    const config = this.configManager.getConfig();

    if (this.task) {
      this.task.stop();
      this.task = null;
    }

    if (!config.enabled) {
      console.log('[BackupScheduler] Automatic backups are disabled');
      return;
    }

    const [hour, minute] = config.time.split(':').map(Number);
    const cronExpr = `${minute} ${hour} * * *`;

    console.log(`[BackupScheduler] Scheduling backup at ${config.time} (cron: ${cronExpr})`);

    this.task = cron.schedule(cronExpr, async () => {
      console.log('[BackupScheduler] Cron triggered, executing backup...');
      await this.executeBackup();
      await this.cleanupOldBackups();
    });
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log('[BackupScheduler] Scheduler stopped');
    }
  }

  restart(): void {
    console.log('[BackupScheduler] Restarting scheduler...');
    this.stop();
    this.start();
  }
}
