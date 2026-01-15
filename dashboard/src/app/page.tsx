'use client';

import { useState, useEffect } from 'react';

interface Entity {
  name: string;
  entityType: string;
  observations: string[];
}

interface Relation {
  from: string;
  to: string;
  relationType: string;
}

interface KnowledgeGraph {
  entities: Entity[];
  relations: Relation[];
}

// Get base URL from environment or use default
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:6666';

async function callMcpTool(toolName: string, args?: Record<string, any>) {
  const response = await fetch(`${BASE_URL}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args || {}
      }
    })
  });
  
  const data = await response.json();
  
  // Parse the text content from the response
  const textContent = data.result?.content?.find((c: any) => c.type === 'text');
  return textContent ? JSON.parse(textContent.text) : null;
}

export default function Dashboard() {
  const [count, setCount] = useState<number | null>(null);
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
  
  useEffect(() => {
    // Fetch note count
    fetch(`${BASE_URL}/count`)
      .then(res => res.json())
      .then(data => setCount(data.count))
      .catch(() => setCount(0));
    
    // Fetch graph data
    callMcpTool('read_graph')
      .then(data => setGraph(data))
      .catch(console.error);
  }, []);
  
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Obsidian Memory Dashboard</h1>
      <p>Total Notes: {count ?? '...'}</p>
      
      {graph && (
        <div>
          <p>Entities: {graph.entities.length}</p>
          <p>Relations: {graph.relations.length}</p>
        </div>
      )}
    </div>
  );
}