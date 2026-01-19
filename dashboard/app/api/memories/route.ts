import { NextRequest, NextResponse } from 'next/server';

const MCP_URL = process.env.MCP_URL || 'http://localhost:6666/mcp';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(MCP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'tools/call',
        params: {
          name: 'get_all_nodes',
          arguments: {}
        }
      })
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch memories' }, { status: response.status });
    }

    const data = await response.json();

    if (data.result && data.result.content && data.result.content[0]) {
      const nodesData = JSON.parse(data.result.content[0].text);
      return NextResponse.json(nodesData);
    }

    return NextResponse.json({ nodes: [] });
  } catch (error) {
    console.error('Error fetching memories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
