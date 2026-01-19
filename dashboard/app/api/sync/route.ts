import { NextRequest, NextResponse } from 'next/server';

const MCP_URL = process.env.MCP_URL || 'http://localhost:6666/mcp';

const VALID_DIRECTIONS = ['neo4j_to_obsidian', 'obsidian_to_neo4j', 'both'] as const;
type SyncDirection = typeof VALID_DIRECTIONS[number];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const direction = body.direction || 'both';

    // Input validation
    if (!VALID_DIRECTIONS.includes(direction as SyncDirection)) {
      return NextResponse.json(
        { error: `Invalid direction. Must be one of: ${VALID_DIRECTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Add timeout to fetch
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    const response = await fetch(MCP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'tools/call',
        params: {
          name: 'sync_obsidian_neo4j',
          arguments: { direction }
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Sync failed: HTTP ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.result && data.result.content && data.result.content[0]) {
      try {
        const syncResult = JSON.parse(data.result.content[0].text);
        return NextResponse.json(syncResult);
      } catch (parseError) {
        return NextResponse.json(
          { error: 'Failed to parse sync result' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Invalid response from MCP server' },
      { status: 500 }
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Sync timeout: request took too long' },
        { status: 504 }
      );
    }
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
