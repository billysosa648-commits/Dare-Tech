document.addEventListener('DOMContentLoaded', () => {
    const API_URL = window.DARE_TECH_API_URL;
    const ticketInput = document.getElementById('ticket-input');
    const searchBtn = document.getElementById('search-btn');
    const searchForm = document.getElementById('tracking-form');
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
        recibido: { text: 'Recibido', className: 'tracking-status-badge--received' },
        en_revision: { text: 'En revisión', className: 'tracking-status-badge--review' },
        reparado: { text: 'Reparado', className: 'tracking-status-badge--repaired' },
        entregado: { text: 'Entregado', className: 'tracking-status-badge--delivered' }
    };

    async function searchTicket() {
        const ticketNumber = ticketInput.value.trim().toUpperCase();
        errorMessage.classList.add('is-hidden');
        resultContainer.classList.add('is-hidden');
        if (!/^DT-\d{5,10}$/.test(ticketNumber)) {
            errorMessage.textContent = 'Ingresa un número de ticket válido.';
            errorMessage.classList.remove('is-hidden');
            return;
        }

        searchBtn.disabled = true;
        searchBtn.textContent = '[ BUSCANDO... ]';
        try {
            const response = await fetch(`${API_URL}/diagnostics/track/${encodeURIComponent(ticketNumber)}`);
            if (response.status === 404) throw new Error('No se encontró ningún ticket con ese número. Verifica que esté escrito correctamente.');
            if (!response.ok) throw new Error('Hubo un problema de conexión. Intenta más tarde.');
            renderResult(await response.json());
        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.classList.remove('is-hidden');
        } finally {
            searchBtn.disabled = false;
            searchBtn.textContent = '[ BUSCAR ]';
        }
    }

    function renderResult(data) {
        resultTicket.textContent = data.ticketNumber;
        resultDevice.textContent = `${data.brand}${data.model ? ` - ${data.model}` : ''}`;
        resultIssue.textContent = data.issue || '';
        const statusInfo = statusLabels[data.status] || { text: data.status || 'Estado actualizado', className: 'tracking-status-badge--unknown' };
        resultStatusBadge.textContent = statusInfo.text;
        resultStatusBadge.className = `tracking-status-badge ${statusInfo.className}`;

        // Pinta el historial, más reciente primero
        resultHistory.replaceChildren();
        [...(Array.isArray(data.statusHistory) ? data.statusHistory : [])].reverse().forEach(entry => {
            const li = document.createElement('li');
            const marker = document.createElement('span');
            marker.className = 'tracking-history__marker';
            marker.textContent = '● ';
            const strong = document.createElement('strong');
            strong.textContent = statusLabels[entry.status]?.text || entry.status || '';
            const date = new Date(entry.date);
            const dateText = Number.isNaN(date.getTime()) ? '' : date.toLocaleString('es-EC');
            li.className = 'tracking-history__item';
            li.append(marker, strong, document.createTextNode(` — ${dateText}${entry.note ? ` (${entry.note})` : ''}`));
            resultHistory.appendChild(li);
        });

        // Pinta la factura si existe
        invoiceContent.replaceChildren();
        if (data.invoice && Array.isArray(data.invoice.items)) {
            data.invoice.items.forEach(item => {
                const row = document.createElement('div');
                row.className = 'tracking-invoice__row';
                const description = document.createElement('span');
                description.textContent = item.description || '';
                const price = document.createElement('span');
                price.textContent = `$${Number(item.price || 0).toFixed(2)}`;
                row.append(description, price);
                invoiceContent.appendChild(row);
            });
            const totalRow = document.createElement('div');
            totalRow.className = 'tracking-invoice__row tracking-invoice__total';
            const totalLabel = document.createElement('span');
            totalLabel.textContent = 'Total';
            const total = document.createElement('span');
            total.textContent = `$${Number(data.invoice.total || 0).toFixed(2)}`;
            totalRow.append(totalLabel, total);
            invoiceContent.appendChild(totalRow);

            const status = document.createElement('p');
            status.className = 'tracking-invoice__payment';
            const paid = data.invoice.status === 'pagada';
            const statusText = document.createElement('span');
            statusText.className = paid ? 'tracking-invoice__payment-status tracking-invoice__payment-status--paid' : 'tracking-invoice__payment-status tracking-invoice__payment-status--pending';
            statusText.textContent = paid ? 'Pagada' : 'Pendiente de pago';
            status.appendChild(statusText);
            invoiceContent.appendChild(status);
        } else {
            const empty = document.createElement('p');
            empty.className = 'tracking-invoice__empty';
            empty.textContent = 'Aún no se ha generado una factura para esta orden.';
            invoiceContent.appendChild(empty);
        }
        resultContainer.classList.remove('is-hidden');
    }

    searchForm.addEventListener('submit', event => {
        event.preventDefault();
        searchTicket();
    });
});
