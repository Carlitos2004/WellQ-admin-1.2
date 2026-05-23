export const API_BASE = 'http://localhost:8000';

export const apiFetch = async (path, options = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} — ${path}`);
    if (import.meta.env.DEV) console.warn('[apiFetch]', err.message);
    throw err;
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};
export const fetchSupportTickets = (params = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
  ).toString();
  return apiFetch(`/api/support-tickets${qs ? `?${qs}` : ''}`);
};

export const fetchSupportTicket = (ticketId) =>
  apiFetch(`/api/support-tickets/${ticketId}`);

export const fetchPatientHealth = (clinicId) =>
  apiFetch(`/api/clinics/${clinicId}/patient-health`);

export const fetchSyncStatus = () =>
  apiFetch('/api/sync-status');