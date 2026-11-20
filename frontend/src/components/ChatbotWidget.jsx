// Presenta el asistente de preguntas frecuentes como un widget flotante accesible.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '../services/api.js';

// Ofrece accesos rápidos con preguntas frecuentes seguras y conocidas.
const quickQuestions = ['¿Qué servicios ofrecen?', '¿Cómo consulto mi ticket?', '¿Qué garantía tienen?'];

// Administra mensajes, foco y envío de consultas en una conversación en memoria.
export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const launcherRef = useRef(null);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Evita abrir el teclado móvil automáticamente al mostrar el chat.
  useEffect(() => {
    if (open && !window.matchMedia('(pointer: coarse)').matches) inputRef.current?.focus();
  }, [open]);

  // Mantiene a la vista la respuesta más reciente sin borrar el historial.
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    messagesEndRef.current?.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [messages, busy]);

  // Cierra el cuadro con Escape y retira el listener al cerrarlo.
  useEffect(() => {
    if (!open) return undefined;
    function closeOnEscape(event) {
      if (event.key === 'Escape') closeChat();
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  // Cierra el diálogo y devuelve el foco al botón flotante.
  function closeChat() {
    setOpen(false);
    requestAnimationFrame(() => launcherRef.current?.focus());
  }

  // Envía texto plano de hasta 300 caracteres y conserva la respuesta.
  async function send(value = draft) {
    const question = value.trim().slice(0, 300);
    if (!question || busy) return;
    setMessages(current => [...current, { role: 'user', text: question }]);
    setDraft('');
    setBusy(true);
    try {
      const response = await apiFetch('/chatbot', { method: 'POST', body: JSON.stringify({ message: question }) });
      setMessages(current => [...current, { role: 'assistant', text: response.answer, suggestions: response.suggestions || [] }]);
    } catch (error) {
      setMessages(current => [...current, { role: 'assistant', text: error.message || 'No se pudo enviar la pregunta.' }]);
    } finally {
      setBusy(false);
      if (!window.matchMedia('(pointer: coarse)').matches) inputRef.current?.focus();
    }
  }

  // Renderiza el botón y la conversación en un portal directo al body.
  return createPortal(
    <div className="chatbot-widget" aria-label="Asistente Dare-Tech">
      <section className={`chatbot-dialog${open ? ' is-open' : ''}`} role="dialog" aria-label="Chat con el asistente de Dare-Tech" aria-hidden={!open} inert={!open}>
        <header className="chatbot-dialog__header">
          <div><p className="chatbot-dialog__eyebrow">DARE-TECH / AYUDA</p><h2>Asistente técnico</h2></div>
          <button className="chatbot-dialog__close" type="button" aria-label="Cerrar chat" onClick={closeChat}>×</button>
        </header>
        <p className="chatbot-dialog__notice">Respuestas informativas. El precio y tiempo de reparación requieren diagnóstico.</p>
        <div className="chatbot-dialog__messages" aria-live="polite" aria-relevant="additions text">
          {!messages.length && <div className="chatbot-dialog__suggestions" aria-label="Preguntas sugeridas">
            <p>¿En qué puedo ayudarte?</p>
            {quickQuestions.map(question => <button key={question} type="button" onClick={() => send(question)}>{question}</button>)}
          </div>}
          {messages.map((item, index) => <article className={`chatbot-message chatbot-message--${item.role}`} key={`${item.role}-${index}`}>
            <p>{item.text}</p>
            {item.suggestions?.map(question => <button key={question} type="button" onClick={() => send(question)}>{question}</button>)}
          </article>)}
          {busy && <p className="chatbot-dialog__typing" role="status">Escribiendo…</p>}
          <span ref={messagesEndRef} />
        </div>
        <form className="chatbot-dialog__composer" onSubmit={event => { event.preventDefault(); send(); }}>
          <label className="visually-hidden" htmlFor="chatbot-message">Escribe tu pregunta</label>
          <input id="chatbot-message" ref={inputRef} value={draft} onChange={event => setDraft(event.target.value.slice(0, 300))} maxLength="300" placeholder="Escribe tu pregunta…" />
          <button type="submit" disabled={busy || !draft.trim()}>Enviar</button>
        </form>
      </section>
      <button ref={launcherRef} className={`chatbot-launcher${open ? ' is-open' : ''}`} type="button" aria-label={open ? 'Cerrar asistente' : 'Abrir asistente Dare-Tech'} aria-expanded={open} onClick={() => open ? closeChat() : setOpen(true)}>
        {open ? <span aria-hidden="true">×</span> : <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M4 5.75A2.75 2.75 0 0 1 6.75 3h10.5A2.75 2.75 0 0 1 20 5.75v7.5A2.75 2.75 0 0 1 17.25 16H10l-5 4v-4.25A2.75 2.75 0 0 1 4 13.5z" /></svg>}
      </button>
    </div>,
    document.body
  );
}
