/**
 * Update Obsidian vault with Neo4j memories.
 *
 * Phase 2 Story 3: Update Obsidian Vault
 */

import { MarkdownStorageManager } from '../../storage/MarkdownStorageManager.js';
import type { Neo4jMemory } from './neo4jFetcher.js';

interface VaultUpdateResult {
  created: number;
  updated: number;
  errors: string[];
}

/**
 * Generate entity name from memory data.
 * Similar to 0brainOS entity naming strategy.
 */
function generateEntityName(memory: Neo4jMemory): string {
  const { content, entities, sector } = memory;

  // Extract action verbs
  const actionWords = ['decision', 'chose', 'selected', 'meeting', 'met', 'discussed',
                       'deployed', 'implemented', 'learned', 'discovered'];

  const contentLower = content.toLowerCase();
  let detectedAction: string | undefined;
  for (const action of actionWords) {
    if (contentLower.includes(action)) {
      detectedAction = action.charAt(0).toUpperCase() + action.slice(1);
      break;
    }
  }

  if (entities.length > 0) {
    const primaryEntity = slugify(entities[0]);

    if (entities.length > 1) {
      const secondaryEntity = slugify(entities[1]);
      if (detectedAction) {
        return `${primaryEntity}_vs_${secondaryEntity}_${detectedAction}`;
      }
      return `${primaryEntity}_and_${secondaryEntity}_${sector.slice(0, 3)}`;
    } else {
      if (detectedAction) {
        return `${primaryEntity}_${detectedAction}`;
      }
      return `${primaryEntity}_${sector.slice(0, 4)}`;
    }
  } else {
    // No entities: Extract from content
    const words = content.split(/\s+/);
    const keywords = words.filter(w => w.length > 3).slice(0, 3);
    const prefix = keywords.map(k => slugify(k)).join('_');

    if (detectedAction) {
      return `${prefix}_${detectedAction}`;
    }
    return `${prefix}_${sector.slice(0, 3)}`;
  }
}

/**
 * Convert text to URL-friendly slug.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s-]+/g, '_')
    .slice(0, 30);
}

/**
 * Update Obsidian vault with Neo4j memories.
 */
export async function updateObsidianVault(memories: Neo4jMemory[]): Promise<VaultUpdateResult> {
  const storage = new MarkdownStorageManager();
  const result: VaultUpdateResult = { created: 0, updated: 0, errors: [] };

  try {
    // Get existing graph to check for duplicates
    const existingGraph = await storage.readGraph();
    const existingNames = new Set(existingGraph.entities.map(e => e.name));

    for (const memory of memories) {
      try {
        const entityName = generateEntityName(memory);

        // Build observations array
        const observations: string[] = [
          `Content: ${memory.content}`,
          `Salience: ${memory.salience}`,
          `Neo4j ID: ${memory.id}`,
          `Created: ${memory.created_at}`,
          ...memory.observations
        ];

        if (existingNames.has(entityName)) {
          // Entity exists - add observations
          await storage.addObservations([{
            entityName,
            contents: observations
          }]);
          result.updated++;
        } else {
          // Create new entity
          await storage.createEntities([{
            name: entityName,
            entityType: memory.sector,
            observations
          }]);
          result.created++;
          existingNames.add(entityName);
        }
      } catch (error) {
        const errorMsg = `Failed to sync memory ${memory.id}: ${error}`;
        result.errors.push(errorMsg);
        console.error(`[Vault Updater] ${errorMsg}`);
      }
    }

    console.error(`[Vault Updater] Complete: ${result.created} created, ${result.updated} updated, ${result.errors.length} errors`);

  } catch (error) {
    const errorMsg = `Vault update failed: ${error}`;
    result.errors.push(errorMsg);
    console.error(`[Vault Updater] ${errorMsg}`);
  }

  return result;
}
