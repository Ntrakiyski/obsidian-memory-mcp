# Obsidian Memory MCP

MCP (Model Context Protocol) server that stores AI memories as Markdown files for visualization in Obsidian's graph view. Includes a Next.js dashboard for visualizing notes. Built with TypeScript and Docker for easy deployment.

<a href="https://glama.ai/mcp/servers/@YuNaga224/obsidian-memory-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@YuNaga224/obsidian-memory-mcp/badge" alt="Obsidian Memory MCP server" />
</a>

## Table of Contents

- [About](#about)
- [Features](#features)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Dashboard](#dashboard)
- [Storage Format](#storage-format)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Development](#development)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Credits](#credits)
- [License](#license)

## About

This project is a modified version of [Anthropic's memory server](https://github.com/modelcontextprotocol/servers/tree/main/src/memory) that has been adapted for Obsidian integration. The original server stored memories in JSON format, while this version stores them as individual Markdown files with Obsidian-compatible `[[link]]` syntax for graph visualization.

A new **Next.js Dashboard** has been added to visualize and explore your Obsidian notes through a web interface.

### Key Changes from Original

- **Storage Format**: Changed from JSON to individual Markdown files
- **Obsidian Integration**: Added `[[link]]` syntax for relations
- **YAML Frontmatter**: Metadata stored in frontmatter instead of JSON
- **File Structure**: Each entity becomes a separate `.md` file
- **Docker Support**: Added containerization for easy deployment
- **HTTP Transport**: Exposed MCP via HTTP for broader compatibility
- **Dashboard**: Added Next.js web interface at `/dashboard`

## Features

- **Markdown Storage**: Individual `.md` files for each entity
- **Obsidian Integration**: Uses `[[link]]` syntax for graph visualization
- **Knowledge Graph**: Store entities, relations, and observations
- **Search Functionality**: Query across all stored memories
- **YAML Frontmatter**: Metadata stored in frontmatter
- **Docker Support**: Production-ready container with persistent storage
- **HTTP Transport**: REST API endpoint for MCP communication
- **Health Checks**: Built-in monitoring endpoint
- **Dashboard**: Web interface for visualizing notes
- **Notes Counter**: Real-time display of total markdown files in the vault

## Quick Start

### Option 1: Run with Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/Ntrakiyski/obsidian-memory-mcp.git
cd obsidian-memory-mcp

# Build and start all services (MCP server + Dashboard)
docker-compose up -d

# Verify MCP server is running
curl http://localhost:6666/health

# Access the services
# MCP server: http://localhost:6666/mcp
# Dashboard: http://localhost:3000
# MCP Tools Explorer: http://localhost:3000/mcp-tools
```

### Option 2: Run Locally (Development)

```bash
# Clone the repository
git clone https://github.com/Ntrakiyski/obsidian-memory-mcp.git
cd obsidian-memory-mcp

# Install MCP server dependencies
npm install

# Build the MCP server
npm run build

# Start the MCP server (runs on port 6666)
npm start

# In a separate terminal, start the dashboard
cd dashboard
npm install
echo "MCP_URL=http://localhost:6666/mcp" > .env.local
npm run dev

# MCP server: http://localhost:6666/mcp
# Dashboard: http://localhost:3000
# MCP Tools Explorer: http://localhost:3000/mcp-tools
```

## Architecture

```mermaid
flowchart TB
    subgraph Docker_Network
        A[Coolify Traefik] --> B[MCP Server<br/>Port 6666]
        A --> C[Next.js Dashboard<br/>Port 3000]
    end
    D[User Browser] --> A
    E[Claude Desktop<br/>MCP Client] --> A

    subgraph Dashboard_Internal
        F[/mcp-tools page] --> G[/api/mcp route]
        G --> H[Public MCP URL]
        H --> B
    end
```

### How It Works

1. **MCP Server** - Handles memory operations via Model Context Protocol
   - Stores entities, relations, and observations as Markdown files
   - Accessible at `/mcp` endpoint
   - Health check at `/health`

2. **Next.js Dashboard** - Web interface for visualization
   - Runs on port 3000 internally, exposed via Traefik
   - Uses server-side API proxy pattern to communicate with MCP server
   - `/mcp-tools` page provides interactive tool explorer

3. **API Proxy Pattern**
   - Dashboard's `/api/mcp` route proxies requests to MCP server
   - Avoids CORS and browser network restrictions
   - Uses `MCP_URL` environment variable (server-side only)
   - Handles session management via `Mcp-Session-Id` header

4. **Traefik Reverse Proxy** (Coolify)
   - Routes traffic based on path prefix
   - Routes to dashboard container at `/`
   - Routes to MCP server at `/mcp`
   - Automatically configured via Docker labels

## Dashboard

### Accessing the Dashboard

The dashboard is deployed as a separate container and accessed via the root path:

- **Local**: `http://localhost:3000`
- **Production**: `https://your-domain.com`

**MCP Tools Explorer**: `/mcp-tools` - Interactive page to explore and execute MCP tools

### Dashboard Architecture

The dashboard uses a **server-side API proxy pattern** to communicate with the MCP server:

```
Browser -> /mcp-tools page -> /api/mcp route -> MCP Server (public URL)
```

This approach:
- Avoids CORS issues when calling MCP from browser
- Prevents exposure of internal Docker URLs
- Allows proper session management via headers
- Works in both local and production environments

### Environment Variables

Create a `.env.local` file in the `dashboard/` directory:

```bash
# MCP Server URL (server-side only, used by API route)
# Local: http://localhost:6666/mcp
# Production: https://your-mcp-domain.com/mcp
MCP_URL=http://localhost:6666/mcp
```

**Important**: Use `MCP_URL` (not `NEXT_PUBLIC_`) as this is server-side only.

### Dashboard Features

- **Home Page** (`/`)
  - Displays real-time data from the Obsidian vault
  - File tree grouped by entity type (Reflective, Procedural, Semantic, Episodic)
  - Interactive markdown editor with live preview
  - Knowledge graph visualization with force-directed layout
  - Metadata panel with YAML frontmatter parsing
  - Displays entity type, creation date, and modification date

- **MCP Tools Explorer** (`/mcp-tools`)
  - List all available MCP tools with schemas
  - Execute tools with dynamic form inputs
  - View tool results and error messages
  - Session-based connection management

- **Data Integration**
  - Fetches data from `/api/nodes` endpoint
  - Parses YAML frontmatter for metadata display
  - Real-time loading and error states
  - Automatic refresh on data changes

- **Race Condition Handling**
  - Prevents duplicate initialization on page refresh
  - Proper cleanup on component unmount
  - Stable connection across React Strict Mode renders

### Development

To run the dashboard separately for development:

```bash
cd dashboard

# Install dependencies
npm install

# Create .env.local with MCP_URL for local development
echo "MCP_URL=http://localhost:6666/mcp" > .env.local

# Start development server with hot reload
npm run dev

# Dashboard runs on http://localhost:3000
```

### Building for Production

```bash
cd dashboard

# Build the Next.js application (standalone output)
npm run build

# The build output is in .next/standalone/ directory
# Ready to be containerized with the provided Dockerfile
```

### Docker Deployment

The dashboard uses **standalone output mode** for optimal Docker deployment:

- Multi-stage build for smaller image size
- Production runs via `node server.js` (not `next start`)
- Static assets served from `.next/static/`
- Minimal dependencies in production image

## Storage Format

Each entity is stored as an individual Markdown file with:

- **YAML frontmatter** for metadata (entityType, created, updated)
- **Obsidian-compatible `[[links]]`** for relations
- **Organized sections** for observations and relations

### Entity Types

The system supports four main entity types (sectors):

- **Reflective** - Self-reflective memories and insights
- **Procedural** - How-to guides, procedures, and processes
- **Semantic** - Factual knowledge and concepts
- **Episodic** - Events and experiences

Example entity file (`documentation_vs_architecture_Implemented.md`):

```markdown
---
entityType: Reflective
created: '2026-01-15'
updated: '2026-01-15'
---

# Documentation vs Architecture

## Observations
- Created documentation standards and wiki setup
- Established template for architecture ADRs
- Implemented auto-generated API docs from code comments
- Set up team wiki in Confluence

## Relations
- [[related_to::architecture]]
- [[related_to::knowledge management]]
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `6666` | HTTP server port for MCP server |
| `MEMORY_DIR` | `/app/data/root_vault` | Directory for storing Markdown files |
| `NODE_ENV` | `production` | Node environment |

### Docker Configuration

The `docker-compose.yml` includes two services:

#### MCP Server (obsidian-memory-mcp)

- Named volume `obsidian-data` bound to `./data` on host
- Health check monitoring
- Auto-restart policy
- Traefik labels for Coolify routing

#### Dashboard (dashboard)

- Next.js application container
- Auto-restart policy
- Traefik labels for Coolify routing

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

Health check endpoint for MCP server.

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

#### GET /count

Returns the total count of markdown files in the vault.

```bash
curl http://localhost:6666/count
```

Response:

```json
{
  "count": 42
}
```

This endpoint is used by the dashboard to display the real-time total notes count.

#### POST /mcp

MCP protocol endpoint for tool calls.

```bash
curl -X POST http://localhost:6666/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'
```

#### POST /api/mcp (Dashboard)

Next.js API route that proxies requests to the MCP server.

```bash
# From dashboard container or localhost:3000
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'
```

This route:
- Forwards requests to the MCP server using the `MCP_URL` environment variable
- Handles session management via `Mcp-Session-Id` header
- Used by the `/mcp-tools` page to avoid CORS issues

#### GET / (Dashboard)

Next.js dashboard web interface.

```bash
# Access in browser
http://localhost:3000
```

#### GET /mcp-tools (Dashboard)

MCP tools explorer page.

```bash
# Access in browser
http://localhost:3000/mcp-tools
```

#### GET /api/nodes (Dashboard)

Fetches all nodes from the MCP server and transforms them for the dashboard.

```bash
# From dashboard container or localhost:3000
curl http://localhost:3000/api/nodes
```

Response:

```json
{
  "nodes": [
    {
      "name": "Reflective",
      "type": "folder",
      "expanded": true,
      "children": [
        {
          "name": "documentation_vs_architecture_Implemented.md",
          "type": "file",
          "id": "node-0"
        }
      ]
    }
  ],
  "fileContents": {
    "node-0": "---\nentityType: Reflective\ncreated: '2026-01-15'\nupdated: '2026-01-15'\n---\n\n# Documentation vs Architecture\n\n## Observations\n- Created documentation standards\n"
  },
  "graphData": {
    "nodes": [
      { "id": "node-0", "label": "Documentation", "size": 5, "category": "reflective" }
    ],
    "links": []
  }
}
```

This endpoint:
- Calls the MCP `get_all_nodes` tool
- Transforms the response into dashboard-compatible format
- Groups files by entity type into folders
- Creates graph nodes and links from relations
- Parses YAML frontmatter for metadata display

### Available MCP Tools

1. **create_entities** - Create new entities in the knowledge graph
2. **create_relations** - Create relations between entities
3. **add_observations** - Add observations to existing entities
4. **delete_entities** - Delete entities and related data
5. **delete_observations** - Remove specific observations
6. **delete_relations** - Remove relations
7. **read_graph** - Get the entire knowledge graph
8. **search_nodes** - Search entities by query
9. **open_nodes** - Get specific entities by name
10. **get_all_nodes** - Get all nodes with full details including metadata, content, and relations

The `get_all_nodes` tool returns:

```json
{
  "nodes": [
    {
      "name": "documentation_vs_architecture_Implemented",
      "entityType": "Reflective",
      "created": "2026-01-15",
      "updated": "2026-01-15",
      "observations": [
        "Created documentation standards"
      ],
      "relations": [
        { "target": "another_node", "type": "related_to" }
      ],
      "content": "---\nentityType: Reflective\ncreated: '2026-01-15'\n---\n\n# Documentation\n..."
    }
  ]
}
```

## Deployment

### Deploying to Coolify

1. **Push to GitHub**

   ```bash
   # Commit and push your changes
   git add .
   git commit -m "feat: Add dashboard feature"
   git push origin main
   ```

2. **Create Resource in Coolify**

   - Go to your Coolify dashboard
   - Click "Create New Resource"
   - Select your GitHub repository
   - Choose "Docker Compose" as the build pack

3. **Configure Domain**

   - Domain: `http://your-server:6666`
   - Coolify will automatically configure Traefik routing

4. **Deploy**

   Coolify will:
   - Build both MCP server and dashboard containers
   - Configure Traefik routing based on labels
   - Start both services
   - Route `/dashboard` to Next.js and `/mcp` to MCP server

### Manual Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### Local Docker Testing

```bash
# Build all services
docker-compose build

# Start services
docker-compose up -d

# Test endpoints
curl http://localhost:6666/health
curl http://localhost:3000

# Access in browser
# MCP server: http://localhost:6666/mcp
# Dashboard: http://localhost:3000
# MCP Tools: http://localhost:3000/mcp-tools

# Stop services
docker-compose down
```

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
docker-compose logs dashboard
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

### MCP Server Commands

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

### Dashboard Commands

```bash
cd dashboard

# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Project Structure

```
obsidian-memory-mcp/
├── src/                          # MCP server source
│   ├── index.ts                  # Main entry point
│   ├── types.ts                  # TypeScript type definitions
│   ├── storage/
│   │   └── MarkdownStorageManager.ts  # Storage layer
│   └── utils/
│       ├── pathUtils.ts          # Path handling utilities
│       └── markdownUtils.ts      # Markdown parsing/generation
├── dist/                         # Compiled JavaScript (MCP server)
├── dashboard/                    # Next.js dashboard application
│   ├── app/                      # App Router (Next.js 13+)
│   │   ├── api/
│   │   │   └── mcp/
│   │   │       └── route.ts      # API proxy to MCP server
│   │   ├── mcp-tools/
│   │   │   └── page.tsx          # MCP tools explorer page
│   │   ├── page.tsx              # Dashboard home page
│   │   ├── layout.tsx            # Root layout
│   │   └── globals.css           # Global styles
│   ├── components/               # React components (shadcn/ui)
│   │   └── ui/                   # UI component library
│   ├── lib/                      # Utility functions
│   │   └── utils.ts              # Helper utilities
│   ├── public/                   # Static assets
│   ├── Dockerfile                # Dashboard containerization
│   ├── next.config.js            # Next.js configuration (standalone)
│   ├── package.json              # Dashboard dependencies
│   ├── tsconfig.json             # TypeScript configuration
│   └── .env.example              # Environment variable template
├── data/                         # Persistent storage (bind mount)
├── docker-compose.yml            # Docker configuration (both services)
├── Dockerfile                    # MCP server containerization
├── package.json                  # MCP server dependencies
└── tsconfig.json                 # TypeScript configuration
```

### Key Files for Dashboard Development

- `dashboard/app/page.tsx` - Main dashboard home page with real data integration
- `dashboard/app/mcp-tools/page.tsx` - MCP tools explorer with API integration
- `dashboard/app/api/mcp/route.ts` - Server-side proxy to MCP server
- `dashboard/app/api/nodes/route.ts` - Fetches and transforms all nodes for dashboard
- `dashboard/lib/mock-data.ts` - Data utilities including YAML frontmatter parser
- `dashboard/components/file-tree.tsx` - File tree navigation component
- `dashboard/components/editor.tsx` - TipTap-based markdown editor
- `dashboard/components/graph-view.tsx` - Force-directed graph visualization
- `dashboard/components/metadata-panel.tsx` - Displays file metadata from frontmatter
- `dashboard/next.config.js` - Next.js configuration (standalone output)
- `dashboard/Dockerfile` - Multi-stage container build
- `docker-compose.yml` - Service orchestration with Traefik labels

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
docker-compose logs dashboard

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

### Dashboard Not Loading

**Symptom**: Dashboard returns 404 or connection error

**Solution**:

```bash
# Check dashboard container logs
docker-compose logs dashboard

# Verify dashboard container is running
docker-compose ps dashboard

# Check dashboard is responding
curl http://localhost:3000

# Verify MCP_URL is set correctly
docker-compose exec dashboard printenv | grep MCP_URL
```

### MCP Tools Page Connection Error

**Symptom**: `/mcp-tools` shows "Failed to connect to MCP server"

**Solution**:

```bash
# Verify MCP_URL environment variable is set
docker-compose exec dashboard printenv MCP_URL

# Test MCP server directly
curl http://localhost:6666/health
curl -X POST http://localhost:6666/mcp -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'

# For production: verify public URL is accessible
curl https://your-mcp-domain.com/health
curl https://your-mcp-domain.com/mcp -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'
```

**Common causes**:
- Wrong `MCP_URL` in dashboard environment
- MCP server not running
- Network/firewall blocking public URL access
- Traefik routing misconfiguration

### Build Failures

**Symptom**: Docker build fails

**Solution**:

```bash
# Check build logs
docker-compose build --no-cache

# Verify all required files exist
ls -la dashboard/

# Test build locally
cd dashboard
npm install
npm run build
```

## Contributing

### Adding New Dashboard Features

1. Create a new branch from `main`:

   ```bash
   git checkout -b feature/your-feature
   ```

2. Make changes in `dashboard/app/` or `dashboard/components/`
3. Test locally with proper `.env.local` configuration:

   ```bash
   cd dashboard
   echo "MCP_URL=http://localhost:6666/mcp" > .env.local
   npm run dev
   ```

4. Build and test production mode:

   ```bash
   npm run build
   # Test with: npm start
   ```

5. Commit and push:

   ```bash
   git add dashboard/
   git commit -m "feat: Add your feature"
   git push origin feature/your-feature
   ```

6. Create a pull request on GitHub

**Important**: When adding new pages that communicate with MCP:
- Use the `/api/mcp` route (server-side proxy)
- Set `MCP_URL` environment variable for production
- Handle session management with `Mcp-Session-Id` header
- Test both locally and with Docker build

### Adding New MCP Tools

1. Add tool definition in `src/index.ts`
2. Implement tool logic in appropriate module
3. Update API Reference in this README
4. Test with `curl` commands

## Roadmap

### Completed Features ✅

- [x] Knowledge graph visualization with force-directed layout
- [x] Entity type grouping in file tree
- [x] Real-time metadata display from YAML frontmatter
- [x] Dashboard integration with MCP server data

### Future Enhancements

- [ ] Advanced search functionality
- [ ] Bulk operations on entities
- [ ] Import/Export tools
- [ ] Dark mode theme
- [ ] Real-time collaboration
- [ ] Mobile-responsive design improvements

## Credits

This project is based on [Anthropic's memory server](https://github.com/modelcontextprotocol/servers/tree/main/src/memory) from the Model Context Protocol servers collection. We thank Anthropic for releasing the original implementation under the MIT license.

## License

MIT License - see [LICENSE](LICENSE) file for details.

Original memory server: Copyright (c) 2024 Anthropic, PBC
Obsidian integration modifications: Copyright (c) 2025 Ntrakiyski

## Support

For issues and feature requests, please open a GitHub issue.
