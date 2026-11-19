# Dare-Tech UX Contract

## Contexto del producto

- Audiencia: clientes que solicitan y siguen reparaciones, y la persona administradora del negocio.
- Trabajos: enviar diagnóstico, consultar ticket, gestionar reportes/facturas/FAQs.
- Mercado e idioma: Ecuador; español; las fechas del panel se presentan con `es-EC`.
- Accesibilidad: conservar navegación por teclado, foco visible y mensajes de estado con `aria-live`.
- Fuentes de comportamiento: `backend/SECURITY.md`, rutas Express en `backend/src/routes/` y el contexto de proyecto entregado por el usuario.
- Identidad visual: `DESIGN.md`; la paleta en ejecución está en `frontend/css/stylesheet.css`.

## Mapa de componentes compartidos

| Capacidad | Dueño | Política |
|---|---|---|
| API React | `frontend/src/services/api.js` | Todas las llamadas React pasan por `apiFetch`. |
| Sesión JWT React | `frontend/src/services/sessionStore.js` | Token solo en memoria; se pierde al recargar. |
| Campos | Formularios del panel React en `frontend/src/pages/AdminScaffold.jsx` | Etiqueta y estado permanecen asociados; el borrador se conserva en caso de error. |
| Selección múltiple | frontend/src/components/DeleteRecordsDialog.jsx (React) y frontend/js/admin.js (admin.html) | La tabla unificada muestra reportes y facturas; seleccionar visibles aplica al filtro actual, conserva selección al buscar y limita cada operación a 100 elementos. |
| Confirmación de borrado | Diálogo de ambos paneles | Confirma cantidad y registros; para borrar un reporte se deben seleccionar también todas sus facturas asociadas. |
| Mensajes | Regiones de estado del panel y formularios | Los conflictos muestran facturas relacionadas y una opción de recuperación. |
| Servicios | `Service` y `/api/services` | Nombre, categoría, descripción, estado y tiempo estimado opcional; gestión por el panel. |
| Asistente de portada | `frontend/src/home.jsx` y `/api/chatbot` | Texto FAQ, sugerencias seleccionables y aviso de que precio/tiempo requieren diagnóstico. |

## Comportamiento de operaciones

| Operación | En curso | Éxito | Error y recuperación |
|---|---|---|---|
| Login | Deshabilitar el botón y mostrar progreso | Abrir el panel | Mantener formulario y explicar el error. |
| Borrado de reporte/factura | Bloquear cambios de selección y doble envío | Borrar primero facturas seleccionadas y luego reportes, actualizar las listas y anunciar cantidades | Mantener tabla y selección ante error; si se borran facturas y falla el borrado de reportes, informar el resultado parcial y permitir recargar. |
| Guardar FAQ | Conservar el borrador durante la solicitud | Mantenerse en el editor y mostrar guardado | Mantener el contenido para corregir y reintentar. |
| Búsqueda | Indicar carga y conservar filtros | Actualizar resultados | Mostrar error recuperable sin borrar la búsqueda. |

Los documentos antiguos quedan activos hasta que la versión React de cada pantalla esté conectada y confirmada. Los mensajes de error y éxito usan texto, no solo color. Las ventanas modales devuelven el foco al control que las abrió y cierran con `Escape` cuando no hay una operación destructiva pendiente.
