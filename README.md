# Obsidian Memory MCP

MCP (Model Context Protocol) server that stores AI memories as Markdown files for visualization in Obsidian's graph view. Built with TypeScript and Docker for easy deployment.

<a href="https://glama.ai/mcp/servers/@YuNaga224/obsidian-memory-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@YuNaga224/obsidian-memory-mcp/badge" alt="Obsidian Memory MCP server" />
</a>

## About

This project is a modified version of [Anthropic's memory server](https://github.com/modelcontextprotocol/servers/tree/main/src/memory) that has been adapted for Obsidian integration. The original server stored memories in JSON format, while this version stores them as individual Markdown files with Obsidian-compatible `[[link]]` syntax for graph visualization.

### Key Changes from Original

- **Storage Format**: Changed from JSON to individual Markdown files
- **Obsidian Integration**: Added `[[link]]` syntax for relations
- **YAML Frontmatter**: Metadata stored in frontmatter instead of JSON
- **File Structure**: Each entity becomes a separate `.md` file
- **Docker Support**: Added containerization for easy deployment
- **HTTP Transport**: Exposed MCP via HTTP for broader compatibility

## Features

- **Markdown Storage**: Individual `.md` files for each entity
- **Obsidian Integration**: Uses `[[link]]` syntax for graph visualization
- **Knowledge Graph**: Store entities, relations, and observations
- **Search Functionality**: Query across all stored memories
- **YAML Frontmatter**: Metadata stored in frontmatter
- **Docker Support**: Production-ready container with persistent storage
- **HTTP Transport**: REST API endpoint for MCP communication
- **Health Checks**: Built-in monitoring endpoint

## Quick Start

### Option 1: Run with Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/Ntrakiyski/obsidian-memory-mcp.git
cd obsidian-memory-mcp

# Build and start the container
docker-compose up -d

# Verify it's running
curl http://localhost:6666/health
```

### Option 2: Run Locally (Development)

```bash
# Clone the repository
git clone https://github.com/Ntrakiyski/obsidian-memory-mcp.git
cd obsidian-memory-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start

# Server runs on http://localhost:6666
```

## Storage Format

Each entity is stored as an individual Markdown file with:

- **YAML frontmatter** for metadata (entityType, created, updated)
- **Obsidian-compatible `[[links]]`** for relations
- **Organized sections** for observations and relations

Example entity file (`John_Doe.md`):

```markdown
---
entityType: person
created: 2025-07-10
updated: 2025-07-10
---

# John Doe

## Observations
- Works at Tech Corp
- Expert in TypeScript
- Lives in Tokyo

## Relations
- [[Manager of::Alice Smith]]
- [[Collaborates with::Bob Johnson]]
- [[Located in::Tokyo Office]]
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `6666` | HTTP server port |
| `MEMORY_DIR` | `/app/data/root_vault` | Directory for storing Markdown files |
| `NODE_ENV` | `production` | Node environment |

### Docker Configuration

The `docker-compose.yml` includes:

- Named volume `obsidian-data` bound to `./data` on host
- Health check monitoring
- Auto-restart policy
- Port mapping `6666:6666`

#### Data Persistence

Files are stored in:
- **Host**: `./data/root_vault/` (bind mount)
- **Container**: `/app/data/root_vault/`

This allows:
- Access to files from host machine
- Data persistence across container restarts
- Easy backup and management

## API Reference

### Endpoints

#### GET /health
Health check endpoint.

```bash
curl http://localhost:6666/health
```

Response:
```json
{
  "status": "ok",
  "server": "memory-server",
  "storageDir": "/app/data/root_vault"
}
```

#### POST /mcp
MCP protocol endpoint for tool calls.

```bash
curl -X POST http://localhost:6666/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'
```

### Available Tools

1. **create_entities** - Create new entities in the knowledge graph
2. **create_relations** - Create relations between entities
3. **add_observations** - Add observations to existing entities
4. **delete_entities** - Delete entities and related data
5. **delete_observations** - Remove specific observations
6. **delete_relations** - Remove relations
7. **read_graph** - Get the entire knowledge graph
8. **search_nodes** - Search entities by query
9. **open_nodes** - Get specific entities by name

## Usage with Claude Desktop

### Option 1: Direct Node.js (Local)

Configure in Claude Desktop:

```json
{
  "mcpServers": {
    "obsidian-memory": {
      "command": "node",
      "args": ["/full/path/to/obsidian-memory-mcp/dist/index.js"],
      "env": {
        "MEMORY_DIR": "/path/to/your/obsidian/vault"
      }
    }
  }
}
```

### Option 2: HTTP Transport (Docker or Remote)

```json
{
  "mcpServers": {
    "obsidian-memory-http": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-http"],
      "env": {
        "MCP_SERVER_URL": "http://localhost:6666/mcp"
      }
    }
  }
}
```

## Usage with Obsidian

1. Configure Claude Desktop or MCP client with one of the options above
2. Restart Claude Desktop
3. Use the MCP memory tools to create entities and relations
4. Open Obsidian and view the graph

The knowledge graph will be visualized with:
- Entity files as nodes
- `[[links]]` as edges
- Different colors for different entity types (if configured in Obsidian)

## Docker Management

### Start Services

```bash
# Start in detached mode
docker-compose up -d

# Start with logs visible
docker-compose up
```

### Stop Services

```bash
# Stop without removing volumes
docker-compose down

# Stop and remove volumes (deletes all data)
docker-compose down -v
```

### Rebuild After Changes

```bash
docker-compose build
docker-compose up -d
```

### View Logs

```bash
# All logs
docker-compose logs

# Follow logs
docker-compose logs -f

# Specific service
docker-compose logs obsidian-memory-mcp
```

### Check Status

```bash
docker-compose ps
```

### Verify Storage

```bash
# Check container is running
docker-compose ps

# Check health
curl http://localhost:6666/health

# Check volume exists
docker volume ls | grep obsidian

# Check host data directory
ls -la data/
ls -la data/root_vault/
```

## Development

### Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start production server
npm start

# Watch mode (auto-rebuild on changes)
npm run watch

# Type checking
npm run typecheck

# Clean build artifacts
npm run clean
```

### Project Structure

```
obsidian-memory-mcp/
├── src/
│   ├── index.ts              # Main entry point
│   ├── types.ts              # TypeScript type definitions
│   ├── storage/
│   │   └── MarkdownStorageManager.ts  # Storage layer
│   └── utils/
│       ├── pathUtils.ts      # Path handling utilities
│       └── markdownUtils.ts  # Markdown parsing/generation
├── dist/                     # Compiled JavaScript
├── data/                     # Persistent storage (bind mount)
├── docker-compose.yml        # Docker configuration
├── Dockerfile               # Docker image definition
├── package.json             # NPM dependencies
└── tsconfig.json           # TypeScript configuration
```

## Troubleshooting

### Permission Denied Errors

**Symptom**: `EACCES: permission denied` or `ENOENT: no such file or directory`

**Solution**:
```bash
# Manually create directory with proper permissions
mkdir -p data/root_vault
chmod 755 data/root_vault
docker-compose restart obsidian-memory-mcp
```

### Container Won't Start

**Symptom**: Container exits immediately or shows errors

**Solution**:
```bash
# Check logs for errors
docker-compose logs obsidian-memory-mcp

# Rebuild and restart
docker-compose down -v
docker-compose build
docker-compose up -d
```

### Files Not Persisting

**Symptom**: Files exist during container run but disappear after restart

**Solution**:
```bash
# Verify volume is properly mounted
docker inspect obsidian-memory-mcp | grep -A 20 Mounts

# Look for: "Type": "volume" and "Name": "obsidian-data"
```

### Health Check Fails

**Symptom**: `docker-compose ps` shows unhealthy

**Solution**:
```bash
# Check if port is in use
lsof -i :6666

# Check if server is responding
curl http://localhost:6666/health

# Restart the service
docker-compose restart obsidian-memory-mcp
```

## Credits

This project is based on [Anthropic's memory server](https://github.com/modelcontextprotocol/servers/tree/main/src/memory) from the Model Context Protocol servers collection. We thank Anthropic for releasing the original implementation under the MIT license.

## License

MIT License - see [LICENSE](LICENSE) file for details.

Original memory server: Copyright (c) 2024 Anthropic, PBC  
Obsidian integration modifications: Copyright (c) 2025 Ntrakiyski

## Support

For issues and feature requests, please open a GitHub issue.
