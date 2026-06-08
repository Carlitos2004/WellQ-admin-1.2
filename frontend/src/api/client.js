import Swal from 'sweetalert2';
import { getAccessToken, clearTokens } from '../services/auth';

// ─────────────────────────────────────────────────────────────────────────────
// client.js — HTTP client centralizado para WellQ Admin
//
// FUENTE ÚNICA DE VERDAD: el token siempre se lee a través de getAccessToken()
// definido en services/auth.js. Nunca acceder a localStorage directamente aquí.
// ─────────────────────────────────────────────────────────────────────────────

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── Core fetch ───────────────────────────────────────────────────────────────

export const apiFetch = async (path, options = {}) => {
  const token = getAccessToken(); // ✅ lee 'wellq_access_token' desde auth.js

  const headers = {
    ...(options.body != null ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

    if (res.status === 403) {
      Swal.fire({
        icon:                'error',
        title:               'Acceso denegado',
        text:                detail || "Se requiere el rol 'super_admin' para esta operación.",
        confirmButtonColor:  '#0D9488',
        confirmButtonText:   'Entendido',
      });
      const err = new Error(detail || 'Forbidden');
      err.status = 403;
      throw err;
    }

    if (res.status === 401) {
      Swal.fire({
        icon:               'warning',
        title:              'Sesión expirada',
        text:               'Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.',
        confirmButtonColor: '#0D9488',
      }).then(() => {
        clearTokens();                   // ✅ borra wellq_access_token, wellq_refresh_token y wellq_user
        window.location.href = '/login';
      });
      const err = new Error('Unauthorized');
      err.status = 401;
      throw err;
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
    body:   JSON.stringify(body),
  });

/**
 * Elimina un ticket permanentemente.
 * @param {string} ticketId
 */
export const deleteSupportTicket = (ticketId) =>
  apiFetch(`/api/support-tickets/${ticketId}`, { method: 'DELETE' });

/**
 * Crea un ticket nuevo desde el backoffice.
 * @param {{ title: string, description: string, category: string, clinic_id?: string, reporter_name?: string, reporter_email?: string }} body
 */
export const createSupportTicket = (body) =>
  apiFetch('/api/support-tickets', {
    method: 'POST',
    body:   JSON.stringify(body),
  });

// ─── Support Config: Categorías ───────────────────────────────────────────────

export const fetchTicketCategories = () =>
  apiFetch('/api/support-tickets/categories');

export const createTicketCategory = (body) =>
  apiFetch('/api/support-tickets/categories', {
    method: 'POST',
    body:   JSON.stringify(body),
  });

export const updateTicketCategory = (categoryId, body) =>
  apiFetch(`/api/support-tickets/categories/${categoryId}`, {
    method: 'PATCH',
    body:   JSON.stringify(body),
  });

export const deleteTicketCategory = (categoryId) =>
  apiFetch(`/api/support-tickets/categories/${categoryId}`, { method: 'DELETE' });

// ─── Support Config: Resolutores ──────────────────────────────────────────────

export const fetchSupportResponders = () =>
  apiFetch('/api/support-tickets/responders');

// Alias de compatibilidad
export const fetchResponders = fetchSupportResponders;

export const createResponder = (body) =>
  apiFetch('/api/support-tickets/responders', {
    method: 'POST',
    body:   JSON.stringify(body),
  });

export const updateResponder = (responderId, body) =>
  apiFetch(`/api/support-tickets/responders/${responderId}`, {
    method: 'PATCH',
    body:   JSON.stringify(body),
  });

export const deleteResponder = (responderId) =>
  apiFetch(`/api/support-tickets/responders/${responderId}`, { method: 'DELETE' });

// ─── Otros endpoints ──────────────────────────────────────────────────────────

export const fetchPatientHealth = (clinicId) =>
  apiFetch(`/api/clinics/${clinicId}/patient-health`);

export const fetchSyncStatus = () =>
  apiFetch('/api/sync-status');

// ─── Clínicas ─────────────────────────────────────────────────────────────────

export const fetchClinics = (params = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
  ).toString();
  return apiFetch(`/api/clinics${qs ? `?${qs}` : ''}`);
};

export const fetchClinic             = (clinicId)       => apiFetch(`/api/clinics/${clinicId}`);
export const createClinic            = (body)           => apiFetch('/api/clinics', { method: 'POST',  body: JSON.stringify(body) });
export const updateClinic            = (clinicId, body) => apiFetch(`/api/clinics/${clinicId}`, { method: 'PATCH', body: JSON.stringify(body) });
/** Requiere super_admin — 403 se muestra automáticamente con Swal */
export const deleteClinic            = (clinicId)       => apiFetch(`/api/clinics/${clinicId}`, { method: 'DELETE' });
export const fetchClinicContact      = (clinicId)       => apiFetch(`/api/clinics/${clinicId}/contact`);
export const fetchClinicSubscription = (clinicId)       => apiFetch(`/api/clinics/${clinicId}/subscription`);
export const fetchClinicUsage        = (clinicId)       => apiFetch(`/api/clinics/${clinicId}/usage`);
export const fetchClinicLicense      = (clinicId)       => apiFetch(`/api/clinics/${clinicId}/license`);
export const fetchClinicInvoices     = (clinicId)       => apiFetch(`/api/clinics/${clinicId}/invoices`);
/** Requiere super_admin — 403 se muestra automáticamente con Swal */
export const impersonateClinic       = (clinicId, body) => apiFetch(`/api/clinics/${clinicId}/impersonate`, { method: 'POST', body: JSON.stringify(body) });

// ─── Planes ───────────────────────────────────────────────────────────────────

export const fetchPlans = (params = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
  ).toString();
  return apiFetch(`/api/plans${qs ? `?${qs}` : ''}`);
};

export const fetchPlan     = (planId)       => apiFetch(`/api/plans/${planId}`);
/** Requiere super_admin — 403 se muestra automáticamente con Swal */
export const createPlan    = (body)         => apiFetch('/api/plans', { method: 'POST', body: JSON.stringify(body) });
export const updatePlan    = (planId, body) => apiFetch(`/api/plans/${planId}`, { method: 'PUT',  body: JSON.stringify(body) });
export const duplicatePlan = (planId, body) => apiFetch(`/api/plans/${planId}/duplicate`, { method: 'POST', body: JSON.stringify(body) });
export const archivePlan   = (planId)       => apiFetch(`/api/plans/${planId}/archive`, { method: 'POST' });
export const restorePlan   = (planId)       => apiFetch(`/api/plans/${planId}/restore`, { method: 'POST' });
/** Requiere super_admin — 403 se muestra automáticamente con Swal */
export const deletePlan    = (planId)       => apiFetch(`/api/plans/${planId}`, { method: 'DELETE' });