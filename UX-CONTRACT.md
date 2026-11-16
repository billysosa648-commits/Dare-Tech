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
| Campos | Componentes compartidos por definir en Fase 3 | Etiqueta, error y estado ocupado permanecen asociados. |
| Selección múltiple | Tabla compartida por definir en Fase 3 | La selección se limita a filas visibles de la página. |
| Confirmación de borrado | Diálogo compartido por definir en Fase 3 | El usuario escribe el ticket o número de factura antes de confirmar. |
| Mensajes | Región de estado común por definir en Fase 3 | Mensajes claros de éxito, conflicto y recuperación. |

## Comportamiento de operaciones

| Operación | En curso | Éxito | Error y recuperación |
|---|---|---|---|
| Login | Deshabilitar el botón y mostrar progreso | Abrir el panel | Mantener formulario y explicar el error. |
| Borrado | Bloquear repetición y mostrar objeto confirmado | Actualizar lista y anunciar el resultado | En un `409`, mostrar las facturas asociadas y ofrecer el paso de confirmación explícita. |
| Guardar FAQ | Conservar el borrador durante la solicitud | Mantenerse en el editor y mostrar guardado | Mantener el contenido para corregir y reintentar. |
| Búsqueda | Indicar carga y conservar filtros | Actualizar resultados | Mostrar error recuperable sin borrar la búsqueda. |

Los documentos antiguos quedan activos hasta que la versión React de cada pantalla esté conectada y confirmada. Los mensajes de error y éxito usan texto, no solo color. Las ventanas modales devuelven el foco al control que las abrió y cierran con `Escape` cuando no hay una operación destructiva pendiente.
