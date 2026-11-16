// Expone el estado temporal de sesión al árbol de componentes React.
import { useContext } from 'react';
import { SessionContext } from '../providers/SessionProvider.jsx';

// Permite leer, iniciar y cerrar una sesión guardada solo en memoria.
export default function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession requiere SessionProvider.');
  return session;
}
