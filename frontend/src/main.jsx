// Inicia la aplicación React de prueba en admin-react.html.
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../css/tailwind.css';
import '../css/stylesheet.css';
import './styles/react-scaffold.css';
import AdminScaffold from './pages/AdminScaffold.jsx';
import SessionProvider from './providers/SessionProvider.jsx';

// Monta la pantalla React en el nodo raíz de su documento.
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SessionProvider><AdminScaffold /></SessionProvider>
  </React.StrictMode>
);
