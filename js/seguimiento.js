document.addEventListener('DOMContentLoaded', () => {

    const API_URL = 'http://localhost:4000/api';

    const ticketInput = document.getElementById('ticket-input');
    const searchBtn = document.getElementById('search-btn');
    const errorMessage = document.getElementById('error-message');
    const resultContainer = document.getElementById('result-container');
    const resultTicket = document.getElementById('result-ticket');
    const resultStatusBadge = document.getElementById('result-status-badge');
    const resultDevice = document.getElementById('result-device');
    const resultIssue = document.getElementById('result-issue');
    const resultHistory = document.getElementById('result-history');
    const invoiceContent = document.getElementById('invoice-content');

    // Traduce el código interno de estado a un texto legible y a un color
    const statusLabels = {
        recibido: { text: 'Recibido', color: 'bg-blue-500/20 text-blue-300' },
        en_revision: { text: 'En revisión', color: 'bg-yellow-500/20 text-yellow-300' },
        reparado: { text: 'Reparado', color: 'bg-green-500/20 text-green-300' },
        entregado: { text: 'Entregado', color: 'bg-slate-500/20 text-slate-300' }
    };

    async function searchTicket() {
        const ticketNumber = ticketInput.value.trim().toUpperCase();

        errorMessage.classList.add('hidden');
        resultContainer.classList.add('hidden');

        if (!ticketNumber) {
            errorMessage.textContent = 'Por favor ingresa un número de ticket.';
            errorMessage.classList.remove('hidden');
            return;
        }

        const originalText = searchBtn.innerHTML;
        searchBtn.innerHTML = '[ BUSCANDO... ]';
        searchBtn.disabled = true;

        try {
            const response = await fetch(`${API_URL}/diagnostics/track/${ticketNumber}`);

            if (response.status === 404) {
                errorMessage.textContent = 'No se encontró ningún ticket con ese número. Verifica que esté escrito correctamente.';
                errorMessage.classList.remove('hidden');
                return;
            }

            if (!response.ok) {
                throw new Error('Error del servidor');
            }

            const data = await response.json();
            renderResult(data);

        } catch (error) {
            errorMessage.textContent = 'Hubo un problema de conexión. Intenta más tarde.';
            errorMessage.classList.remove('hidden');
        } finally {
            searchBtn.innerHTML = originalText;
            searchBtn.disabled = false;
        }
    }

    function renderResult(data) {
        resultTicket.textContent = data.ticketNumber;
        resultDevice.textContent = `${data.brand}${data.model ? ' - ' + data.model : ''}`;
        resultIssue.textContent = data.issue;

        const statusInfo = statusLabels[data.status] || { text: data.status, color: 'bg-slate-500/20 text-slate-300' };
        resultStatusBadge.textContent = statusInfo.text;
        resultStatusBadge.className = `px-3 py-1 rounded text-xs font-bold uppercase ${statusInfo.color}`;

        // Pinta el historial, más reciente primero
        resultHistory.innerHTML = '';
        [...data.statusHistory].reverse().forEach(entry => {
            const li = document.createElement('li');
            const date = new Date(entry.date).toLocaleString('es-EC');
            const label = statusLabels[entry.status]?.text || entry.status;
            li.innerHTML = `<span class="text-[#00f3ff]">●</span> <strong>${label}</strong> — ${date}${entry.note ? ` (${entry.note})` : ''}`;
            resultHistory.appendChild(li);
        });

        // Pinta la factura si existe
        if (data.invoice) {
            const itemsHtml = data.invoice.items
                .map(item => `<div class="flex justify-between"><span>${item.description}</span><span>$${item.price.toFixed(2)}</span></div>`)
                .join('');

            const invoiceStatus = data.invoice.status === 'pagada'
                ? '<span class="text-green-400">Pagada</span>'
                : '<span class="text-yellow-400">Pendiente de pago</span>';

            invoiceContent.innerHTML = `
                ${itemsHtml}
                <div class="flex justify-between font-bold border-t border-[#00f3ff]/20 mt-2 pt-2">
                    <span>Total</span><span>$${data.invoice.total.toFixed(2)}</span>
                </div>
                <p class="mt-2">${invoiceStatus}</p>
            `;
        } else {
            invoiceContent.innerHTML = '<p class="text-slate-500">Aún no se ha generado una factura para esta orden.</p>';
        }

        resultContainer.classList.remove('hidden');
    }

    searchBtn.addEventListener('click', searchTicket);

    // Permite buscar presionando Enter en el input
    ticketInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchTicket();
    });
});