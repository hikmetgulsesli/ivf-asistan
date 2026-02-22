import type { Article, FAQ, Video, DashboardStats, TopQuestion, SentimentData, Conversation } from '../types';

const API_BASE = '/api/admin';

function getToken(): string {
  return localStorage.getItem('adminToken') || '';
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    localStorage.removeItem('adminToken');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Request failed' } }));
    throw new Error(error.error?.message || 'Request failed');
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// Auth
export async function login(username: string, password: string): Promise<{ token: string }> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Login failed' } }));
    throw new Error(error.error?.message || 'Login failed');
  }
  
  const data = await response.json();
  if (data.data?.token) {
    localStorage.setItem('adminToken', data.data.token);
  }
  return data.data;
}

export async function logout(): Promise<void> {
  localStorage.removeItem('adminToken');
}

// Dashboard
export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await request<{ data: DashboardStats }>(`${API_BASE}/dashboard`);
  return response.data;
}

export async function getTopQuestions(limit = 10): Promise<TopQuestion[]> {
  const response = await request<{ data: TopQuestion[] }>(`${API_BASE}/dashboard/top-questions?limit=${limit}`);
  return response.data;
}

export async function getSentimentDistribution(): Promise<{ data: SentimentData[]; meta: { total: number } }> {
  return request(`${API_BASE}/dashboard/sentiment`);
}

export async function getRecentConversations(limit = 20, offset = 0): Promise<{ data: Conversation[]; meta: any }> {
  return request(`${API_BASE}/dashboard/conversations?limit=${limit}&offset=${offset}`);
}

// Articles
export async function getArticles(params: { search?: string; category?: string; status?: string; limit?: number; offset?: number } = {}): Promise<{ data: Article[]; meta: any }> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.category) query.set('category', params.category);
  if (params.status) query.set('status', params.status);
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));
  
  return request(`${API_BASE}/articles?${query}`);
}

export async function getArticle(id: number): Promise<Article> {
  const response = await request<{ data: Article }>(`${API_BASE}/articles/${id}`);
  return response.data;
}

export async function createArticle(data: { title: string; content: string; category?: string; status?: string }): Promise<Article> {
  return request(`${API_BASE}/articles`, {
    method: 'POST',
    body: JSON.stringify(data),
  }).then(r => (r as { data: Article }).data);
}

export async function updateArticle(id: number, data: Partial<Article>): Promise<Article> {
  return request(`${API_BASE}/articles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }).then(r => (r as { data: Article }).data);
}

export async function deleteArticle(id: number): Promise<void> {
  await request(`${API_BASE}/articles/${id}`, { method: 'DELETE' });
}

// FAQs
export async function getFaqs(): Promise<{ data: FAQ[] }> {
  return request(`${API_BASE}/faqs`);
}

export async function getFaq(id: number): Promise<FAQ> {
  const response = await request<{ data: FAQ }>(`${API_BASE}/faqs/${id}`);
  return response.data;
}

export async function createFaq(data: { question: string; answer: string; category?: string }): Promise<FAQ> {
  return request(`${API_BASE}/faqs`, {
    method: 'POST',
    body: JSON.stringify(data),
  }).then(r => (r as { data: FAQ }).data);
}

export async function updateFaq(id: number, data: Partial<FAQ>): Promise<FAQ> {
  return request(`${API_BASE}/faqs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }).then(r => (r as { data: FAQ }).data);
}

export async function deleteFaq(id: number): Promise<void> {
  await request(`${API_BASE}/faqs/${id}`, { method: 'DELETE' });
}

export async function reorderFaqs(itemIds: number[]): Promise<FAQ[]> {
  const response = await request<{ data: FAQ[] }>(`${API_BASE}/faqs/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ items: itemIds }),
  });
  return response.data;
}

// Videos
export async function getVideos(params: { analysis_status?: string; limit?: number; offset?: number } = {}): Promise<{ data: Video[]; meta: any }> {
  const query = new URLSearchParams();
  if (params.analysis_status) query.set('analysis_status', params.analysis_status);
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));
  
  return request(`${API_BASE}/videos?${query}`);
}

export async function getVideo(id: number): Promise<Video> {
  const response = await request<{ data: Video }>(`${API_BASE}/videos/${id}`);
  return response.data;
}

export async function getVideoAnalysis(id: number): Promise<Video> {
  const response = await request<{ data: Video }>(`${API_BASE}/videos/${id}/analyze`);
  return response.data;
}

export async function createVideo(data: { title: string; url: string; category?: string }): Promise<Video> {
  return request(`${API_BASE}/videos`, {
    method: 'POST',
    body: JSON.stringify(data),
  }).then(r => (r as { data: Video }).data);
}

export async function updateVideo(id: number, data: Partial<Video>): Promise<Video> {
  return request(`${API_BASE}/videos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }).then(r => (r as { data: Video }).data);
}

export async function deleteVideo(id: number): Promise<void> {
  await request(`${API_BASE}/videos/${id}`, { method: 'DELETE' });
}

// Settings
export async function getSettings(): Promise<Record<string, string>> {
  const response = await request<{ data: Record<string, string> }>(`${API_BASE}/settings`);
  return response.data;
}

export async function updateSettings(settings: Record<string, string>): Promise<Record<string, string>> {
  const response = await request<{ data: Record<string, string> }>(`${API_BASE}/settings`, {
    method: 'PUT',
    body: JSON.stringify({ settings }),
  });
  return response.data;
}

// Cache
export async function clearCache(pattern?: string): Promise<{ deleted: number; pattern: string }> {
  const query = pattern ? `?pattern=${encodeURIComponent(pattern)}` : '';
  const response = await request<{ data: { deleted: number; pattern: string } }>(`${API_BASE}/cache${query}`, {
    method: 'DELETE',
  });
  return response.data;
}
