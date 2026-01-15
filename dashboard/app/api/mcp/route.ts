import { NextRequest, NextResponse } from "next/server";

// Use public URL for MCP server
const MCP_SERVER_URL = process.env.MCP_URL || "https://obsidian-mcp.trakiyski.work/mcp";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("MCP Proxy: Requesting", JSON.stringify(body, null, 2));
    console.log("MCP Proxy: Target URL", MCP_SERVER_URL);

    // Forward the request to the MCP server
    const response = await fetch(MCP_SERVER_URL, {
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

    console.log("MCP Proxy: Response status", response.status);

    // Create response with session ID if present
    const nextResponse = NextResponse.json(data, { status: response.status });
    if (sessionId) {
      nextResponse.headers.set("Mcp-Session-Id", sessionId);
    }

    return nextResponse;
  } catch (error) {
    console.error("MCP proxy error:", error);
    return NextResponse.json(
      { error: "Failed to connect to MCP server", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
