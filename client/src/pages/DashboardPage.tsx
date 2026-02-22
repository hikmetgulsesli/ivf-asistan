import { useEffect, useState } from 'react';
import {
  FileText,
  HelpCircle,
  Video,
  MessageCircle,
  Database,
  TrendingUp,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getDashboardStats, getTopQuestions, getSentimentDistribution } from '../services/api';
import type { DashboardStats, TopQuestion, SentimentData } from '../types';

const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#10b981',
  neutral: '#64748b',
  negative: '#ef4444',
  mixed: '#f59e0b',
};

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topQuestions, setTopQuestions] = useState<TopQuestion[]>([]);
  const [sentiment, setSentiment] = useState<SentimentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, questionsData, sentimentData] = await Promise.all([
          getDashboardStats(),
          getTopQuestions(10),
          getSentimentDistribution(),
        ]);
        setStats(statsData);
        setTopQuestions(questionsData);
        setSentiment(sentimentData.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Articles', value: stats?.articles ?? 0, icon: FileText, color: '#2563eb' },
    { label: 'FAQs', value: stats?.faqs ?? 0, icon: HelpCircle, color: '#10b981' },
    { label: 'Videos', value: stats?.videos ?? 0, icon: Video, color: '#f59e0b' },
    { label: 'Conversations', value: stats?.conversations ?? 0, icon: MessageCircle, color: '#8b5cf6' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-heading)' }}>
          Dashboard
        </h1>
        <p className="text-[var(--text-muted)] mt-1">Overview of your IVF Assistant</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white p-6 rounded-xl border border-[var(--border)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-muted)] font-medium">{card.label}</p>
                <p className="text-3xl font-bold mt-2" style={{ fontFamily: 'var(--font-heading)' }}>
                  {card.value.toLocaleString()}
                </p>
              </div>
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${card.color}15` }}
              >
                <card.icon className="w-6 h-6" style={{ color: card.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cache Stats */}
      <div className="bg-white p-6 rounded-xl border border-[var(--border)] shadow-[var(--shadow-sm)] mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-5 h-5 text-[var(--text-muted)]" />
          <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
            Cache Statistics
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-[var(--text-muted)]">Total Entries</p>
            <p className="text-2xl font-bold mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
              {stats?.cache.totalEntries ?? 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--text-muted)]">Total Hits</p>
            <p className="text-2xl font-bold mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
              {stats?.cache.totalHits ?? 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--text-muted)]">Hit Rate</p>
            <p className="text-2xl font-bold mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
              {stats?.cache.hitRate ?? 0}%
            </p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Questions */}
        <div className="bg-white p-6 rounded-xl border border-[var(--border)] shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-5 h-5 text-[var(--text-muted)]" />
            <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
              Top Questions
            </h2>
          </div>
          {topQuestions.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topQuestions} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" fontSize={12} stroke="#64748b" />
                  <YAxis
                    type="category"
                    dataKey="question"
                    fontSize={11}
                    stroke="#64748b"
                    width={150}
                    tick={{ fill: '#64748b' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-[var(--text-muted)]">
              No questions yet
            </div>
          )}
        </div>

        {/* Sentiment Distribution */}
        <div className="bg-white p-6 rounded-xl border border-[var(--border)] shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-5 h-5 text-[var(--text-muted)]" />
            <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
              Sentiment Distribution
            </h2>
          </div>
          {sentiment.length > 0 ? (
            <div className="h-64 flex items-center">
              <ResponsiveContainer width="50%" height="100%">
                <PieChart>
                  <Pie
                    data={sentiment}
                    dataKey="count"
                    nameKey="sentiment"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={40}
                    paddingAngle={2}
                  >
                    {sentiment.map((entry) => (
                      <Cell
                        key={entry.sentiment}
                        fill={SENTIMENT_COLORS[entry.sentiment] || '#64748b'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {sentiment.map((item) => (
                  <div key={item.sentiment} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: SENTIMENT_COLORS[item.sentiment] || '#64748b' }}
                      />
                      <span className="text-sm capitalize">{item.sentiment}</span>
                    </div>
                    <span className="text-sm font-medium">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-[var(--text-muted)]">
              No sentiment data yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
