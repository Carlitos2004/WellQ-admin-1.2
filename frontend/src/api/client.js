export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiFetch = async (path, options = {}) => {
  const headers = {
    ...(options.body != null ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers ?? {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  const text = await res.text();
  if (!res.ok) {
    let detail = '';
    try {
      const payload = text ? JSON.parse(text) : null;
      detail = typeof payload?.detail === 'string' ? payload.detail : '';
    } catch {
      detail = text;
    }
    const err = new Error(detail || `HTTP ${res.status} — ${path}`);
    if (import.meta.env.DEV) console.warn('[apiFetch]', err.message);
    throw err;
  }
  return text ? JSON.parse(text) : null;
};

// ─── Support Tickets ──────────────────────────────────────────────────────────

export const fetchSupportTickets = (params = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
  ).toString();
  return apiFetch(`/api/support-tickets${qs ? `?${qs}` : ''}`);
};

export const fetchSupportTicket = (ticketId) =>
  apiFetch(`/api/support-tickets/${ticketId}`);

/**
 * Actualiza el ciclo de vida de un ticket.
 * @param {string} ticketId
 * @param {{ status?: string, responder_id?: string, responder_name?: string, solution?: string }} body
 */
export const patchSupportTicket = (ticketId, body) =>
  apiFetch(`/api/support-tickets/${ticketId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

/**
 * Crea un ticket nuevo desde el backoffice.
 * @param {{ title: string, description: string, category: string, clinic_id?: string, reporter_name?: string, reporter_email?: string }} body
 */
export const createSupportTicket = (body) =>
  apiFetch('/api/support-tickets', {
    method: 'POST',
    body: JSON.stringify(body),
  });

/**
 * Retorna las categorías disponibles (dinámicas desde la BD).
 * Úsalo para poblar los chips de filtro y el formulario de creación.
 */
export const fetchTicketCategories = () =>
  apiFetch('/api/support-tickets/categories');

/**
 * Retorna los responders disponibles, planos y agrupados por equipo.
 * El drawer los usa para el selector de reasignación.
 */
export const fetchResponders = () =>
  apiFetch('/api/support-tickets/responders');

// ─── Otros endpoints existentes ───────────────────────────────────────────────

export const fetchPatientHealth = (clinicId) =>
  apiFetch(`/api/clinics/${clinicId}/patient-health`);

export const fetchSyncStatus = () =>
  apiFetch('/api/sync-status');
