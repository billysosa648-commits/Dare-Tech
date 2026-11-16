# Configuración segura

## Límites, Turnstile y proxy

- En desarrollo, configura `NODE_ENV=development`. En producción configura `NODE_ENV=production`, `TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET` en Render. La aplicación no inicia en modo distinto de desarrollo si falta una de las claves; la secreta nunca se publica al navegador.
- Puedes usar las claves de prueba de Cloudflare Turnstile en desarrollo. La ruta de diagnóstico verifica el token con `siteverify`; en desarrollo solo permite omitir la comprobación si no hay clave secreta configurada. Producción falla cerrada.
- `DIAGNOSTIC_RATE_LIMIT_HOURLY` y `DIAGNOSTIC_RATE_LIMIT_DAILY` limitan creación por IP. `DIAGNOSTIC_CONTACT_DAILY_LIMIT` limita el contacto por día de Guayaquil y `DIAGNOSTIC_MIN_FILL_MS` rechaza envíos instantáneos. `CHATBOT_RATE_LIMIT_WINDOW_MS` y `CHATBOT_RATE_LIMIT_MAX` controlan el chatbot; `ADMIN_RATE_LIMIT_WINDOW_MS` y `ADMIN_RATE_LIMIT_MAX` limitan el panel.
- El límite predeterminado usa memoria local del proceso; varias instancias Render no comparten el contador. Si se escala a varias instancias, se debe conectar un almacén compartido para `express-rate-limit` antes de depender de los topes como cuotas globales.
- Las huellas de contacto y problema usan HMAC-SHA-256 con `JWT_SECRET`; las reservas de problema expiran después de 24 horas en la colección `spamfingerprints`. Mantén estable `JWT_SECRET` para conservar el reconocimiento entre reinicios.
- Mantén `TRUST_PROXY_HOPS=0` al desarrollar sin proxy. En el servicio web de Render, establece `TRUST_PROXY_HOPS=1` para que Express use la dirección del cliente que reenvía el balanceador. Si el servicio se coloca detrás de un proxy adicional propio, mide la cadena real antes de cambiarlo.
- Turnstile necesita que la política CSP de la página permita `https://challenges.cloudflare.com` en `script-src`, `frame-src` y `connect-src`; el formulario principal ya declara estos orígenes. El middleware Helmet del backend también incluye esos orígenes.

## Eliminación administrativa y auditoría

- `DELETE /api/invoices/:id` elimina definitivamente una factura. La acción administrativa anterior de anular facturas se conserva en `PATCH /api/invoices/:id/annul`.
- `DELETE /api/diagnostics/:id` responde `409` con las facturas asociadas. Solo `?withInvoices=true` permite borrar el diagnóstico junto con ellas. Los endpoints `/bulk-delete` aceptan de 1 a 100 IDs Mongo explícitos.
- Las eliminaciones definitivas crean registros en la colección `auditlogs` con ID del administrador, tipo de documento, ID y número de referencia, fecha e IP. No se copian nombre, contacto, descripción ni otros datos del cliente.
- Las facturas usan un contador separado y un número único `DT-000001` en adelante. El contador no retrocede al borrar: los números eliminados quedan como huecos y nunca se reutilizan.

## Chatbot y FAQs

- `POST /api/chatbot` consulta la colección `faqs`, puntúa coincidencias por palabras y reconoce tickets públicos `DT-...`. No usa IA ni envía mensajes a proveedores externos.
- Ejecuta `npm run seed:faqs` desde `backend/` para insertar las preguntas iniciales basadas en el sitio. El seed usa `$setOnInsert`, así que no sobrescribe cambios administrativos.
- El sitio no publica precios, horarios, plazos concretos ni condiciones generales de garantía. Las respuestas iniciales indican esa ausencia y ofrecen los contactos publicados.

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
