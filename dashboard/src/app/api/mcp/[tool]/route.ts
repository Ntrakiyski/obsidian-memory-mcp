import { NextRequest, NextResponse } from 'next/server';

// Get MCP server URL from environment
const getMcpUrl = () => {
  // In production, use internal Docker URL (service name)
  // This is hardcoded because environment variables might be overridden by Coolify
  if (process.env.NODE_ENV === 'production') {
    return 'http://obsidian-memory-mcp:6666/mcp';
  }
  // For local development
  return process.env.NEXT_PUBLIC_BASE_URL 
    ? `${process.env.NEXT_PUBLIC_BASE_URL}/mcp`
    : 'http://localhost:6666/mcp';
};

// Generic JSON-RPC request handler
async function callMcpMethod(method: string, params?: Record<string, any>) {
  const mcpUrl = getMcpUrl();
  console.log(`📡 Calling MCP: ${method} at ${mcpUrl}`);
  
  const response = await fetch(mcpUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params: params || {},
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ MCP HTTP Error: ${response.status} ${response.statusText}`);
    console.error(`Error body: ${errorText}`);
    throw new Error(`MCP request failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  
  if (result.error) {
    console.error('❌ MCP JSON-RPC Error:', result.error);
    throw new Error(`MCP error: ${result.error.message}`);
  }
  
  console.log(`✅ MCP ${method} response:`, result.result);
  return result.result;
}

// GET /api/mcp/[tool] - List available tools
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tool: string }> }
) {
  try {
    const { tool } = await params;

    if (tool === 'list' || tool === 'tools') {
      // Call tools/list method
      const result = await callMcpMethod('tools/list');
      return NextResponse.json({
        success: true,
        tools: result.tools || [],
      });
    }

    // For specific tool info, we need to list all tools and find the one
    const toolsResult = await callMcpMethod('tools/list');
    const tools = toolsResult.tools || [];
    const targetTool = tools.find((t: any) => t.name === tool);

    if (!targetTool) {
      return NextResponse.json(
        {
          success: false,
          error: `Tool '${tool}' not found`,
          availableTools: tools.map((t: any) => t.name),
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      tool: targetTool,
    });
  } catch (error) {
    console.error('Error in GET /api/mcp/[tool]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch tool information',
      },
      { status: 500 }
    );
  }
}

// POST /api/mcp/[tool] - Call a specific tool
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tool: string }> }
) {
  try {
    const { tool } = await params;
    const body = await request.json();

    console.log(`🚀 Calling tool: ${tool}`, body.args);

    // Validate tool name
    if (!tool || typeof tool !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid tool name',
        },
        { status: 400 }
      );
    }

    // Call the tool using tools/call method
    const result = await callMcpMethod('tools/call', {
      name: tool,
      arguments: body.args || {},
    });

    console.log(`✅ Tool ${tool} executed successfully`);
    
    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Error in POST /api/mcp/[tool]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute tool',
      },
      { status: 500 }
    );
  }
}