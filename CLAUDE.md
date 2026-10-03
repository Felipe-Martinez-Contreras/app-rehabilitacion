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
- Landmarks a píxeles antes de medir (x·ancho, y·alto, z·ancho); métricas divididas por el tamaño de la palma (0 → 9); media móvil exponencial + histéresis.
- Decisiones tomadas con mediciones reales (ya incorporadas en la especificación; valores medidos en `src/detection/config.ts`):
  - Los cambios de estado se confirman por tiempo (150 ms), no por número de fotogramas, porque los fps varían entre 29 y 60.
  - La apertura por distancias es la métrica principal de la flor y el filtro de toques (60 % del rango calibrado; 1,40 sin calibrar). La flexión por ángulos tiene saltos: solo es informativa.
  - Al detectar la mano se ignoran los primeros 300 ms; al perderla se reinicia el estado del toque y de los contadores en curso.
  - Los umbrales de los ejercicios salen siempre del rango calibrado de la persona, nunca de valores fijos. Rango mínimo 0,15: bajo eso se invita a recalibrar y, al segundo intento, se amplía a 0,15 alrededor de su punto medio. Los valores sin calibrar (1,40) solo rigen antes de calibrar.
  - El abanico tiene su propia minicalibración (3 s dedos juntos + 3 s separados); sus umbrales (35 % y 70 %) salen de ese rango, con rango mínimo 0,10 (el ruido de la separación con los dedos quietos es 0,02–0,03). La separación máxima de la calibración inicial es solo referencia: depende de cuánto se abre la mano.
  - Toques y repeticiones solo cuentan con la palma de frente (normal con 0, 5 y 17; signo de la palma registrado en la calibración).
- No usar la etiqueta izquierda/derecha. Video y canvas se espejan juntos; los textos nunca.
- No re-renderizar React por fotograma: canvas y panel por refs; el estado cambia solo en eventos.
- Panel de depuración solo con `?debug=1`.

## Sonido
- Web Audio API nativa, todo sintetizado (`src/sound/motor.ts`): sin archivos de audio ni librerías, nunca el micrófono, sin sonidos de error. Todo en Do: la flor sube por la escala mayor de Do (Do, Re, Mi, Fa, Sol, La, Si, Do agudo; si no termina en Do, la resuelve un acorde suave de Do); el piano, el arpegio y los acordes usan la pentatónica de Do. El acorde del abanico es Do4–Mi4–Sol4.
- Los volúmenes cambian siempre con rampas suaves desde el valor actual (`cancelScheduledValues` + `setTargetAtTime`), nunca con saltos por fotograma. Con "Sonido" apagado no se crea ninguna nota, y el clic del propio botón no reanuda el sonido.
- El `AudioContext` se crea o reanuda en un clic de la persona; se silencia al ocultar la pestaña y al pulsar "Detener".
- Lógica pura con pruebas en `src/sound/` (`notas.ts`, `acorde.ts`, `melodia.ts`). La melodía del día vive solo en memoria: silencios recortados a 1,5 s, máximo 20 s, separación mínima de 150 ms.
- Animaciones decorativas solo dentro de `@media (prefers-reduced-motion: no-preference)`; la flor y el abanico siguen reflejando la mano siempre.

## Consola
- Advertencias conocidas aceptadas en la auditoría de "consola sin errores": las dos advertencias internas de MediaPipe (`vision_wasm_internal.js`) que aparecen al cargar el modelo: "OpenGL error checking is disabled" (informativa, del motor gráfico) y "landmark_projection_calculator.cc:81 Using NORM_RECT without IMAGE_DIMENSIONS is only supported for the square ROI" (aparece con video no cuadrado; la detección funciona bien). No son errores de la app y no se corrigen si eso implica cambiar la detección.

## Guardado local
- Solo `localStorage` con try/catch y solo dos claves: `mqs:ajustes` (preferencias) y `mqs:registro` (por rutina: fecha AAAA-MM-DD, fases completadas, repeticiones y cómo se sintió).
- La calibración nunca se guarda: se calibra en cada sesión ("Recalibrar" la repite dentro de la sesión). El rango cambia día a día y se acerca a un dato clínico.
- Nace una flor en el jardín por cada rutina con al menos una repetición, también con "Terminar por hoy".

## Tono y derivación
- Español neutro, tratando de tú. Invitaciones ("cuando quieras", "a tu ritmo", "puedes"), nunca órdenes. Sin urgencia, sin rojo, sin sonidos de error, sin gamificación que genere culpa.
- Si la detección falla, la responsabilidad es de la app ("No alcanzo a ver tu mano"), nunca de la persona.
- No diagnostica, no mide clínicamente y no promete curar. Los valores son referenciales.
- Mensaje de derivación visible en todas las pantallas (con poca altura, versión compacta de una línea que abre "Privacidad y ayuda"): "Esta app acompaña tu rutina; no reemplaza a tu kinesiólogo/a ni a tu equipo de salud. Si sientes dolor, hormigueo o algo no se siente bien, detente y consulta."

## Accesibilidad (WCAG 2.2 AA)
- `lang="es"`, HTML semántico (header, main, footer, un `h1` por pantalla que recibe el foco), `<button>` reales de al menos 48 × 48 px con texto visible.
- Foco visible de 3 px. Uso completo con teclado. `aria-live="polite"` para avisos de estado.
- Contraste AA verificado (tokens en `src/styles/global.css`): lavanda `#8B7FC7` solo para bordes/íconos (texto: `#6B5FAF`); durazno `#F2B89B` solo relleno, con borde `#C4704A`.
- Botones de alternancia (como "Sonido"): texto fijo con `aria-pressed`, nunca un texto que cambia con el estado junto con `aria-pressed`; el estado se ve además en el ícono o el estilo.
- El significado nunca depende solo del color. Tamaños en rem; sin scroll horizontal a 360 px ni con zoom al 200 %.

## Despliegue
- Google Cloud Run con Docker; **no se usa Vercel**. `Dockerfile` multietapa (`node:22-alpine` → `nginx:alpine`), nginx en el puerto 8080 (`nginx.conf`).
- Probar la imagen: `docker build -t app-rehabilitacion .` y `docker run --rm -p 8080:8080 app-rehabilitacion` → http://localhost:8080.
- Desplegar: `gcloud run deploy --source . --allow-unauthenticated`.
