// Renderiza y envía un solo formulario de diagnóstico con el estilo terminal original.
import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../services/api.js';
import useTurnstile from '../hooks/useTurnstile.js';

// Presenta el formulario React y bloquea reenvíos mientras una solicitud está activa.
export default function DiagnosticForm() {
  const [brands, setBrands] = useState([]);
  const [brand, setBrand] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [model, setModel] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [issue, setIssue] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [siteKey, setSiteKey] = useState('');
  const [startedAt, setStartedAt] = useState(Date.now());
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const sendingRef = useRef(false);
  const { token, mountRef, error: turnstileError, reset } = useTurnstile(siteKey);

  // Carga el catálogo y la clave pública de Turnstile al montar la portada.
  useEffect(() => {
    let active = true;
    Promise.allSettled([apiFetch('/brands'), apiFetch('/public-config')])
      .then(([brandsResult, configResult]) => {
        if (!active) return;
        if (brandsResult.status === 'fulfilled') {
          setBrands(brandsResult.value);
        } else {
          setMessage(brandsResult.reason.message || 'No se pudieron cargar las marcas.');
        }
        if (configResult.status === 'fulfilled') setSiteKey(configResult.value.turnstileSiteKey || '');
      })
      .finally(() => { if (active) setLoadingCatalog(false); });
    return () => { active = false; };
  }, []);

  const selectedBrand = brands.find(item => item.name === brand);
  const modelOptions = selectedBrand?.models || [];

  // Envía un único POST y limpia el formulario después del éxito.
  async function submit(event) {
    event.preventDefault();
    if (sendingRef.current || busy) return;
    sendingRef.current = true;
    setBusy(true);
    setMessage('');
    setTicketNumber('');
    const form = event.currentTarget;
    const website = form.elements.namedItem('website')?.value || '';
    const normalizedBrand = brand === 'Otra' ? customBrand.trim() : brand;
    if (!normalizedBrand) {
      setMessage('Selecciona una marca o escribe la marca del dispositivo.');
      sendingRef.current = false;
      setBusy(false);
      return;
    }
    const payload = {
      brand: normalizedBrand,
      model: model === 'Otro' ? customModel.trim() : model,
      issue: issue.trim(),
      customerName: customerName.trim(),
      customerContact: customerContact.trim(),
      website,
      formStartedAt: startedAt,
      turnstileToken: token
    };

    try {
      const result = await apiFetch('/diagnostics', { method: 'POST', body: JSON.stringify(payload) });
      setTicketNumber(result.ticketNumber || '');
      setMessage('Reporte recibido correctamente. Guarda este número para consultar el seguimiento.');
      setBrand('');
      setCustomBrand('');
      setModel('');
      setCustomModel('');
      setIssue('');
      setCustomerName('');
      setCustomerContact('');
      setStartedAt(Date.now());
      reset();
    } catch (error) {
      setMessage(error.message || 'No se pudo enviar el reporte. Intenta nuevamente.');
      reset();
    } finally {
      sendingRef.current = false;
      setBusy(false);
    }
  }

  // Cambia la marca elegida y restablece el modelo dependiente.
  function chooseBrand(value) {
    setBrand(value);
    setModel('');
    setCustomModel('');
    setCustomBrand('');
  }

  return (
    <div className="diagnostic-terminal">
      <div className="diagnostic-terminal__toolbar">
        <div className="terminal-window__controls">
          <span className="terminal-window__dot terminal-window__dot--red" />
          <span className="terminal-window__dot terminal-window__dot--yellow" />
          <span className="terminal-window__dot terminal-window__dot--green" />
          <span className="diagnostic-terminal__filename">Diagnóstico Dare-Tech</span>
        </div>
        <span className="diagnostic-terminal__status">● ONLINE</span>
      </div>
      <form className="diagnostic-terminal__content home-diagnostic" onSubmit={submit} aria-labelledby="react-diagnostic-title">
      <div className="diagnostic-intro">
        <h2 id="react-diagnostic-title" className="diagnostic-intro__title">BIENVENIDO A DARE-TECH</h2>
        <p className="diagnostic-intro__description">SOMOS ECUATORIANOS APASIONADOS POR LA TECNOLOGÍA Y LA REPARACIÓN. DESCRIBE TU PROBLEMA PARA UNA ASESORÍA TÉCNICA.</p>
      </div>

      <fieldset className="diagnostic-step">
        <legend className="step-label"><span className="accent-cyan">PASO 1:</span> Selecciona la marca de tu dispositivo</legend>
        <p className="form-status" role="status" aria-live="polite">{loadingCatalog ? 'Cargando marcas…' : brands.length ? '' : 'No hay marcas disponibles. Puedes elegir Otra.'}</p>
        <div className="diagnostic-options" role="group" aria-label="Marcas disponibles">
          {brands.map(item => <button key={item._id} type="button" className={`term-btn${brand === item.name ? ' is-selected' : ''}`} aria-pressed={brand === item.name} onClick={() => chooseBrand(item.name)}>{item.name}</button>)}
          <button type="button" className={`term-btn${brand === 'Otra' ? ' is-selected' : ''}`} aria-pressed={brand === 'Otra'} onClick={() => chooseBrand('Otra')}>Otra</button>
        </div>
        {brand === 'Otra' && <label className="diagnostic-custom-input step-label">Escribe la marca
          <input className="terminal-input terminal-input--full" required maxLength="80" autoComplete="organization" value={customBrand} onChange={event => setCustomBrand(event.target.value)} />
        </label>}
      </fieldset>

      <fieldset className="diagnostic-step" disabled={!brand || brand === 'Otra'}>
        <legend className="step-label"><span className="accent-cyan">PASO 2:</span> Selecciona o escribe el modelo</legend>
        <div className="diagnostic-options" role="group" aria-label="Modelos disponibles">
          {modelOptions.map(option => <button key={option} type="button" className={`term-btn${model === option ? ' is-selected' : ''}`} aria-pressed={model === option} onClick={() => { setModel(option); setCustomModel(''); }}>{option}</button>)}
          <button type="button" className={`term-btn${model === 'Otro' ? ' is-selected' : ''}`} aria-pressed={model === 'Otro'} onClick={() => setModel('Otro')}>Otro / no aparece</button>
        </div>
        {model === 'Otro' && <label className="diagnostic-custom-input step-label">Especifica el modelo
          <input className="terminal-input terminal-input--full" required maxLength="100" value={customModel} onChange={event => setCustomModel(event.target.value)} />
        </label>}
      </fieldset>

      <div className="diagnostic-step">
        <label className="step-label" htmlFor="react-issue"><span className="accent-cyan">PASO 3:</span> Descripción de la falla</label>
        <textarea id="react-issue" className="terminal-input terminal-input--emphasis terminal-input--full terminal-input--multiline" required rows="4" maxLength="1500" value={issue} onChange={event => setIssue(event.target.value)} placeholder="Describe el problema de tu equipo…" />
      </div>

      <fieldset className="diagnostic-contact-step">
        <legend className="step-label"><span className="accent-cyan">PASO 4:</span> Datos de contacto</legend>
        <div className="contact-fields">
          <label className="visually-hidden" htmlFor="react-customer-name">Tu nombre</label>
          <input id="react-customer-name" className="terminal-input" required autoComplete="name" maxLength="120" placeholder="Tu nombre" value={customerName} onChange={event => setCustomerName(event.target.value)} />
          <label className="visually-hidden" htmlFor="react-customer-contact">Teléfono o correo electrónico</label>
          <input id="react-customer-contact" className="terminal-input" required maxLength="120" placeholder="Teléfono o correo" value={customerContact} onChange={event => setCustomerContact(event.target.value)} />
        </div>
      </fieldset>

      <label className="diagnostic-honeypot" aria-hidden="true">Sitio web
        <input name="website" tabIndex="-1" autoComplete="off" />
      </label>
      {siteKey && <div className="diagnostic-turnstile" ref={mountRef} aria-label="Verificación de seguridad" />}
      {turnstileError && <p className="report-result__message" role="alert">{turnstileError}</p>}
      <div className="diagnostic-submit">
        <button type="submit" className="btn-neon btn-neon--lg" disabled={busy || loadingCatalog || (Boolean(siteKey) && !token)}>{busy ? '[ ENVIANDO REPORTE… ]' : '[ ENVIAR REPORTE ]'}</button>
      </div>
      {(message || ticketNumber) && <div className="report-result" data-state={ticketNumber ? 'success' : 'error'} role="status" aria-live="polite" aria-atomic="true">
        <p className="report-result__message">{message}</p>
        {ticketNumber && <p className="report-result__ticket">Ticket: <a href={`seguimiento.html?ticket=${encodeURIComponent(ticketNumber)}`}>{ticketNumber}</a></p>}
      </div>}
      </form>
    </div>
  );
}
