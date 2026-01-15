'use client';

import { useState, useEffect } from 'react';
import ToolExecutor from '@/components/ToolExecutor';
import GraphVisualizer from '@/components/GraphVisualizer';

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

export default function Dashboard() {
  const [count, setCount] = useState<number | null>(null);
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
  const [graphLoading, setGraphLoading] = useState(true);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'graph' | 'tools'>('graph');

  useEffect(() => {
    // Fetch note count
    fetch(`${BASE_URL}/count`)
      .then(res => res.json())
      .then(data => setCount(data.count))
      .catch(() => setCount(0));

    // Fetch graph data
    fetchGraphData();
  }, []);

  const fetchGraphData = async () => {
    setGraphLoading(true);
    setGraphError(null);

    try {
      const response = await fetch('/api/mcp/read_graph', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ args: {} }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch graph data');
      }

      // Parse the text content from the response
      const textContent = data.result?.content?.find((c: any) => c.type === 'text');
      if (textContent?.text) {
        const parsedGraph = JSON.parse(textContent.text);
        setGraph(parsedGraph);
      } else {
        setGraph(null);
      }
    } catch (err) {
      setGraphError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching graph:', err);
    } finally {
      setGraphLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Obsidian Memory Dashboard</h1>
        <div className="header-stats">
          <div className="stat-card">
            <span className="stat-label">Total Notes</span>
            <span className="stat-value">{count ?? '...'}</span>
          </div>
          {graph && (
            <div className="stat-card">
              <span className="stat-label">Entities</span>
              <span className="stat-value">{graph.entities.length}</span>
            </div>
          )}
          {graph && (
            <div className="stat-card">
              <span className="stat-label">Relations</span>
              <span className="stat-value">{graph.relations.length}</span>
            </div>
          )}
        </div>
      </header>

      <nav className="dashboard-nav">
        <button
          className={`nav-tab ${activeTab === 'graph' ? 'active' : ''}`}
          onClick={() => setActiveTab('graph')}
        >
          Knowledge Graph
        </button>
        <button
          className={`nav-tab ${activeTab === 'tools' ? 'active' : ''}`}
          onClick={() => setActiveTab('tools')}
        >
          Tool Executor
        </button>
      </nav>

      <main className="dashboard-content">
        {activeTab === 'graph' ? (
          <div className="graph-section">
            <GraphVisualizer
              data={graph}
              loading={graphLoading}
              error={graphError}
            />
            {graph && !graphLoading && !graphError && (
              <button onClick={fetchGraphData} className="refresh-button">
                Refresh Graph
              </button>
            )}
          </div>
        ) : (
          <ToolExecutor />
        )}
      </main>

      <footer className="dashboard-footer">
        <p>Connected to MCP server at {BASE_URL}</p>
      </footer>
    </div>
  );
}