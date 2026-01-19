/**
 * Sync scheduler using node-cron.
 *
 * Phase 2 Story 8: 5-Minute Cron Scheduler
 */

import cron from 'node-cron';
import { syncObsidianNeo4j } from './index.js';

let syncTask: cron.ScheduledTask | null = null;
let isRunning = false;
let lastSyncTime: Date | null = null;
let lastSyncResult: any = null;

/**
 * Start the sync scheduler.
 * Runs sync every N minutes (default: 5).
 */
export function startSyncScheduler(): void {
  if (syncTask) {
    console.error('[Sync Scheduler] Already running');
    return;
  }

  // Get interval from environment or default to 5 minutes
  const interval = parseInt(process.env.SYNC_INTERVAL_MINUTES || '5', 10);
  const cronPattern = `*/${interval} * * * *`; // Every N minutes

  syncTask = cron.schedule(cronPattern, async () => {
    if (isRunning) {
      console.error('[Sync Scheduler] Previous sync still running, skipping');
      return;
    }

    isRunning = true;
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [Sync Scheduler] Running scheduled sync...`);

    try {
      const result = await syncObsidianNeo4j({ direction: 'both' });

      // Track last sync time and result
      lastSyncTime = new Date();
      lastSyncResult = result;

      if (result.success) {
        console.error(`[${timestamp}] [Sync Scheduler] Sync completed successfully:`, {
          neo4j_to_obsidian: result.neo4j_to_obsidian,
          obsidian_to_neo4j: result.obsidian_to_neo4j,
          duration_ms: result.duration_ms
        });
      } else {
        console.error(`[${timestamp}] [Sync Scheduler] Sync completed with errors:`, {
          neo4j_to_obsidian_errors: result.neo4j_to_obsidian.errors.length,
          obsidian_to_neo4j_errors: result.obsidian_to_neo4j.errors.length
        });
      }
    } catch (error) {
      console.error(`[${timestamp}] [Sync Scheduler] Sync failed:`, error);
    } finally {
      isRunning = false;
    }
  });

  console.error(`[Sync Scheduler] Started: every ${interval} minutes`);
}

/**
 * Stop the sync scheduler.
 */
export function stopSyncScheduler(): void {
  if (syncTask) {
    syncTask.stop();
    syncTask = null;
    console.error('[Sync Scheduler] Stopped');
  }
}

/**
 * Check if scheduler is running.
 */
export function isSchedulerRunning(): boolean {
  return syncTask !== null;
}

/**
 * Manually trigger a sync (useful for testing).
 */
export async function triggerManualSync(direction: 'neo4j_to_obsidian' | 'obsidian_to_neo4j' | 'both' = 'both'): Promise<any> {
  if (isRunning) {
    throw new Error('Sync already in progress');
  }

  isRunning = true;
  try {
    console.error(`[Sync Scheduler] Manual sync triggered: direction=${direction}`);
    const result = await syncObsidianNeo4j({ direction });
    lastSyncTime = new Date();
    lastSyncResult = result;
    console.error('[Sync Scheduler] Manual sync completed:', result);
    return result;
  } finally {
    isRunning = false;
  }
}

/**
 * Get the current scheduler status.
 * Returns enabled state, last sync time, and next scheduled sync.
 */
export function getSchedulerStatus(): {
  enabled: boolean;
  lastSync?: string;
  nextSync?: string;
  interval: number;
  isRunning: boolean;
  lastResult?: any;
} {
  const enabled = syncTask !== null;
  const interval = parseInt(process.env.SYNC_INTERVAL_MINUTES || '5', 10);

  let nextSync: Date | undefined;
  if (enabled && lastSyncTime) {
    nextSync = new Date(lastSyncTime.getTime() + interval * 60000);
  }

  return {
    enabled,
    lastSync: lastSyncTime?.toISOString(),
    nextSync: nextSync?.toISOString(),
    interval,
    isRunning,
    lastResult: lastSyncResult
  };
}
