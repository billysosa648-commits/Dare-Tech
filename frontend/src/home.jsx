// Coordina los componentes React de la portada y sus puntos de montaje.
import React from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import DiagnosticForm from './components/DiagnosticForm.jsx';
import ChatbotWidget from './components/ChatbotWidget.jsx';
import ManagedServices from './components/ManagedServices.jsx';
import './styles/home.css';
import './styles/chatbot.css';

// Mantiene cada pieza en su sección y monta el chatbot en el body mediante portal.
function HomeReactApp() {
  const diagnosticTarget = document.getElementById('diagnostic-app');
  const servicesTarget = document.getElementById('managed-service-app');
  return <>
    {diagnosticTarget && createPortal(<DiagnosticForm />, diagnosticTarget)}
    {servicesTarget && createPortal(<ManagedServices />, servicesTarget)}
    <ChatbotWidget />
  </>;
}

// Crea una sola raíz React para todas las interacciones de la portada.
const homeRoot = document.getElementById('home-react-root');
if (homeRoot) createRoot(homeRoot).render(<HomeReactApp />);
