// Configuración central de API.
(() => {
    const hostname = window.location.hostname || 'localhost';
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
    const localApi = `${protocol}//${hostname}:4000/api`;
    const productionApi = "https://dare-tech.onrender.com/api";
    window.DARE_TECH_API_URL = window.DARE_TECH_API_URL || (isLocal ? localApi : productionApi);

    // Carga Turnstile solo si el backend publicó una site key para este frontend.
    window.DARE_TECH_TURNSTILE = (() => {
        let widgetId = null;
        let available = false;
        const ready = (async () => {
            try {
                if (!document.getElementById('turnstile-widget')) return true;
                const response = await fetch(`${window.DARE_TECH_API_URL}/public-config`);
                const { turnstileSiteKey } = await response.json();
                if (!response.ok || !turnstileSiteKey) return true;
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
                    script.async = true;
                    script.defer = true;
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
                widgetId = window.turnstile.render('#turnstile-widget', { sitekey: turnstileSiteKey });
                available = true;
                return true;
            } catch {
                return false;
            }
        })();
        return {
            ready,
            // Lee el token vigente sin modificar ni interpretar el contenido del reto.
            async getResponse() {
                if (!(await ready)) throw new Error('No se pudo cargar la verificación de seguridad.');
                return available ? window.turnstile.getResponse(widgetId) : '';
            },
            // Solicita a Turnstile un reto nuevo después de cada envío.
            async reset() {
                if (available) window.turnstile.reset(widgetId);
            }
        };
    })();
})();
