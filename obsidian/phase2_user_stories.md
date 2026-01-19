# Phase 2: Bidirectional Sync - Obsidian ↔ Neo4j
**Status**: 🔄 READY TO IMPLEMENT (Target: Week of 2026-01-20)
**Goal**: Background cron job syncs Obsidian and Neo4j every 5 minutes

---

## Overview

Phase 2 enables bidirectional synchronization between 0brainOS (Neo4j) and Obsidian Memory MCP. The sync runs every 5 minutes via a background cron job, ensuring both systems stay in sync automatically.

**IMPORTANT**: This phase is about the SYNC ONLY. The autonomous "Engine" (Master Agent, sub-agents, decision-making) is documented in the manifesto and will be implemented in future phases.

**Primary Goals**:
1. **`sync_obsidian_neo4j` tool** - Created in Obsidian Memory MCP
2. **5-minute cron job** - Background sync cycle
3. **Bidirectional sync** - Neo4j ↔ Obsidian synchronization
4. **Conflict resolution** - Handle competing updates
5. **0brainOS wrapper tool** - Calls Obsidian MCP sync tool
6. **Manual sync trigger** - On-demand sync via tool call

**Out of Scope for Phase 2** (moved to future):
- ❌ UI editing features (separate dashboard work)
- ❌ Bulk export (can be done manually via sync)
- ❌ Autonomous decision engine (future phase)

**Success Criteria**:
- ✅ Sync runs every 5 minutes automatically
- ✅ Neo4j updates when Obsidian files change
- ✅ Obsidian updates when Neo4j memories change
- ✅ Conflicts resolved correctly (newest timestamp wins)
- ✅ Manual sync works on-demand via tool call

**Timeline**: 2-3 days of focused development

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 2: SYNC ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Every 5 Minutes:                                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Cron Job Triggers                            │   │
│  │         sync_obsidian_neo4j()                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                    │
│                           ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │          Obsidian Memory MCP (TypeScript)                │   │
│  │  - Read changed files from vault                          │   │
│  │  - Call 0brainOS MCP to fetch new memories                │   │
│  │  - Update files with new memory data                      │   │
│  │  - Parse changed files → Update Neo4j                     │   │
│  └───────────────┬──────────────────────────────────────────┘   │
│                   │                                                │
│                   │ MCP Call                                      │
│                   ▼                                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              0brainOS (Python)                            │   │
│  │  - Wrapper tool: sync_with_obsidian()                    │   │
│  │  - Fetches new/modified memories from Neo4j               │   │
│  │  - Returns memory data to Obsidian MCP                   │   │
│  │  - Receives file updates → Updates Neo4j                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                   │                                                │
│                   ▼                                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Neo4j Database                          │   │
│  │  - Bubbles (memories) stored and updated                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## User Stories

### Story 1: Create `sync_obsidian_neo4j` Tool in Obsidian MCP

**As a** system
**I want to** create a sync tool in Obsidian Memory MCP
**So that** bidirectional sync can be triggered manually or via cron

**Acceptance Criteria**:
- [ ] New MCP tool: `sync_obsidian_neo4j(neo4j_mcp_url: str)`
- [ ] Calls 0brainOS MCP to get new/modified memories
- [ ] Updates Obsidian vault with new memory data
- [ ] Reads changed files from Obsidian vault
- [ ] Calls 0brainOS to update Neo4j with file changes
- [ ] Returns sync summary
- [ ] Handles connection errors gracefully

**Technical Implementation**:
```typescript
// obsidian-memory-mcp/index.ts

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "sync_obsidian_neo4j") {
    const neo4jMCPUrl = args?.neo4j_mcp_url || process.env.NEO4J_MCP_URL;

    // Direction 1: Neo4j → Obsidian
    const neo4jUpdates = await fetchFromNeo4j(neo4jMCPUrl);
    await updateObsidianVault(neo4jUpdates);

    // Direction 2: Obsidian → Neo4j
    const obsidianChanges = await readChangedFiles();
    await updateNeo4j(neo4jMCPUrl, obsidianChanges);

    return {
      content: [{
        type: "text",
        text: `✅ Sync complete: ${neo4jUpdates.length} from Neo4j, ${obsidianChanges.length} from Obsidian`
      }]
    };
  }
});
```

