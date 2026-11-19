// Permite seleccionar y eliminar reportes y facturas desde una sola tabla administrativa.
import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../services/api.js';

const MAX_DELETE_SELECTION = 5;

// Prepara filas compactas a partir de los reportes y las facturas enlazadas.
function buildRows(diagnostics) {
  return diagnostics.flatMap(diagnostic => {
    const invoiceRows = (diagnostic.invoices || []).map(invoice => ({
      key: 'invoice:' + invoice._id,
      id: String(invoice._id),
      type: 'Factura',
      number: invoice.invoiceNumber,
      person: invoice.customer?.name || diagnostic.customerName || 'Sin nombre',
      createdAt: invoice.createdAt
    }));
    return [{
      key: 'report:' + diagnostic._id,
      id: String(diagnostic._id),
      type: 'Reporte',
      number: diagnostic.ticketNumber,
      person: diagnostic.customerName || 'Sin nombre',
      invoiceIds: invoiceRows.map(invoice => invoice.id),
      createdAt: diagnostic.createdAt
    }, ...invoiceRows];
  }).sort((first, second) => new Date(second.createdAt || 0) - new Date(first.createdAt || 0));
}

// Conserva el foco dentro del diálogo y lo devuelve al botón que lo abrió.
function useDialogFocus(dialogRef, closeRef, onClose, busy, confirming) {
  const currentState = useRef({ busy, confirming, onClose });
  currentState.current = { busy, confirming, onClose };
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !currentState.current.busy && !currentState.current.confirming) currentState.current.onClose();
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled)')];
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
        event.preventDefault(); first.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [closeRef, dialogRef]);
}

