import { useState, useEffect } from 'react';
import { Database, Trash2, RefreshCw } from 'lucide-react';
import { getDashboardStats, clearCache } from '../services/api';

export function CachePage() {
  const [stats, setStats] = useState<{ totalEntries: number; totalHits: number; hitRate: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pattern, setPattern] = useState('');
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await getDashboardStats();
      setStats(data.cache);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cache stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleClear = async () => {
    const confirmMessage = pattern
      ? `Are you sure you want to clear cache entries matching "${pattern}"?`
      : 'Are you sure you want to clear ALL cache entries?';
    
    if (!confirm(confirmMessage)) return;

    setClearing(true);
    setCleared(false);
    try {
      await clearCache(pattern || undefined);
      setPattern('');
      loadStats();
      setCleared(true);
      setTimeout(() => setCleared(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear cache');
    } finally {
      setClearing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-heading)' }}>
          Cache Management
        </h1>
        <p className="text-[var(--text-muted)] mt-1">View and manage response cache</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 mb-6">
          {error}
        </div>
      )}

      {cleared && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-600 mb-6">
          Cache cleared successfully!
        </div>
      )}

      {/* Cache Stats */}
      <div className="bg-white p-6 rounded-xl border border-[var(--border)] shadow-[var(--shadow-sm)] mb-8">
        <div className="flex items-center gap-3 mb-6">
          <Database className="w-5 h-5 text-[var(--text-muted)]" />
          <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
            Cache Statistics
          </h2>
          <button
            onClick={loadStats}
            className="ml-auto p-2 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-blue-50 rounded-lg transition-colors duration-150 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="p-4 bg-[var(--surface)] rounded-lg">
            <p className="text-sm text-[var(--text-muted)]">Total Entries</p>
            <p className="text-3xl font-bold mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
              {stats?.totalEntries ?? 0}
            </p>
          </div>
          <div className="p-4 bg-[var(--surface)] rounded-lg">
            <p className="text-sm text-[var(--text-muted)]">Total Hits</p>
            <p className="text-3xl font-bold mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
              {stats?.totalHits ?? 0}
            </p>
          </div>
          <div className="p-4 bg-[var(--surface)] rounded-lg">
            <p className="text-sm text-[var(--text-muted)]">Hit Rate</p>
            <p className="text-3xl font-bold mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
              {stats?.hitRate ?? 0}%
            </p>
          </div>
        </div>

        {/* Hit rate bar */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[var(--text-muted)]">Cache Performance</span>
            <span className="font-medium text-[var(--text)]">{stats?.hitRate ?? 0}% hit rate</span>
          </div>
          <div className="h-4 bg-[var(--surface)] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] transition-all duration-500"
              style={{ width: `${stats?.hitRate ?? 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Clear Cache */}
      <div className="bg-white p-6 rounded-xl border border-[var(--border)] shadow-[var(--shadow-sm)]">
        <div className="flex items-center gap-3 mb-6">
          <Trash2 className="w-5 h-5 text-[var(--error)]" />
          <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
            Clear Cache
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">
              Optional: Clear by pattern (leave empty to clear all)
            </label>
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="e.g., %treatment%"
              className="w-full px-4 py-3 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Use % as wildcard. SQL ILIKE pattern matching is used.
            </p>
          </div>

          <button
            onClick={handleClear}
            disabled={clearing}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--error)] text-white rounded-lg hover:bg-red-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-5 h-5" />
            {clearing ? 'Clearing...' : 'Clear Cache'}
          </button>
        </div>
      </div>
    </div>
  );
}
