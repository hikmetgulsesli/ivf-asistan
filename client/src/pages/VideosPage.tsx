import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, X, ExternalLink } from 'lucide-react';
import { getVideos, createVideo, updateVideo, deleteVideo, getVideoAnalysis } from '../services/api';
import type { Video } from '../types';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300',
  processing: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  done: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  error: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

export function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [viewingVideo, setViewingVideo] = useState<Video | null>(null);
  const [formData, setFormData] = useState({ title: '', url: '', category: '' });
  const [saving, setSaving] = useState(false);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const response = await getVideos({ analysis_status: analysisStatus });
      setVideos(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, [analysisStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingVideo) {
        await updateVideo(editingVideo.id, formData);
      } else {
        await createVideo(formData);
      }
      setShowModal(false);
      setEditingVideo(null);
      setFormData({ title: '', url: '', category: '' });
      loadVideos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save video');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this video?')) return;
    try {
      await deleteVideo(id);
      loadVideos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete video');
    }
  };

  const openEdit = (video: Video) => {
    setEditingVideo(video);
    setFormData({
      title: video.title,
      url: video.url,
      category: video.category,
    });
    setShowModal(true);
  };

  const viewAnalysis = async (video: Video) => {
    try {
      const analysis = await getVideoAnalysis(video.id);
      setViewingVideo(analysis);
      setShowAnalysisModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load video analysis');
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-heading)' }}>
            Videos
          </h1>
          <p className="text-[var(--text-muted)] mt-1">Manage educational videos</p>
        </div>
        <button
          onClick={() => {
            setEditingVideo(null);
            setFormData({ title: '', url: '', category: '' });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] transition-colors duration-200"
        >
          <Plus className="w-5 h-5" />
          Add Video
        </button>
      </div>

      {/* Filters */}
      <div className="bg-[var(--card)] p-4 rounded-xl border border-[var(--border)] shadow-[var(--shadow-sm)] mb-6">
        <div className="flex flex-wrap gap-4">
          <select
            value={analysisStatus}
            onChange={(e) => setAnalysisStatus(e.target.value)}
            className="px-4 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="done">Done</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 mb-6">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-[var(--shadow-sm)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[var(--surface)] border-b border-[var(--border)]">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--text)]">Title</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--text)]">URL</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--text)]">Category</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--text)]">Analysis Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--text)]">Added</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--text)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {videos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-muted)]">
                    No videos found
                  </td>
                </tr>
              ) : (
                videos.map((video) => (
                  <tr key={video.id} className="border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors duration-150">
                    <td className="px-6 py-4 font-medium text-[var(--text)]">{video.title}</td>
                    <td className="px-6 py-4">
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[var(--primary)] hover:underline cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span className="truncate max-w-[200px]">{video.url}</span>
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300 capitalize">
                        {video.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => viewAnalysis(video)}
                        className={`px-3 py-1 text-xs font-medium rounded-full capitalize cursor-pointer hover:opacity-80 ${STATUS_COLORS[video.analysis_status]}`}
                      >
                        {video.analysis_status}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                      {new Date(video.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => viewAnalysis(video)}
                          className="p-2 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors duration-150 cursor-pointer"
                          title="View Analysis"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(video)}
                          className="p-2 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors duration-150 cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(video.id)}
                          className="p-2 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-150 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card)] rounded-2xl w-full max-w-xl">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
              <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
                {editingVideo ? 'Edit Video' : 'New Video'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-[var(--surface)] rounded-lg transition-colors duration-150 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Video URL</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-4 py-3 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  placeholder="https://..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="">Select category</option>
                  <option value="general">General</option>
                  <option value="treatment">Treatment</option>
                  <option value="procedure">Procedure</option>
                  <option value="education">Education</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 border border-[var(--border)] rounded-lg hover:bg-[var(--surface)] transition-colors duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] transition-colors duration-200 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingVideo ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Analysis Modal */}
      {showAnalysisModal && viewingVideo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
              <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
                Video Analysis
              </h2>
              <button
                onClick={() => { setShowAnalysisModal(false); setViewingVideo(null); }}
                className="p-2 hover:bg-[var(--surface)] rounded-lg transition-colors duration-150 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-[var(--text-muted)] mb-2">Title</h3>
                <p className="text-[var(--text)]">{viewingVideo.title}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-[var(--text-muted)] mb-2">Status</h3>
                <span className={`px-3 py-1 text-xs font-medium rounded-full capitalize ${STATUS_COLORS[viewingVideo.analysis_status]}`}>
                  {viewingVideo.analysis_status}
                </span>
              </div>
              {viewingVideo.summary && (
                <div>
                  <h3 className="text-sm font-medium text-[var(--text-muted)] mb-2">Summary</h3>
                  <div className="p-4 bg-[var(--surface)] rounded-lg">
                    <p className="text-[var(--text)] whitespace-pre-wrap">{viewingVideo.summary}</p>
                  </div>
                </div>
              )}
              {viewingVideo.timestamps && viewingVideo.timestamps.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-[var(--text-muted)] mb-2">Timestamps</h3>
                  <div className="space-y-2">
                    {viewingVideo.timestamps.map((ts, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-[var(--surface)] rounded-lg">
                        <span className="text-sm font-mono text-[var(--primary)]">{ts.time}</span>
                        <span className="text-sm text-[var(--text)]">{ts.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {viewingVideo.error_message && (
                <div>
                  <h3 className="text-sm font-medium text-[var(--text-muted)] mb-2">Error</h3>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
                    {viewingVideo.error_message}
                  </div>
                </div>
              )}
              {!viewingVideo.summary && !viewingVideo.error_message && viewingVideo.analysis_status === 'done' && (
                <div className="text-center py-8 text-[var(--text-muted)]">
                  No analysis data available yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
