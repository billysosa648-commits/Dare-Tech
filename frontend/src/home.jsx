// Monta las interacciones React de diagnóstico y chatbot en la portada existente.
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { apiFetch } from './services/api.js';
import './styles/react-scaffold.css';

// Carga Turnstile de forma explícita y entrega el token al formulario.
function useTurnstile(siteKey) {
  const [token, setToken] = useState(''), [ready, setReady] = useState(false), mount = useRef(null), widget = useRef(null);
  useEffect(() => {
    if (!siteKey) return;
    let active = true;
    const render = () => { if (!active || !window.turnstile || !mount.current || widget.current) return; widget.current = window.turnstile.render(mount.current, { sitekey: siteKey, callback: setToken, 'expired-callback': () => setToken(''), 'error-callback': () => setToken('') }); setReady(true); };
    if (window.turnstile) render();
    else { const script = document.createElement('script'); script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; script.async = true; script.defer = true; script.onload = render; document.head.append(script); }
    return () => { active = false; if (widget.current && window.turnstile) window.turnstile.remove(widget.current); };
  }, [siteKey]);
  return { token, mount, ready };
}

// Envía solicitudes de diagnóstico con los campos y protecciones del servidor.
function DiagnosticForm() {
  const [brands, setBrands] = useState([]), [brand, setBrand] = useState(''), [customBrand, setCustomBrand] = useState(''), [model, setModel] = useState(''), [customModel, setCustomModel] = useState(''), [issue, setIssue] = useState(''), [name, setName] = useState(''), [contact, setContact] = useState('');
  const [siteKey, setSiteKey] = useState(''), [started] = useState(Date.now()), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [ticket, setTicket] = useState('');
  const { token, mount } = useTurnstile(siteKey);
  useEffect(() => { let live = true; Promise.all([apiFetch('/brands'), apiFetch('/public-config')]).then(([catalog, config]) => { if (live) { setBrands(catalog); setSiteKey(config.turnstileSiteKey || ''); } }).catch(() => live && setMessage('No se pudo cargar el formulario. Intenta más tarde.')); return () => { live = false; }; }, []);
  const current = brands.find(item => item.name === brand);
  // Valida requisitos sencillos y procesa el ticket nuevo sin exponer HTML.
  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage(''); setTicket('');
    try {
      const result = await apiFetch('/diagnostics', { method: 'POST', body: JSON.stringify({ brand: brand === 'Otra' ? customBrand : brand, model: model === 'Otro' ? customModel : model, issue, customerName: name, customerContact: contact, website: event.currentTarget.elements.website.value, formStartedAt: started, turnstileToken: token }) });
      setTicket(result.ticketNumber); setMessage('Reporte recibido. Guarda el número de ticket para consultar el seguimiento.');
      setIssue(''); setName(''); setContact(''); setModel('');
      if (window.turnstile && window.turnstile.reset) window.turnstile.reset();
    } catch (error) { setMessage(error.message); if (window.turnstile?.reset) window.turnstile.reset(); }
    finally { setBusy(false); }
  }
  return <form className="diagnostic-terminal__content home-diagnostic" onSubmit={submit}>
    <div className="diagnostic-intro"><h2 className="diagnostic-intro__title">BIENVENIDO A DARE-TECH</h2><p className="diagnostic-intro__description">SOMOS ECUATORIANOS APASIONADOS POR LA TECNOLOGÍA Y LA REPARACIÓN. DESCRIBE TU PROBLEMA PARA UNA ASESORÍA TÉCNICA.</p></div>
    <label className="home-field">Marca<select required value={brand} onChange={e => { setBrand(e.target.value); setModel(''); }}><option value="">Selecciona la marca</option>{brands.map(item => <option key={item._id} value={item.name}>{item.name}</option>)}<option value="Otra">Otra</option></select></label>
    {brand === 'Otra' && <label className="home-field">Especifica la marca<input required value={customBrand} onChange={e => setCustomBrand(e.target.value)} maxLength="80" /></label>}
    <label className="home-field">Modelo<select value={model} onChange={e => setModel(e.target.value)} disabled={!brand}><option value="">Selecciona el modelo (opcional)</option>{(current?.models || []).map(item => <option key={item} value={item}>{item}</option>)}<option value="Otro">Otro / no aparece</option></select></label>
    {model === 'Otro' && <label className="home-field">Especifica el modelo<input required value={customModel} onChange={e => setCustomModel(e.target.value)} maxLength="100" /></label>}
    <label className="home-field">Describe la falla<textarea required rows="4" maxLength="1500" value={issue} onChange={e => setIssue(e.target.value)} placeholder="Ej.: no enciende, pantalla rota…" /></label>
    <div className="home-contact"><label className="home-field">Nombre<input required autoComplete="name" maxLength="120" value={name} onChange={e => setName(e.target.value)} /></label><label className="home-field">Teléfono o correo<input required maxLength="120" value={contact} onChange={e => setContact(e.target.value)} /></label></div>
    <label className="home-honeypot" aria-hidden="true">Sitio web<input name="website" tabIndex="-1" autoComplete="off" /></label>
    {siteKey && <div className="home-turnstile" ref={mount} aria-label="Verificación de seguridad" />}
    <button className="btn-neon btn-neon--lg" disabled={busy || (Boolean(siteKey) && !token)}>{busy ? 'Enviando…' : '[ ENVIAR REPORTE ]'}</button>
    {message && <p className="home-result" role="status">{message} {ticket && <a href={`seguimiento.html?ticket=${encodeURIComponent(ticket)}`}>{ticket}</a>}</p>}
  </form>;
}

