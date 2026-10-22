# Configuración segura

1. Copia `.env.example` a `.env` y coloca credenciales reales fuera del control de versiones.
2. Configura `JWT_SECRET` con al menos 32 bytes aleatorios y `FRONTEND_ORIGINS` con los orígenes exactos del frontend desplegado. Si despliegas detrás de un proxy confiable, ajusta `TRUST_PROXY_HOPS` al número exacto de proxies para que los límites por IP se apliquen correctamente.
3. Define `ADMIN_BOOTSTRAP_KEY` como secreto largo temporal. Crea el primer administrador con `POST /api/auth/register`, enviando `x-admin-bootstrap-key` y el cuerpo `{ "username": "...", "password": "..." }`. La contraseña debe tener de 12 a 72 caracteres.
4. Retira `ADMIN_BOOTSTRAP_KEY` del entorno después del alta inicial. El endpoint de bootstrap solo funciona mientras no exista un administrador y registra el uso de forma atómica.

Los HTML cargan scripts externos desde `frontend/js/` y estilos compilados locales desde `frontend/css/tailwind.css`, además de `frontend/css/stylesheet.css`. Ejecuta `npm install` y `npm run build:css` dentro de `frontend/` después de cambiar clases Tailwind. Ajusta la URL de API en `frontend/js/common.js` para el despliegue.

Las páginas incluyen una política CSP de desarrollo que permite las APIs de localhost. En producción, actualiza `connect-src` en los tres HTML para que incluya el origen exacto de la API y configura la misma política como cabecera HTTP en el hosting estático; una política en `<meta>` no reemplaza cabeceras como HSTS, `X-Content-Type-Options` o `frame-ancestors`.
