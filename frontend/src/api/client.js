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
 * Elimina un ticket permanentemente.
 * @param {string} ticketId
 */
export const deleteSupportTicket = (ticketId) =>
  apiFetch(`/api/support-tickets/${ticketId}`, {
    method: 'DELETE',
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

// ─── Support Config: Categorías ───────────────────────────────────────────────

/**
 * Retorna las categorías disponibles (dinámicas desde la BD).
 */
export const fetchTicketCategories = () =>
  apiFetch('/api/support-tickets/categories');

export const createTicketCategory = (body) =>
  apiFetch('/api/support-tickets/categories', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const updateTicketCategory = (categoryId, body) =>
  apiFetch(`/api/support-tickets/categories/${categoryId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const deleteTicketCategory = (categoryId) =>
  apiFetch(`/api/support-tickets/categories/${categoryId}`, {
    method: 'DELETE',
  });

// ─── Support Config: Resolutores ──────────────────────────────────────────────

/**
 * Retorna los responders disponibles, planos y agrupados por equipo.
 */
export const fetchSupportResponders = () =>
  apiFetch('/api/support-tickets/responders');

// Alias por si algún componente antiguo sigue usando fetchResponders en vez de fetchSupportResponders
export const fetchResponders = fetchSupportResponders;

export const createResponder = (body) =>
  apiFetch('/api/support-tickets/responders', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const updateResponder = (responderId, body) =>
  apiFetch(`/api/support-tickets/responders/${responderId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const deleteResponder = (responderId) =>
  apiFetch(`/api/support-tickets/responders/${responderId}`, {
    method: 'DELETE',
  });

// ─── Otros endpoints existentes ───────────────────────────────────────────────

export const fetchPatientHealth = (clinicId) =>
  apiFetch(`/api/clinics/${clinicId}/patient-health`);

export const fetchSyncStatus = () =>
  apiFetch('/api/sync-status');