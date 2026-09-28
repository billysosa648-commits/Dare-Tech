document.addEventListener('DOMContentLoaded', () => {

    const API_URL = 'http://localhost:4000/api';

    // --- Referencias DOM ---
    const loginScreen = document.getElementById('login-screen');
    const panelScreen = document.getElementById('panel-screen');
    const loginUsername = document.getElementById('login-username');
    const loginPassword = document.getElementById('login-password');
    const loginBtn = document.getElementById('login-btn');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');
    const tbody = document.getElementById('diagnostics-tbody');

    const invoiceModal = document.getElementById('invoice-modal');
    const modalTicket = document.getElementById('modal-ticket');
    const modalItems = document.getElementById('modal-items');
    const addItemBtn = document.getElementById('add-item-btn');
    const modalSaveBtn = document.getElementById('modal-save-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');

    let currentDiagnosticId = null; // guarda para cuál diagnóstico se está creando la factura

    const statusLabels = {
        recibido: { text: 'Recibido', color: 'bg-blue-500/20 text-blue-300' },
        en_revision: { text: 'En revisión', color: 'bg-yellow-500/20 text-yellow-300' },
        reparado: { text: 'Reparado', color: 'bg-green-500/20 text-green-300' },
        entregado: { text: 'Entregado', color: 'bg-slate-500/20 text-slate-300' }
    };

    // --- Manejo de sesión ---
    function getToken() {
        return localStorage.getItem('adminToken');
    }

    function showPanel() {
        loginScreen.classList.add('hidden');
        panelScreen.classList.remove('hidden');
        loadDiagnostics();
    }

    function showLogin() {
        panelScreen.classList.add('hidden');
        loginScreen.classList.remove('hidden');
    }

    // Al cargar la página, si ya hay un token guardado, saltamos directo al panel
    if (getToken()) {
        showPanel();
    }

    // --- Login ---
    loginBtn.addEventListener('click', async () => {
        const username = loginUsername.value.trim();
        const password = loginPassword.value.trim();
        loginError.classList.add('hidden');

        if (!username || !password) {
            loginError.textContent = 'Ingresa usuario y contraseña.';
            loginError.classList.remove('hidden');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                loginError.textContent = data.message || 'Error al iniciar sesión';
                loginError.classList.remove('hidden');
                return;
            }

            localStorage.setItem('adminToken', data.token);
            showPanel();

        } catch (error) {
            loginError.textContent = 'Problema de conexión con el servidor.';
            loginError.classList.remove('hidden');
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('adminToken');
        showLogin();
    });

    // --- Cargar diagnósticos ---
    async function loadDiagnostics() {
        try {
            const response = await fetch(`${API_URL}/diagnostics`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });

            if (response.status === 401) {
                // El token expiró o es inválido: forzamos login de nuevo
                localStorage.removeItem('adminToken');
                showLogin();
                return;
            }

            const diagnostics = await response.json();
            renderTable(diagnostics);

        } catch (error) {
            console.error('Error al cargar diagnósticos:', error);
        }
    }

    function renderTable(diagnostics) {
        tbody.innerHTML = '';

        diagnostics.forEach(d => {
            const tr = document.createElement('tr');
            tr.className = 'border-t border-[#00f3ff]/10';

            const statusInfo = statusLabels[d.status] || { text: d.status, color: '' };

            tr.innerHTML = `
                <td class="p-3 font-bold text-[#00f3ff]">${d.ticketNumber}</td>
                <td class="p-3">${d.customerName}<br><span class="text-xs text-slate-500">${d.customerContact}</span></td>
                <td class="p-3">${d.brand}${d.model ? ' - ' + d.model : ''}</td>
                <td class="p-3">${d.issue}</td>
                <td class="p-3">
                    <select data-id="${d._id}" class="status-select bg-[#05080c] border border-[#00f3ff]/40 rounded px-2 py-1 text-xs ${statusInfo.color}">
                        ${Object.keys(statusLabels).map(key =>
                            `<option value="${key}" ${key === d.status ? 'selected' : ''}>${statusLabels[key].text}</option>`
                        ).join('')}
                    </select>
                </td>
                <td class="p-3">
                    <button data-id="${d._id}" data-ticket="${d.ticketNumber}" class="create-invoice-btn text-xs text-[#00f3ff] underline">
                        + Factura
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Listeners para cada <select> de estado (delegación no aplica bien con <select>, así que los enganchamos uno por uno tras crearlos)
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', (e) => updateStatus(e.target.dataset.id, e.target.value));
        });

        document.querySelectorAll('.create-invoice-btn').forEach(btn => {
            btn.addEventListener('click', (e) => openInvoiceModal(e.target.dataset.id, e.target.dataset.ticket));
        });
    }

    // --- Cambiar estado ---
    async function updateStatus(diagnosticId, newStatus) {
        try {
            const response = await fetch(`${API_URL}/diagnostics/${diagnosticId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                alert('No se pudo actualizar el estado.');
                loadDiagnostics(); // recargamos para revertir el <select> visualmente
            }
        } catch (error) {
            alert('Problema de conexión al actualizar el estado.');
        }
    }

    // --- Modal de factura ---
    function openInvoiceModal(diagnosticId, ticketNumber) {
        currentDiagnosticId = diagnosticId;
        modalTicket.textContent = ticketNumber;
        modalItems.innerHTML = '';
        addItemRow();
        invoiceModal.classList.remove('hidden');
    }

    function addItemRow() {
        const row = document.createElement('div');
        row.className = 'flex gap-2 mb-2 item-row';
        row.innerHTML = `
            <input type="text" placeholder="Descripción" class="item-desc flex-1 bg-[#05080c] border border-[#00f3ff]/40 rounded px-2 py-1 text-sm">
            <input type="number" placeholder="Precio" class="item-price w-24 bg-[#05080c] border border-[#00f3ff]/40 rounded px-2 py-1 text-sm">
        `;
        modalItems.appendChild(row);
    }

    addItemBtn.addEventListener('click', addItemRow);

    modalCancelBtn.addEventListener('click', () => {
        invoiceModal.classList.add('hidden');
    });

    modalSaveBtn.addEventListener('click', async () => {
        const items = [...document.querySelectorAll('.item-row')].map(row => ({
            description: row.querySelector('.item-desc').value.trim(),
            price: parseFloat(row.querySelector('.item-price').value) || 0
        })).filter(item => item.description && item.price > 0);

        if (items.length === 0) {
            alert('Agrega al menos un ítem válido.');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/invoices`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ diagnosticId: currentDiagnosticId, items })
            });

            if (!response.ok) {
                throw new Error('Error al crear la factura');
            }

            invoiceModal.classList.add('hidden');
            alert('Factura creada correctamente.');

        } catch (error) {
            alert('No se pudo crear la factura.');
        }
    });

});