---

### Story 2: Implement `fetchFromNeo4j` - Get New Memories

**As a** Obsidian MCP
**I want to** fetch new and modified memories from Neo4j
**So that** Obsidian vault stays up to date

**Acceptance Criteria**:
- [ ] Function: `fetchFromNeo4j(mcpUrl: str) -> Promise<EntityData[]>`
- [ ] Calls 0brainOS MCP `get_all_memories` tool
- [ ] Filters for memories newer than last sync
- [ ] Transforms Neo4j memory format to Obsidian entity format:
  - `content` → entity name (generated)
  - `sector` → `entityType`
  - `observations` → observations array
  - `entities` → relations
- [ ] Returns array of entity data to create/update

**Technical Implementation**:
```typescript
// obsidian-memory-mcp/src/sync/neo4jFetcher.ts

interface Neo4jMemory {
  id: string;
  content: string;
  sector: string;
  observations: string[];
  entities: string[];
  last_accessed: string;
}

async function fetchFromNeo4j(mcpUrl: string): Promise<EntityData[]> {
  // Call 0brainOS MCP
  const response = await fetch(`${mcpUrl}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "get_all_memories",
        arguments: { limit: 100 }
      }
    })
  });

  const data = await response.json();
  const memories = parseMemories(data.result.content[0].text);

  // Filter and transform
  return memories
    .filter(m => m.last_accessed > lastSyncTime)
    .map(memory => ({
      name: generateEntityName(memory.content, memory.entities),
      entityType: memory.sector,
      observations: memory.observations
    }));
}
```

---

### Story 3: Implement `updateObsidianVault` - Write New Entities

**As a** Obsidian MCP
**I want to** update the vault with new data from Neo4j
**So that** files reflect the latest memory state

**Acceptance Criteria**:
- [ ] Function: `updateObsidianVault(entities: EntityData[])`
- [ ] For each entity:
  - Check if file exists
  - If exists: update with new observations
  - If not exists: create new file
- [ ] Uses MarkdownStorageManager for file operations
- [ ] Returns count of created/updated entities

**Technical Implementation**:
```typescript
// obsidian-memory-mcp/src/sync/vaultUpdater.ts

async function updateObsidianVault(entities: EntityData[]): Promise<{
  created: number;
  updated: number;
}> {
  let created = 0, updated = 0;

  for (const entity of entities) {
    const existing = await storageManager.openNodes({ names: [entity.name] });

    if (existing && existing.length > 0) {
      // Update existing
      await storageManager.addObservations({
        observations: [{
          entityName: entity.name,
          contents: entity.observations
        }]
      });
      updated++;
    } else {
      // Create new
      await storageManager.createEntities({
        entities: [entity]
      });
      created++;
    }
  }

  return { created, updated };
}
```

---

### Story 4: Implement `readChangedFiles` - Detect File Changes

**As a** Obsidian MCP
**I want to** detect which files have changed since last sync
**So that** I know what to sync to Neo4j

**Acceptance Criteria**:
- [ ] Function: `readChangedFiles(since: Date) -> Promise<FileChange[]>`
- [ ] Scans `MEMORY_DIR` for `.md` files
- [ ] Compares file `mtime` with `since` timestamp
- [ ] Parses YAML frontmatter for metadata
- [ ] Extracts entities, observations, relations
- [ ] Returns array of changed file data

**Technical Implementation**:
```typescript
// obsidian-memory-mcp/src/sync/fileWatcher.ts

import * as fs from 'fs';
import * as path from 'path';

