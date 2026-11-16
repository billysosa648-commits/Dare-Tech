// Implementa acceso y operaciones administrativas en una sola vista React.
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../services/api.js';
import { setSessionToken } from '../services/sessionStore.js';
import useSession from '../hooks/useSession.js';
import AppHeader from '../components/AppHeader.jsx';

// Normaliza los errores de API para mostrar mensajes accionables.
function errorText(error) { return error?.message || 'Ocurrió un error. Intenta nuevamente.'; }

// Permite iniciar sesión y renovar la contraseña desde el panel.
function Login({ onLogin }) {
  const [username, setUsername] = useState(''), [password, setPassword] = useState(''), [newPassword, setNewPassword] = useState(''), [changeRequired, setChangeRequired] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const { endSession } = useSession();
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }); if (result.passwordChangeRequired) { setSessionToken(result.token); setChangeRequired(true); } else onLogin(result.token); }
    catch (failure) { setError(errorText(failure)); } finally { setBusy(false); }
  }
  async function updatePassword(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await apiFetch('/auth/password', { method: 'PUT', body: JSON.stringify({ password: newPassword }) }); endSession(); setChangeRequired(false); setPassword(''); setNewPassword(''); setError('Contraseña actualizada. Ingresa de nuevo.'); }
    catch (failure) { setError(errorText(failure)); } finally { setBusy(false); }
  }
  return <main id="main-content" className="admin-react"><AppHeader /><section className="admin-card admin-login" aria-labelledby="login-heading"><p className="admin-kicker">DARE-TECH / ADMIN</p><h1 id="login-heading">{changeRequired ? 'Actualiza tu contraseña' : 'Acceso al panel'}</h1>{changeRequired ? <form onSubmit={updatePassword}><p>Por seguridad, usa una contraseña nueva de al menos 12 caracteres.</p><label>Nueva contraseña<input type="password" autoComplete="new-password" required minLength="12" maxLength="72" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></label><button className="admin-button" disabled={busy}>Actualizar contraseña</button></form> : <form onSubmit={submit}><label>Usuario<input autoComplete="username" required maxLength="40" value={username} onChange={e => setUsername(e.target.value)} /></label><label>Contraseña<input type="password" autoComplete="current-password" required maxLength="72" value={password} onChange={e => setPassword(e.target.value)} /></label><button className="admin-button" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button></form>}{error && <p role="status" className="admin-error">{error}</p>}</section></main>;
}

