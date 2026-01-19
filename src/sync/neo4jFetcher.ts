/**
 * Fetch memories from Neo4j for sync.
 *
 * Phase 2 Story 2: FetchFromNeo4j
 */

import { promises as fs } from 'fs';
import path from 'path';

const LAST_SYNC_FILE = '.last_neo4j_sync';

export interface Neo4jMemory {
  id: string;
  content: string;
  sector: string;
  salience: number;
  entities: string[];
  observations: string[];
  created_at: string;
  last_accessed?: string;
}

/**
 * Fetch memories from Neo4j MCP server.
 * Filters by last_accessed timestamp for incremental sync.
 */
export async function fetchFromNeo4j(): Promise<Neo4jMemory[]> {
  const memories: Neo4jMemory[] = [];
  const sinceTime = await getLastSyncTime();

  // Get Neo4j MCP URL from environment or use default
  const neo4jMcpUrl = process.env.NEO4J_MCP_URL || 'http://localhost:9131/mcp';

  try {
    console.error(`[Neo4j Fetcher] Fetching memories modified since ${sinceTime.toISOString()}...`);

    // Call get_all_memories from Neo4j MCP
    const response = await fetch(neo4jMcpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'tools/call',
        params: {
          name: 'get_all_memories',
          arguments: { limit: 1000 }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Neo4j MCP returned HTTP ${response.status}`);
    }

    const data = await response.json();

    // Parse the MCP response
    if (data.result && data.result.content && data.result.content[0]) {
      const textContent = data.result.content[0].text;
      let memoriesData;
      try {
        memoriesData = JSON.parse(textContent);
      } catch (parseError) {
        console.error('[Neo4j Fetcher] Failed to parse JSON response:', parseError);
        return [];
      }

      if (memoriesData.bubbles && Array.isArray(memoriesData.bubbles)) {
        for (const bubble of memoriesData.bubbles) {
          // Incremental filter: only sync memories accessed since last sync
          const lastAccessed = bubble.last_accessed ? new Date(bubble.last_accessed) : new Date(0);

          if (lastAccessed > sinceTime) {
            memories.push({
              id: String(bubble.id),
              content: bubble.content || '',
              sector: bubble.sector || 'Semantic',
              salience: bubble.salience || 0.5,
              entities: bubble.entities || [],
              observations: bubble.observations || [],
              created_at: bubble.created_at || new Date().toISOString(),
              last_accessed: bubble.last_accessed
            });
          }
        }
      }
    }

    // Update last sync timestamp
    await updateLastSyncTime();

    console.error(`[Neo4j Fetcher] Fetched ${memories.length} memories modified since last sync`);

  } catch (error) {
    console.error('[Neo4j Fetcher] Error fetching from Neo4j:', error);
    throw error;
  }

  return memories;
}

/**
 * Get the last sync timestamp from the .last_neo4j_sync file.
 */
async function getLastSyncTime(): Promise<Date> {
  try {
    const memoryDir = process.env.MEMORY_DIR || path.join(process.cwd(), 'data');
    const syncFile = path.join(memoryDir, LAST_SYNC_FILE);

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
    const memoryDir = process.env.MEMORY_DIR || path.join(process.cwd(), 'data');
    const syncFile = path.join(memoryDir, LAST_SYNC_FILE);

    // Ensure directory exists
    await fs.mkdir(memoryDir, { recursive: true });

    // Write current timestamp
    await fs.writeFile(syncFile, new Date().toISOString(), 'utf-8');
  } catch (error) {
    console.error('[Neo4j Fetcher] Failed to update last sync time:', error);
  }
}
