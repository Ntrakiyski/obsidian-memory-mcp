# Docker Setup for Obsidian Memory MCP

This guide explains how to run the Obsidian Memory MCP server using Docker Compose.

## Prerequisites

- [Docker](https://www.docker.com/get-started) installed
- [Docker Compose](https://docs.docker.com/compose/install/) installed

## Quick Start

### 1. Build and Start the Container

```bash
docker-compose up --build
```

This will:
- Build the Docker image
- Start the container in detached mode
- Mount the `./data` directory for persistent storage
- Expose the server on port `6666`

### 2. Access the Server

The MCP server will be available at:
```
http://localhost:6666
```

### 3. View Logs

```bash
docker-compose logs -f
```

### 4. Stop the Container

```bash
docker-compose down
```

## Directory Structure

After running the container, you'll have:

```
obsidian-memory-mcp/
├── data/                    # Persistent storage for Markdown files
│   └── (your knowledge graph files)
├── Dockerfile
├── docker-compose.yml
└── .dockerignore
```

## Persistent Storage

The `./data` directory is mounted to `/app/data` inside the container. This is where:
- Entity Markdown files are stored
- Relation Markdown files are stored
- Your knowledge graph data persists across container restarts

## Port Configuration

The server runs on **port 6666** by default. You can customize this by setting the `PORT` environment variable:

```yaml
environment:
  - PORT=8080  # Change to a different port
```

If you change the port, also update the `ports` mapping in `docker-compose.yml`:

```yaml
ports:
  - "8080:8080"  # Host port:Container port
```

## Running in Foreground (Development)

For development or debugging:

```bash
docker-compose up
```

This shows logs in real-time.

## Configuration

### Environment Variables

You can customize the container by adding environment variables to `docker-compose.yml`:

```yaml
environment:
  - NODE_ENV=production
  - PORT=6666
  - CUSTOM_VAR=value
```

### Resource Limits

Add resource limits in `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '1'
      memory: 512M
```

## Troubleshooting

### Container won't start

Check the logs:
```bash
docker-compose logs
```

### Port already in use

If port 6666 is already in use, modify the port mapping:

```yaml
ports:
  - "8080:6666"  # Map host port 8080 to container port 6666
```

### Permission issues

Ensure the `./data` directory exists and has proper permissions:
```bash
mkdir -p data
chmod 777 data
```

### Rebuilding the image

If you make code changes:
```bash
docker-compose up --build
```

## API Endpoint

The MCP server exposes the following endpoint:

- **URL**: `http://localhost:6666`
- **Protocol**: HTTP
- **MCP Version**: 1.0

You can send MCP requests to this endpoint using any HTTP client.

## Security Notes

- The container runs as a non-root user (`node`)
- Port 6666 is exposed - consider firewall rules for production
- All data is stored in the mounted volume

## Next Steps

- Configure your MCP client to connect to `http://localhost:6666`
- Create your first entities and relations
- Open the Markdown files in Obsidian to visualize your knowledge graph
