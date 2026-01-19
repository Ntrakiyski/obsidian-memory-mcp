/**
 * Bidirectional sync between Neo4j and Obsidian markdown files.
 *
 * Phase 2 Implementation:
 * - Fetches memories from Neo4j
 * - Updates Obsidian vault
 * - Reads changed files
 * - Updates Neo4j
 */

import { fetchFromNeo4j, type Neo4jMemory } from './neo4jFetcher.js';
import { updateObsidianVault } from './vaultUpdater.js';
import { readChangedFiles } from './fileWatcher.js';
import { updateNeo4j } from './neo4jUpdater.js';

export interface SyncResult {
  success: boolean;
  neo4j_to_obsidian: {
    fetched: number;
    created: number;
    updated: number;
    errors: string[];
  };
  obsidian_to_neo4j: {
    changed_files: number;
    updated_memories: number;
    errors: string[];
  };
  duration_ms: number;
}

export interface SyncOptions {
  direction: 'neo4j_to_obsidian' | 'obsidian_to_neo4j' | 'both';
}

/**
 * Main sync orchestrator.
 * Performs bidirectional sync between Neo4j and Obsidian.
 */
export async function syncObsidianNeo4j(options: SyncOptions): Promise<SyncResult> {
  const startTime = Date.now();
  const result: SyncResult = {
    success: true,
    neo4j_to_obsidian: {
      fetched: 0,
      created: 0,
      updated: 0,
      errors: []
    },
    obsidian_to_neo4j: {
      changed_files: 0,
      updated_memories: 0,
      errors: []
    },
    duration_ms: 0
  };

  try {
    // Step 1: Neo4j → Obsidian (if direction is both or neo4j_to_obsidian)
    if (options.direction === 'neo4j_to_obsidian' || options.direction === 'both') {
      console.error('[Sync] Starting Neo4j → Obsidian sync...');

      const memories = await fetchFromNeo4j();
      result.neo4j_to_obsidian.fetched = memories.length;

      if (memories.length > 0) {
        const vaultResult = await updateObsidianVault(memories);
        result.neo4j_to_obsidian.created = vaultResult.created;
        result.neo4j_to_obsidian.updated = vaultResult.updated;
        result.neo4j_to_obsidian.errors = vaultResult.errors;

        if (vaultResult.errors.length > 0) {
          console.error(`[Sync] Vault update had ${vaultResult.errors.length} errors`);
        }
      }

      console.error(`[Sync] Neo4j → Obsidian complete: ${memories.length} fetched, ${result.neo4j_to_obsidian.created} created, ${result.neo4j_to_obsidian.updated} updated`);
    }

    // Step 2: Obsidian → Neo4j (if direction is both or obsidian_to_neo4j)
    if (options.direction === 'obsidian_to_neo4j' || options.direction === 'both') {
      console.error('[Sync] Starting Obsidian → Neo4j sync...');

      const changedFiles = await readChangedFiles();
      result.obsidian_to_neo4j.changed_files = changedFiles.length;

      if (changedFiles.length > 0) {
        const neo4jResult = await updateNeo4j(changedFiles);
        result.obsidian_to_neo4j.updated_memories = neo4jResult.updated;
        result.obsidian_to_neo4j.errors = neo4jResult.errors;

        if (neo4jResult.errors.length > 0) {
          console.error(`[Sync] Neo4j update had ${neo4jResult.errors.length} errors`);
        }
      }

      console.error(`[Sync] Obsidian → Neo4j complete: ${changedFiles.length} files changed, ${result.obsidian_to_neo4j.updated_memories} memories updated`);
    }

    // Check for any critical errors
    const hasErrors = result.neo4j_to_obsidian.errors.length > 0 || result.obsidian_to_neo4j.errors.length > 0;
    result.success = !hasErrors;

  } catch (error) {
    console.error('[Sync] Fatal error:', error);
    result.success = false;
    result.neo4j_to_obsidian.errors.push(String(error));
  }

  result.duration_ms = Date.now() - startTime;
  return result;
}

// Re-export types
export type { Neo4jMemory } from './neo4jFetcher.js';