interface FileChange {
  filename: string;
  entityType: string;
  observations: string[];
  relations: string[];
  mtime: Date;
}

async function readChangedFiles(since: Date): Promise<FileChange[]> {
  const files = fs.readdirSync(process.env.MEMORY_DIR);
  const changes: FileChange[] = [];

  for (const file of files) {
    if (!file.endsWith('.md')) continue;

    const filePath = path.join(process.env.MEMORY_DIR, file);
    const stats = fs.statSync(filePath);

    if (stats.mtime > since) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = parseEntityFile(content);

      changes.push({
        filename: file,
        ...parsed,
        mtime: stats.mtime
      });
    }
  }

  return changes;
}

function parseEntityFile(content: string) {
  // Parse YAML frontmatter
  const frontmatterMatch = content.match(/^---\n(.*?)\n---\n(.*)$/s);
  if (!frontmatterMatch) return null;

  const frontmatter = parseYAML(frontmatterMatch[1]);
  const body = frontmatterMatch[2];

  // Extract observations from body
  const obsMatch = body.match(/## Observations\n(.*?)(?=\n##|\Z)/s);
  const observations = obsMatch
    ? obsMatch[1].split('\n').map(line => line.replace(/^-\s*/, '').trim()).filter(Boolean)
    : [];

  // Extract relations
  const relMatch = body.match(/## Relations\n(.*?)\n*/s);
  const relations = relMatch
    ? relMatch[1].match(/\[\[.*?::(.*?)\]\]/g)?.map(r => r.match(/::(.*?)\]\/)?.[1]) || []
    : [];

  return {
    entityType: frontmatter.entityType,
    observations,
    relations
  };
}
```

---

### Story 5: Implement `updateNeo4j` - Sync Changes to Neo4j

**As a** Obsidian MCP
**I want to** update Neo4j with changes from Obsidian files
**So that** Neo4j reflects manual edits

**Acceptance Criteria**:
- [ ] Function: `updateNeo4j(mcpUrl: str, changes: FileChange[])`
- [ ] For each changed file:
  - Find corresponding Neo4j memory by name
  - Update memory with new observations
  - Handle conflicts (newest timestamp wins)
- [ ] Calls 0brainOS MCP tools
- [ ] Returns sync summary

**Technical Implementation**:
```typescript
// obsidian-memory-mcp/src/sync/neo4jUpdater.ts

async function updateNeo4j(mcpUrl: string, changes: FileChange[]): Promise<{
  synced: number;
  skipped: number;
  conflicts: number;
}> {
  let synced = 0, skipped = 0, conflicts = 0;

  for (const change of changes) {
    // Find corresponding memory in Neo4j
    const searchResponse = await fetch(`${mcpUrl}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "search_nodes",
          arguments: { query: change.filename.replace('.md', '') }
        }
      })
    });

    const searchData = await searchResponse.json();
    const memory = parseMemory(searchData);

    if (!memory) {
      skipped++; // No corresponding memory found
      continue;
    }

    // Conflict resolution: Compare timestamps
    const neo4jTime = new Date(memory.last_accessed);
    const obsidianTime = change.mtime;

    if (neo4jTime > obsidianTime) {
      conflicts++; // Neo4j is newer, skip
      continue;
    }

    // Update memory
    await fetch(`${mcpUrl}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "update_memory_observations",
          arguments: {
            memory_id: memory.id,
            observations: change.observations
          }
        }
      })
    });

    synced++;
  }

  return { synced, skipped, conflicts };
}
```

---

### Story 6: Add `update_memory_observations` Tool to 0brainOS

**As a** 0brainOS system
**I want to** provide a tool for updating memory observations
**So that** Obsidian MCP can sync changes

**Acceptance Criteria**:
- [ ] New tool: `update_memory_observations(memory_id: str, observations: list[str])`
- [ ] Finds memory by ID in Neo4j
- [ ] Updates observations field
- [ ] Sets `last_accessed` to current timestamp
- [ ] Returns success message

**Technical Implementation**:
```python
# 0brainOS/src/tools/memory/update_memory.py

