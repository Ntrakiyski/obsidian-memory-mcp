/**
 * Update Neo4j with changes from Obsidian files.
 *
 * Phase 2 Story 5: Update Neo4j
 */

import { promises as fs } from 'fs';
import { parseMarkdown } from '../../utils/markdownUtils.js';
import type { ChangedFile } from './fileWatcher.js';

interface UpdateResult {
  updated: number;
  errors: string[];
}

/**
 * Update Neo4j with observations from changed Obsidian files.
 */
export async function updateNeo4j(
  changedFiles: ChangedFile[]
): Promise<UpdateResult> {
  const result: UpdateResult = { updated: 0, errors: [] };

  // Get Neo4j MCP URL from environment
  const neo4jMcpUrl = process.env.NEO4J_MCP_URL || 'http://localhost:9131/mcp';

  for (const file of changedFiles) {
    try {
      const content = await fs.readFile(file.path, 'utf-8');
      const parsed = parseMarkdown(content, file.entityName);

      // Extract Neo4j ID from observations
      const neo4jIdMatch = parsed.observations.find(o =>
        o.startsWith('Neo4j ID:') || o.startsWith('Neo4j:')
      );

      if (!neo4jIdMatch) {
        result.errors.push(`No Neo4j ID in ${file.entityName}`);
        continue;
      }

      const neo4jId = neo4jIdMatch.replace(/^Neo4j ID:\s*/i, '').trim();

      // Filter out system observations (keep only user-added observations)
      const userObservations = parsed.observations.filter(o =>
        !o.startsWith('Content:') &&
        !o.startsWith('Salience:') &&
        !o.startsWith('Neo4j ID:') &&
        !o.startsWith('Neo4j:') &&
        !o.startsWith('Created:')
      );

      // Call 0brainOS update_memory_observations via MCP
      const response = await fetch(neo4jMcpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'tools/call',
          params: {
            name: 'update_memory_observations',
            arguments: {
              memory_id: neo4jId,
              observations: userObservations,
              append: false  // Replace observations with Obsidian content
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      result.updated++;
      console.error(`[Neo4j Updater] Updated memory ${neo4jId} from ${file.entityName}`);

    } catch (error) {
      const errorMsg = `Failed to sync ${file.entityName}: ${error}`;
      result.errors.push(errorMsg);
      console.error(`[Neo4j Updater] ${errorMsg}`);
    }
  }

  console.error(`[Neo4j Updater] Complete: ${result.updated} updated, ${result.errors.length} errors`);

  return result;
}
