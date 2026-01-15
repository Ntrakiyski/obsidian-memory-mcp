'use client';

import { useState, useEffect, useCallback } from 'react';

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

interface ToolsListProps {
  onToolSelect: (tool: MCPTool) => void;
  selectedToolName?: string;
}

export default function ToolsList({ onToolSelect, selectedToolName }: ToolsListProps) {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTools = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/mcp/list');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch tools');
      }

      setTools(data.tools || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching tools:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  if (loading) {
    return (
      <div className="tools-list">
        <h3>Available Tools</h3>
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading tools...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tools-list">
        <h3>Available Tools</h3>
        <div className="error">
          <p>Failed to load tools</p>
          <p className="error-message">{error}</p>
          <button onClick={fetchTools} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tools-list">
      <h3>Available Tools ({tools.length})</h3>
      
      {tools.length === 0 ? (
        <p className="no-tools">No tools available</p>
      ) : (
        <ul className="tools-list-items">
          {tools.map((tool) => (
            <li
              key={tool.name}
              className={`tool-item ${selectedToolName === tool.name ? 'selected' : ''}`}
              onClick={() => onToolSelect(tool)}
            >
              <div className="tool-header">
                <span className="tool-name">{tool.name}</span>
                {tool.inputSchema.required && tool.inputSchema.required.length > 0 && (
                  <span className="tool-required">Required args</span>
                )}
              </div>
              <p className="tool-description">{tool.description}</p>
              {tool.inputSchema.properties && Object.keys(tool.inputSchema.properties).length > 0 && (
                <div className="tool-arguments">
                  <span className="arguments-label">Arguments:</span>
                  {Object.entries(tool.inputSchema.properties).map(([key, schema]) => (
                    <span key={key} className="argument-tag">
                      {key}
                      {schema.type && ` (${schema.type})`}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
