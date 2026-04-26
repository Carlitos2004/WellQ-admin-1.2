const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const STORAGE = {
  ACCESS:  "wellq_access_token",
  REFRESH: "wellq_refresh_token",
};

// ── Almacenamiento de tokens ──────────────────────────────────────────────────

export function getAccessToken() {
  return localStorage.getItem(STORAGE.ACCESS);
}

function saveTokens({ access_token, refresh_token }) {
  localStorage.setItem(STORAGE.ACCESS, access_token);
  if (refresh_token) localStorage.setItem(STORAGE.REFRESH, refresh_token);
}

function clearTokens() {
  localStorage.removeItem(STORAGE.ACCESS);
  localStorage.removeItem(STORAGE.REFRESH);
}

// ── Endpoints de auth ─────────────────────────────────────────────────────────

export async function login(email, password) {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Credenciales inválidas");
  }

  const { data } = await response.json();
  saveTokens(data);
  return data;
}

export async function logout() {
  const refresh_token = localStorage.getItem(STORAGE.REFRESH);

  try {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token }),
    });
  } finally {
    clearTokens();
  }
}

export async function refreshAccessToken() {
  const refresh_token = localStorage.getItem(STORAGE.REFRESH);
  if (!refresh_token) throw new Error("Sin refresh token");

  const response = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token }),
  });

  if (!response.ok) {
    clearTokens();
    throw new Error("Sesión expirada");
  }

  const { data } = await response.json();
  saveTokens(data);
  return data.access_token;
}

export async function getCurrentUser() {
  const token = getAccessToken();
  if (!token) throw new Error("No autenticado");

  const response = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    const retry = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${newToken}` },
    });
    if (!retry.ok) {
      clearTokens();
      throw new Error("Sesión inválida");
    }
    return retry.json();
  }

  if (!response.ok) throw new Error("Error al obtener perfil");
  return response.json();
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}
