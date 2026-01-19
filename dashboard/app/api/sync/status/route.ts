import { NextRequest, NextResponse } from 'next/server';

const MCP_URL = process.env.MCP_URL || 'http://localhost:6666/mcp';

export async function GET(request: NextRequest) {
  try {
    // Call the MCP server's get_scheduler_status tool
    const response = await fetch(MCP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'tools/call',
        params: {
          name: 'get_scheduler_status',
          arguments: {}
        }
      })
    });

    if (!response.ok) {
      // Fallback to environment-based status if MCP is unavailable
      const enabled = process.env.ENABLE_SYNC === 'true';
      const interval = parseInt(process.env.SYNC_INTERVAL_MINUTES || '5', 10);
      return NextResponse.json({
        enabled,
        interval,
        note: 'MCP server unavailable, using environment variables'
      });
    }

    const data = await response.json();

    if (data.result && data.result.content && data.result.content[0]) {
      try {
        const status = JSON.parse(data.result.content[0].text);
        return NextResponse.json(status);
      } catch (parseError) {
        return NextResponse.json(
          { error: 'Failed to parse scheduler status' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Invalid response from MCP server' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error fetching sync status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
