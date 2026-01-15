import { NextRequest, NextResponse } from 'next/server';
import { mcpClient, MCPTool, MCPToolResult } from '@/lib/mcp-client';

// GET /api/mcp/[tool] - List available tools
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tool: string }> }
): Promise<NextResponse> {
  try {
    const { tool } = await params;

    // For listing tools, we use a special endpoint
    if (tool === 'list' || tool === 'tools') {
      const tools = await mcpClient.listTools();
      return NextResponse.json({
        success: true,
        tools: tools,
      });
    }

    // For specific tool info, return tool details
    const tools = await mcpClient.listTools();
    const targetTool = tools.find(t => t.name === tool);

    if (!targetTool) {
      return NextResponse.json(
        {
          success: false,
          error: `Tool '${tool}' not found`,
          availableTools: tools.map(t => t.name),
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
): Promise<NextResponse> {
  try {
    const { tool } = await params;
    const body = await request.json();

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

    // Get available tools to validate
    const tools = await mcpClient.listTools();
    const targetTool = tools.find(t => t.name === tool);

    if (!targetTool) {
      return NextResponse.json(
        {
          success: false,
          error: `Tool '${tool}' not found`,
          availableTools: tools.map(t => t.name),
        },
        { status: 404 }
      );
    }

    // Validate arguments against tool's input schema
    const args = body.args || {};
    const requiredFields = targetTool.inputSchema.required || [];
    
    for (const field of requiredFields) {
      if (!(field in args) || args[field] === undefined || args[field] === null) {
        return NextResponse.json(
          {
            success: false,
            error: `Missing required argument: ${field}`,
            tool: targetTool.name,
            requiredFields,
          },
          { status: 400 }
        );
      }
    }

    // Call the tool
    const result = await mcpClient.callTool(tool, args);

    // Check for errors
    if (result.isError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tool execution failed',
          result,
        },
        { status: 400 }
      );
    }

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
