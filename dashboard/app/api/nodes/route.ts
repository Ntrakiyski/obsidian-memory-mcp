import { NextResponse } from "next/server";

const MCP_SERVER_URL = process.env.MCP_URL || "https://obsidian-mcp.trakiyski.work/mcp";

// MCP response types
interface MCPNode {
  name: string;
  entityType: string;
  created?: string;
  updated?: string;
  observations: string[];
  relations: Array<{
    target: string;
    type?: string;
  }>;
  content: string;
}

interface MCPResponse {
  nodes: MCPNode[];
}

// Dashboard data types
interface TreeNode {
  name: string;
  type: "file" | "folder";
  id?: string;
  children?: TreeNode[];
  expanded?: boolean;
}

interface GraphNode {
  id: string;
  label: string;
  size: number;
  category: string;
}

interface GraphLink {
  source: string;
  target: string;
}

interface NodesResponse {
  nodes: TreeNode[];
  fileContents: Record<string, string>;
  graphData: {
    nodes: GraphNode[];
    links: GraphLink[];
  };
}

// Transform MCP data to dashboard format
function transformMCPData(mcpData: MCPResponse): NodesResponse {
  const nodes: TreeNode[] = [];
  const fileContents: Record<string, string> = {};
  const graphNodes: GraphNode[] = [];
  const graphLinks: GraphLink[] = [];

  // Group nodes by entity type for folder structure
  const groupedByType = mcpData.nodes.reduce((acc, node, index) => {
    const folderName = node.entityType || "Uncategorized";
    if (!acc[folderName]) {
      acc[folderName] = [];
    }
    acc[folderName].push({ ...node, index });
    return acc;
  }, {} as Record<string, Array<MCPNode & { index: number }>>);

  // Build folder structure and file contents
  Object.entries(groupedByType).forEach(([entityType, items]) => {
    const folderChildren: TreeNode[] = [];

    items.forEach((node) => {
      const fileId = `node-${node.index}`;

      // Add to folder children
      folderChildren.push({
        name: `${node.name}.md`,
        type: "file",
        id: fileId,
      });

      // Add file content
      fileContents[fileId] = node.content;

      // Add graph node
      const size = Math.max(3, Math.min(15, node.observations.length + 3));
      graphNodes.push({
        id: fileId,
        label: node.name,
        size,
        category: entityType.toLowerCase(),
      });

      // Add graph links from relations
      node.relations.forEach((rel) => {
        // Find target node index
        const targetIndex = mcpData.nodes.findIndex((n) => n.name === rel.target);
        if (targetIndex !== -1) {
          graphLinks.push({
            source: fileId,
            target: `node-${targetIndex}`,
          });
        }
      });
    });

    // Add folder with its children
    nodes.push({
      name: entityType,
      type: "folder",
      expanded: true,
      children: folderChildren,
    });
  });

  // Sort folders by name
  nodes.sort((a, b) => a.name.localeCompare(b.name));

  return {
    nodes,
    fileContents,
    graphData: {
      nodes: graphNodes,
      links: graphLinks,
    },
  };
}

export async function GET() {
  try {
    console.log("Fetching nodes from MCP server:", MCP_SERVER_URL);

    // Call get_all_nodes tool
    const response = await fetch(MCP_SERVER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "get_all_nodes",
          arguments: {},
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`MCP server returned ${response.status}`);
    }

    const data = await response.json();
    console.log("MCP response received:", JSON.stringify(data, null, 2));

    // Extract the actual content from the MCP response
    let mcpData: MCPResponse;
    if (data.result && data.result.content && data.result.content[0]) {
      const textContent = data.result.content[0].text;
      mcpData = JSON.parse(textContent);
    } else {
      throw new Error("Unexpected MCP response format");
    }

    // Transform to dashboard format
    const transformed = transformMCPData(mcpData);

    console.log(`Transformed ${transformed.nodes.length} folders, ${Object.keys(transformed.fileContents).length} files`);

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Error fetching nodes:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch nodes from MCP server",
        details: error instanceof Error ? error.message : String(error),
        nodes: [],
        fileContents: {},
        graphData: { nodes: [], links: [] },
      },
      { status: 500 }
    );
  }
}
