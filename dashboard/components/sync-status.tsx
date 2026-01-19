'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Check, X, Clock } from 'lucide-react';

interface SyncStatus {
  enabled: boolean;
  lastSync?: string;
  nextSync?: string;
  interval?: number;
}

interface SyncResult {
  success: boolean;
  neo4j_to_obsidian: {
    fetched: number;
    created: number;
    updated: number;
    errors: string[];
  };
  obsidian_to_neo4j: {
    changed_files: number;
    updated_memories: number;
    errors: string[];
  };
  duration_ms: number;
}

export function SyncStatus() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    fetchSyncStatus();
    const interval = setInterval(fetchSyncStatus, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (status?.nextSync) {
      const updateCountdown = () => {
        const now = new Date();
        const next = new Date(status.nextSync!);
        const diff = next.getTime() - now.getTime();

        if (diff > 0) {
          const minutes = Math.floor(diff / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          setCountdown(`${minutes}m ${seconds}s`);
        } else {
          setCountdown('Soon');
        }
      };

      updateCountdown();
      const countdownInterval = setInterval(updateCountdown, 1000);
      return () => clearInterval(countdownInterval);
    }
  }, [status]);

  async function fetchSyncStatus() {
    try {
      const response = await fetch('/api/sync/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    }
  }

  async function handleSyncNow() {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: 'both' })
      });

      const data = await response.json();
      setSyncResult(data);

      // Refresh status after sync
      setTimeout(fetchSyncStatus, 1000);
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncResult({
        success: false,
        neo4j_to_obsidian: { fetched: 0, created: 0, updated: 0, errors: [String(error)] },
        obsidian_to_neo4j: { changed_files: 0, updated_memories: 0, errors: [] },
        duration_ms: 0
      });
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
      {/* Status Indicator */}
      <div className="flex items-center gap-2">
        {status?.enabled ? (
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-gray-400" />
        )}
        <span className="text-sm font-medium">
          {status?.enabled ? 'Sync enabled' : 'Sync disabled'}
        </span>
      </div>

      {/* Countdown */}
      {status?.enabled && countdown && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Next: {countdown}</span>
        </div>
      )}

      {/* Sync Result */}
      {syncResult && (
        <div className="flex items-center gap-1 text-sm">
          {syncResult.success ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <X className="h-4 w-4 text-red-500" />
          )}
          <span className="text-xs text-muted-foreground">
            {syncResult.success
              ? `Synced: ${syncResult.neo4j_to_obsidian.created} created, ${syncResult.obsidian_to_neo4j.updated_memories} updated`
              : 'Sync failed'
            }
          </span>
        </div>
      )}

      {/* Sync Now Button */}
      <Button
        size="sm"
        variant="outline"
        onClick={handleSyncNow}
        disabled={isSyncing}
        className="ml-auto"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
        {isSyncing ? 'Syncing...' : 'Sync Now'}
      </Button>
    </div>
  );
}
