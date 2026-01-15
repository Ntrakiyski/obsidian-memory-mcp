'use client';

import { useState, useEffect } from 'react';

interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'audio' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

interface ToolOutputProps {
  result: MCPToolResult | null;
  loading?: boolean;
  error?: string | null;
  toolName?: string;
}

export default function ToolOutput({ 
  result, 
  loading = false, 
  error = null, 
  toolName = '' 
}: ToolOutputProps) {
  const [parsedData, setParsedData] = useState<any>(null);
  const [displayMode, setDisplayMode] = useState<'formatted' | 'raw'>('formatted');

  useEffect(() => {
    if (!result) {
      setParsedData(null);
      return;
    }

    // Extract text content from the result
    const textContent = result.content.find(c => c.type === 'text');
    
    if (textContent?.text) {
      try {
        // Try to parse as JSON
        const parsed = JSON.parse(textContent.text);
        setParsedData(parsed);
      } catch {
        // If not JSON, use as plain text
        setParsedData(textContent.text);
      }
    } else {
      setParsedData(result.content);
    }
  }, [result]);

  if (loading) {
    return (
      <div className="tool-output">
        <h3>Output</h3>
        <div className="loading">
          <div className="spinner"></div>
          <p>Executing {toolName || 'tool'}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tool-output">
        <h3>Output</h3>
        <div className="error">
          <p>Execution failed</p>
          <p className="error-message">{error}</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="tool-output">
        <h3>Output</h3>
        <p className="no-output">No output yet. Select and run a tool to see results.</p>
      </div>
    );
  }

  if (result.isError) {
    return (
      <div className="tool-output">
        <h3>Output</h3>
        <div className="error">
          <p>Tool returned an error</p>
          <pre className="error-details">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="tool-output">
      <div className="output-header">
        <h3>Output</h3>
        <div className="display-toggle">
          <button
            className={displayMode === 'formatted' ? 'active' : ''}
            onClick={() => setDisplayMode('formatted')}
          >
            Formatted
          </button>
          <button
            className={displayMode === 'raw' ? 'active' : ''}
            onClick={() => setDisplayMode('raw')}
          >
            Raw JSON
          </button>
        </div>
      </div>

      <div className="output-content">
        {displayMode === 'raw' ? (
          <pre className="raw-json">
            {JSON.stringify(result, null, 2)}
          </pre>
        ) : (
          <div className="formatted-output">
            {typeof parsedData === 'object' && parsedData !== null ? (
              <FormattedData data={parsedData} />
            ) : (
              <pre className="text-output">{String(parsedData)}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Component to format different data types
function FormattedData({ data }: { data: any }) {
  // Handle knowledge graph data
  if (data.entities && data.relations) {
    return (
      <div className="graph-data">
        <div className="graph-summary">
          <span className="summary-item">
            <strong>{data.entities.length}</strong> entities
          </span>
          <span className="summary-item">
            <strong>{data.relations.length}</strong> relations
          </span>
        </div>
        
        {data.entities.length > 0 && (
          <div className="entities-section">
            <h4>Entities</h4>
            <div className="entities-grid">
              {data.entities.map((entity: any, index: number) => (
                <div key={index} className="entity-card">
                  <div className="entity-header">
                    <span className="entity-name">{entity.name}</span>
                    <span className="entity-type">{entity.entityType}</span>
                  </div>
                  {entity.observations && entity.observations.length > 0 && (
                    <ul className="observations-list">
                      {entity.observations.slice(0, 3).map((obs: string, i: number) => (
                        <li key={i}>{obs}</li>
                      ))}
                      {entity.observations.length > 3 && (
                        <li className="more">+{entity.observations.length - 3} more</li>
                      )}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {data.relations.length > 0 && (
          <div className="relations-section">
            <h4>Relations</h4>
            <div className="relations-list">
              {data.relations.map((relation: any, index: number) => (
                <div key={index} className="relation-item">
                  <span className="relation-from">{relation.from}</span>
                  <span className="relation-type">{relation.relationType}</span>
                  <span className="relation-to">{relation.to}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Handle array data
  if (Array.isArray(data)) {
    return (
      <div className="array-data">
        <p className="array-length">{data.length} items</p>
        <ul className="array-list">
          {data.map((item, index) => (
            <li key={index}>
              {typeof item === 'object' ? (
                <FormattedData data={item} />
              ) : (
                String(item)
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Handle plain objects
  if (typeof data === 'object' && data !== null) {
    return (
      <div className="object-data">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="object-field">
            <span className="field-name">{key}:</span>
            <span className="field-value">
              {typeof value === 'object' ? (
                <FormattedData data={value} />
              ) : (
                String(value)
              )}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // Fallback to string representation
  return <pre className="text-output">{String(data)}</pre>;
}
