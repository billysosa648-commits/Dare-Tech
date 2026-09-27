/* ========================================== */
/* LÓGICA DE INTERACTIVIDAD Y ENVÍO A TELEGRAM  */
/* ========================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    // Base de datos local simulada para las marcas y sus respectivos modelos
    const brandData = {
        'Apple': ['iPhone 15', 'iPhone 14', 'iPhone 13', 'MacBook Air', 'iPad Pro', 'Otro Modelo'],
        'Samsung': ['S24 Ultra', 'A55', 'Z Flip', 'S23', 'A34', 'Otro Modelo'],
        'Xiaomi': ['Redmi Note 13', 'Poco X6 Pro', 'Xiaomi 14', 'Redmi 12', 'Otro Modelo'],
        'Motorola': ['Edge 40', 'Moto G84', 'Razr 40', 'Moto G23', 'Otro Modelo'],
        'HP': ['Pavilion', 'Victus', 'Spectre', 'ProBook', 'Otro Modelo'],
        'Lenovo': ['ThinkPad', 'Legion', 'IdeaPad', 'Yoga', 'Otro Modelo'],
        'Otro': []
    };

    let selectedBrand = '';
    let selectedModel = '';

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
    function initBrands() {
        if (!brandContainer) return;
        brandContainer.innerHTML = '';
        Object.keys(brandData).forEach(brand => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'term-btn px-4 py-2 border border-[#00f3ff]/40 bg-[#05080c] text-slate-400 text-sm rounded hover:border-[#00f3ff] hover:text-[#00f3ff] transition-all';
            btn.textContent = `[${brand}]`;
            btn.addEventListener('click', () => selectBrand(brand, btn));
            brandContainer.appendChild(btn);
        });
    }

    // Maneja la lógica de selección visual y despliegue del Paso 2 según la marca elegida
    function selectBrand(brand, btnElement) {
        document.querySelectorAll('#brand-buttons button').forEach(b => {
            b.classList.remove('bg-[#00f3ff]/15', 'border-[#00f3ff]', 'text-[#00f3ff]', 'font-bold');
        });
        btnElement.classList.add('bg-[#00f3ff]/15', 'border-[#00f3ff]', 'text-[#00f3ff]', 'font-bold');

        selectedBrand = brand;
        selectedModel = ''; 
        otherModelContainer.classList.add('hidden');
        customModelInput.value = '';

        if (brand === 'Otro') {
            otherBrandContainer.classList.remove('hidden');
            stepModel.classList.add('hidden');
        } else {
            otherBrandContainer.classList.add('hidden');
            customBrandInput.value = '';
            renderModels(brand);
        }
    }

    // Genera dinámicamente los botones de modelos correspondientes a la marca seleccionada
    function renderModels(brand) {
        if (!modelContainer) return;
        modelContainer.innerHTML = '';
        stepModel.classList.remove('hidden');

        const models = brandData[brand] || [];
        models.forEach(model => {
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
            sendBtn.innerHTML = '[ ENVIANDO REPORTE A TELEGRAM... ]';
            sendBtn.disabled = true;

            // URL del Webhook seguro de Google Apps Script vinculado al Bot
            const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwNHB0L_SWKhdDflbv4dJImiU6_NHyY4cPpkxeGn0ZxAgjIQUdMN5CBN0u-vqXKXDoD/exec';

            try {
                // Envío de datos por método POST en segundo plano
                await fetch(WEBHOOK_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        marca: finalBrand,
                        modelo: finalModel,
                        falla: issue,
                        nombre: name,
                        contacto: contact
                    })
                });

                alert('¡Diagnóstico enviado con éxito! Un técnico te contactará pronto.');
                
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