export const API_BASE = 'http://localhost:8000';

export const apiFetch = async (path) => {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} — ${path}`);
    if (import.meta.env.DEV) console.warn('[apiFetch]', err.message);
    throw err;
  }
  return res.json();
};