// Presenta un chat de preguntas frecuentes con texto seguro y control por teclado.
function Chatbot() {
  const [open, setOpen] = useState(false), [messages, setMessages] = useState([]), [text, setText] = useState(''), [busy, setBusy] = useState(false), end = useRef(null), field = useRef(null);
  useEffect(() => { if (open) field.current?.focus(); else setMessages([]); }, [open]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [messages]);
  // Envía texto plano al servicio FAQ y muestra sugerencias seleccionables.
  async function send(value = text) {
    const question = value.trim(); if (!question || busy) return;
    setMessages(list => [...list, { role: 'user', text: question }]); setText(''); setBusy(true);
    try { const answer = await apiFetch('/chatbot', { method: 'POST', body: JSON.stringify({ message: question }) }); setMessages(list => [...list, { role: 'assistant', text: answer.answer, suggestions: answer.suggestions || [] }]); }
    catch (error) { setMessages(list => [...list, { role: 'assistant', text: error.message }]); }
    finally { setBusy(false); field.current?.focus(); }
  }
  // Permite cerrar el panel del chat con Escape.
  useEffect(() => { const key = event => event.key === 'Escape' && open && setOpen(false); window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [open]);
  return <aside className="help-chat" aria-label="Asistente Dare-Tech">{open && <section className="help-chat__panel" aria-labelledby="chat-title"><header><h2 id="chat-title">Asistente técnico</h2><button aria-label="Cerrar chat" onClick={() => setOpen(false)}>×</button></header><p className="help-chat__notice">Respuestas informativas. El precio y tiempo de reparación requieren diagnóstico.</p><div className="help-chat__messages" aria-live="polite" aria-relevant="additions text">{!messages.length && <p>Hola. Pregúntame sobre servicios, garantías o seguimiento de tu ticket.</p>}{messages.map((item, index) => <div key={index} className={`help-chat__message help-chat__message--${item.role}`}><p>{item.text}</p>{item.suggestions?.map(choice => <button key={choice} onClick={() => send(choice)}>{choice}</button>)}</div>)}<span ref={end} /></div><form onSubmit={event => { event.preventDefault(); send(); }}><label className="visually-hidden" htmlFor="chat-message">Escribe tu pregunta</label><input id="chat-message" ref={field} value={text} onChange={e => setText(e.target.value)} maxLength="500" placeholder="Escribe tu pregunta…" /><button disabled={busy || !text.trim()}>Enviar</button></form></section>}<button className="help-chat__toggle" aria-expanded={open} aria-controls="chat-title" onClick={() => setOpen(!open)}>{open ? 'Cerrar asistente' : '¿Necesitas ayuda?'}</button></aside>;
}

// Añade al escaparate los servicios administrables y su estimación opcional.
function ManagedServices() {
  const [services, setServices] = useState([]);
  useEffect(() => { let live = true; apiFetch('/services').then(items => live && setServices(items)).catch(() => {}); return () => { live = false; }; }, []);
  return services.length ? <div className="service-list managed-service-list" aria-label="Servicios adicionales">{services.map((service, index) => <article className={`service-card${index % 2 ? ' service-card--green' : ''}`} key={service._id}><div className={`service-card__icon ${index % 2 ? 'service-card__icon--green' : 'service-card__icon--cyan'}`} aria-hidden="true">{index % 2 ? '⚙' : '⌁'}</div><p className="admin-kicker">{service.category}</p><h3 className="service-card__title">{service.name}</h3><p>{service.description}</p>{service.estimatedTime && <p className="service-card__features">Tiempo estimado: {service.estimatedTime}</p>}</article>)}</div> : null;
}

// Inicia los módulos independientes de diagnóstico, servicios y chatbot.
const diagnosticRoot = document.getElementById('diagnostic-app');
if (diagnosticRoot) createRoot(diagnosticRoot).render(<DiagnosticForm />);
const servicesRoot = document.getElementById('managed-service-app');
if (servicesRoot) createRoot(servicesRoot).render(<ManagedServices />);
const chatRoot = document.getElementById('chatbot-root');
if (chatRoot) createRoot(chatRoot).render(<Chatbot />);