// Carga datos autenticados y controla las acciones compartidas del panel.
function AdminPanel() {
  const { endSession } = useSession();
  const [section, setSection] = useState('diagnosticos'), [notice, setNotice] = useState(''), [error, setError] = useState('');
  const [records, setRecords] = useState([]), [selected, setSelected] = useState([]), [page, setPage] = useState(1), [totalPages, setTotalPages] = useState(1), [search, setSearch] = useState('');
  const [brands, setBrands] = useState([]), [services, setServices] = useState([]), [faqs, setFaqs] = useState([]), [invoices, setInvoices] = useState([]);
  const [dialog, setDialog] = useState(null), [busy, setBusy] = useState(false);
  const headings = useMemo(() => ({ diagnosticos: 'Diagnósticos', facturas: 'Facturas', servicios: 'Servicios', catalogo: 'Marcas y modelos', faqs: 'Preguntas frecuentes' }), []);

  // Obtiene la sección elegida y conserva su paginación en pantalla.
  async function load(targetPage = page) {
    setError(''); setSelected([]);
    try {
      if (section === 'diagnosticos') { const data = await apiFetch(`/diagnostics/received?page=${targetPage}&limit=2&search=${encodeURIComponent(search)}`); setRecords(data.items); setTotalPages(Math.max(1, data.pages)); }
      if (section === 'facturas') { const data = await apiFetch(`/invoices?page=${targetPage}&limit=4&search=${encodeURIComponent(search)}`); setInvoices(data.items); setTotalPages(Math.max(1, data.pages)); }
      if (section === 'catalogo') setBrands(await apiFetch('/brands'));
      if (section === 'servicios') setServices(await apiFetch('/services/admin'));
      if (section === 'faqs') setFaqs(await apiFetch('/faqs'));
    } catch (failure) { setError(errorText(failure)); }
  }
  useEffect(() => { load(); }, [section, page]);

  // Ejecuta cambios CRUD y vuelve a cargar la sección activa.
  async function mutate(path, method, payload) {
    setBusy(true); setError(''); setNotice('');
    try { await apiFetch(path, { method, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }) }); setNotice('Cambios guardados.'); setDialog(null); await load(); }
    catch (failure) {
      const related = failure.status === 409 && failure.payload?.invoices?.length
        ? ` Facturas asociadas: ${failure.payload.invoices.map(invoice => invoice.invoiceNumber).join(', ')}. Marca la opción de borrado explícito y vuelve a confirmar.` : '';
      setError(`${errorText(failure)}${related}`);
    }
    finally { setBusy(false); }
  }
  // Pide una confirmación escrita antes de borrar datos seleccionados.
  async function confirmDelete() {
    if (!dialog?.reference || dialog.input !== dialog.reference) return;
    if (dialog.kind === 'diagnosticos') await mutate('/diagnostics/bulk-delete', 'POST', { ids: selected, withInvoices: dialog.withInvoices });
    if (dialog.kind === 'facturas') await mutate('/invoices/bulk-delete', 'POST', { ids: selected });
    if (dialog.kind === 'faq') await mutate(`/faqs/${dialog.id}`, 'DELETE');
    if (dialog.kind === 'servicio') await mutate(`/services/${dialog.id}`, 'DELETE');
    if (dialog.kind === 'marca') await mutate(`/brands/${dialog.id}`, 'DELETE');
  }
  // Cambia el estado de un diagnóstico con una nota opcional de historial.
  async function setStatus(item, status) { await mutate(`/diagnostics/${item._id}/status`, 'PATCH', { status, note: 'Actualizado desde el panel' }); }
  const nav = [['diagnosticos', 'Diagnósticos'], ['facturas', 'Facturas'], ['servicios', 'Servicios'], ['catalogo', 'Marcas / modelos'], ['faqs', 'FAQs']];

  return <main id="main-content" className="admin-react"><AppHeader /><div className="admin-top"><p className="admin-kicker">DARE-TECH / OPERACIONES</p><button className="admin-quiet" onClick={async () => { await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {}); endSession(); }}>Cerrar sesión</button></div>
    <nav className="admin-tabs" aria-label="Secciones del panel">{nav.map(([id, title]) => <button key={id} aria-current={section === id ? 'page' : undefined} onClick={() => { setSection(id); setPage(1); }}>{title}</button>)}</nav>
    <section className="admin-workspace" aria-labelledby="admin-heading"><div className="admin-section-heading"><div><p className="admin-kicker">GESTIÓN</p><h1 id="admin-heading">{headings[section]}</h1></div>{['servicios', 'catalogo', 'faqs', 'facturas'].includes(section) && <button className="admin-button" onClick={() => setDialog({ type: section === 'catalogo' ? 'brand' : section === 'faqs' ? 'faq' : section === 'servicios' ? 'service' : 'invoice' })}>+ Nuevo</button>}</div>
    {notice && <p role="status" className="admin-success">{notice}</p>}{error && <p role="alert" className="admin-error">{error}</p>}
    {section === 'diagnosticos' && <><div className="admin-toolbar"><label>Buscar ticket o cliente<input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && (setPage(1), load(1))} /></label><button className="admin-quiet" onClick={() => { setPage(1); load(1); }}>Buscar</button><button className="admin-danger" disabled={!selected.length} onClick={() => setDialog({ type: 'delete', kind: 'diagnosticos', reference: selected.map(id => records.find(row => row._id === id)?.ticketNumber).filter(Boolean).join(', '), input: '', withInvoices: false })}>Eliminar seleccionados</button></div><Records rows={records} selected={selected} setSelected={setSelected} onStatus={setStatus} /></>}
    {section === 'facturas' && <><div className="admin-toolbar"><label>Buscar factura, ticket o cliente<input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && (setPage(1), load(1))} /></label><button className="admin-quiet" onClick={() => { setPage(1); load(1); }}>Buscar</button><button className="admin-danger" disabled={!selected.length} onClick={() => setDialog({ type: 'delete', kind: 'facturas', reference: selected.map(id => invoices.find(row => row._id === id)?.invoiceNumber).filter(Boolean).join(', '), input: '' })}>Eliminar seleccionadas</button></div><Invoices rows={invoices} selected={selected} setSelected={setSelected} onAction={async (invoice, action) => action === 'pagada' ? mutate(`/invoices/${invoice._id}/pay`, 'PATCH') : action === 'anular' ? mutate(`/invoices/${invoice._id}/annul`, 'PATCH') : setDialog({ type: 'invoice-edit', invoice })} /></>}
    {section === 'catalogo' && <div className="admin-card"><button className="admin-quiet" onClick={() => setDialog({ type: 'brand' })}>Agregar marca</button>{brands.map(brand => <article className="admin-row" key={brand._id}><div><strong>{brand.name}</strong><p>{(brand.models || []).join(', ') || 'Sin modelos registrados'}</p></div><button onClick={() => setDialog({ type: 'brand', brand })}>Editar</button><button className="admin-danger" onClick={() => setDialog({ type: 'delete', kind: 'marca', id: brand._id, reference: brand.name, input: '' })}>Eliminar</button></article>)}</div>}
    {section === 'servicios' && <div className="admin-card">{services.map(service => <article className="admin-row" key={service._id}><div><strong>{service.name}</strong><p>{service.category} · {service.active ? 'Activo' : 'Inactivo'}{service.estimatedTime ? ` · ${service.estimatedTime}` : ''}</p><p>{service.description}</p></div><button onClick={() => setDialog({ type: 'service', service })}>Editar</button><button className="admin-danger" onClick={() => setDialog({ type: 'delete', kind: 'servicio', id: service._id, reference: service.name, input: '' })}>Eliminar</button></article>)}</div>}
    {section === 'faqs' && <div className="admin-card">{faqs.map(faq => <article className="admin-row" key={faq._id}><div><strong>{faq.question}</strong><p>{faq.answer}</p><small>{faq.category} · {faq.active ? 'Activa' : 'Inactiva'}</small></div><button onClick={() => setDialog({ type: 'faq', faq })}>Editar</button><button className="admin-danger" onClick={() => setDialog({ type: 'delete', kind: 'faq', id: faq._id, reference: faq.question, input: '' })}>Eliminar</button></article>)}</div>}
    {['diagnosticos', 'facturas'].includes(section) && <div className="admin-pagination"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button><span>Página {page} de {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Siguiente</button></div>}
    </section>
    {dialog && <AdminDialog dialog={dialog} setDialog={setDialog} busy={busy} mutate={mutate} confirmDelete={confirmDelete} />}
  </main>;
}

