---
version: alpha
name: "Dare-Tech"
description: "Servicio técnico ecuatoriano con identidad de terminal y administración clara."
colors:
  background: "#0a0e14"
  surface: "#0d1117"
  cyan: "#00f3ff"
  green: "#00ff66"
  text: "#e2e8f0"
  muted: "#94a3b8"
  danger: "#ef4444"
typography:
  sans:
    fontFamily: '"Fira Code", ui-monospace, SFMono-Regular, Menlo, monospace'
  mono:
    fontFamily: '"Fira Code", ui-monospace, SFMono-Regular, Menlo, monospace'
rounded:
  sm: "0.25rem"
  md: "0.375rem"
  lg: "0.5rem"
spacing:
  page-gutter: "clamp(1rem, 4vw, 4rem)"
  content-max: "72rem"
components:
  button: {}
  card: {}
  dialog: {}
---

# Dare-Tech Design System

## Overview

### Creative North Star

La interfaz toma sus señales del banco de reparación: una base oscura y silenciosa, trazos finos de diagnóstico y acentos cian y verde que identifican acciones y estados.

### Product context and register

- **Audience and primary job:** clientes en Ecuador que solicitan o siguen una reparación; administradores que gestionan reportes y facturas.
- **Target market(s) and evidence:** Ecuador; la marca, la ubicación y los contactos del sitio identifican Guayaquil, Ecuador.
- **Locale(s) and language policy:** español; fechas visibles usan `es-EC` y zona horaria del navegador salvo que el producto defina otra.
- **Usage scene:** celular para el formulario y seguimiento; escritorio y celular para tareas administrativas.
- **Register:** híbrido: marca técnica para la página pública y lectura operativa para el panel.
- **Memorable signature:** etiquetas cortas que recuerdan una consola técnica sin ocultar el nombre real de cada acción.
- **Restraint:** el cian y verde resaltan interacción y estado; no reemplazan texto ni se usan como decoración extensa.
- **Anti-references:** paneles con brillo continuo, navegación ambigua o tablas ilegibles en móvil.
- **Token ownership/runtime mapping:** este archivo registra los valores observados en `frontend/css/stylesheet.css`; React reutiliza esa hoja y `frontend/src/styles/react-scaffold.css`. Actualizar ambos en el mismo cambio si se modifica la paleta.

## Colors

La superficie es casi negra (`background`, `surface`) para continuar el tema actual. Cian (`cyan`) identifica enlaces y acciones principales; verde (`green`) distingue éxito y foco visible. Texto y estados secundarios usan contraste alto con `text` y `muted`; `danger` queda reservado para errores y borrados.

## Typography

Fira Code es la voz existente del producto y se usa con una pila de reserva de ancho fijo. Mantén frases cortas, etiquetas en español sencillo y números alineados; no dependas solo del color para comunicar estado.

## Layout

Las secciones públicas usan el ancho máximo ya presente y el panel puede ocupar más espacio para listas. En móviles, convertir tablas densas en tarjetas o permitir desplazamiento local sin mover toda la página. Mantener el foco visible y el orden de lectura del documento.

## Elevation & Depth

La jerarquía se comunica con superficies próximas y bordes discretos. Evitar sombras luminosas amplias; reservar superposición para diálogos que bloquean una confirmación.

## Shapes

Los radios pequeños existentes (`sm` a `lg`) mantienen el aspecto técnico del sitio. Los controles destructivos conservan separación visual y una etiqueta escrita completa.

## Components

### Foundational visual states

Todo control debe distinguir foco, deshabilitado, ocupado, éxito y error; el movimiento respeta `prefers-reduced-motion`.

### Buttons and actions

Una acción primaria por bloque, verbos concretos y confirmación explícita antes de borrar. El texto de éxito usa el mismo verbo que el botón.

### Navigation and data display

Las pantallas administrativas conservan filtros, paginación y acceso legible a números de ticket y factura.

### Forms and overlays

Cada campo tiene etiqueta visible o accesible, errores asociados al campo y diálogos con foco controlado.
