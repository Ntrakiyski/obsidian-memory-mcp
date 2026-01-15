#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  InitializeRequestSchema,
  PingRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Entity, Relation } from './types.js';
import { MarkdownStorageManager } from './storage/MarkdownStorageManager.js';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const PORT = parseInt(process.env.PORT || "6666", 10);
const MEMORY_DIR = process.env.MEMORY_DIR || "/app/data/root_vault";

// Ensure storage directory exists
function ensureStorageDirectory() {
  try {
    if (!fs.existsSync(MEMORY_DIR)) {
      fs.mkdirSync(MEMORY_DIR, { recursive: true, mode: 0o755 });
      console.error(`Created storage directory: ${MEMORY_DIR}`);
    } else {
      console.error(`Storage directory exists: ${MEMORY_DIR}`);
    }
    
    // Verify it's writable
    fs.accessSync(MEMORY_DIR, fs.constants.W_OK);
    console.error(`Storage directory is writable: ${MEMORY_DIR}`);
  } catch (error) {
    console.error(`Failed to ensure storage directory: ${error}`);
    process.exit(1);
  }
}

// Verify storage initialization
function verifyStoragePermissions() {
  try {
    const testFile = path.join(MEMORY_DIR, '.test-write-permission');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.error(`Storage write permission verified`);
  } catch (error) {
    console.error(`Storage write permission failed: ${error}`);
    process.exit(1);
  }
}

// Create Markdown storage manager
const storageManager = new MarkdownStorageManager();

// The server instance and tools exposed to Claude
const server = new Server({
  name: "memory-server",
  version: "0.6.3",
}, {
    capabilities: {
      tools: {},
    },
  });

// Handle initialization request
server.setRequestHandler(InitializeRequestSchema, async () => {
  return {
    protocolVersion: "2024-11-05",
    capabilities: {
      tools: {},
    },
    serverInfo: {
      name: "memory-server",
      version: "0.6.3",
    },
  };
});

