
/* LÓGICA DE INTERACTIVIDAD Y ENVÍO AL BACKEND  */


document.addEventListener('DOMContentLoaded', () => {

    const API_URL = window.DARE_TECH_API_URL;

    let selectedBrand = '';
    let selectedModel = '';
    let brandsFromDB = [];

    // Referencias a los elementos del DOM de la sección de diagnóstico
    const brandContainer = document.getElementById('brand-buttons');
    const stepModel = document.getElementById('step-model');
    const modelContainer = document.getElementById('model-buttons');
    const otherBrandContainer = document.getElementById('other-brand-container');
    const customBrandInput = document.getElementById('custom-brand-input');
    const otherModelContainer = document.getElementById('other-model-container');
    const customModelInput = document.getElementById('custom-model-input');
    const issueInput = document.getElementById('issue-description');
    const userNameInput = document.getElementById('user-name');
    const userContactInput = document.getElementById('user-contact');
    const sendBtn = document.getElementById('send-btn');
    const diagnosticForm = document.getElementById('diagnostic-form');
    const brandLoadStatus = document.getElementById('brand-load-status');
    const resultPanel = document.getElementById('report-result');
    const resultIcon = resultPanel?.querySelector('.report-result__icon');
    const resultTitle = resultPanel?.querySelector('.report-result__title');
    const resultMessage = resultPanel?.querySelector('.report-result__message');
    const resultTicket = resultPanel?.querySelector('.report-result__ticket');
    const resultClose = resultPanel?.querySelector('.report-result__close');

    function showResult(state, title, message, ticket = '') {
        if (!resultPanel) return;
        resultPanel.hidden = false;
        resultPanel.dataset.state = state;
        resultPanel.setAttribute('role', state === 'error' ? 'alert' : 'status');
        resultIcon.textContent = state === 'loading' ? '' : state === 'success' ? '✓' : '×';
        resultTitle.textContent = title;
        resultMessage.textContent = message;
        resultTicket.textContent = ticket ? `Número de ticket: ${ticket}` : '';
        resultTicket.hidden = !ticket;
        resultClose.hidden = state === 'loading';
        resultPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    resultClose?.addEventListener('click', () => { resultPanel.hidden = true; });

    // Función que inicializa y pinta los botones de las marcas 
    async function initBrands() {
        if (!brandContainer) return;
        brandLoadStatus.textContent = 'Cargando marcas...';
        try {
            const response = await fetch(`${API_URL}/brands`);
            if (!response.ok) throw new Error('brands-unavailable');
            const result = await response.json();
            if (!Array.isArray(result) || result.some(brand => !brand || typeof brand.name !== 'string')) {
                throw new Error('brands-invalid');
            }
            brandsFromDB = result;

            brandContainer.replaceChildren();
            brandsFromDB.forEach(brand => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'term-btn';
                btn.setAttribute('aria-pressed', 'false');
                btn.textContent = `[${brand.name}]`;
                btn.addEventListener('click', () => selectBrand(brand, btn));
                brandContainer.appendChild(btn);
            });
            brandLoadStatus.textContent = brandsFromDB.length ? '' : 'No hay marcas disponibles en este momento.';
            brandLoadStatus.hidden = brandsFromDB.length > 0;
        } catch (error) {
            console.error('Error al cargar las marcas:', error);
            brandLoadStatus.textContent = 'No se pudieron cargar las marcas. Verifica la conexión y vuelve a intentarlo.';
            brandLoadStatus.hidden = false;
            brandLoadStatus.querySelector('.brand-retry')?.remove();
            const retry = document.createElement('button');
            retry.type = 'button';
            retry.className = 'brand-retry';
            retry.textContent = 'Reintentar';
            retry.addEventListener('click', initBrands);
            brandLoadStatus.append(' ');
            brandLoadStatus.appendChild(retry);
        }
    }

    // Maneja la lógica de selección visual y despliegue 
    function selectBrand(brand, btnElement) {
        document.querySelectorAll('#brand-buttons button').forEach(b => {
            b.classList.remove('is-selected');
            b.setAttribute('aria-pressed', 'false');
        });
        btnElement.classList.add('is-selected');
        btnElement.setAttribute('aria-pressed', 'true');

        selectedBrand = brand.name;
        selectedModel = '';
        otherModelContainer.classList.add('is-hidden');
        customModelInput.value = '';

        if (brand.name === 'Otro') {
            otherBrandContainer.classList.remove('is-hidden');
            stepModel.classList.add('is-hidden');
        } else {
            otherBrandContainer.classList.add('is-hidden');
            customBrandInput.value = '';
            renderModels(brand.models);
        }
    }

    // Genera dinámicamente los botones de modelos correspondientes a la marca seleccionada
    function renderModels(models) {
        if (!modelContainer) return;
        modelContainer.replaceChildren();
        stepModel.classList.remove('is-hidden');

        (models || []).concat('Otro Modelo').forEach(model => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'term-btn';
                btn.setAttribute('aria-pressed', 'false');
            btn.textContent = `[${model}]`;
            btn.addEventListener('click', () => selectModel(model, btn));
            modelContainer.appendChild(btn);
        });
    }

    // Gestiona la selección del modelo específico
    function selectModel(model, btnElement) {
        document.querySelectorAll('#model-buttons button').forEach(b => {
            b.classList.remove('is-selected');
            b.setAttribute('aria-pressed', 'false');
        });
        btnElement.classList.add('is-selected');
        btnElement.setAttribute('aria-pressed', 'true');

        selectedModel = model;

        if (model === 'Otro Modelo') {
            otherModelContainer.classList.remove('is-hidden');
        } else {
            otherModelContainer.classList.add('is-hidden');
            customModelInput.value = '';
        }
    }

    // Evento de clic en el botón de envío del formulario de diagnóstico
    if (diagnosticForm && sendBtn) {
        diagnosticForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            let finalBrand = selectedBrand === 'Otro' ? (customBrandInput.value.trim() || 'No especificada') : selectedBrand;
            let finalModel = selectedModel === 'Otro Modelo' ? (customModelInput.value.trim() || 'No especificado') : selectedModel;

            const issue = issueInput.value.trim();
            const name = userNameInput.value.trim();
            const contact = userContactInput.value.trim();

            // Validaciones obligatorias previas al envío
            if (!finalBrand) return alert('Por favor selecciona la marca.');
            if (!issue) return alert('Por favor describe la falla.');
            if (!name) return alert('Por favor ingresa tu nombre.');
            if (!contact) return alert('Por favor ingresa tu contacto.');

            // Cambiar texto del botón a estado de carga
            const originalText = sendBtn.textContent;
            sendBtn.textContent = '[ ENVIANDO REPORTE... ]';
            sendBtn.disabled = true;
            showResult('loading', 'Enviando reporte', 'Estamos registrando tu solicitud.');

            try {
                const response = await fetch(`${API_URL}/diagnostics`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        brand: finalBrand,
                        model: finalModel,
                        issue: issue,
                        customerName: name,
                        customerContact: contact
                    })
                });

                if (!response.ok) {
                    const error = new Error('request-failed');
                    error.status = response.status;
                    throw error;
                }

                const data = await response.json();
                showResult('success', 'Reporte enviado correctamente', 'Se ha enviado el reporte de manera correcta. Nos pondremos en contacto en breve.', data.ticketNumber || '');

                // Limpieza total del formulario después de un envío exitoso
                issueInput.value = '';
                userNameInput.value = '';
                userContactInput.value = '';
                customBrandInput.value = '';
                customModelInput.value = '';
                selectedBrand = '';
                selectedModel = '';
                stepModel.classList.add('is-hidden');
                otherBrandContainer.classList.add('is-hidden');
                otherModelContainer.classList.add('is-hidden');
                document.querySelectorAll('#brand-buttons button, #model-buttons button').forEach(b => {
                    b.classList.remove('is-selected');
                    b.setAttribute('aria-pressed', 'false');
                });

            } catch (error) {
                let reason = 'No se pudo guardar el reporte. Intenta nuevamente en unos minutos.';
                if (error.status === 400) reason = 'Revisa los datos ingresados: hay un campo inválido o incompleto.';
                else if (error.status === 413) reason = 'El reporte supera el tamaño permitido. Reduce la descripción e inténtalo de nuevo.';
                else if (error.status === 429) reason = 'Se recibieron demasiados intentos. Espera unos minutos antes de volver a enviar.';
                else if (!error.status) reason = 'No se pudo conectar con el servicio. Revisa tu conexión e inténtalo nuevamente.';
                showResult('error', 'No se pudo enviar el reporte', reason);
            } finally {
                // Restaurar el estado original del botón
                sendBtn.textContent = originalText;
                sendBtn.disabled = false;
            }
        });
    }

    // Inicializar la ejecución del sistema de marcas al cargar la página
    initBrands();
});
