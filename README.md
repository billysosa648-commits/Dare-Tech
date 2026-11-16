# Dare-Tech

Servicio técnico Dare-Tech con backend Express/MongoDB y frontend estático/React. El panel React se encuentra en `admin-react.html`; el panel anterior `admin.html`, sus scripts y el seguimiento continúan disponibles durante la transición.

## Backend local

1. En `backend/`, copia `.env.example` a `.env` y completa `MONGO_URI`, `JWT_SECRET` y los demás valores para desarrollo.
2. Instala paquetes con `npm install`.
3. Inicia con `npm run dev` (usa `http://localhost:4000`).
4. Inserta las FAQs iniciales con `npm run seed:faqs`.

En Render define `NODE_ENV=production`, `TRUST_PROXY_HOPS=1`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET`, los límites deseados, `MONGO_URI`, `JWT_SECRET` y `FRONTEND_ORIGINS`. La aplicación no inicia si falta una clave de Turnstile en un entorno que no sea desarrollo. El backend acepta las claves de prueba de Cloudflare cuando las configuras en desarrollo.

## Frontend Vite y React

1. En `frontend/`, copia `.env.example` a `.env.local` y ajusta `VITE_API_BASE_URL` si el backend no corre en `http://localhost:4000/api`.
2. Instala con `npm install` (Node.js `22.12` o superior, requerido por Wrangler).
3. Inicia Vite con `npm run dev`; el panel React queda en `http://127.0.0.1:5173/admin-react.html` e incluye diagnósticos, estados, facturas, marcas/modelos, servicios, FAQs y cambio de contraseña.
4. Compila Tailwind y todas las páginas con `npm run build`; Vite escribe los archivos publicables en `frontend/dist/`.
5. Revisa localmente con `npm run preview`.
6. Para publicar en Cloudflare Workers, autentica una vez con `npx wrangler login` y después ejecuta `npm run deploy`.

`frontend/wrangler.jsonc` publica `dist` como assets estáticos del Worker. El nombre `dare-tech` coincide con el hostname de Workers usado hoy por el sitio (`dare-tech.billysosa648.workers.dev`); autentica Wrangler con la cuenta que administra ese Worker. El valor `VITE_API_BASE_URL` se incorpora al build del navegador; nunca pongas secretos del backend en variables `VITE_*`.

## Turnstile

Obtén una site key y una secret key en Cloudflare Turnstile. La site key puede mostrarse al navegador y se sirve desde `/api/public-config`; la secret key va solo en el entorno de Render o en el `.env` local. El dominio público debe estar permitido en el widget y en `FRONTEND_ORIGINS`.

## Verificaciones automatizadas

Los scripts de integración usan una base temporal en MongoDB y la eliminan al terminar. Se ejecutan desde `backend/` con `npm run test:diagnostic-abuse`, `npm run test:diagnostic-daily-limit`, `npm run test:deletion` y `npm run test:chatbot`. El script existente de facturas se ejecuta con `npm run test:invoice-flow`.

La portada conserva sus secciones actuales e incorpora diagnóstico React con Turnstile y un asistente FAQ de texto. El catálogo de servicios se gestiona en `/api/services`; el tiempo estimado es opcional.
La guía manual de Atlas, Compass y `mongosh` se agregará en la fase final junto con el inventario completo de colecciones y campos.
