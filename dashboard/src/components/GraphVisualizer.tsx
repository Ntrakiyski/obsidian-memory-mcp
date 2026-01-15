'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

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

interface GraphVisualizerProps {
  data: KnowledgeGraph | null;
  loading?: boolean;
  error?: string | null;
}

// Node interface for visualization
interface VisualNode {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  observations: string[];
}

// Edge interface for visualization
interface VisualEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}

export default function GraphVisualizer({ data, loading = false, error = null }: GraphVisualizerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<VisualNode[]>([]);
  const [edges, setEdges] = useState<VisualEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<VisualNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<VisualNode | null>(null);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [relationTypes, setRelationTypes] = useState<string[]>([]);
  const [showLegend, setShowLegend] = useState(true);
  const animationRef = useRef<number | null>(null);

  // Color palette for different entity types
  const getNodeColor = useCallback((type: string): string => {
    const colors: Record<string, string> = {
      'person': '#4A90D9',
      'organization': '#7B68EE',
      'location': '#20B2AA',
      'concept': '#FF6B6B',
      'event': '#FFD93D',
      'default': '#95A5A6',
    };
    return colors[type.toLowerCase()] || colors['default'];
  }, []);

  // Color palette for relation types
  const getEdgeColor = useCallback((type: string): string => {
    const colors: Record<string, string> = {
      'related': '#95A5A6',
      'knows': '#4A90D9',
      'works_at': '#7B68EE',
      'located_in': '#20B2AA',
      'created': '#FF6B6B',
      'participated_in': '#FFD93D',
      'default': '#BDC3C7',
    };
    return colors[type.toLowerCase()] || colors['default'];
  }, []);

  // Initialize graph data
  useEffect(() => {
    if (!data || data.entities.length === 0) {
      setNodes([]);
      setEdges([]);
      setEntityTypes([]);
      setRelationTypes([]);
      return;
    }

    // Extract unique entity and relation types
    const types = [...new Set(data.entities.map(e => e.entityType))];
    const relTypes = [...new Set(data.relations.map(r => r.relationType))];
    setEntityTypes(types);
    setRelationTypes(relTypes);

    // Create nodes with initial positions in a circle
    const newNodes: VisualNode[] = data.entities.map((entity, index) => {
      const angle = (index / data.entities.length) * 2 * Math.PI;
      const radius = Math.min(250, 50 + data.entities.length * 10);
      return {
        id: entity.name,
        label: entity.name,
        type: entity.entityType,
        x: 400 + Math.cos(angle) * radius,
        y: 300 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        observations: entity.observations,
      };
    });

    setNodes(newNodes);
    setSelectedNode(null);
  }, [data]);

  // Force-directed simulation
  useEffect(() => {
    if (nodes.length === 0 || !svgRef.current) return;

    const runSimulation = () => {
      setNodes(prevNodes => {
        const newNodes = prevNodes.map(node => ({ ...node }));
        
        // Repulsion between all nodes
        for (let i = 0; i < newNodes.length; i++) {
          for (let j = i + 1; j < newNodes.length; j++) {
            const dx = newNodes[j].x - newNodes[i].x;
            const dy = newNodes[j].y - newNodes[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = 5000 / (dist * dist);
            
            newNodes[i].vx -= (dx / dist) * force;
            newNodes[i].vy -= (dy / dist) * force;
            newNodes[j].vx += (dx / dist) * force;
            newNodes[j].vy += (dy / dist) * force;
          }
        }

        // Attraction along edges
        const edges = data?.relations || [];
        edges.forEach(edge => {
          const sourceNode = newNodes.find(n => n.id === edge.from);
          const targetNode = newNodes.find(n => n.id === edge.to);
          
          if (sourceNode && targetNode) {
            const dx = targetNode.x - sourceNode.x;
            const dy = targetNode.y - sourceNode.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = dist * 0.01;
            
            sourceNode.vx += (dx / dist) * force;
            sourceNode.vy += (dy / dist) * force;
            targetNode.vx -= (dx / dist) * force;
            targetNode.vy -= (dy / dist) * force;
          }
        });

        // Center gravity
        const centerX = 400;
        const centerY = 300;
        newNodes.forEach(node => {
          node.vx += (centerX - node.x) * 0.005;
          node.vy += (centerY - node.y) * 0.005;
        });

        // Update positions with damping
        return newNodes.map(node => ({
          ...node,
          x: node.x + node.vx * 0.9,
          y: node.y + node.vy * 0.9,
          vx: node.vx * 0.9,
          vy: node.vy * 0.9,
        }));
      });

      animationRef.current = requestAnimationFrame(runSimulation);
    };

    animationRef.current = requestAnimationFrame(runSimulation);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodes.length, data?.relations]);

  // Update edges positions based on nodes
  useEffect(() => {
    if (!data || nodes.length === 0) {
      setEdges([]);
      return;
    }

    const newEdges: VisualEdge[] = data.relations.map((relation, index) => {
      const sourceNode = nodes.find(n => n.id === relation.from);
      const targetNode = nodes.find(n => n.id === relation.to);

      return {
        id: `edge-${index}`,
        source: relation.from,
        target: relation.to,
        label: relation.relationType,
        sourceX: sourceNode?.x || 0,
        sourceY: sourceNode?.y || 0,
        targetX: targetNode?.x || 0,
        targetY: targetNode?.y || 0,
      };
    });

    setEdges(newEdges);
  }, [nodes, data]);

  if (loading) {
    return (
      <div className="graph-visualizer">
        <h3>Knowledge Graph</h3>
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading graph data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="graph-visualizer">
        <h3>Knowledge Graph</h3>
        <div className="error">
          <p>Failed to load graph</p>
          <p className="error-message">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || data.entities.length === 0) {
    return (
      <div className="graph-visualizer">
        <h3>Knowledge Graph</h3>
        <p className="no-data">No graph data available</p>
      </div>
    );
  }

  return (
    <div className="graph-visualizer">
      <div className="graph-header">
        <h3>Knowledge Graph</h3>
        <div className="graph-stats">
          <span>{data.entities.length} entities</span>
          <span>{data.relations.length} relations</span>
        </div>
        <button 
          className="legend-toggle"
          onClick={() => setShowLegend(!showLegend)}
        >
          {showLegend ? 'Hide' : 'Show'} Legend
        </button>
      </div>

      <div className="graph-container">
        <svg
          ref={svgRef}
          viewBox="0 0 800 600"
          className="graph-svg"
        >
          {/* Edges */}
          <g className="edges">
            {edges.map(edge => (
              <g key={edge.id}>
                <line
                  x1={edge.sourceX}
                  y1={edge.sourceY}
                  x2={edge.targetX}
                  y2={edge.targetY}
                  stroke={getEdgeColor(edge.label)}
                  strokeWidth="2"
                  className="edge-line"
                />
                {/* Edge label background */}
                <rect
                  x={(edge.sourceX + edge.targetX) / 2 - 20}
                  y={(edge.sourceY + edge.targetY) / 2 - 10}
                  width="40"
                  height="20"
                  fill="white"
                  opacity="0.8"
                  rx="4"
                />
                {/* Edge label */}
                <text
                  x={(edge.sourceX + edge.targetX) / 2}
                  y={(edge.sourceY + edge.targetY) / 2 + 4}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#666"
                >
                  {edge.label}
                </text>
              </g>
            ))}
          </g>

          {/* Nodes */}
          <g className="nodes">
            {nodes.map(node => (
              <g
                key={node.id}
                className={`node ${hoveredNode?.id === node.id ? 'hovered' : ''} ${selectedNode?.id === node.id ? 'selected' : ''}`}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => setSelectedNode(selectedNode?.id === node.id ? null : node)}
                style={{ cursor: 'pointer' }}
              >
                {/* Node circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={hoveredNode?.id === node.id || selectedNode?.id === node.id ? 25 : 20}
                  fill={getNodeColor(node.type)}
                  stroke="white"
                  strokeWidth="2"
                  className="node-circle"
                />
                {/* Node label */}
                <text
                  x={node.x}
                  y={node.y + 35}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="500"
                  fill="#333"
                >
                  {node.label}
                </text>
                {/* Node type indicator */}
                <text
                  x={node.x}
                  y={node.y + 5}
                  textAnchor="middle"
                  fontSize="10"
                  fill="white"
                  fontWeight="bold"
                >
                  {node.type.charAt(0).toUpperCase()}
                </text>
              </g>
            ))}
          </g>
        </svg>

        {/* Legend */}
        {showLegend && (
          <div className="graph-legend">
            <h4>Entity Types</h4>
            {entityTypes.map(type => (
              <div key={type} className="legend-item">
                <span 
                  className="legend-color" 
                  style={{ backgroundColor: getNodeColor(type) }}
                />
                <span className="legend-label">{type}</span>
              </div>
            ))}
            
            <h4>Relation Types</h4>
            {relationTypes.map(type => (
              <div key={type} className="legend-item">
                <span 
                  className="legend-color" 
                  style={{ backgroundColor: getEdgeColor(type) }}
                />
                <span className="legend-label">{type}</span>
              </div>
            ))}
          </div>
        )}

        {/* Node details panel */}
        {selectedNode && (
          <div className="node-details">
            <div className="details-header">
              <h4>{selectedNode.label}</h4>
              <span 
                className="entity-type-badge"
                style={{ backgroundColor: getNodeColor(selectedNode.type) }}
              >
                {selectedNode.type}
              </span>
            </div>
            
            {selectedNode.observations.length > 0 ? (
              <div className="observations">
                <h5>Observations</h5>
                <ul>
                  {selectedNode.observations.map((obs, index) => (
                    <li key={index}>{obs}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="no-observations">No observations</p>
            )}
            
            {/* Connected relations */}
            <div className="connected-relations">
              <h5>Connections</h5>
              {data?.relations
                .filter(r => r.from === selectedNode.id || r.to === selectedNode.id)
                .map((relation, index) => (
                  <div key={index} className="relation-entry">
                    {relation.from === selectedNode.id ? (
                      <>
                        <span>→ {relation.relationType} →</span>
                        <span className="connected-node">{relation.to}</span>
                      </>
                    ) : (
                      <>
                        <span className="connected-node">{relation.from}</span>
                        <span>← {relation.relationType} ←</span>
                      </>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Hover tooltip */}
      {hoveredNode && !selectedNode && (
        <div 
          className="node-tooltip"
          style={{
            left: Math.min(hoveredNode.x + 20, 700),
            top: hoveredNode.y - 40,
          }}
        >
          <strong>{hoveredNode.label}</strong>
          <span>{hoveredNode.type}</span>
          <span>{hoveredNode.observations.length} observations</span>
        </div>
      )}
    </div>
  );
}
