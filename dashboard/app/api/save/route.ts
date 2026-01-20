import { NextResponse } from "next/server";

const MCP_SERVER_URL = process.env.MCP_URL || "https://obsidian-mcp.trakiyski.work/mcp";

interface SaveRequest {
  entityName: string;
  content: string;
}

interface MCPResponse {
  result?: {
    content: Array<{ text: string }>;
  };
  error?: {
    message: string;
  };
}

export async function POST(request: Request) {
  try {
    const { entityName, content }: SaveRequest = await request.json();

    // Validate input
    if (!entityName || !content) {
      return NextResponse.json(
        { error: "Missing required fields: entityName and content" },
        { status: 400 }
      );
    }

    // Parse observations from markdown content
    const observations = parseObservations(content);

    // Call MCP add_observations tool
    const response = await fetch(MCP_SERVER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "add_observations",
          arguments: {
            observations: [
              {
                entityName,
                contents: observations,
              },
            ],
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`MCP server returned ${response.status}`);
    }

    const data: MCPResponse = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save" },
      { status: 500 }
    );
  }
}

function parseObservations(markdown: string): string[] {
  // Extract observations from ## Observations section
  const obsMatch = markdown.match(/## Observations\n\n([\s\S]+?)(?=##|\Z)/);
  if (!obsMatch) return [];

  return obsMatch[1]
    .split("\n")
    .map((line) => line.replace(/^-\s*/, "").trim())
    .filter((line) => line.length > 0 && !line.startsWith("**"));
}
