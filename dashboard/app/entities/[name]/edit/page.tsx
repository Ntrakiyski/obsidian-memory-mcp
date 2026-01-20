'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Editor } from '@/components/editor';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, X, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const MCP_SERVER_URL = process.env.NEXT_PUBLIC_MCP_URL || 'https://obsidian-mcp.trakiyski.work/mcp';

interface Entity {
  name: string;
  entityType: string;
  created?: string;
  updated?: string;
  observations: string[];
  relations: Array<{ target: string; type?: string }>;
  content: string;
}

interface MCPResponse {
  result?: {
    content: Array<{ text: string }>;
  };
  error?: {
    message: string;
  };
}

export default function EditEntityPage() {
  const params = useParams();
  const router = useRouter();
  // Remove .md extension from entity name if present
  const rawName = decodeURIComponent(params.name as string);
  const entityName = rawName.endsWith('.md') ? rawName.slice(0, -3) : rawName;

  const [entity, setEntity] = useState<Entity | null>(null);
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch entity data via MCP open_nodes tool
  useEffect(() => {
    async function fetchEntity() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(MCP_SERVER_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
              name: 'open_nodes',
              arguments: {
                names: [entityName],
              },
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`MCP server returned ${response.status}`);
        }

        const data: MCPResponse = await response.json();

        if (data.error) {
          throw new Error(data.error.message);
        }

        if (!data.result?.content?.[0]) {
          throw new Error('Invalid response format from MCP server');
        }

        const result = JSON.parse(data.result.content[0].text);

        if (!result.nodes || result.nodes.length === 0) {
          throw new Error(`Entity "${entityName}" not found`);
        }

        const node = result.nodes[0];
        setEntity(node);

        // Build markdown content from entity
        const markdown = buildMarkdownFromEntity(node);
        setContent(markdown);
      } catch (err) {
        console.error('Error fetching entity:', err);
        setError(err instanceof Error ? err.message : 'Failed to load entity');
      } finally {
        setIsLoading(false);
      }
    }

    fetchEntity();
  }, [entityName]);

  const buildMarkdownFromEntity = useCallback((node: Entity): string => {
    let md = `# ${node.name}\n\n`;
    md += `**Type:** ${node.entityType}\n\n`;
    md += `**Created:** ${node.created ? new Date(node.created).toLocaleString() : 'Unknown'}\n\n`;

    if (node.updated) {
      md += `**Updated:** ${new Date(node.updated).toLocaleString()}\n\n`;
    }

    if (node.observations.length > 0) {
      md += `## Observations\n\n`;
      node.observations.forEach((obs) => {
        md += `- ${obs}\n`;
      });
      md += `\n`;
    }

    if (node.relations.length > 0) {
      md += `## Relations\n\n`;
      node.relations.forEach((rel) => {
        const relText = rel.type ? `[[${rel.target}::${rel.type}]]` : `[[${rel.target}]]`;
        md += `- ${relText}\n`;
      });
    }

    return md;
  }, []);

  const parseObservationsFromMarkdown = useCallback((markdown: string): string[] => {
    // Extract observations from ## Observations section
    const obsMatch = markdown.match(/## Observations\n\n([\s\S]+?)(?=##|\Z)/);
    if (!obsMatch) return [];

    return obsMatch[1]
      .split('\n')
      .map((line) => line.replace(/^-\s*/, '').trim())
      .filter((line) => line.length > 0 && !line.startsWith('**')); // Filter out metadata lines
  }, []);

  const handleSave = async () => {
    if (!entity) return;

    setIsSaving(true);
    setError(null);

    try {
      const updatedObservations = parseObservationsFromMarkdown(content);

      const response = await fetch(MCP_SERVER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'add_observations',
            arguments: {
              observations: [
                {
                  entityName: entity.name,
                  contents: updatedObservations,
                },
              ],
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`MCP server returned ${response.status}`);
      }

      const data: MCPResponse = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      // Redirect back to home
      router.push('/');
    } catch (err) {
      console.error('Error saving:', err);
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading entity...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !entity) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center gap-2 bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error || 'Entity not found'}</span>
        </div>
        <Link
          href="/"
          className="inline-flex items-center mt-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Home
        </Link>
      </div>
    );
  }

  const originalMarkdown = buildMarkdownFromEntity(entity);
  const isDirty = content !== originalMarkdown;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button size="sm" variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Edit: {entity.name}</h1>
            <p className="text-xs text-muted-foreground">
              Type: {entity.entityType} • <span className="text-blue-600">Edit mode</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {error && (
            <span className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {error}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSaving}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
          >
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          content={content}
          onChange={setContent}
          fileName={`${entity.name}.md`}
          fileId={`edit-${entity.name}`}
          isDirty={isDirty}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
