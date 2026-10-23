// Configuración central de API. En producción, asigna la URL pública del backend aquí.
(() => {
    const hostname = window.location.hostname || 'localhost';
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    window.DARE_TECH_API_URL = window.DARE_TECH_API_URL || `${protocol}//${hostname}:4000/api`;
})();
