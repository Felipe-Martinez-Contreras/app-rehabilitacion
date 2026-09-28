# Manos que Suenan — reglas del proyecto

App web terapéutica (Vite + React + TypeScript) que usa la cámara para reconocer la mano, contar repeticiones y convertirlas en música. Todo ocurre en el dispositivo.

**Al comenzar cada hito, relee completo `docs/especificacion.md`.** Es la fuente de verdad; estas reglas la resumen, no la reemplazan.

## Forma de trabajo
- Se avanza por hitos (ver especificación §1). Al cerrar cada uno: `npm test` en verde, `npm run build` sin errores ni advertencias, resumen de máximo 5 puntos y qué debe probar la persona con su cámara. Luego detenerse y esperar su confirmación.
- Tras la confirmación: commit con mensaje claro en español. El push lo hace la persona, nunca Claude.
- No agregar funciones que no estén en la especificación sin preguntar.
- Cambios mínimos: editar lo necesario, sin reescribir archivos completos.
- Cada función pura de `src/detection/` se crea junto con su prueba Vitest (`*.test.ts`) en el mismo hito, usando landmarks sintéticos (`src/detection/manoSintetica.ts`). Las pruebas son la forma de verificar la lógica, porque Claude no puede ver la cámara.

## Privacidad de la cámara (no negociable)
- `getUserMedia({ video: { facingMode: 'user' }, audio: false })`. Nunca el micrófono. `<video>` con `playsinline` y `muted`.
- La cámara se enciende solo por acción de la persona y se apaga al cerrar, al pulsar "Detener", al salir de la rutina y al ocultar la pestaña.
- Prohibido: grabar video, capturar fotos, exportar el canvas (`toDataURL`/`toBlob`), guardar landmarks o imágenes y enviar cualquier dato a la red (sin fetch, XHR, WebSocket ni sendBeacon propios, sin URLs externas en tiempo de ejecución).
- Indicador visible "Cámara activa · procesamiento local" con botón para apagarla. Solo modelo de mano; nunca el rostro.
- Ningún recurso externo: el modelo está en `public/models/` (se sube al repo) y los wasm se copian a `public/wasm/` en `predev`/`prebuild` (ignorado por git). URLs absolutas con `new URL(import.meta.env.BASE_URL + ruta, document.baseURI)` (ver `src/camera/assets.ts`).

## Dependencias permitidas
- Producción: solo `react`, `react-dom` y `@mediapipe/tasks-vision`, con versiones fijadas (sin `^`). Desarrollo: Vite, TypeScript, tipos de React y Vitest.
- **`@mediapipe/tasks-vision` está fijada en 0.10.35 a propósito.** La 1.0.1 envía métricas de uso a Google (`POST https://odml.pa.googleapis.com/v1/log` cada 60 s, sin opción para desactivarlo), lo que rompe la promesa de privacidad. Antes de actualizarla, busca en `node_modules/@mediapipe/tasks-vision` (todos los `.js` y la carpeta `wasm/`) las cadenas `odml.pa.googleapis.com`, `googleapis.com`, `clearcut` y `/v1/log`, revisa el contexto de cada coincidencia y confirma en la pestaña Red que no hay peticiones a otros dominios. En 0.10.35 solo aparece `type.googleapis.com/...` (nombres de tipos protobuf, no URLs de red).

## Detección
- Lógica de detección y conteo en funciones puras en `src/detection/` (sin DOM ni React). Todos los umbrales en `src/detection/config.ts`, comentados.
- Landmarks a píxeles antes de medir (x·ancho, y·alto, z·ancho); métricas divididas por el tamaño de la palma (0 → 9); media móvil exponencial + histéresis con 3 fotogramas de confirmación.
- No usar la etiqueta izquierda/derecha. Video y canvas se espejan juntos; los textos nunca.
- No re-renderizar React por fotograma: canvas y panel por refs; el estado cambia solo en eventos.
- Panel de depuración solo con `?debug=1`.

## Tono y derivación
- Español neutro, tratando de tú. Invitaciones ("cuando quieras", "a tu ritmo", "puedes"), nunca órdenes. Sin urgencia, sin rojo, sin sonidos de error, sin gamificación que genere culpa.
- Si la detección falla, la responsabilidad es de la app ("No alcanzo a ver tu mano"), nunca de la persona.
- No diagnostica, no mide clínicamente y no promete curar. Los valores son referenciales.
- Mensaje de derivación visible en todas las pantallas: "Esta app acompaña tu rutina; no reemplaza a tu kinesiólogo/a ni a tu equipo de salud. Si sientes dolor, hormigueo o algo no se siente bien, detente y consulta."

## Accesibilidad (WCAG 2.2 AA)
- `lang="es"`, HTML semántico (header, main, footer, un `h1` por pantalla que recibe el foco), `<button>` reales de al menos 48 × 48 px con texto visible.
- Foco visible de 3 px. Uso completo con teclado. `aria-live="polite"` para avisos de estado.
- Contraste AA verificado (tokens en `src/styles/global.css`): lavanda `#8B7FC7` solo para bordes/íconos (texto: `#6B5FAF`); durazno `#F2B89B` solo relleno, con borde `#C4704A`.
- El significado nunca depende solo del color. Tamaños en rem; sin scroll horizontal a 360 px ni con zoom al 200 %.

## Despliegue
- Google Cloud Run con Docker; **no se usa Vercel**. `Dockerfile` multietapa (`node:22-alpine` → `nginx:alpine`), nginx en el puerto 8080 (`nginx.conf`).
- Probar la imagen: `docker build -t app-rehabilitacion .` y `docker run --rm -p 8080:8080 app-rehabilitacion` → http://localhost:8080.
- Desplegar: `gcloud run deploy --source . --allow-unauthenticated`.
