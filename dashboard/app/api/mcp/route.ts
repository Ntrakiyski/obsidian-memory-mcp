import { NextRequest, NextResponse } from "next/server";

// Internal MCP server URL (Docker network)
const MCP_SERVER_URL = process.env.MCP_URL || "http://obsidian-memory-mcp:6666";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Forward the request to the MCP server
    const response = await fetch(`${MCP_SERVER_URL}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    // Get session ID if provided
    const sessionId = response.headers.get("Mcp-Session-Id");

    // Get response data
    const data = await response.json();

    // Create response with session ID if present
    const nextResponse = NextResponse.json(data, { status: response.status });
    if (sessionId) {
      nextResponse.headers.set("Mcp-Session-Id", sessionId);
    }

    return nextResponse;
  } catch (error) {
    console.error("MCP proxy error:", error);
    return NextResponse.json(
      { error: "Failed to connect to MCP server" },
      { status: 500 }
    );
  }
}
