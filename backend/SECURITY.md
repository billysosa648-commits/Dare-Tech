# Configuración segura

1. Copia `.env.example` a `.env` y coloca credenciales reales fuera del control de versiones.
2. Configura `JWT_SECRET` con al menos 32 bytes aleatorios y `FRONTEND_ORIGINS` con los orígenes exactos del frontend desplegado. Si despliegas detrás de un proxy confiable, ajusta `TRUST_PROXY_HOPS` al número exacto de proxies para que los límites por IP se apliquen correctamente.
3. Define `ADMIN_BOOTSTRAP_KEY` como secreto largo temporal. Crea el primer administrador con `POST /api/auth/register`, enviando `x-admin-bootstrap-key` y el cuerpo `{ "username": "...", "password": "..." }`. La contraseña debe tener de 12 a 72 caracteres.
4. Retira `ADMIN_BOOTSTRAP_KEY` del entorno después del alta inicial. El endpoint de bootstrap solo funciona mientras no exista un administrador y registra el uso de forma atómica.

## Credenciales de MongoDB Atlas

- `MONGO_URI` contiene credenciales de servidor. Debe existir solo en el entorno del backend o en el gestor de secretos del proveedor de despliegue; nunca en `frontend/`, HTML, JavaScript del navegador, repositorios públicos ni capturas de pantalla.
- Crea un usuario de base de datos exclusivo para Dare-Tech, con rol `readWrite` limitado a la base usada por la aplicación. No uses usuarios de administración del proyecto ni roles globales como `readWriteAnyDatabase`.
- Limita Network Access en Atlas a las IP de salida del backend o usa conectividad privada. No mantengas `0.0.0.0/0` habilitado en producción.
- Si la URI o su contraseña se compartió, publicó o envió a un tercero, rota la contraseña del usuario en Atlas, actualiza el secreto del backend y reinícialo. Borrar el secreto del repositorio no invalida copias previas.
- Comprueba que el backend vuelve a conectar tras la rotación y elimina usuarios antiguos que ya no se utilicen. No pegues la URI real en reportes, tickets ni conversaciones.

Los HTML cargan scripts externos desde `frontend/js/` y estilos compilados locales desde `frontend/css/tailwind.css`, además de `frontend/css/stylesheet.css`. Ejecuta `npm install` y `npm run build:css` dentro de `frontend/` después de cambiar clases Tailwind. Ajusta la URL de API en `frontend/js/common.js` para el despliegue.

Las páginas incluyen una política CSP de desarrollo que permite las APIs de localhost. En producción, actualiza `connect-src` en los tres HTML para que incluya el origen exacto de la API y configura la misma política como cabecera HTTP en el hosting estático; una política en `<meta>` no reemplaza cabeceras como HSTS, `X-Content-Type-Options` o `frame-ancestors`.
