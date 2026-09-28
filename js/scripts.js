/* ========================================== */
/* LÓGICA DE INTERACTIVIDAD Y ENVÍO AL BACKEND  */
/* ========================================== */

document.addEventListener('DOMContentLoaded', () => {

    const API_URL = 'http://localhost:4000/api'; // cámbialo cuando subas el backend a producción

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

    // Función que inicializa y pinta los botones de las marcas en el Paso 1
    async function initBrands() {
        if (!brandContainer) return;
        try {
            const response = await fetch(`${API_URL}/brands`);
            brandsFromDB = await response.json();

            brandContainer.innerHTML = '';
            brandsFromDB.forEach(brand => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'term-btn px-4 py-2 border border-[#00f3ff]/40 bg-[#05080c] text-slate-400 text-sm rounded hover:border-[#00f3ff] hover:text-[#00f3ff] transition-all';
                btn.textContent = `[${brand.name}]`;
                btn.addEventListener('click', () => selectBrand(brand, btn));
                brandContainer.appendChild(btn);
            });
        } catch (error) {
            console.error('Error al cargar las marcas:', error);
        }
    }

    // Maneja la lógica de selección visual y despliegue del Paso 2 según la marca elegida
    function selectBrand(brand, btnElement) {
        document.querySelectorAll('#brand-buttons button').forEach(b => {
            b.classList.remove('bg-[#00f3ff]/15', 'border-[#00f3ff]', 'text-[#00f3ff]', 'font-bold');
        });
        btnElement.classList.add('bg-[#00f3ff]/15', 'border-[#00f3ff]', 'text-[#00f3ff]', 'font-bold');

        selectedBrand = brand.name;
        selectedModel = '';
        otherModelContainer.classList.add('hidden');
        customModelInput.value = '';

        if (brand.name === 'Otro') {
            otherBrandContainer.classList.remove('hidden');
            stepModel.classList.add('hidden');
        } else {
            otherBrandContainer.classList.add('hidden');
            customBrandInput.value = '';
            renderModels(brand.models);
        }
    }

    // Genera dinámicamente los botones de modelos correspondientes a la marca seleccionada
    function renderModels(models) {
        if (!modelContainer) return;
        modelContainer.innerHTML = '';
        stepModel.classList.remove('hidden');

        (models || []).concat('Otro Modelo').forEach(model => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'term-btn px-4 py-2 border border-[#00f3ff]/40 bg-[#05080c] text-slate-400 text-sm rounded hover:border-[#00f3ff] hover:text-[#00f3ff] transition-all';
            btn.textContent = `[${model}]`;
            btn.addEventListener('click', () => selectModel(model, btn));
            modelContainer.appendChild(btn);
        });
    }

    // Gestiona la selección del modelo específico
    function selectModel(model, btnElement) {
        document.querySelectorAll('#model-buttons button').forEach(b => {
            b.classList.remove('bg-[#00f3ff]/15', 'border-[#00f3ff]', 'text-[#00f3ff]', 'font-bold');
        });
        btnElement.classList.add('bg-[#00f3ff]/15', 'border-[#00f3ff]', 'text-[#00f3ff]', 'font-bold');

        selectedModel = model;

        if (model === 'Otro Modelo') {
            otherModelContainer.classList.remove('hidden');
        } else {
            otherModelContainer.classList.add('hidden');
            customModelInput.value = '';
        }
    }

    // Evento de clic en el botón de envío del formulario de diagnóstico
    if (sendBtn) {
        sendBtn.addEventListener('click', async () => {
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
            const originalText = sendBtn.innerHTML;
            sendBtn.innerHTML = '[ ENVIANDO REPORTE... ]';
            sendBtn.disabled = true;

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
                    throw new Error('El servidor respondió con un error');
                }

                const data = await response.json();
                alert(`¡Diagnóstico enviado con éxito! Tu número de ticket es: ${data.ticketNumber}`);

                // Limpieza total del formulario después de un envío exitoso
                issueInput.value = '';
                userNameInput.value = '';
                userContactInput.value = '';
                customBrandInput.value = '';
                customModelInput.value = '';
                selectedBrand = '';
                selectedModel = '';
                stepModel.classList.add('hidden');
                otherBrandContainer.classList.add('hidden');
                otherModelContainer.classList.add('hidden');
                document.querySelectorAll('#brand-buttons button, #model-buttons button').forEach(b => {
                    b.classList.remove('bg-[#00f3ff]/15', 'border-[#00f3ff]', 'text-[#00f3ff]', 'font-bold');
                });

            } catch (error) {
                alert('Hubo un problema de conexión. Por favor intenta más tarde.');
            } finally {
                // Restaurar el estado original del botón
                sendBtn.innerHTML = originalText;
                sendBtn.disabled = false;
            }
        });
    }

    // Inicializar la ejecución del sistema de marcas al cargar la página
    initBrands();
});