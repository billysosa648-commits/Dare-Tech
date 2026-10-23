document.addEventListener('DOMContentLoaded', () => {
    const API_URL = window.DARE_TECH_API_URL;
    const $ = id => document.getElementById(id);
    const loginScreen = $('login-screen'), panelScreen = $('panel-screen');
    const loginForm = $('login-form'), passwordChangeForm = $('password-change-form');
    const loginUsername = $('login-username'), loginPassword = $('login-password');
    const passwordChangeScreen = $('password-change-screen'), newPasswordInput = $('new-password');
    const changePasswordBtn = $('change-password-btn'), passwordChangeError = $('password-change-error');
    const loginBtn = $('login-btn'), loginError = $('login-error'), logoutBtn = $('logout-btn');
    const createInvoiceTopBtn = $('create-invoice-top-btn');
    const invoiceModal = $('invoice-modal'), invoiceCreateForm = $('invoice-create-form');
    const ticketCustomerInput = $('invoice-ticket-customer'), ticketContactInput = $('invoice-ticket-contact');
    const ticketBrandInput = $('invoice-ticket-brand'), ticketModelInput = $('invoice-ticket-model');
    const ticketIssueInput = $('invoice-ticket-issue');
    const invoiceAvailabilityMessage = $('invoice-availability-message'), modalItems = $('modal-items');
    const invoiceItemTemplate = $('invoice-item-template'), addItemBtn = $('add-item-btn');
    const modalSaveBtn = $('modal-save-btn'), modalCancelBtn = $('modal-cancel-btn');
    const invoiceList = $('invoice-list'), invoiceListStatus = $('invoice-list-status');
    const reportsList = $('reports-list'), reportsListStatus = $('reports-list-status');
    const reportsPagination = $('reports-pagination'), reportsPageLabel = $('reports-page-label');
    let reportsPage = 1, reportsPages = 1, reportsRequest = null;
    const invoiceSearch = $('invoice-search'), invoiceStatusFilter = $('invoice-status-filter');
    const invoicePrev = $('invoice-prev'), invoiceNext = $('invoice-next');
    const invoicePageLabel = $('invoice-page-label'), invoicePagination = $('invoice-pagination');
    const invoiceDetailModal = $('invoice-detail-modal'), invoiceDetailContent = $('invoice-detail-content');
    const invoiceCustomerModal = $('invoice-customer-modal'), invoiceCustomerForm = $('invoice-customer-form');
    const invoiceCustomerName = $('invoice-customer-name'), invoiceCustomerError = $('invoice-customer-error');
    const invoiceCustomerSave = $('invoice-customer-save');
    const invoiceDiscount = $('invoice-discount'), invoiceNotes = $('invoice-notes');
    let invoicePage = 1, invoicePages = 1, invoiceTotal = 0;
    let invoiceIvaRateBps = 1500, idempotencyKey = null, searchTimer, customerEditInvoiceId = null;

    const getToken = () => sessionStorage.getItem('adminToken');
    const money = amount => `$${Number(amount || 0).toFixed(2)}`;
    function showLogin() {
        passwordChangeScreen.classList.add('is-hidden'); panelScreen.classList.add('is-hidden'); loginScreen.classList.remove('is-hidden');
    }
    function showPasswordChange() {
        loginScreen.classList.add('is-hidden'); panelScreen.classList.add('is-hidden'); passwordChangeScreen.classList.remove('is-hidden');
    }
    function showPanel() {
        passwordChangeScreen.classList.add('is-hidden'); loginScreen.classList.add('is-hidden'); panelScreen.classList.remove('is-hidden');
        loadInvoices(); loadReceivedReports();
    }
    function authHeaders(json = false) {
        return { ...(json ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${getToken()}` };
    }
    async function apiFetch(path, options = {}) {
        const response = await fetch(`${API_URL}${path}`, { ...options, headers: { ...authHeaders(options.body !== undefined), ...(options.headers || {}) } });
        if (response.status === 401) { sessionStorage.removeItem('adminToken'); showLogin(); }
        if (response.status === 403) showPasswordChange();
        return response;
    }
    async function responseMessage(response, fallback) {
        try { return (await response.json()).message || fallback; } catch { return fallback; }
    }

    async function loadReceivedReports() {
        if (reportsRequest) reportsRequest.abort();
        reportsRequest = new AbortController();
        reportsListStatus.textContent = 'Cargando reportes…'; reportsList.replaceChildren();
        const params = new URLSearchParams({ page: String(reportsPage), limit: '2' });
        try {
            const response = await apiFetch(`/diagnostics/received?${params}`, { signal: reportsRequest.signal });
            if (!response.ok) throw new Error(await responseMessage(response, 'No se pudieron cargar los reportes.'));
            const data = await response.json();
            reportsPage = data.page || 1; reportsPages = Math.max(1, data.pages || 1);
            renderReceivedReports(data.items || []);
            reportsListStatus.textContent = data.total ? `${data.total} reporte${data.total === 1 ? '' : 's'} recibido${data.total === 1 ? '' : 's'}.` : 'Aún no se han recibido reportes.';
            reportsPagination.classList.toggle('is-hidden', !data.total);
            reportsPageLabel.textContent = `Página ${reportsPage} de ${reportsPages}`;
            $('reports-prev').disabled = reportsPage <= 1; $('reports-next').disabled = reportsPage >= reportsPages;
        } catch (error) {
            if (error.name !== 'AbortError') reportsListStatus.textContent = error.message;
        } finally { reportsRequest = null; }
    }
    function renderReceivedReports(reports) {
        reportsList.replaceChildren();
        reports.forEach(report => {
            const card = document.createElement('article'); card.className = 'invoice-card report-card';
            const heading = document.createElement('div'); heading.className = 'invoice-card-heading';
            const ticket = document.createElement('strong'); ticket.textContent = report.ticketNumber || 'Reporte';
            const status = document.createElement('span');
            const reportStatusClasses = { recibido: 'invoice-status--report-received', en_revision: 'invoice-status--report-review', reparado: 'invoice-status--report-repaired', entregado: 'invoice-status--report-delivered' };
            status.className = 'invoice-status ' + (reportStatusClasses[report.status] || 'invoice-status--report-unknown');
            status.textContent = ({ recibido: 'Recibido', en_revision: 'En revisión', reparado: 'Reparado', entregado: 'Entregado' })[report.status] || 'Recibido';
            heading.append(ticket, status);
            const details = document.createElement('dl'); details.className = 'invoice-card-details';
            const values = [
                ['Cliente', report.customerName], ['Contacto', report.customerContact],
                ['Equipo', [report.brand, report.model].filter(Boolean).join(' ')],
                ['Fecha', formatDate(report.createdAt)], ['Falla reportada', report.issue]
            ];
            values.forEach(([label, value]) => {
                const wrapper = document.createElement('div'); const dt = document.createElement('dt'); dt.textContent = label;
                const dd = document.createElement('dd'); dd.textContent = value || '—'; wrapper.append(dt, dd); details.appendChild(wrapper);
            });
            const actions = document.createElement('div'); actions.className = 'report-card__actions';
            const label = document.createElement('label'); label.className = 'report-card__label';
            label.textContent = `Cambiar estado de ${report.ticketNumber || 'este reporte'}`;
            const select = document.createElement('select'); select.className = 'report-card__status-select';
            select.id = `report-status-${report._id}`; label.htmlFor = select.id;
            select.setAttribute('aria-label', label.textContent);
            [['recibido', 'Recibido'], ['en_revision', 'En revisión'], ['reparado', 'Reparado'], ['entregado', 'Entregado']].forEach(([value, text]) => {
                const option = document.createElement('option'); option.value = value; option.textContent = text;
                option.selected = report.status === value; select.appendChild(option);
            });
            const saveButton = document.createElement('button'); saveButton.type = 'button';
            saveButton.className = 'report-card__save-status'; saveButton.textContent = 'Guardar estado';
            const feedback = document.createElement('p'); feedback.className = 'report-card__feedback';
            feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite');
            saveButton.addEventListener('click', async () => {
                if (!report._id || select.value === report.status) return;
                saveButton.disabled = true; feedback.textContent = 'Guardando…';
                try {
                    const response = await apiFetch(`/diagnostics/${encodeURIComponent(report._id)}/status`, {
                        method: 'PATCH', body: JSON.stringify({ status: select.value })
                    });
                    if (!response.ok) throw new Error(await responseMessage(response, 'No se pudo actualizar el estado.'));
                    report.status = select.value;
                    status.className = 'invoice-status ' + (reportStatusClasses[report.status] || 'invoice-status--report-unknown');
                    status.textContent = ({ recibido: 'Recibido', en_revision: 'En revisión', reparado: 'Reparado', entregado: 'Entregado' })[report.status] || 'Recibido';
                    feedback.textContent = 'Estado actualizado.';
                } catch (error) { feedback.textContent = error.message; }
                finally { saveButton.disabled = false; }
            });
            actions.append(label, select, saveButton, feedback);
            card.append(heading, details, actions); reportsList.appendChild(card);
        });
    }
    $('reports-refresh-btn').addEventListener('click', () => loadReceivedReports());
    $('reports-prev').addEventListener('click', () => { if (reportsPage > 1) { reportsPage--; loadReceivedReports(); } });
    $('reports-next').addEventListener('click', () => { if (reportsPage < reportsPages) { reportsPage++; loadReceivedReports(); } });

    if (getToken()) showPanel();
    loginForm.addEventListener('submit', async event => {
        event.preventDefault();
        const username = loginUsername.value.trim(), password = loginPassword.value;
        loginError.classList.add('is-hidden');
        if (!username || !password) { loginError.textContent = 'Ingresa usuario y contraseña.'; loginError.classList.remove('is-hidden'); return; }
        loginBtn.disabled = true;
        try {
            const response = await fetch(`${API_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Error al iniciar sesión');
            sessionStorage.setItem('adminToken', data.token);
            if (data.passwordChangeRequired) showPasswordChange(); else showPanel();
        } catch (error) { loginError.textContent = error.message === 'Failed to fetch' ? 'Problema de conexión con el servidor.' : error.message; loginError.classList.remove('is-hidden'); }
        finally { loginBtn.disabled = false; }
    });
    logoutBtn.addEventListener('click', async () => {
        try { if (getToken()) await fetch(`${API_URL}/auth/logout`, { method: 'POST', headers: authHeaders() }); }
        catch { /* La salida local continúa aunque falle la red. */ }
        finally { sessionStorage.removeItem('adminToken'); showLogin(); }
    });
    passwordChangeForm.addEventListener('submit', async event => {
        event.preventDefault();
        const password = newPasswordInput.value; passwordChangeError.classList.add('is-hidden');
        if ([...password].length < 12 || new TextEncoder().encode(password).length > 72) {
            passwordChangeError.textContent = 'Usa una contraseña de 12 a 72 caracteres.'; passwordChangeError.classList.remove('is-hidden'); return;
        }
        changePasswordBtn.disabled = true;
        try {
            const response = await apiFetch('/auth/password', { method: 'PUT', body: JSON.stringify({ password }) });
            if (!response.ok) throw new Error(await responseMessage(response, 'No se pudo actualizar la contraseña.'));
            sessionStorage.removeItem('adminToken'); newPasswordInput.value = ''; showLogin();
            loginError.textContent = 'Contraseña actualizada. Inicia sesión nuevamente.'; loginError.classList.remove('is-hidden');
        } catch (error) { passwordChangeError.textContent = error.message; passwordChangeError.classList.remove('is-hidden'); }
        finally { changePasswordBtn.disabled = false; }
    });

    // Facturas se consultan por separado para permitir varias facturas por ticket.
    async function loadInvoices() {
        invoiceListStatus.textContent = 'Cargando facturas…'; invoiceList.replaceChildren(); invoicePagination.classList.add('is-hidden');
        const params = new URLSearchParams({ page: String(invoicePage), limit: '4' });
        const search = invoiceSearch.value.trim(), status = invoiceStatusFilter.value;
        if (search) params.set('search', search); if (status) params.set('status', status);
        try {
            const response = await apiFetch(`/facturas?${params}`);
            if (!response.ok) throw new Error(await responseMessage(response, 'No se pudieron cargar las facturas.'));
            const data = await response.json();
            invoiceIvaRateBps = Number.isInteger(data.ivaRateBps) ? data.ivaRateBps : 1500;
            $('invoice-iva-rate').textContent = String(invoiceIvaRateBps / 100);
            invoicePages = Math.max(1, data.pages || 1); invoicePage = data.page || 1; invoiceTotal = data.total || 0;
            renderInvoices(data.items || []);
            invoiceListStatus.textContent = invoiceTotal ? `${invoiceTotal} factura${invoiceTotal === 1 ? '' : 's'} encontrada${invoiceTotal === 1 ? '' : 's'}.` : 'No hay facturas que coincidan con la búsqueda.';
            if (invoiceTotal) {
                invoicePagination.classList.remove('is-hidden'); invoicePageLabel.textContent = `Página ${invoicePage} de ${invoicePages}`;
                invoicePrev.disabled = invoicePage <= 1; invoiceNext.disabled = invoicePage >= invoicePages;
            }
            recalculateInvoice();
        } catch (error) { invoiceListStatus.textContent = error.message; }
    }
    function makeAction(label, className, handler) {
        const button = document.createElement('button'); button.type = 'button'; button.className = className; button.textContent = label; button.addEventListener('click', handler); return button;
    }
    function renderInvoices(invoices) {
        invoiceList.replaceChildren();
        invoices.forEach(invoice => {
            const card = document.createElement('article'); card.className = 'invoice-card';
            const heading = document.createElement('div'); heading.className = 'invoice-card-heading';
            const number = document.createElement('strong'); number.textContent = invoice.invoiceNumber || 'Factura';
            const status = document.createElement('span'); status.className = `invoice-status invoice-status--${invoice.status}`;
            status.textContent = invoice.status === 'pagada' ? 'Pagada' : invoice.status === 'anulada' ? 'Anulada' : 'Pendiente';
            heading.append(number, status);
            const details = document.createElement('dl'); details.className = 'invoice-card-details';
            const values = [['Ticket', invoice.ticketNumber], ['Cliente', invoice.customer?.name], ['Fecha', formatDate(invoice.issuedAt || invoice.createdAt)], ['Total', money(invoice.total)]];
            values.forEach(([label, value]) => { const wrapper = document.createElement('div'); const dt = document.createElement('dt'); dt.textContent = label; const dd = document.createElement('dd'); dd.textContent = value || '—'; wrapper.append(dt, dd); details.appendChild(wrapper); });
            const actions = document.createElement('div'); actions.className = 'invoice-card-actions';
            actions.append(makeAction('Ver / imprimir', 'invoice-action', () => showInvoiceDetail(invoice._id)));
            if (invoice.status !== 'anulada') {
                actions.append(makeAction('Cambiar cliente', 'invoice-action', () => openCustomerModal(invoice._id, invoice.customer?.name)));
            }
            if (invoice.status === 'pendiente') actions.append(makeAction('Pago recibido', 'invoice-action invoice-action--paid', () => markInvoicePaid(invoice._id)));
            if (invoice.status !== 'anulada') actions.append(makeAction('Anular', 'invoice-action invoice-action--danger', () => annulInvoice(invoice._id, invoice.invoiceNumber)));
            card.append(heading, details, actions); invoiceList.appendChild(card);
        });
    }
    function formatDate(value) {
        if (!value) return '—'; const date = new Date(value);
        return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium' }).format(date);
    }
    async function markInvoicePaid(id) {
        try {
            const response = await apiFetch(`/facturas/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status: 'pagada' }) });
            if (!response.ok) throw new Error(await responseMessage(response, 'No se pudo registrar el pago.'));
            await loadInvoices();
        } catch (error) { alert(error.message); }
    }
    async function annulInvoice(id, number) {
        if (!confirm(`¿Anular la factura ${number || ''}? La factura quedará registrada como anulada.`)) return;
        try {
            const response = await apiFetch(`/facturas/${encodeURIComponent(id)}`, { method: 'DELETE' });
            if (!response.ok) throw new Error(await responseMessage(response, 'No se pudo anular la factura.'));
            await loadInvoices();
        } catch (error) { alert(error.message); }
    }
    async function showInvoiceDetail(id) {
        try {
            const response = await apiFetch(`/facturas/${encodeURIComponent(id)}`);
            if (!response.ok) throw new Error(await responseMessage(response, 'No se pudo abrir la factura.'));
            const invoice = await response.json(); renderInvoiceDetail(invoice);
            invoiceDetailModal.classList.remove('is-hidden'); invoiceDetailModal.classList.add('is-open'); $('invoice-detail-close').focus();
        } catch (error) { alert(error.message); }
    }
    function renderInvoiceDetail(invoice) {
        invoiceDetailContent.replaceChildren();
        const addLine = (label, value, parent = invoiceDetailContent) => {
            const p = document.createElement('p'), strong = document.createElement('strong'); strong.textContent = `${label}: `;
            p.className = 'invoice-detail-line';
            p.append(strong, document.createTextNode(value || '—')); parent.appendChild(p);
        };
        addLine('Número', invoice.invoiceNumber); addLine('Ticket', invoice.ticketNumber);
        addLine('Cliente', invoice.customer?.name); addLine('Contacto', invoice.customer?.contact);
        addLine('Emitida', formatDate(invoice.issuedAt || invoice.createdAt));
        const table = document.createElement('table'); table.className = 'invoice-detail-items';
        const caption = document.createElement('caption'); caption.textContent = 'Ítems de la factura'; table.appendChild(caption);
        const head = document.createElement('thead'), hr = document.createElement('tr');
        ['Descripción', 'Cant.', 'Precio unitario', 'Subtotal'].forEach(label => { const th = document.createElement('th'); th.scope = 'col'; th.textContent = label; hr.appendChild(th); }); head.appendChild(hr);
        const body = document.createElement('tbody');
        (invoice.items || []).forEach(item => {
            const row = document.createElement('tr');
            [item.description, String(item.quantity || 1), money(item.unitPrice), money(item.subtotal)].forEach(value => { const td = document.createElement('td'); td.textContent = value; row.appendChild(td); }); body.appendChild(row);
        });
        table.append(head, body); invoiceDetailContent.appendChild(table);
        addLine('Subtotal', money(invoice.subtotal)); addLine(`IVA (${invoice.ivaRate}%)`, money(invoice.iva));
        addLine('Descuento', money(invoice.discount)); addLine('Total', money(invoice.total));
        addLine('Estado', invoice.status === 'pagada' ? 'Pagada' : invoice.status === 'anulada' ? 'Anulada' : 'Pendiente');
        if (invoice.notes) addLine('Notas', invoice.notes);
    }
    invoiceSearch.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { invoicePage = 1; loadInvoices(); }, 300); });
    invoiceStatusFilter.addEventListener('change', () => { invoicePage = 1; loadInvoices(); });
    invoicePrev.addEventListener('click', () => { if (invoicePage > 1) { invoicePage--; loadInvoices(); } });
    invoiceNext.addEventListener('click', () => { if (invoicePage < invoicePages) { invoicePage++; loadInvoices(); } });
    $('invoice-detail-close').addEventListener('click', () => { invoiceDetailModal.classList.add('is-hidden'); invoiceDetailModal.classList.remove('is-open'); });
    $('invoice-print-btn').addEventListener('click', () => window.print());
    function openCustomerModal(invoiceId, currentName) {
        customerEditInvoiceId = invoiceId;
        invoiceCustomerName.value = currentName || '';
        invoiceCustomerError.textContent = '';
        invoiceCustomerModal.classList.remove('is-hidden'); invoiceCustomerModal.classList.add('is-open');
        invoiceCustomerName.focus(); invoiceCustomerName.select();
    }
    function closeCustomerModal() {
        invoiceCustomerModal.classList.add('is-hidden'); invoiceCustomerModal.classList.remove('is-open');
        customerEditInvoiceId = null;
    }
    $('invoice-customer-cancel').addEventListener('click', closeCustomerModal);
    invoiceCustomerForm.addEventListener('submit', async event => {
        event.preventDefault();
        const customerName = invoiceCustomerName.value.trim();
        invoiceCustomerError.textContent = '';
        if (!customerEditInvoiceId || !customerName || customerName.length > 120) {
            invoiceCustomerError.textContent = 'Escribe un nombre de cliente de hasta 120 caracteres.'; return;
        }
        invoiceCustomerSave.disabled = true;
        try {
            const response = await apiFetch(`/facturas/${encodeURIComponent(customerEditInvoiceId)}`, {
                method: 'PATCH', body: JSON.stringify({ customerName })
            });
            if (!response.ok) throw new Error(await responseMessage(response, 'No se pudo cambiar el cliente.'));
            closeCustomerModal(); await loadInvoices();
        } catch (error) { invoiceCustomerError.textContent = error.message; }
        finally { invoiceCustomerSave.disabled = false; }
    });

    createInvoiceTopBtn.addEventListener('click', () => openInvoiceModal());
    function openInvoiceModal() {
        ticketCustomerInput.value = ''; ticketContactInput.value = '';
        ticketBrandInput.value = ''; ticketModelInput.value = ''; ticketIssueInput.value = '';
        invoiceAvailabilityMessage.textContent = '';
        invoiceAvailabilityMessage.classList.add('is-hidden');
        modalSaveBtn.disabled = false;
        resetInvoiceForm();
        invoiceModal.classList.remove('is-hidden'); invoiceModal.classList.add('is-open');
        ticketCustomerInput.focus();
    }
    function resetInvoiceForm() {
        modalItems.replaceChildren(); invoiceDiscount.value = '0'; invoiceNotes.value = ''; idempotencyKey = null;
        addItemRow(); recalculateInvoice(); modalSaveBtn.textContent = '[ CREAR FACTURA ]';
    }
    function addItemRow() {
        const row = invoiceItemTemplate.content.firstElementChild.cloneNode(true);
        row.querySelectorAll('input').forEach(input => input.addEventListener('input', recalculateInvoice));
        row.querySelector('.remove-item-btn').addEventListener('click', () => { row.remove(); recalculateInvoice(); });
        modalItems.appendChild(row); recalculateInvoice();
    }
    function recalculateInvoice() {
        if (!modalItems) return;
        const subtotalCents = [...modalItems.querySelectorAll('.item-row')].reduce((sum, row) => {
            const quantity = Math.max(0, Number(row.querySelector('.item-quantity').value) || 0);
            const price = Math.max(0, Number(row.querySelector('.item-price').value) || 0);
            return sum + Math.round(price * 100) * quantity;
        }, 0);
        const discountCents = Math.min(subtotalCents, Math.max(0, Math.round((Number(invoiceDiscount.value) || 0) * 100)));
        const ivaCents = Math.round((subtotalCents - discountCents) * invoiceIvaRateBps / 10000);
        $('invoice-subtotal').textContent = money(subtotalCents / 100);
        $('invoice-iva').textContent = money(ivaCents / 100);
        $('invoice-total').textContent = money((subtotalCents - discountCents + ivaCents) / 100);
    }
    addItemBtn.addEventListener('click', addItemRow); invoiceDiscount.addEventListener('input', recalculateInvoice);
    modalCancelBtn.addEventListener('click', () => { invoiceModal.classList.add('is-hidden'); invoiceModal.classList.remove('is-open'); });
    invoiceCreateForm.addEventListener('submit', async event => {
        event.preventDefault();
        const ticket = {
            customerName: ticketCustomerInput.value.trim(),
            customerContact: ticketContactInput.value.trim(),
            brand: ticketBrandInput.value.trim(),
            model: ticketModelInput.value.trim(),
            issue: ticketIssueInput.value.trim()
        };
        const items = [...modalItems.querySelectorAll('.item-row')].map(row => ({
            description: row.querySelector('.item-desc').value.trim(),
            quantity: Number(row.querySelector('.item-quantity').value),
            unitPrice: Number(row.querySelector('.item-price').value)
        }));
        if (!ticket.customerName || !ticket.customerContact || !ticket.brand || !ticket.issue) {
            invoiceAvailabilityMessage.textContent = 'Completa cliente, contacto, marca y falla para crear un ticket nuevo.';
            invoiceAvailabilityMessage.classList.remove('is-hidden'); return;
        }
        if (!items.length || items.some(item => !item.description || item.description.length > 200 || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000 || !Number.isFinite(item.unitPrice) || item.unitPrice <= 0 || Math.round(item.unitPrice * 100) / 100 !== item.unitPrice)) {
            alert('Completa cada ítem con descripción, cantidad y precio válido (máximo dos decimales).'); return;
        }
        const discountCents = Math.round((Number(invoiceDiscount.value) || 0) * 100);
        if (!Number.isInteger(discountCents) || discountCents < 0 || discountCents > 3000000000) { alert('El descuento debe ser un valor válido.'); return; }
        const subtotalCents = items.reduce((sum, item) => sum + Math.round(item.unitPrice * 100) * item.quantity, 0);
        if (discountCents > subtotalCents) { alert('El descuento no puede superar el subtotal.'); return; }
        idempotencyKey ||= globalThis.crypto?.randomUUID?.() || `invoice-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        modalSaveBtn.disabled = true; modalSaveBtn.textContent = 'Creando…';
        const controller = new AbortController(), timeoutId = setTimeout(() => controller.abort(), 20000);
        try {
            const response = await apiFetch('/facturas', {
                method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, signal: controller.signal,
                body: JSON.stringify({ ticket, items, discountCents, notes: invoiceNotes.value.trim() })
            });
            if (!response.ok) throw new Error(await responseMessage(response, 'No se pudo crear la factura.'));
            const createdInvoice = await response.json();
            invoiceModal.classList.add('is-hidden'); invoiceModal.classList.remove('is-open'); idempotencyKey = null; invoicePage = 1;
            await loadInvoices(); alert(`Factura creada: ${createdInvoice.invoiceNumber}. Ticket nuevo: ${createdInvoice.ticketNumber}.`);
        } catch (error) {
            invoiceAvailabilityMessage.textContent = error.name === 'AbortError' ? 'Se agotó el tiempo de espera. Puedes reintentar con seguridad.' : error.message;
            invoiceAvailabilityMessage.classList.remove('is-hidden');
        } finally { clearTimeout(timeoutId); modalSaveBtn.disabled = false; modalSaveBtn.textContent = '[ CREAR FACTURA ]'; }
    });
});