// Handle ping requests
server.setRequestHandler(PingRequestSchema, async () => {
  return {};
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_entities",
        description: "Create multiple new entities in the knowledge graph",
        inputSchema: {
          type: "object",
          properties: {
            entities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "The name of the entity" },
                  entityType: { type: "string", description: "The type of the entity" },
                  observations: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "An array of observation contents associated with the entity"
                  },
                },
                required: ["name", "entityType", "observations"],
              },
            },
          },
          required: ["entities"],
        },
      },
      {
        name: "create_relations",
        description: "Create multiple new relations between entities in the knowledge graph. Relations should be in active voice",
        inputSchema: {
          type: "object",
          properties: {
            relations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  from: { type: "string", description: "The name of the entity where the relation starts" },
                  to: { type: "string", description: "The name of the entity where the relation ends" },
                  relationType: { type: "string", description: "The type of the relation" },
                },
                required: ["from", "to", "relationType"],
              },
            },
          },
          required: ["relations"],
        },
      },
      {
        name: "add_observations",
        description: "Add new observations to existing entities in the knowledge graph",
        inputSchema: {
          type: "object",
          properties: {
            observations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  entityName: { type: "string", description: "The name of the entity to add the observations to" },
                  contents: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "An array of observation contents to add"
                  },
                },
                required: ["entityName", "contents"],
              },
            },
          },
          required: ["observations"],
        },
      },
      {
        name: "delete_entities",
        description: "Delete multiple entities and their associated relations from the knowledge graph",
        inputSchema: {
          type: "object",
          properties: {
            entityNames: { 
              type: "array", 
              items: { type: "string" },
              description: "An array of entity names to delete" 
            },
          },
          required: ["entityNames"],
        },
      },
      {
        name: "delete_observations",
        description: "Delete specific observations from entities in the knowledge graph",
        inputSchema: {
          type: "object",
          properties: {
            deletions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  entityName: { type: "string", description: "The name of the entity containing the observations" },
                  observations: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "An array of observations to delete"
                  },
                },
                required: ["entityName", "observations"],
              },
            },
          },
          required: ["deletions"],
        },
      },
      {
        name: "delete_relations",
        description: "Delete multiple relations from the knowledge graph",
        inputSchema: {
          type: "object",
          properties: {
            relations: { 
              type: "array", 
              items: {
                type: "object",
                properties: {
                  from: { type: "string", description: "The name of the entity where the relation starts" },
                  to: { type: "string", description: "The name of the entity where the relation ends" },
                  relationType: { type: "string", description: "The type of the relation" },
                },
                required: ["from", "to", "relationType"],
              },
              description: "An array of relations to delete" 
            },
          },
          required: ["relations"],
        },
      },
      {
        name: "read_graph",
        description: "Read the entire knowledge graph",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "search_nodes",
        description: "Search for nodes in the knowledge graph based on a query",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "The search query to match against entity names, types, and observation content" },
          },
          required: ["query"],
        },
      },
      {
        name: "open_nodes",
        description: "Open specific nodes in the knowledge graph by their names",
        inputSchema: {
          type: "object",
          properties: {
            names: {
              type: "array",
              items: { type: "string" },
              description: "An array of entity names to retrieve",
            },
          },
          required: ["names"],
        },
      },
      {
        name: "get_all_nodes",
        description: "Get all nodes in the knowledge graph with full details including metadata, content, and relations. Suitable for the home page UI.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    throw new Error(`No arguments provided for tool: ${name}`);
  }

  switch (name) {
    case "create_entities":
      return { content: [{ type: "text", text: JSON.stringify(await storageManager.createEntities(args.entities as Entity[]), null, 2) }] };
    case "create_relations":
      return { content: [{ type: "text", text: JSON.stringify(await storageManager.createRelations(args.relations as Relation[]), null, 2) }] };
    case "add_observations":
      return { content: [{ type: "text", text: JSON.stringify(await storageManager.addObservations(args.observations as { entityName: string; contents: string[] }[]), null, 2) }] };
    case "delete_entities":
      await storageManager.deleteEntities(args.entityNames as string[]);
      return { content: [{ type: "text", text: "Entities deleted successfully" }] };
    case "delete_observations":
      await storageManager.deleteObservations(args.deletions as { entityName: string; observations: string[] }[]);
      return { content: [{ type: "text", text: "Observations deleted successfully" }] };
    case "delete_relations":
      await storageManager.deleteRelations(args.relations as Relation[]);
      return { content: [{ type: "text", text: "Relations deleted successfully" }] };
    case "read_graph":
      return { content: [{ type: "text", text: JSON.stringify(await storageManager.readGraph(), null, 2) }] };
    case "search_nodes":
      return { content: [{ type: "text", text: JSON.stringify(await storageManager.searchNodes(args.query as string), null, 2) }] };
    case "open_nodes":
      return { content: [{ type: "text", text: JSON.stringify(await storageManager.openNodes(args.names as string[]), null, 2) }] };
    case "get_all_nodes":
      return { content: [{ type: "text", text: JSON.stringify(await storageManager.getAllNodes(), null, 2) }] };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

async function main() {
  // Ensure storage directory exists before starting server
  ensureStorageDirectory();
  verifyStoragePermissions();

  // Create HTTP server for MCP
  const serverInstance = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', server: 'memory-server', storageDir: MEMORY_DIR }));
      return;
    }

    if (req.method === 'GET' && req.url === '/count') {
      try {
        const files = fs.readdirSync(MEMORY_DIR);
        const mdFiles = files.filter(f => f.endsWith('.md'));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ count: mdFiles.length }));
        return;
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to count files' }));
        return;
      }
    }

    if (req.method === 'POST' && req.url === '/mcp') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const request = JSON.parse(body);
          console.error('Received MCP request:', request.method || request.params?.name);
          
          // Handle the request based on method
          let result;
          
          if (request.method === 'initialize') {
            // Handle initialization
            result = {
              protocolVersion: "2024-11-05",
              capabilities: {
                tools: {},
              },
              serverInfo: {
                name: "memory-server",
                version: "0.6.3",
              },
            };
          } else if (request.method === 'ping') {
            // Handle ping
            result = {};
          } else if (request.method === 'notifications/initialized') {
            // Handle initialized notification (no response needed)
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({}));
            return;
          } else if (request.method === 'tools/list') {
            // Return list of tools
            result = {
              tools: [
                {
                  name: "create_entities",
                  description: "Create multiple new entities in the knowledge graph",
                  inputSchema: {
                    type: "object",
                    properties: {
                      entities: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string", description: "The name of the entity" },
                            entityType: { type: "string", description: "The type of the entity" },
                            observations: { 
                              type: "array", 
                              items: { type: "string" },
                              description: "An array of observation contents associated with the entity"
                            },
                          },
                          required: ["name", "entityType", "observations"],
                        },
                      },
                    },
                    required: ["entities"],
                  },
                },
                {
                  name: "create_relations",
                  description: "Create multiple new relations between entities in the knowledge graph. Relations should be in active voice",
                  inputSchema: {
                    type: "object",
                    properties: {
                      relations: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            from: { type: "string", description: "The name of the entity where the relation starts" },
                            to: { type: "string", description: "The name of the entity where the relation ends" },
                            relationType: { type: "string", description: "The type of the relation" },
                          },
                          required: ["from", "to", "relationType"],
                        },
                      },
                    },
                    required: ["relations"],
                  },
                },
                {
                  name: "add_observations",
                  description: "Add new observations to existing entities in the knowledge graph",
                  inputSchema: {
                    type: "object",
                    properties: {
                      observations: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            entityName: { type: "string", description: "The name of the entity to add the observations to" },
                            contents: { 
                              type: "array", 
                              items: { type: "string" },
                              description: "An array of observation contents to add"
                            },
                          },
                          required: ["entityName", "contents"],
                        },
                      },
                    },
                    required: ["observations"],
                  },
                },
                {
                  name: "delete_entities",
                  description: "Delete multiple entities and their associated relations from the knowledge graph",
                  inputSchema: {
                    type: "object",
                    properties: {
                      entityNames: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "An array of entity names to delete" 
                      },
                    },
                    required: ["entityNames"],
                  },
                },
                {
                  name: "delete_observations",
                  description: "Delete specific observations from entities in the knowledge graph",
                  inputSchema: {
                    type: "object",
                    properties: {
                      deletions: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            entityName: { type: "string", description: "The name of the entity containing the observations" },
                            observations: { 
                              type: "array", 
                              items: { type: "string" },
                              description: "An array of observations to delete"
                            },
                          },
                          required: ["entityName", "observations"],
                        },
                      },
                    },
                    required: ["deletions"],
                  },
                },
                {
                  name: "delete_relations",
                  description: "Delete multiple relations from the knowledge graph",
                  inputSchema: {
                    type: "object",
                    properties: {
                      relations: { 
                        type: "array", 
                        items: {
                          type: "object",
                          properties: {
                            from: { type: "string", description: "The name of the entity where the relation starts" },
                            to: { type: "string", description: "The name of the entity where the relation ends" },
                            relationType: { type: "string", description: "The type of the relation" },
                          },
                          required: ["from", "to", "relationType"],
                        },
                        description: "An array of relations to delete" 
                      },
                    },
                    required: ["relations"],
                  },
                },
                {
                  name: "read_graph",
                  description: "Read the entire knowledge graph",
                  inputSchema: {
                    type: "object",
                    properties: {},
                  },
                },
                {
                  name: "search_nodes",
                  description: "Search for nodes in the knowledge graph based on a query",
                  inputSchema: {
                    type: "object",
                    properties: {
                      query: { type: "string", description: "The search query to match against entity names, types, and observation content" },
                    },
                    required: ["query"],
                  },
                },
                {
                  name: "open_nodes",
                  description: "Open specific nodes in the knowledge graph by their names",
                  inputSchema: {
                    type: "object",
                    properties: {
                      names: {
                        type: "array",
                        items: { type: "string" },
                        description: "An array of entity names to retrieve",
                      },
                    },
                    required: ["names"],
                  },
                },
                {
                  name: "get_all_nodes",
                  description: "Get all nodes in the knowledge graph with full details including metadata, content, and relations. Suitable for the home page UI.",
                  inputSchema: {
                    type: "object",
                    properties: {},
                  },
                },
              ],
            };
          } else if (request.method === 'tools/call') {
            // Handle tool calls
            const { name, arguments: args } = request.params;
            
            if (!args) {
              throw new Error(`No arguments provided for tool: ${name}`);
            }
            
            switch (name) {
              case "create_entities":
                result = { content: [{ type: "text", text: JSON.stringify(await storageManager.createEntities(args.entities as Entity[]), null, 2) }] };
                break;
              case "create_relations":
                result = { content: [{ type: "text", text: JSON.stringify(await storageManager.createRelations(args.relations as Relation[]), null, 2) }] };
                break;
              case "add_observations":
                result = { content: [{ type: "text", text: JSON.stringify(await storageManager.addObservations(args.observations as { entityName: string; contents: string[] }[]), null, 2) }] };
                break;
              case "delete_entities":
                await storageManager.deleteEntities(args.entityNames as string[]);
                result = { content: [{ type: "text", text: "Entities deleted successfully" }] };
                break;
              case "delete_observations":
                await storageManager.deleteObservations(args.deletions as { entityName: string; observations: string[] }[]);
                result = { content: [{ type: "text", text: "Observations deleted successfully" }] };
                break;
              case "delete_relations":
                await storageManager.deleteRelations(args.relations as Relation[]);
                result = { content: [{ type: "text", text: "Relations deleted successfully" }] };
                break;
              case "read_graph":
                result = { content: [{ type: "text", text: JSON.stringify(await storageManager.readGraph(), null, 2) }] };
                break;
              case "search_nodes":
                result = { content: [{ type: "text", text: JSON.stringify(await storageManager.searchNodes(args.query as string), null, 2) }] };
                break;
              case "open_nodes":
                result = { content: [{ type: "text", text: JSON.stringify(await storageManager.openNodes(args.names as string[]), null, 2) }] };
                break;
              case "get_all_nodes":
                result = { content: [{ type: "text", text: JSON.stringify(await storageManager.getAllNodes(), null, 2) }] };
                break;
              default:
                throw new Error(`Unknown tool: ${name}`);
            }
          } else {
            throw new Error(`Unknown method: ${request.method}`);
          }
          
          // Wrap response in JSON-RPC 2.0 format
          const response = {
            jsonrpc: "2.0",
            id: request.id,
            result: result
          };
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(response));
        } catch (error) {
          console.error('Error handling request:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: String(error) }));
        }
      });
      return;
    }

    // Return 404 for other routes
    res.writeHead(404);
    res.end('Not Found');
  });

  serverInstance.listen(PORT, () => {
    console.error(`Knowledge Graph MCP Server running on http://localhost:${PORT}`);
    console.error(`Storage directory: ${MEMORY_DIR}`);
    console.error(`Endpoints:`);
    console.error(`  - GET  /health - Health check`);
    console.error(`  - POST /mcp   - MCP endpoint`);
  });
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});