// Renderiza diagnósticos con selección y control de estado accesible.
function Records({ rows, selected, setSelected, onStatus }) {
  return <div className="admin-list">{!rows.length && <p className="admin-empty">No hay diagnósticos en esta página.</p>}{rows.map(item => <article className="admin-record" key={item._id}><label className="admin-check"><input type="checkbox" checked={selected.includes(item._id)} onChange={e => setSelected(e.target.checked ? [...selected, item._id] : selected.filter(id => id !== item._id))} /><span>Seleccionar {item.ticketNumber}</span></label><div className="admin-record__main"><p className="admin-kicker">{item.ticketNumber} · {new Date(item.createdAt).toLocaleDateString('es-EC')}</p><h2>{item.brand} {item.model}</h2><p>{item.issue}</p><p>{item.customerName} · {item.customerContact}</p></div><label>Estado<select value={item.status} onChange={e => onStatus(item, e.target.value)}><option value="recibido">Recibido</option><option value="en_revision">En revisión</option><option value="reparado">Reparado</option><option value="entregado">Entregado</option></select></label><a href={`seguimiento.html?ticket=${encodeURIComponent(item.ticketNumber)}`}>Ver seguimiento</a></article>)}</div>;
}

// Presenta facturas y acciones permitidas por el estado contable.
function Invoices({ rows, selected, setSelected, onAction }) {
  return <div className="admin-list">{!rows.length && <p className="admin-empty">No se encontraron facturas.</p>}{rows.map(invoice => <article className="admin-record" key={invoice._id}><label className="admin-check"><input type="checkbox" checked={selected.includes(invoice._id)} onChange={e => setSelected(e.target.checked ? [...selected, invoice._id] : selected.filter(id => id !== invoice._id))} /><span>Seleccionar {invoice.invoiceNumber}</span></label><div className="admin-record__main"><p className="admin-kicker">{invoice.invoiceNumber} · {invoice.ticketNumber}</p><h2>{invoice.customer?.name || 'Cliente'}</h2><p>{invoice.items?.map(item => `${item.description} × ${item.quantity}`).join(' · ')}</p><strong>${Number(invoice.total).toFixed(2)} USD</strong></div><span className={`admin-status admin-status--${invoice.status}`}>{invoice.status}</span>{invoice.status === 'pendiente' && <><button onClick={() => onAction(invoice, 'pagada')}>Marcar pagada</button><button onClick={() => onAction(invoice, 'editar')}>Editar ítems</button><button className="admin-quiet" onClick={() => onAction(invoice, 'anular')}>Anular</button></>}</article>)}</div>;
}

