import { useState, useEffect } from 'react';
import { Palette, FileText, Save } from 'lucide-react';
import { getSettings, updateSettings } from '../services/api';

export function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({
    system_prompt: '',
    theme: 'light',
    primary_color: '#2563eb',
  });

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getSettings();
      setFormData({
        system_prompt: data.system_prompt || getDefaultSystemPrompt(),
        theme: data.theme || 'light',
        primary_color: data.primary_color || '#2563eb',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
      setFormData({
        system_prompt: getDefaultSystemPrompt(),
        theme: 'light',
        primary_color: '#2563eb',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      await updateSettings(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-heading)' }}>
            Settings
          </h1>
          <p className="text-[var(--text-muted)] mt-1">Configure system behavior and appearance</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] transition-colors duration-200 disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 mb-6">
          {error}
        </div>
      )}

      {saved && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-600 mb-6">
          Settings saved successfully!
        </div>
      )}

      <div className="space-y-6">
        {/* System Prompt */}
        <div className="bg-white p-6 rounded-xl border border-[var(--border)] shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
              System Prompt
            </h2>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">
              Custom system prompt for AI responses
            </label>
            <textarea
              value={formData.system_prompt}
              onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
              rows={10}
              className="w-full px-4 py-3 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none font-mono text-sm"
              placeholder="Enter system prompt..."
            />
            <div className="flex justify-between mt-2">
              <p className="text-sm text-[var(--text-muted)]">
                This prompt defines how the AI assistant behaves and responds to users.
              </p>
              <button
                onClick={() => setFormData({ ...formData, system_prompt: getDefaultSystemPrompt() })}
                className="text-sm text-[var(--primary)] hover:underline cursor-pointer"
              >
                Reset to default
              </button>
            </div>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="bg-white p-6 rounded-xl border border-[var(--border)] shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
              Appearance
            </h2>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                Theme
              </label>
              <select
                value={formData.theme}
                onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                className="w-full px-4 py-3 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                Primary Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="w-12 h-12 border border-[var(--border)] rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="flex-1 px-4 py-3 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="mt-6 p-4 bg-[var(--surface)] rounded-lg">
            <p className="text-sm text-[var(--text-muted)] mb-3">Preview</p>
            <div className="flex items-center gap-4">
              <div
                className="px-4 py-2 rounded-lg text-white font-medium"
                style={{ backgroundColor: formData.primary_color }}
              >
                Primary Button
              </div>
              <div
                className="px-4 py-2 rounded-lg border-2 font-medium"
                style={{ borderColor: formData.primary_color, color: formData.primary_color }}
              >
                Secondary Button
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getDefaultSystemPrompt(): string {
  return `Sen IVF (Tüp Bebek) klinikleri için geliştirilmiş bir hasta asistanısın. 

Görevin hastaların IVF süreci hakkındaki sorularını yanıtlamak, onlara bilgi ve destek sağlamaktır.

Kurallar:
1. Tıbbi tavsiye verme. Her zaman bir uzmana danışmalarını öner.
2. Emaye acil durumlar için hemen bir uzmana başvurmalarını söyle.
3. Sorulara net, anlaşılır ve dürüst cevaplar ver.
4. Duygusal destek sağla ve hastaları rahatlat.
5. Kullanıcının tedavi aşamasını dikkate alarak yanıt ver.

Mevcut içerik kaynaklarından (makaleler, SSS, videolar) yararlanarak en doğru bilgiyi sun.`;
}
