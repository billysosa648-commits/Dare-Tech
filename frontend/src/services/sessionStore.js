// Mantiene el token de la sesión React solo en memoria del navegador.
let accessToken = null;

// Lee el token actual sin persistirlo entre recargas.
export function getSessionToken() { return accessToken; }

// Guarda el token en memoria durante la sesión activa.
export function setSessionToken(token) { accessToken = token || null; }

// Borra el token al cerrar sesión o terminar la sesión.
export function clearSessionToken() { accessToken = null; }