// Centraliza formularios CRUD y confirmación de eliminación escrita.
function AdminDialog({ dialog, setDialog, busy, mutate, confirmDelete }) {
  const [form, setForm] = useState(() => dialog.type === 'brand' ? { name: dialog.brand?.name || '', models: dialog.brand?.models?.join('\n') || '' } : dialog.type === 'service' ? { name: dialog.service?.name || '', description: dialog.service?.description || '', category: dialog.service?.category || '', estimatedTime: dialog.service?.estimatedTime || '', active: dialog.service?.active ?? true } : dialog.type === 'faq' ? { question: dialog.faq?.question || '', answer: dialog.faq?.answer || '', category: dialog.faq?.category || 'general', keywords: dialog.faq?.keywords?.join(', ') || '', active: dialog.faq?.active ?? true } : dialog.type === 'invoice' ? { mode: 'new', ticketNumber: '', customerName: '', customerContact: '', brand: '', model: '', issue: '', description: '', price: '' } : { items: dialog.invoice?.items?.map(item => `${item.description}|${item.quantity}|${item.unitPrice}`).join('\n') || '', notes: dialog.invoice?.notes || '' });
  const [input, setInput] = useState(''), [withInvoices, setWithInvoices] = useState(false), [dialogError, setDialogError] = useState('');
  // Closes the dialog with Escape and restores keyboard-friendly native behavior.
  useEffect(() => { const onKey = event => event.key === 'Escape' && setDialog(null); window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [setDialog]);
  // Serializes each editor into the API shape expected by its endpoint.
  async function submit(event) {
    event.preventDefault();
    if (dialog.type === 'delete') { dialog.input = input; dialog.withInvoices = withInvoices; await confirmDelete(); return; }
    if (dialog.type === 'brand') return mutate(dialog.brand ? `/brands/${dialog.brand._id}` : '/brands', dialog.brand ? 'PUT' : 'POST', { name: form.name, models: form.models.split('\n').map(s => s.trim()).filter(Boolean) });
    if (dialog.type === 'service') return mutate(dialog.service ? `/services/${dialog.service._id}` : '/services', dialog.service ? 'PATCH' : 'POST', { ...form, order: dialog.service?.order || 0 });
    if (dialog.type === 'faq') return mutate(dialog.faq ? `/faqs/${dialog.faq._id}` : '/faqs', dialog.faq ? 'PATCH' : 'POST', { ...form, keywords: form.keywords.split(',').map(s => s.trim()).filter(Boolean), order: dialog.faq?.order || 0 });
    if (dialog.type === 'invoice') {
      if (form.mode === 'existing') {
        try { const ticket = await apiFetch(`/diagnostics/admin-ticket/${encodeURIComponent(form.ticketNumber.trim())}`); return mutate('/invoices', 'POST', { diagnosticId: ticket._id, items: [{ description: form.description, quantity: 1, unitPrice: Number(form.price) }] }); }
        catch (failure) { setDialogError(errorText(failure)); return; }
      }
      const ticket = { brand: form.brand, model: form.model, issue: form.issue, customerName: form.customerName, customerContact: form.customerContact };
      return mutate('/invoices', 'POST', { ticket, items: [{ description: form.description, quantity: 1, unitPrice: Number(form.price) }] });
    }
    const items = form.items.split('\n').filter(Boolean).map(line => { const [description, quantity, unitPrice] = line.split('|'); return { description, quantity: Number(quantity), unitPrice: Number(unitPrice) }; });
    return mutate(`/invoices/${dialog.invoice._id}`, 'PUT', { items, notes: form.notes });
  }
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const field = (key, label, options = {}) => <label key={key}>{label}{options.multiline ? <textarea required={options.required !== false} rows="4" value={form[key]} onChange={e => set(key, e.target.value)} /> : options.select ? <select value={form[key]} onChange={e => set(key, e.target.value)}><option value="general">General</option><option value="garantias">Garantías</option><option value="diagnostico">Diagnóstico</option><option value="reparacion">Reparación</option></select> : <input required={options.required !== false} type={options.type || 'text'} min={options.min} value={form[key]} onChange={e => set(key, e.target.value)} />}</label>;
  const title = dialog.type === 'delete' ? 'Confirmar eliminación' : dialog.type === 'brand' ? 'Marca y modelos' : dialog.type === 'service' ? 'Servicio' : dialog.type === 'faq' ? 'Pregunta frecuente' : dialog.type === 'invoice' ? 'Crear factura' : 'Editar factura pendiente';
  return <div className="admin-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && setDialog(null)}><section className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><button className="admin-dialog__close" aria-label="Cerrar" onClick={() => setDialog(null)}>×</button><h2 id="dialog-title">{title}</h2>
    {dialogError && <p role="alert" className="admin-error">{dialogError}</p>}
    {dialog.type === 'delete' ? <form onSubmit={submit}><p>Escribe exactamente la referencia {dialog.kind === 'diagnosticos' ? 'del ticket' : 'de la factura'} para continuar: <strong>{dialog.reference || 'sin selección'}</strong>.</p><label>Confirmación<input autoFocus required value={input} onChange={e => setInput(e.target.value)} /></label>{dialog.kind === 'diagnosticos' && <label className="admin-inline"><input type="checkbox" checked={withInvoices} onChange={e => setWithInvoices(e.target.checked)} /> También eliminar facturas relacionadas</label>}<div className="admin-dialog__actions"><button type="button" onClick={() => setDialog(null)}>Cancelar</button><button className="admin-danger" disabled={busy || !dialog.reference || input !== dialog.reference}>Eliminar</button></div></form> : <form onSubmit={submit}>
      {dialog.type === 'brand' && <>{field('name', 'Marca')}{field('models', 'Modelos (uno por línea)', { multiline: true, required: false })}</>}
      {dialog.type === 'service' && <>{field('name', 'Nombre')}{field('category', 'Categoría')}{field('description', 'Descripción', { multiline: true })}{field('estimatedTime', 'Tiempo estimado (opcional)', { required: false })}<label className="admin-inline"><input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} /> Servicio activo</label></>}
      {dialog.type === 'faq' && <>{field('question', 'Pregunta')}{field('answer', 'Respuesta', { multiline: true })}{field('category', 'Categoría')}{field('keywords', 'Palabras clave separadas por coma', { required: false })}<label className="admin-inline"><input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} /> Pregunta activa</label></>}
      {dialog.type === 'invoice' && <><label>Asociar a<select value={form.mode} onChange={e => set('mode', e.target.value)}><option value="new">Ticket nuevo</option><option value="existing">Ticket existente</option></select></label>{form.mode === 'existing' ? <label>Número de ticket<input required placeholder="DT-000001" value={form.ticketNumber} onChange={e => set('ticketNumber', e.target.value)} /></label> : <><p>El ticket nuevo recibirá un número automáticamente.</p>{field('brand', 'Marca')}{field('model', 'Modelo', { required: false })}{field('issue', 'Problema reportado', { multiline: true })}{field('customerName', 'Nombre del cliente')}{field('customerContact', 'Contacto')}</>}{field('description', 'Descripción del ítem')}{field('price', 'Precio unitario (USD)', { type: 'number', min: '0' })}</>}
      {dialog.type === 'invoice-edit' && <><p>Edición disponible para facturas pendientes. Escribe un ítem por línea: descripción|cantidad|precio.</p>{field('items', 'Ítems', { multiline: true })}{field('notes', 'Notas', { multiline: true, required: false })}</>}
      <div className="admin-dialog__actions"><button type="button" onClick={() => setDialog(null)}>Cancelar</button><button className="admin-button" disabled={busy}>Guardar</button></div>
    </form>}</section></div>;
}

// Selecciona el acceso o panel usando la sesión en memoria.
export default function AdminScaffold() {
  const { isAuthenticated, startSession } = useSession();
  return isAuthenticated ? <AdminPanel /> : <Login onLogin={startSession} />;
}
