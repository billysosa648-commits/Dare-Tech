// Centraliza las solicitudes HTTP del frontend React hacia el backend.
import { getSessionToken } from './sessionStore.js';

// Define la URL de API desde Vite o usa el dominio desplegado.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://dare-tech.onrender.com/api').replace(/\/$/, '');

// Envía una solicitud con JSON y el JWT en memoria cuando existe.
export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body !== undefined && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const token = getSessionToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, { ...options, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || `La solicitud falló (${response.status}).`);
  }
  return response.status === 204 ? null : response.json();
}