export default function DeleteRecordsDialog({ onClose, onDeleted }) {
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  useDialogFocus(dialogRef, closeRef, onClose, busy, confirming);

  // Ignora una respuesta tardía si se cerró el diálogo o se volvió a cargar la tabla.
  useEffect(() => {
    let active = true;
    async function loadRecords() {
      setLoading(true);
      setLoadError('');
      try {
        const diagnostics = await apiFetch('/diagnostics');
        if (!active) return;
        const rows = buildRows(Array.isArray(diagnostics) ? diagnostics : []);
        setRecords(rows);
        setSelected(current => new Set([...current].filter(key => rows.some(row => row.key === key))));
      } catch (failure) {
        if (active) setLoadError(failure.message || 'No se pudieron cargar los reportes y las facturas.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadRecords();
    return () => { active = false; };
  }, [attempt]);

  const visibleRecords = useMemo(() => {
    const search = query.trim().toLocaleLowerCase('es-EC');
    if (!search) return records;
    return records.filter(record => (record.type + ' ' + record.number + ' ' + record.person).toLocaleLowerCase('es-EC').includes(search));
  }, [query, records]);
  const selectedRecords = useMemo(() => records.filter(record => selected.has(record.key)), [records, selected]);
  const selectedInvoices = useMemo(() => new Set(selectedRecords.filter(record => record.type === 'Factura').map(record => record.id)), [selectedRecords]);
  const selectedReports = selectedRecords.filter(record => record.type === 'Reporte');
  const missingInvoices = selectedReports.flatMap(report => (report.invoiceIds || []).filter(id => !selectedInvoices.has(id)));
  const allVisibleSelected = visibleRecords.length > 0 && visibleRecords.every(record => selected.has(record.key));
  const reportCount = selectedReports.length;
  const invoiceCount = selectedRecords.length - reportCount;

  // Cambia una fila sin alterar la selección de las demás.
  function toggleRecord(record) {
    setError('');
    const next = new Set(selected);
    if (next.has(record.key)) next.delete(record.key);
    else if (next.size < MAX_DELETE_SELECTION) next.add(record.key);
    else { setError('Puedes seleccionar hasta ' + MAX_DELETE_SELECTION + ' elementos por operación.'); return; }
    setSelected(next);
  }

  // Alterna todas las filas visibles, con el límite que acepta la API.
  function toggleVisible() {
    setError('');
    const next = new Set(selected);
    if (allVisibleSelected) visibleRecords.forEach(record => next.delete(record.key));
    else {
      for (const record of visibleRecords) {
        if (next.size >= MAX_DELETE_SELECTION) break;
        next.add(record.key);
      }
      if (visibleRecords.some(record => !next.has(record.key))) setError('La selección está limitada a ' + MAX_DELETE_SELECTION + ' elementos.');
    }
    setSelected(next);
  }

  // Evita borrar un reporte dejando alguna de sus facturas vinculadas.
  function beginDelete() {
    setError('');
    if (!selectedRecords.length) return;
    if (missingInvoices.length) {
      const numbers = missingInvoices.map(id => records.find(record => record.type === 'Factura' && record.id === id)?.number || id);
      setError('Selecciona también las facturas asociadas: ' + [...new Set(numbers)].join(', ') + '.');
      return;
    }
    setConfirming(true);
  }

  // Elimina primero las facturas seleccionadas y luego sus reportes.
  async function deleteSelected() {
    if (!selectedRecords.length || selectedRecords.length > MAX_DELETE_SELECTION) return;
    setBusy(true);
    dialogRef.current?.focus();
    setError('');
    setNotice('');
    let deletedInvoices = 0;
    try {
      const invoiceIds = selectedRecords.filter(record => record.type === 'Factura').map(record => record.id);
      const reportIds = selectedReports.map(record => record.id);
      if (invoiceIds.length) {
        const result = await apiFetch('/invoices/bulk-delete', { method: 'POST', body: JSON.stringify({ ids: invoiceIds }) });
        deletedInvoices = result.deletedCount || 0;
        if (deletedInvoices !== invoiceIds.length) throw new Error('No se eliminaron todas las facturas seleccionadas. Actualiza la tabla y vuelve a intentarlo.');
      }
      let deletedReports = 0;
      if (reportIds.length) {
        const result = await apiFetch('/diagnostics/bulk-delete', {
          method: 'POST', body: JSON.stringify({ ids: reportIds, withInvoices: false })
        });
        deletedReports = result.deletedCount || 0;
        if (deletedReports !== reportIds.length) throw new Error('No se eliminaron todos los reportes seleccionados. Actualiza la tabla y vuelve a intentarlo.');
      }
      const deletedSummary = [];
      if (deletedReports) deletedSummary.push(deletedReports + (deletedReports === 1 ? ' reporte' : ' reportes'));
      if (deletedInvoices) deletedSummary.push(deletedInvoices + (deletedInvoices === 1 ? ' factura' : ' facturas'));
      setNotice('Se eliminaron ' + (deletedSummary.join(' y ') || '0 elementos') + '.');
      setSelected(new Set());
      setConfirming(false);
      setAttempt(value => value + 1);
      await onDeleted?.();
    } catch (failure) {
      setError(deletedInvoices
        ? 'Se eliminaron ' + deletedInvoices + ' facturas, pero no se completó el borrado de los reportes. Actualiza la tabla y revisa la selección.'
        : failure.message || 'No se pudieron eliminar los elementos seleccionados.');
      setConfirming(false);
      if (deletedInvoices) {
        setAttempt(value => value + 1);
        await onDeleted?.();
      }
    } finally {
      setBusy(false);
    }
  }

  return <div className="admin-backdrop delete-records-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && !busy && !confirming && onClose()}>
    <section ref={dialogRef} className="admin-dialog delete-records-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-records-title" aria-describedby="delete-records-help" tabIndex={-1}>
      <button ref={closeRef} className="admin-dialog__close" aria-label="Cerrar selección de reportes y facturas" disabled={busy} onClick={onClose}>×</button>
      <p className="admin-kicker">GESTIÓN / BORRADO</p>
      <h2 id="delete-records-title">Eliminar facturas y reportes</h2>
      <p id="delete-records-help" className="delete-records-help">Selecciona los registros que quieras borrar. Si eliminas un reporte con facturas, selecciona también sus facturas.</p>
      {error && <p className="admin-error" role="alert">{error}</p>}
      {loadError && <p className="admin-error" role="alert">{loadError}</p>}
      {notice && <p className="admin-success" role="status" aria-live="polite">{notice}</p>}
      <div className="delete-records-toolbar">
        <label htmlFor="delete-records-search">Buscar por número o persona</label>
        <div className="delete-records-search">
          <input id="delete-records-search" type="search" value={query} disabled={busy || confirming} onChange={event => setQuery(event.target.value)} />
          {query && <button type="button" className="admin-quiet" aria-label="Limpiar búsqueda" disabled={busy || confirming} onClick={() => setQuery('')}>Limpiar</button>}
        </div>
        <button type="button" className="admin-quiet" disabled={loading || !visibleRecords.length || busy || confirming} aria-pressed={allVisibleSelected} onClick={toggleVisible}>
          {allVisibleSelected ? 'Deseleccionar visibles' : 'Seleccionar visibles'}
        </button>
        <span className="delete-records-count" aria-live="polite">{selectedRecords.length} seleccionados</span>
      </div>
      <div className="delete-records-table-wrap" aria-busy={loading}>
        <table className="delete-records-table">
          <caption className="visually-hidden">Facturas y reportes disponibles para eliminar</caption>
          <thead><tr><th scope="col">Seleccionar</th><th scope="col">Tipo</th><th scope="col">N.º de reporte/factura</th><th scope="col">Persona</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan="4" className="delete-records-state">Cargando reportes y facturas…</td></tr>}
            {!loading && !loadError && visibleRecords.map(record => <tr key={record.key} data-selected={selected.has(record.key) ? 'true' : undefined}>
              <td><input type="checkbox" checked={selected.has(record.key)} disabled={busy || confirming || (!selected.has(record.key) && selected.size >= MAX_DELETE_SELECTION)} aria-label={'Seleccionar ' + record.type.toLowerCase() + ' ' + record.number} onChange={() => toggleRecord(record)} /></td>
              <td>{record.type}</td>
              <th scope="row">{record.number}</th>
              <td>{record.person}</td>
            </tr>)}
            {!loading && !loadError && !visibleRecords.length && <tr><td colSpan="4" className="delete-records-state">{records.length ? 'No hay resultados para esa búsqueda.' : 'No hay reportes ni facturas.'}</td></tr>}
          </tbody>
        </table>
      </div>
      {loadError && <button type="button" className="admin-quiet" disabled={loading} onClick={() => setAttempt(value => value + 1)}>Reintentar carga</button>}
      {confirming && <div className="delete-records-confirmation" role="alert">
        <p>Se eliminarán permanentemente {selectedRecords.length} elementos: {reportCount} reportes y {invoiceCount} facturas. Esta acción no se puede deshacer.</p>
        <ul>{selectedRecords.map(record => <li key={record.key}>{record.type} {record.number} · {record.person}</li>)}</ul>
      </div>}
      <div className="admin-dialog__actions delete-records-actions">
        {confirming ? <>
          <button type="button" className="admin-quiet" disabled={busy} onClick={() => setConfirming(false)}>Volver a la tabla</button>
          <button type="button" className="admin-danger" disabled={busy} aria-busy={busy} onClick={deleteSelected}>{busy ? 'Eliminando…' : 'Confirmar eliminación (' + selectedRecords.length + ')'}</button>
        </> : <>
          <button type="button" className="admin-quiet" disabled={busy} onClick={onClose}>Cerrar</button>
          <button type="button" className="admin-danger" disabled={loading || busy || selectedRecords.length === 0} onClick={beginDelete}>Eliminar</button>
        </>}
      </div>
    </section>
  </div>;
}