from pydantic import Field
from src.database.connection import get_driver

def register_update_memory_tool(mcp) -> None:
    @mcp.tool
    async def update_memory_observations(
        memory_id: str = Field(description="The ID of the memory to update"),
        observations: list[str] = Field(description="New observations to set")
    ) -> str:
        """Update the observations of an existing memory."""

        async with get_driver().session() as session:
            result = await session.run("""
                MATCH (b:Bubble {id: $memory_id})
                WHERE b.valid_to IS NULL
                SET b.observations = $observations,
                    b.last_accessed = datetime()
                RETURN b
            """, {
                "memory_id": memory_id,
                "observations": observations
            })

            record = result.single()
            if not record:
                return f"❌ Memory not found: {memory_id}"

            return f"✅ Updated memory {memory_id} with {len(observations)} observations"
```

---

### Story 7: Add 0brainOS Wrapper Tool `sync_with_obsidian`

**As a** 0brainOS user
**I want to** trigger sync from within 0brainOS
**So that** I don't have to call Obsidian MCP directly

**Acceptance Criteria**:
- [ ] New tool: `sync_with_obsidian()`
- [ ] Calls Obsidian MCP `sync_obsidian_neo4j` tool
- [ ] Passes 0brainOS MCP URL to Obsidian
- [ ] Returns sync result
- [ ] Handles Obsidian offline gracefully

**Technical Implementation**:
```python
# 0brainOS/src/tools/memory/sync_with_obsidian.py

import os
from pydantic import Field
import httpx

def register_sync_tool(mcp) -> None:
    @mcp.tool
    async def sync_with_obsidian() -> str:
        """Sync memories with Obsidian vault (bidirectional)."""

        obsidian_url = os.getenv("OBSIDIAN_MCP_URL", "http://obsidian-memory-mcp:6666/mcp")
        brainos_url = os.getenv("BRAINOS_MCP_URL", "http://localhost:9131/mcp")

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(obsidian_url, json={
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "tools/call",
                    "params": {
                        "name": "sync_obsidian_neo4j",
                        "arguments": {
                            "neo4j_mcp_url": brainos_url
                        }
                    }
                })

                if response.status_code != 200:
                    return f"⚠️ Obsidian sync failed: HTTP {response.status_code}"

                result = response.json()
                return result.result?.content[0]?.text || "✅ Sync complete"

        except Exception as e:
            return f"⚠️ Obsidian sync error: {str(e)}"
```

---

### Story 8: Implement 5-Minute Cron Job

**As a** system
**I want to** run sync every 5 minutes automatically
**So that** systems stay in sync without manual intervention

**Acceptance Criteria**:
- [ ] Cron job runs every 5 minutes
- [ ] Calls `sync_obsidian_neo4j` tool
- [ ] Logs sync results
- [ ] Stores last sync timestamp
- [ ] Handles errors gracefully (continue on next cycle)
- [ ] Configurable via environment variable

**Technical Implementation**:
```typescript
// obsidian-memory-mcp/src/sync/scheduler.ts

import cron from 'node-cron';

let lastSyncTime = new Date(0); // Start from epoch

