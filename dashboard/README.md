# Obsidian Memory MCP Dashboard

A Next.js dashboard for interacting with the Obsidian Memory MCP server. This dashboard allows you to explore and execute MCP tools, and view your Obsidian knowledge graph.

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
NEXT_PUBLIC_MCP_URL=http://obsidian-memory-mcp:6666
```

- **Local development**: `http://localhost:6666`
- **Docker/Production**: `http://obsidian-memory-mcp:6666` (internal Docker network)
- **External access**: `https://obsidian-mcp.trakiyski.work/mcp` (public URL)

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Building for Production

```bash
npm run build
npm start
```

## Docker Deployment

The dashboard is deployed as part of the main Docker Compose stack:

```bash
docker-compose up -d
```

### Configuration

- **Dashboard URL**: `https://obsidian.trakiyski.work/`
- **MCP Server URL**: `https://obsidian-mcp.trakiyski.work/mcp`

The dashboard communicates with the MCP server via the internal Docker network (`http://obsidian-memory-mcp:6666`) for better performance and security.

## Features

- **MCP Tools Explorer** (`/mcp-tools`): Browse and execute available MCP tools
- **Obsidian Vault Interface**: View and manage your markdown files
- **Graph Visualization**: Visualize entity relationships
- **Rich Text Editor**: Edit notes with TipTap editor

## Available MCP Tools

1. `create_entities` - Create new entities with observations
2. `create_relations` - Create relations between entities
3. `add_observations` - Add observations to existing entities
4. `delete_entities` - Delete entities and their relations
5. `delete_observations` - Delete specific observations
6. `delete_relations` - Delete relations between entities
7. `read_graph` - Read the entire knowledge graph
8. `search_nodes` - Search entities by query
9. `open_nodes` - Retrieve specific entities by name
