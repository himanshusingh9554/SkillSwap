// Centralized API client for FastAPI backend
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
export const API_HOST = IS_LOCAL ? 'http://localhost:3000' : 'https://skillswap-cih6.onrender.com';
export const API_BASE = `${API_HOST}/api/v1`;

export function getAuthHeaders(extraHeaders = {}) {
  const token = localStorage.getItem('accessToken');
  const headers = { ...extraHeaders };
  if (token && token !== 'null' && token !== 'undefined') {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const headers = getAuthHeaders(options.headers || {});
  
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers,
    credentials: 'include',
  };

  const res = await fetch(url, config);
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const errorMsg = data?.detail || data?.message || res.statusText || 'An error occurred';
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  get: (url) => request(url, { method: 'GET' }),
  post: (url, body) => request(url, { method: 'POST', body: JSON.stringify(body) }),
  patch: (url, body) => request(url, { method: 'PATCH', body: JSON.stringify(body) }),
  put: (url, body) => request(url, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (url) => request(url, { method: 'DELETE' }),
  upload: (url, formData) => request(url, { method: 'PATCH', body: formData }),
};
