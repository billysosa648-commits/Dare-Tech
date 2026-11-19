// Centraliza las solicitudes HTTP del frontend React hacia el backend.
import { getSessionToken } from './sessionStore.js';

// Define la URL de API desde Vite o usa el dominio desplegado.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:4000/api' : 'https://dare-tech.onrender.com/api')).replace(/\/$/, '');

// Envía una solicitud con JSON y el JWT en memoria cuando existe.
export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body !== undefined && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const token = getSessionToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (cause) {
    console.warn('No se pudo conectar con la API:', url, cause);
    const error = new Error('No se pudo conectar con el servidor. Intenta de nuevo en unos segundos.');
    error.status = 0;
    throw error;
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    // Conserva detalles de conflictos para que la interfaz ofrezca una recuperación explícita.
    const error = new Error(payload.message || `La solicitud falló (${response.status}).`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}
