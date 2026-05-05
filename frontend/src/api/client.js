export const API_BASE = 'http://localhost:8000';

export const apiFetch = async (path) => {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};