export function startSyncScheduler(intervalMinutes: number = 5) {
  const pattern = `*/${intervalMinutes} * * * *`;

  cron.schedule(pattern, async () => {
    console.log(`[${new Date().toISOString()}] Starting scheduled sync...`);

    try {
      // Store current time as "before" timestamp
      const syncStart = new Date();

      // Run the sync
      const result = await sync_obsidian_neo4j({
        neo4j_mcp_url: process.env.NEO4J_MCP_URL
      });

      // Update last sync time
      lastSyncTime = syncStart;

      console.log(`[${new Date().toISOString()}] Sync complete:`, result);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Sync failed:`, error);
      // Don't throw - continue on next cycle
    }
  });

  console.log(`Sync scheduler started: every ${intervalMinutes} minutes`);
}

// Start on server init
if (process.env.ENABLE_SYNC === 'true') {
  const interval = parseInt(process.env.SYNC_INTERVAL_MINUTES || '5', 10);
  startSyncScheduler(interval);
}
```

---

## Technical Requirements

### New Dependencies

**Obsidian Memory MCP (TypeScript)**:
- `node-cron` - Cron job scheduling
- `js-yaml` - YAML parsing for frontmatter

**0brainOS (Python)**:
- `httpx` - Async HTTP client for calling Obsidian MCP

### Environment Variables

```bash
# Obsidian Memory MCP
ENABLE_SYNC=true                # Enable scheduled sync
SYNC_INTERVAL_MINUTES=5         # Sync every 5 minutes
NEO4J_MCP_URL=http://0brainOS:9131/mcp  # 0brainOS MCP endpoint

# 0brainOS
OBSIDIAN_MCP_URL=http://obsidian-memory-mcp:6666/mcp
BRAINOS_MCP_URL=http://localhost:9131/mcp
```

### File Changes

**Obsidian Memory MCP**:
- `src/sync/neo4jFetcher.ts` - Fetch memories from Neo4j
- `src/sync/vaultUpdater.ts` - Update Obsidian vault
- `src/sync/fileWatcher.ts` - Detect changed files
- `src/sync/neo4jUpdater.ts` - Update Neo4j with changes
- `src/sync/scheduler.ts` - 5-minute cron job
- `index.ts` - Add `sync_obsidian_neo4j` tool

**0brainOS**:
- `src/tools/memory/update_memory.py` - Update observations tool
- `src/tools/memory/sync_with_obsidian.py` - Wrapper sync tool

---

## Testing Plan

### Integration Tests

1. **Neo4j → Obsidian Sync**:
   - Create memory in Neo4j via `create_memory`
   - Wait 5 minutes (or run manual sync)
   - Verify file appears in Obsidian vault
   - Check file content matches memory

2. **Obsidian → Neo4j Sync**:
   - Edit file in Obsidian vault
   - Wait 5 minutes (or run manual sync)
   - Query Neo4j via `get_memory`
   - Verify observations updated

3. **Conflict Resolution**:
   - Edit same entity in both Neo4j and Obsidian
   - Run sync
   - Verify newer version wins
   - Check conflict log

4. **Manual Sync Trigger**:
   - Call `sync_with_obsidian` from 0brainOS
   - Verify sync runs immediately
   - Check result message

---

## Success Metrics

**Phase 2 Complete When**:
- ✅ 5-minute cron job syncs automatically
- ✅ `sync_obsidian_neo4j` tool functional
- ✅ `sync_with_obsidian` wrapper tool works
- ✅ Neo4j → Obsidian sync works
- ✅ Obsidian → Neo4j sync works
- ✅ Conflicts resolved (newest wins)
- ✅ Errors handled gracefully

---

## Estimated Effort

| Story | Complexity | Effort |
|-------|------------|--------|
| Story 1: sync_obsidian_neo4j tool | Medium | 3 hours |
| Story 2: fetchFromNeo4j | Medium | 2 hours |
| Story 3: updateObsidianVault | Low | 2 hours |
| Story 4: readChangedFiles | Medium | 2 hours |
| Story 5: updateNeo4j | Medium | 3 hours |
| Story 6: update_memory_observations | Low | 1 hour |
| Story 7: sync_with_obsidian wrapper | Low | 1 hour |
| Story 8: Cron scheduler | Medium | 2 hours |

**Total Estimated Effort**: 16 hours
**Timeline**: 2 days of focused development

---

### Story 9: View All Memories in Dashboard UI

**As a** user
**I want to** see all memories I've created in the dashboard
**So that** I can browse and manage them

**Acceptance Criteria**:
- [ ] Display all memories from Neo4j in a list/grid view
- [ ] Show memory metadata:
  - Content preview (first 100 chars)
  - Sector (Episodic/Semantic/Procedural/Emotional/Reflective)
  - Salience score
  - Created date
  - Entities list
  - Observations count
- [ ] Filter by sector dropdown
- [ ] Search by content text input
- [ ] Click memory to open in edit mode
- [ ] Pagination or infinite scroll for large datasets

**Technical Implementation**:
```typescript
// dashboard/app/memories/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { MCPClient } from '@/lib/mcp-client';

interface Memory {
  id: string;
  content: string;
  sector: string;
  salience: number;
  created_at: string;
  entities: string[];
  observations: string[];
}

export default function MemoriesPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filter, setFilter] = useState<string>('All');
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    async function fetchMemories() {
      const mcp = new MCPClient();
      const result = await mcp.callTool('get_all_memories', {});

      // Parse memories from response
      const parsedMemories = parseMemories(result);
      setMemories(parsedMemories);
    }

    fetchMemories();
  }, []);

  const filteredMemories = memories.filter(m => {
    const matchesSector = filter === 'All' || m.sector === filter;
    const matchesSearch = m.content.toLowerCase().includes(search.toLowerCase());
    return matchesSector && matchesSearch;
  });

  return (
    <div className="memories-page">
      <div className="filters">
        <input
          type="text"
          placeholder="Search memories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="All">All Sectors</option>
          <option value="Episodic">Episodic</option>
          <option value="Semantic">Semantic</option>
          <option value="Procedural">Procedural</option>
          <option value="Emotional">Emotional</option>
          <option value="Reflective">Reflective</option>
        </select>
      </div>

      <div className="memories-grid">
        {filteredMemories.map(memory => (
          <div
            key={memory.id}
            className="memory-card"
            onClick={() => window.location.href = `/memories/${memory.id}`}
          >
            <h3>{memory.content.substring(0, 100)}...</h3>
            <div className="metadata">
              <span className="sector">{memory.sector}</span>
              <span className="salience">Salience: {memory.salience}</span>
              <span className="date">{new Date(memory.created_at).toLocaleDateString()}</span>
            </div>
            <div className="entities">
              {memory.entities.map(e => <span key={e} className="entity-tag">{e}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### Story 10: Edit Existing Markdown Files via TipTap

**As a** user
**I want to** edit existing Markdown files in the UI
**So that** I can modify observations and entities

**Acceptance Criteria**:
- [ ] Edit mode for existing entity files
- [ ] YAML frontmatter editor (entityType, created, updated dates)
- [ ] Markdown body editor using existing TipTap editor
- [ ] Save button that updates the file
- [ ] Cancel button to discard changes
- [ ] **NOT**: Create new files (explicitly out of scope)
- [ ] Shows "Edit mode" indicator in UI

**Technical Implementation**:
```typescript
// dashboard/app/entities/[name]/edit/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TipTapEditor } from '@/components/TipTapEditor';
import { MCPClient } from '@/lib/mcp-client';

interface Entity {
  name: string;
  entityType: string;
  created: string;
  observations: string[];
  relations: string[];
}

export default function EditEntityPage({ params }: { params: { name: string } }) {
  const router = useRouter();
  const [entity, setEntity] = useState<Entity | null>(null);
  const [content, setContent] = useState<string>('');

  useEffect(() => {
    async function fetchEntity() {
      const mcp = new MCPClient();
      const result = await mcp.callTool('open_nodes', { names: [params.name] });

      const parsedEntity = parseEntity(result);
      setEntity(parsedEntity);

      // Build markdown content
      const md = buildMarkdownFromEntity(parsedEntity);
      setContent(md);
    }

    fetchEntity();
  }, [params.name]);

  async function handleSave() {
    const mcp = new MCPClient();

    // Parse updated observations from content
    const updatedObservations = parseObservations(content);

    // Update observations using MCP tool
    await mcp.callTool('add_observations', {
      observations: [{
        entityName: params.name,
        contents: updatedObservations
      }]
    });

    router.push(`/entities/${params.name}`);
  }

  if (!entity) return <div>Loading...</div>;

  return (
    <div className="edit-entity-page">
      <div className="header">
        <h1>Edit: {entity.name}</h1>
        <div className="actions">
          <button onClick={() => router.back()}>Cancel</button>
          <button onClick={handleSave}>Save Changes</button>
        </div>
      </div>

      <div className="metadata">
        <label>
          Entity Type:
          <input
            type="text"
            value={entity.entityType}
            disabled
            title="Entity type cannot be changed"
          />
        </label>
        <p>Created: {new Date(entity.created).toLocaleString()}</p>
      </div>

      <TipTapEditor
        content={content}
        onChange={setContent}
        placeholder="Edit observations here..."
      />
    </div>
  );
}
```

**Important**: This does NOT expose the "create new file" functionality. Only editing existing files is supported.

---

### Story 11: Sync Status UI Component

**As a** user
**I want to** see sync status in the dashboard
**So that** I know when the next sync will happen

**Acceptance Criteria**:
- [ ] Display "Last sync: [timestamp]" (e.g., "5 minutes ago", "Just now")
- [ ] Display countdown: "Next sync in: 35s, 34s, 33s, ..."
- [ ] Real-time countdown updates every second
- [ ] "Sync now" button that triggers immediate sync
- [ ] Loading state during sync
- [ ] Success/error message after sync completes
- [ ] Auto-refresh countdown after sync completes

**Technical Implementation**:
```typescript
// dashboard/components/sync-status.tsx

'use client';

import { useEffect, useState } from 'react';
import { MCPClient } from '@/lib/mcp-client';

interface SyncStatus {
  lastSync: string;
  nextSync: string;
  syncInterval: number; // seconds
}

export function SyncStatus() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    // Fetch sync status
    async function fetchStatus() {
      const mcp = new MCPClient();
      const result = await mcp.callTool('get_sync_status', {});
      setStatus(parseSyncStatus(result));
    }

    fetchStatus();

    // Update countdown every second
    const interval = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (status) {
      // Calculate initial countdown
      const lastSyncTime = new Date(status.lastSync).getTime();
      const nextSyncTime = lastSyncTime + (status.syncInterval * 1000);
      const remaining = Math.max(0, Math.floor((nextSyncTime - Date.now()) / 1000));
      setCountdown(remaining);
    }
  }, [status]);

  async function handleSyncNow() {
    setSyncing(true);
    setMessage('');

    try {
      const mcp = new MCPClient();
      const result = await mcp.callTool('sync_with_obsidian', {});
      setMessage('✅ Sync complete!');

      // Refresh status
      const statusResult = await mcp.callTool('get_sync_status', {});
      setStatus(parseSyncStatus(statusResult));
    } catch (error) {
      setMessage(`❌ Sync failed: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  }

  if (!status) return <div className="sync-status">Loading sync status...</div>;

  const lastSyncAgo = formatTimeAgo(new Date(status.lastSync));
  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div className="sync-status">
      <div className="status-info">
        <span className="last-sync">Last sync: {lastSyncAgo}</span>
        <span className="next-sync">
          Next sync in: {minutes > 0 ? `${minutes}m ` : ''}{seconds}s
        </span>
      </div>

      <button
        onClick={handleSyncNow}
        disabled={syncing}
        className="sync-now-button"
      >
        {syncing ? 'Syncing...' : 'Sync now'}
      </button>

      {message && <div className="sync-message">{message}</div>}
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  return `${Math.floor(seconds / 3600)} hours ago`;
}
```

---

### Story 12: Manual Sync Trigger (API Route)

**As a** system
**I want to** provide an API endpoint for manual sync
**So that** the dashboard can trigger sync on demand

**Acceptance Criteria**:
- [ ] API route: `/api/sync`
- [ ] Calls Obsidian MCP `sync_obsidian_neo4j` tool
- [ ] Returns sync result message
- [ ] Handles errors gracefully
- [ ] POST method only

**Technical Implementation**:
```typescript
// dashboard/app/api/sync/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { MCPClient } from '@/lib/mcp-client';

export async function POST(request: NextRequest) {
  try {
    const mcp = new MCPClient();

    // Call the sync tool via Obsidian MCP
    const result = await mcp.callTool('sync_obsidian_neo4j', {
      neo4j_mcp_url: process.env.NEO4J_MCP_URL || 'http://0brainOS:9131/mcp'
    });

    // Parse result
    const syncResult = parseSyncResult(result);

    return NextResponse.json({
      success: true,
      message: syncResult.message,
      timestamp: new Date().toISOString(),
      details: syncResult
    });

  } catch (error) {
    console.error('Sync failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Sync failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

function parseSyncResult(result: any): { message: string; fromNeo4j: number; fromObsidian: number } {
  // Parse the sync result from MCP response
  const text = result?.content?.[0]?.text || '';

  // Extract numbers from message like "✅ Sync complete: 5 from Neo4j, 3 from Obsidian"
  const neo4jMatch = text.match(/(\d+)\s+from\s+Neo4j/);
  const obsidianMatch = text.match(/(\d+)\s+from\s+Obsidian/);

  return {
    message: text,
    fromNeo4j: neo4jMatch ? parseInt(neo4jMatch[1]) : 0,
    fromObsidian: obsidianMatch ? parseInt(obsidianMatch[1]) : 0
  };
}
```

---

## Additional Technical Requirements (UI Stories)

### New Dependencies

**Obsidian Memory MCP Dashboard (TypeScript)**:
- No new dependencies (uses existing TipTap editor)

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/sync` | POST | Trigger manual sync |
| `/api/sync-status` | GET | Get current sync status |

### MCP Tools (to be added to 0brainOS)

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_sync_status` | Get current sync status | - |

---

## Updated Success Metrics

**Phase 2 Complete When** (includes UI stories):
- ✅ 5-minute cron job syncs automatically
- ✅ `sync_obsidian_neo4j` tool functional
- ✅ `sync_with_obsidian` wrapper tool works
- ✅ Neo4j → Obsidian sync works
- ✅ Obsidian → Neo4j sync works
- ✅ Conflicts resolved (newest wins)
- ✅ Errors handled gracefully
- ✅ Dashboard displays all memories with filters
- ✅ Dashboard can edit existing entities
- ✅ Sync status component shows countdown
- ✅ Manual sync button works

---

## Updated Estimated Effort

| Story | Complexity | Effort |
|-------|------------|--------|
| Story 1: sync_obsidian_neo4j tool | Medium | 3 hours |
| Story 2: fetchFromNeo4j | Medium | 2 hours |
| Story 3: updateObsidianVault | Low | 2 hours |
| Story 4: readChangedFiles | Medium | 2 hours |
| Story 5: updateNeo4j | Medium | 3 hours |
| Story 6: update_memory_observations | Low | 1 hour |
| Story 7: sync_with_obsidian wrapper | Low | 1 hour |
| Story 8: Cron scheduler | Medium | 2 hours |
| Story 9: View All Memories UI | Medium | 3 hours |
| Story 10: Edit Existing Entities UI | Medium | 3 hours |
| Story 11: Sync Status Component | Medium | 2 hours |
| Story 12: Manual Sync API | Low | 1 hour |

**Total Estimated Effort**: 25 hours (was 16 hours, added 9 hours for UI stories)
**Timeline**: 3 days of focused development

---

**Phase 2 Status**: 🔄 READY TO IMPLEMENT
**Target Start**: Week of 2026-01-20
**Dependencies**: Phase 1 complete ✅
**Next Phase**: Phase 3 - Scheduled Updates (Internal Agents via PocketFlow)
