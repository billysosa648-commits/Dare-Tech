// Configuración central de API. En producción, asigna la URL pública del backend aquí.
(() => {
    const hostname = window.location.hostname || 'localhost';
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
    const localApi = `${protocol}//${hostname}:4000/api`;
    const productionApi = "https://dare-tech.onrender.com/api";
    window.DARE_TECH_API_URL = window.DARE_TECH_API_URL || (isLocal ? localApi : productionApi);
})();
