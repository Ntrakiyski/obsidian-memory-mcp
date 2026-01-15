import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Tool definition interfaces
export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'audio' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

// MCP Client class
class MCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private isConnected: boolean = false;
  private connectionPromise: Promise<void> | null = null;

  // Get or create the MCP client connection
  private async getClient(): Promise<Client> {
    if (this.client && this.isConnected) {
      return this.client;
    }

    // If connection is in progress, wait for it
    if (this.connectionPromise) {
      await this.connectionPromise;
      if (this.client && this.isConnected) {
        return this.client;
      }
    }

    // Create new connection
    this.connectionPromise = this.connect();
    await this.connectionPromise;

    if (!this.client || !this.isConnected) {
      throw new Error('Failed to establish MCP client connection');
    }

    return this.client;
  }

  // Establish connection to MCP server
  private async connect(): Promise<void> {
    try {
      // Create new client instance
      this.client = new Client({
        name: 'obsidian-dashboard',
        version: '1.0.0',
      });

      // Create stdio transport to connect to MCP server on port 6666
      this.transport = new StdioClientTransport({
        command: 'node',
        args: ['dist/index.js'],
        cwd: process.cwd(),
        env: {
          ...process.env,
          PORT: '6666',
        },
      });

      // Connect to the server
      await this.client.connect(this.transport);
      this.isConnected = true;
      console.log('Connected to MCP server');
    } catch (error) {
      this.isConnected = false;
      this.client = null;
      this.transport = null;
      console.error('Failed to connect to MCP server:', error);
      throw error;
    }
  }

  // List all available tools
  async listTools(): Promise<MCPTool[]> {
    const client = await this.getClient();
    
    try {
      const response = await client.listTools();
      return response.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema as MCPTool['inputSchema'],
      }));
    } catch (error) {
      console.error('Failed to list tools:', error);
      throw error;
    }
  }

  // Call a specific tool with arguments
  async callTool(name: string, args: Record<string, any> = {}): Promise<MCPToolResult> {
    const client = await this.getClient();
    
    try {
      const response = await client.callTool({
        name,
        arguments: args,
      });

      return {
        content: response.content as MCPToolResult['content'],
        isError: response.isError as boolean | undefined,
      };
    } catch (error) {
      console.error(`Failed to call tool ${name}:`, error);
      throw error;
    }
  }

  // Check if client is connected
  async isReady(): Promise<boolean> {
    try {
      await this.getClient();
      return this.isConnected;
    } catch {
      return false;
    }
  }

  // Disconnect from the server
  async disconnect(): Promise<void> {
    try {
      if (this.client && this.isConnected) {
        await this.client.close();
      }
    } catch (error) {
      console.error('Error disconnecting from MCP server:', error);
    } finally {
      this.client = null;
      this.transport = null;
      this.isConnected = false;
      this.connectionPromise = null;
    }
  }
}

// Export singleton instance
export const mcpClient = new MCPClient();

// Helper functions for common operations
export async function getAvailableTools(): Promise<MCPTool[]> {
  return mcpClient.listTools();
}

export async function executeTool(toolName: string, args?: Record<string, any>): Promise<MCPToolResult> {
  return mcpClient.callTool(toolName, args);
}

export async function checkConnection(): Promise<boolean> {
  return mcpClient.isReady();
}

export { MCPClient };