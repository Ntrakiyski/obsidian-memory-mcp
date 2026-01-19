/**
 * Watch for changed files in Obsidian vault.
 *
 * Phase 2 Story 4: Read Changed Files
 */

import { promises as fs } from 'fs';
import path from 'path';
import { getMemoryDir } from '../../utils/pathUtils.js';

const LAST_SYNC_FILE = '.last_obsidian_sync';

export interface ChangedFile {
  path: string;
  entityName: string;
  modified_time: Date;
}

/**
 * Read files changed since last sync from Obsidian vault.
 */
export async function readChangedFiles(): Promise<ChangedFile[]> {
  const memoryDir = getMemoryDir();
  const lastSync = await getLastSyncTime();
  const changedFiles: ChangedFile[] = [];

  try {
    console.error(`[File Watcher] Checking for files modified since ${lastSync.toISOString()}...`);

    const files = await fs.readdir(memoryDir);
    const mdFiles = files.filter(f => f.endsWith('.md') && f !== LAST_SYNC_FILE && !f.startsWith('.'));

    for (const file of mdFiles) {
      const filePath = path.join(memoryDir, file);
      const stats = await fs.stat(filePath);

      if (stats.mtime > lastSync) {
        changedFiles.push({
          path: filePath,
          entityName: file.replace(/\.md$/, ''),
          modified_time: stats.mtime
        });
      }
    }

    // Update last sync time AFTER reading files
    await updateLastSyncTime();

    console.error(`[File Watcher] Found ${changedFiles.length} changed files`);

  } catch (error) {
    console.error('[File Watcher] Error reading changed files:', error);
    throw error;
  }

  return changedFiles;
}

/**
 * Get the last sync timestamp from the .last_obsidian_sync file.
 */
async function getLastSyncTime(): Promise<Date> {
  try {
    const syncFile = path.join(getMemoryDir(), LAST_SYNC_FILE);
    const content = await fs.readFile(syncFile, 'utf-8');
    return new Date(content.trim());
  } catch {
    // First run - use epoch time
    return new Date(0);
  }
}

/**
 * Update the last sync timestamp.
 */
async function updateLastSyncTime(): Promise<void> {
  try {
    const syncFile = path.join(getMemoryDir(), LAST_SYNC_FILE);
    await fs.writeFile(syncFile, new Date().toISOString(), 'utf-8');
  } catch (error) {
    console.error('[File Watcher] Failed to update last sync time:', error);
  }
}
