// Comparte el token temporal y las acciones de sesión entre componentes React.
import { createContext, useCallback, useMemo, useState } from 'react';
import { clearSessionToken, getSessionToken, setSessionToken } from '../services/sessionStore.js';

// Provee una sesión que solo vive en memoria mientras la página permanece abierta.
export const SessionContext = createContext(null);

// Mantiene y publica el estado de autenticación de la aplicación.
export default function SessionProvider({ children }) {
  const [token, updateToken] = useState(() => getSessionToken());
  const startSession = useCallback(value => { setSessionToken(value); updateToken(value); }, []);
  const endSession = useCallback(() => { clearSessionToken(); updateToken(null); }, []);
  const value = useMemo(() => ({ token, isAuthenticated: Boolean(token), startSession, endSession }), [token, startSession, endSession]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
