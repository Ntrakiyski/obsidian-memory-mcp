'use client';

import { useState, useEffect } from 'react';
import ToolsList, { MCPTool } from './ToolsList';
import ToolOutput from './ToolOutput';

interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'audio' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export default function ToolExecutor() {
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);
  const [args, setArgs] = useState<Record<string, any>>({});
  const [result, setResult] = useState<MCPToolResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset args when tool changes
  useEffect(() => {
    if (selectedTool) {
      const defaultArgs: Record<string, any> = {};
      
      // Set default values for required fields
      if (selectedTool.inputSchema.required) {
        selectedTool.inputSchema.required.forEach(field => {
          const prop = selectedTool.inputSchema.properties?.[field];
          if (prop?.enum) {
            defaultArgs[field] = prop.enum[0];
          } else {
            defaultArgs[field] = '';
          }
        });
      }
      
      setArgs(defaultArgs);
      setResult(null);
      setError(null);
    }
  }, [selectedTool]);

  const handleToolSelect = (tool: MCPTool) => {
    setSelectedTool(tool);
  };

  const handleArgChange = (argName: string, value: any) => {
    setArgs(prev => ({
      ...prev,
      [argName]: value,
    }));
  };

  const handleExecute = async () => {
    if (!selectedTool) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/mcp/${selectedTool.name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ args }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Tool execution failed');
      }

      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error executing tool:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedTool(null);
    setArgs({});
    setResult(null);
    setError(null);
  };

  return (
    <div className="tool-executor">
      <div className="executor-header">
        <h2>Tool Executor</h2>
        {selectedTool && (
          <button onClick={handleReset} className="reset-button">
            Clear Selection
          </button>
        )}
      </div>

      <div className="executor-content">
        {!selectedTool ? (
          <ToolsList onToolSelect={handleToolSelect} />
        ) : (
          <div className="selected-tool-panel">
            <div className="tool-config">
              <div className="tool-info">
                <h3>{selectedTool.name}</h3>
                <p>{selectedTool.description}</p>
              </div>

              {selectedTool.inputSchema.properties && 
               Object.keys(selectedTool.inputSchema.properties).length > 0 && (
                <div className="tool-arguments-form">
                  <h4>Arguments</h4>
                  
                  {selectedTool.inputSchema.required?.map(field => {
                    const prop = selectedTool.inputSchema.properties?.[field];
                    if (!prop) return null;

                    return (
                      <div key={field} className="form-field">
                        <label htmlFor={field}>
                          {field}
                          {selectedTool.inputSchema.required?.includes(field) && (
                            <span className="required-mark">*</span>
                          )}
                        </label>
                        
                        {prop.enum ? (
                          <select
                            id={field}
                            value={args[field] || ''}
                            onChange={(e) => handleArgChange(field, e.target.value)}
                            className="form-select"
                          >
                            {prop.enum.map(value => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={prop.type === 'number' ? 'number' : 'text'}
                            id={field}
                            value={args[field] || ''}
                            onChange={(e) => handleArgChange(
                              field, 
                              prop.type === 'number' ? Number(e.target.value) : e.target.value
                            )}
                            className="form-input"
                            placeholder={`Enter ${field}`}
                          />
                        )}
                        
                        {prop.description && (
                          <span className="field-description">{prop.description}</span>
                        )}
                      </div>
                    );
                  })}

                  <button
                    onClick={handleExecute}
                    disabled={loading}
                    className="execute-button"
                  >
                    {loading ? (
                      <>
                        <span className="spinner"></span>
                        Executing...
                      </>
                    ) : (
                      `Execute ${selectedTool.name}`
                    )}
                  </button>
                </div>
              )}

              {!selectedTool.inputSchema.properties || 
               Object.keys(selectedTool.inputSchema.properties).length === 0 ? (
                <div className="no-args-notice">
                  <p>This tool doesn't require any arguments.</p>
                  <button
                    onClick={handleExecute}
                    disabled={loading}
                    className="execute-button"
                  >
                    {loading ? (
                      <>
                        <span className="spinner"></span>
                        Executing...
                      </>
                    ) : (
                      `Execute ${selectedTool.name}`
                    )}
                  </button>
                </div>
              ) : null}
            </div>

            <ToolOutput
              result={result}
              loading={loading}
              error={error}
              toolName={selectedTool.name}
            />
          </div>
        )}
      </div>
    </div>
  );
}
