'use client';

import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [toolResult, setToolResult] = useState<any>(null);

  useEffect(() => {
    async function testMcpTool() {
      setStatus('Fetching tools list...');
      console.log('🔍 Starting MCP test...');
      
      try {
        // Test 1: List tools
        console.log('📋 Fetching available tools...');
        const toolsResponse = await fetch('/api/mcp/list', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        const toolsData = await toolsResponse.json();
        console.log('📋 Tools response:', toolsData);
        
        if (!toolsData.success) {
          throw new Error(`Failed to fetch tools: ${toolsData.error}`);
        }
        
        setStatus(`Found ${toolsData.tools.length} tools`);
        
        // Test 2: Call read_graph tool
        console.log('📊 Calling read_graph tool...');
        const graphResponse = await fetch('/api/mcp/read_graph', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ args: {} }),
        });
        
        const graphData = await graphResponse.json();
        console.log('📊 Graph response:', graphData);
        
        if (!graphData.success) {
          throw new Error(`Failed to call read_graph: ${graphData.error}`);
        }
        
        // Parse the result
        const textContent = graphData.result?.content?.find((c: any) => c.type === 'text');
        if (textContent?.text) {
          const parsed = JSON.parse(textContent.text);
          console.log('✅ Parsed graph data:', parsed);
          setToolResult(parsed);
          setStatus(`Loaded: ${parsed.entities?.length || 0} entities, ${parsed.relations?.length || 0} relations`);
        } else {
          console.log('⚠️ No text content in response');
          setStatus('No data returned');
        }
        
      } catch (err) {
        console.error('❌ Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStatus('Error occurred - check console');
      }
    }

    testMcpTool();
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Obsidian Memory Dashboard</h1>
      
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2>Status: {status}</h2>
        
        {error && (
          <div style={{ padding: '1rem', background: '#fee', border: '1px solid red', borderRadius: '4px', marginTop: '1rem' }}>
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {toolResult && (
          <div style={{ marginTop: '1rem' }}>
            <h3>Result:</h3>
            <pre style={{ background: '#f0f0f0', padding: '1rem', borderRadius: '4px', overflow: 'auto' }}>
              {JSON.stringify(toolResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '2rem', fontSize: '0.875rem', color: '#666' }}>
        <p>Check browser console (F12) for detailed logs.</p>
        <p>Base URL: {process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:6666'}</p>
      </div>
    </div>
  );
}