'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Filter, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface MemoryNode {
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

export default function MemoriesPage() {
  const [nodes, setNodes] = useState<MemoryNode[]>([]);
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMemories() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch('/api/memories');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch memories');
        }

        setNodes(data.nodes || []);
      } catch (err) {
        console.error('Error fetching memories:', err);
        setError(err instanceof Error ? err.message : 'Failed to load memories');
      } finally {
        setIsLoading(false);
      }
    }

    fetchMemories();
  }, []);

  const filtered = nodes.filter(n => {
    const matchSearch = n.name.toLowerCase().includes(search.toLowerCase()) ||
                       n.observations.some(o => o.toLowerCase().includes(search.toLowerCase()));
    const matchSector = !sector || n.entityType === sector;
    return matchSearch && matchSector;
  });

  const sectors = Array.from(new Set(nodes.map(n => n.entityType))).sort();

  const getSectorColor = (sectorType: string) => {
    const colors: Record<string, string> = {
      'Episodic': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'Semantic': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'Procedural': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'Emotional': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      'Reflective': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    };
    return colors[sectorType] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Home
        </Link>
        <h1 className="text-3xl font-bold mb-2">All Memories</h1>
        <p className="text-muted-foreground">
          Browse and search through all stored memories
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 border rounded-lg bg-card">
          <div className="text-2xl font-bold">{nodes.length}</div>
          <div className="text-sm text-muted-foreground">Total Memories</div>
        </div>
        <div className="p-4 border rounded-lg bg-card">
          <div className="text-2xl font-bold">{filtered.length}</div>
          <div className="text-sm text-muted-foreground">Showing</div>
        </div>
        <div className="p-4 border rounded-lg bg-card">
          <div className="text-2xl font-bold">{sectors.length}</div>
          <div className="text-sm text-muted-foreground">Sectors</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search memories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-background"
          >
            <option value="">All Sectors</option>
            {sectors.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Loading memories...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Memories Grid */}
      {!isLoading && !error && (
        <>
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {search || sector ? 'No memories match your filters.' : 'No memories found.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((node) => (
                <Link
                  key={node.name}
                  href={`/?entity=${encodeURIComponent(node.name)}`}
                  className="block p-4 border rounded-lg bg-card hover:bg-accent transition-colors group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-1">
                      {node.name}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${getSectorColor(node.entityType)}`}>
                      {node.entityType}
                    </span>
                  </div>

                  {node.observations.length > 0 && (
                    <div className="space-y-1">
                      {node.observations.slice(0, 2).map((obs, i) => (
                        <p key={i} className="text-sm text-muted-foreground line-clamp-1">
                          {obs}
                        </p>
                      ))}
                      {node.observations.length > 2 && (
                        <p className="text-xs text-muted-foreground">
                          +{node.observations.length - 2} more
                        </p>
                      )}
                    </div>
                  )}

                  {node.relations.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground">
                        {node.relations.length} relation{node.relations.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}

                  {node.updated && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground">
                        Updated: {new Date(node.updated).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
