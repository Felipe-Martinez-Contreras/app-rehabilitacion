# App terapéutica con cámara: "Manos que Suenan"

Construye desde cero una app web terapéutica de salud física para un seminario sobre inclusión. La cámara web es obligatoria y es el centro de la experiencia: la app reconoce la mano en tiempo real, cuenta repeticiones, guía una rutina paso a paso y convierte cada movimiento en música. Todo el procesamiento ocurre en el dispositivo de la persona. Trabaja como desarrollador/a frontend senior con experiencia en accesibilidad (WCAG 2.2 AA) y visión por computador en el navegador.

## 1. Forma de trabajo
- Antes de escribir código, preséntame un plan de máximo 7 puntos (arquitectura, archivos, dependencias y cómo resolverás la detección) y espera mi confirmación.
- Avanza por hitos. Al cerrar cada uno, verifica que `npm run build` compile sin errores, resume en máximo 5 puntos lo que hiciste y dime qué debo probar yo con mi cámara (tú no puedes verla).
  - Hito 1: proyecto base, cámara, detección de la mano con el esqueleto dibujado y panel de depuración.
  - Hito 2: flujo de pantallas, calibración, los tres ejercicios y el conteo.
  - Hito 3: sonido, animaciones y melodía final.
  - Hito 4: accesibilidad, ajustes, guardado local y registro.
  - Hito 5: pruebas, auditoría final, README, CLAUDE.md y preparación del despliegue.
- No agregues funciones que no estén en este documento sin preguntarme.

## 2. Ficha del caso
- Persona o grupo: personas adultas que están recuperando la movilidad de la mano y los dedos (por ejemplo, después de retirar un yeso de muñeca o por rigidez) y que tienen indicada una rutina en casa.
- Contexto: ejercicios diarios en casa, frente al computador o celular, sin supervisión constante de su kinesiólogo/a.
- Actividad a guiar: abrir y cerrar la mano, tocar con el pulgar la punta de cada dedo y separar los dedos sosteniendo unos segundos.
- Barrera: la rutina es repetitiva y poco motivante. La persona pierde la cuenta, no sabe si completó el movimiento y tiende a apurarse o a saltarse los descansos.
- Objetivo terapéutico: usar la cámara para reconocer cada movimiento, contar las repeticiones automáticamente y convertir cada una en una nota musical, guiando la rutina con pausas de descanso y un registro simple de esfuerzo, sin grabar ni enviar imágenes.

## 3. Personalización
- Nombre: Manos que Suenan
- Dirigido a: personas adultas que recuperan la movilidad de la mano en casa.
- Contexto de uso: sentado/a frente al computador o celular, con buena luz, unos 5 minutos al día.
- Objetivo principal: acompañar una rutina de movilidad de mano con retroalimentación visual y sonora, para que sea más fácil completarla y mantenerla en el tiempo.
- Fases (5): 1) Preparación y rango cómodo · 2) La flor: abrir y cerrar · 3) Piano de dedos: pulgar a cada dedo · 4) El abanico: separar y sostener · 5) Cierre: cómo se sintió y la melodía del día.
- Mensaje final: "Rutina completa. Hoy tu mano hizo música. Vuelve cuando quieras, a tu propio ritmo."
- Paleta suave: fondo crema #FAF7F2 · texto gris carbón #2B2D42 · botones verde salvia #3F6B5A con texto blanco · acento lavanda #8B7FC7 · flor durazno #F2B89B. Verifica contraste AA (4,5:1 en texto; 3:1 en bordes, íconos y controles) y ajusta los tonos que no cumplan.
- Mensaje de derivación, visible en todas las pantallas: "Esta app acompaña tu rutina; no reemplaza a tu kinesiólogo/a ni a tu equipo de salud. Si sientes dolor, hormigueo o algo no se siente bien, detente y consulta."

## 4. Principios no negociables
- No diagnostica, no mide clínicamente y no promete curar ni mejorar síntomas. Cualquier valor que se muestre es referencial.
- Textos en español neutro, tratando de tú.
- Tono calmado y sin juicio: invitaciones ("cuando quieras", "a tu ritmo", "puedes") en lugar de órdenes. Sin urgencia, sin rojo y sin sonidos de error.
- Si la detección falla, la responsabilidad es de la app ("No alcanzo a ver tu mano"), nunca de la persona.
- Una sola idea por pantalla, frases cortas y lenguaje simple.
- La app se adapta al rango cómodo de cada persona (calibración) y nunca la empuja más allá. Siempre se puede saltar un ejercicio.
- Botón "Detener" siempre visible durante los ejercicios: pausa todo, muestra un mensaje calmado con la derivación y ofrece terminar o retomar.
- Sin gamificación que genere culpa: sin rachas que se pierden, sin puntajes comparativos y sin mensajes de "fallaste".

## 5. Privacidad de la cámara
- Pide solo video: `getUserMedia({ video: { facingMode: 'user' }, audio: false })`. Nunca el micrófono. El `<video>` lleva `playsinline` y `muted` para que funcione en iPhone.
- Antes del aviso de permiso del navegador, una pantalla explica para qué se usa la cámara: "Solo para ver el movimiento de tu mano. Todo se procesa en este dispositivo; ninguna imagen se guarda ni se envía."
- Los fotogramas se procesan en memoria y se descartan. Está prohibido:
  - grabar video o capturar fotos;
  - exportar el canvas de la cámara (toDataURL/toBlob);
  - guardar landmarks o imágenes;
  - enviar cualquier dato a la red.
- Indicador visible "Cámara activa · procesamiento local" mientras está encendida, con un botón para apagarla.
- Detén todos los tracks de la cámara en la pantalla de cierre, al pulsar "Detener", al salir de la rutina y cuando la pestaña queda oculta. Solo se reactiva por acción de la persona.
- Opción "Ver solo el trazo de mi mano": oculta la imagen y muestra solo el esqueleto de la mano sobre un fondo suave.
- Solo se usa el modelo de mano; no se analiza el rostro.
- Errores con mensaje calmado y botón "Reintentar":
  - permiso denegado (explica cómo habilitarlo);
  - sin cámara;
  - cámara ocupada por otra app (por ejemplo, una videollamada);
  - contexto no seguro (se necesita HTTPS o localhost).

## 6. Stack y restricciones técnicas
- Vite + React + TypeScript. Sin backend, base de datos, login, analítica ni cookies. Sin librería de rutas: las pantallas se manejan con estado.
- Dependencias de producción: solo `react`, `react-dom` y `@mediapipe/tasks-vision` (versión fijada: 0.10.35, porque la 1.x envía métricas de uso a Google; ver CLAUDE.md antes de actualizarla). Es la única librería extra y se justifica porque la cámara es obligatoria. Vitest se permite solo como dependencia de desarrollo.
- Ningún recurso se carga desde servidores externos en tiempo de ejecución (ni CDN, ni Google Fonts, ni íconos remotos):
  - Descarga una vez el modelo `hand_landmarker.task` (float16) desde la fuente oficial de MediaPipe, guárdalo en `public/models/` y súbelo al repositorio.
  - Copia los archivos de `node_modules/@mediapipe/tasks-vision/wasm` a `public/wasm/` con un script de Node sin dependencias, ejecutado en `predev` y `prebuild`.
  - Arma las rutas a esos archivos con `import.meta.env.BASE_URL`.
  - Usa la tipografía del sistema o una fuente alojada en el proyecto (por ejemplo, Atkinson Hyperlegible), e íconos SVG propios en línea.
- Sonido con Web Audio API nativa; animaciones con CSS, SVG o Canvas.
- Sin fotografías de personas en ninguna parte del proyecto (tampoco en el README): solo ilustraciones SVG propias.

## 7. Detección de la mano (MediaPipe Hand Landmarker)
- Configuración: `HandLandmarker` en modo `VIDEO`, `numHands: 1`, delegado GPU con respaldo a CPU.
- Llama a `detectForVideo` una vez por fotograma nuevo, sin acumular llamadas si la anterior no terminó. Muestra "Preparando…" mientras carga el modelo y un mensaje claro si falla.
- La vista es espejo. Si espejas el video con CSS, espeja también el canvas del esqueleto; los textos nunca se espejan.
- No uses la etiqueta izquierda/derecha en la lógica, porque su valor depende de si la imagen está espejada.
- Antes de medir distancias, pasa los landmarks a píxeles (x·ancho, y·alto, z·ancho), porque x e y vienen normalizados con escalas distintas.
- Divide cada métrica por el tamaño de la palma (distancia muñeca 0 → base del dedo medio 9) para que no dependa de la distancia a la cámara.
- Suaviza las métricas con una media móvil exponencial y usa histéresis: un umbral para entrar a un estado, otro para salir y una condición que se mantenga al menos 150 ms seguidos antes de confirmar un cambio. Se confirma por tiempo y no por número de fotogramas, porque los fps varían (se midieron entre 29 y 60). Así no se cuentan repeticiones dobles.
- Al detectar la mano, ignora los primeros 300 ms (al entrar al cuadro los puntos llegan deformados). Al perderla, reinicia el estado del toque y de los contadores en curso.
- Orientación: calcula la normal de la palma con la muñeca (0), la base del índice (5) y la base del meñique (17), y usa su componente z normalizada. Si |z| < 0,5 la mano está de canto; si no, el signo indica palma o dorso. Toques y repeticiones solo cuentan con la palma de frente: de canto o de dorso las métricas no son confiables (de canto, la apertura sube por la perspectiva). Si la mano gira, muestra con calma: "Cuando quieras, vuelve a mostrar la palma a la cámara".
- No re-renderices React en cada fotograma. El canvas y las animaciones se actualizan con refs o variables CSS; el estado de React cambia solo en eventos (repetición, cambio de fase, mano perdida).
- Si la mano no se ve por más de 1,5 s, muestra "No alcanzo a ver tu mano. Puedes acercarla un poco, con la palma hacia la cámara" y pausa los temporizadores del ejercicio.
- Métricas (todos los umbrales en un único archivo de configuración, comentado, para ajustarlos con pruebas reales):
  - Apertura: promedio de la distancia de las puntas (8, 12, 16, 20) a la muñeca. Es la métrica principal de la flor y el filtro de los toques. Medido con la palma de frente: abierta ~1,82; puño 0,51–0,74.
  - Flexión: 180° menos el ángulo de cada dedo en su articulación media (MCP-PIP-DIP). Solo informativa en el panel de depuración: tiene saltos momentáneos y no sirve como filtro.
  - Toque: distancia 3D de la punta del pulgar (4) a la punta más cercana de los otros dedos. Toque < 0,33 y soltar > 0,45 (con 0,30 el anular oscilaba). Para contar un toque nuevo, el pulgar debe haberse separado antes de todos los dedos. Un toque solo puede empezar si la apertura supera el 60 % del rango calibrado (cerrada + 0,6 × (abierta − cerrada)); sin calibración, 1,40. Así el puño cerrado nunca cuenta como toque.
  - Separación: promedio de las distancias entre puntas vecinas (8–12, 12–16, 16–20).
- Calibración del rango cómodo (fase 1): dos posturas sostenidas 3 s con anillo de progreso:
  - "Abre la mano y separa los dedos hasta donde te sea cómodo".
  - "Ahora ciérrala con suavidad, hasta donde te sea cómodo".
- Con la calibración:
  - Guarda la apertura mínima y máxima y la separación máxima.
  - Los umbrales de la flor y del abanico son porcentajes de ese rango personal (por ejemplo, en la flor: cerrada < 30 % y abierta > 70 %).
  - Usa siempre el rango calibrado de la persona, nunca valores fijos (los medidos en este documento son de una sola mano). Con la mano quieta la apertura varía 0,01–0,02, así que el rango mínimo aceptable es 0,15.
  - Si el rango queda bajo 0,15, invita con calma a repetir la calibración: "Puedes intentarlo de nuevo, sin forzar; buscamos tu movimiento cómodo de hoy". Si en el segundo intento sigue bajo 0,15, continúa con su rango ampliado a 0,15 alrededor de su punto medio y avisa que la flor será más sensible.
  - Los valores por defecto (1,40 para el filtro de toques) solo se usan mientras no hay calibración.
  - Registra el signo de z de "palma de frente" mientras la persona muestra la palma, sin usar la etiqueta izquierda/derecha (cada mano tiene el signo contrario).
  - Registra también el |z| de palma que alcanza la persona. Quienes salen de un yeso de muñeca pueden tener limitado el giro: si |z| queda por debajo de 0,65, avísale con calma que puede acercar un poco la palma hacia la cámara, sin forzar el giro.
  - El filtro de toques relativo al rango calibrado debe cuidar a quienes tengan menos apertura (con 1,40 fijo, el margen mínimo medido fue 0,14).
  - Se puede recalibrar desde Ajustes.
- Toda la lógica de detección y conteo va en funciones puras en `src/detection/` (sin DOM ni React), para probarla con landmarks sintéticos.
- Panel de depuración solo con `?debug=1`: métricas en vivo, umbrales, estado actual y fps.

## 8. Flujo de pantallas
Arriba, siempre: nombre de la app, "Fase X de 5" y controles rápidos (alto contraste, A− / A+, sonido, Ajustes).
Abajo, siempre: el mensaje de derivación y un enlace "Privacidad y ayuda" que abre un `<dialog>` accesible (cómo se usa la cámara, qué se guarda y cómo borrarlo).

1. Bienvenida: una frase de propósito, duración aproximada (unos 5 minutos), "Tu jardín" (una flor por cada rutina completada, que nunca se marchita) y botón "Comenzar".
2. Tu cámara: explicación de privacidad, consejos de encuadre (luz de frente, mano a 40–60 cm, palma hacia la cámara) y botón "Activar cámara".
3. Te veo: vista de cámara con el esqueleto. Cuando detecta la mano de forma estable (~1 s): "Te veo. Cuando quieras, seguimos."
4. Rango cómodo: la calibración.
5. "¿Todo listo?", antes de cada ejercicio: una frase sobre lo que viene y una ilustración.
   - Se empieza con el botón "Comenzar" o sosteniendo la mano abierta 2 s, con anillo de progreso visible.
   - El gesto empieza a contar 1 s después de que aparece la pantalla, nunca es la única vía y se puede desactivar en Ajustes.
6. La flor (fase 2): una flor SVG abre y cierra sus pétalos en tiempo real siguiendo la apertura de la mano.
   - Cada ciclo cerrado → abierto cuenta una repetición (el estado inicial no cuenta: como el ejercicio empieza tras el gesto de mano abierta, la primera repetición exige pasar por "cerrada" y luego por "abierta"), deja un pétalo encendido y toca la siguiente nota de la escala pentatónica de Do.
   - Texto: "Cuando quieras, abre la mano despacio… y ciérrala con suavidad."
7. Descanso (20 s): temporizador circular con los segundos en texto y "Deja descansar tu mano. Suelta los hombros y respira con calma." Botones "Pausar" y "Seguir ahora".
8. Piano de dedos (fase 3): tocar con el pulgar índice → medio → anular → meñique.
   - Cada dedo tiene su nota (Do, Mi, Sol, Do agudo) y su tecla en pantalla, que se ilumina al sonar.
   - El dedo que sigue se indica de tres formas: con texto ("Ahora: dedo medio"), con una ilustración de mano con ese dedo destacado y con un anillo sobre su punta en la vista de cámara.
   - Si toca otro dedo, suena su nota pero no avanza; solo se repite la invitación.
   - Cada vuelta completa cierra con un arpegio.
9. Descanso.
10. El abanico (fase 4): separar los dedos hasta el rango cómodo y sostener 3 s.
    - Mientras sostiene, un abanico SVG se despliega, avanza un temporizador circular y crece un acorde suave. Al completar, suena una campana.
    - Si suelta antes, el tiempo se pausa sin penalización y se retoma.
    - Juntar los dedos prepara la siguiente repetición.
    - Minicalibración al empezar el abanico: 3 s con los dedos juntos y 3 s con los dedos separados hasta donde sea cómodo, con anillo de progreso, la palma de frente y la apertura sobre el filtro. La separación máxima de la calibración inicial queda solo como referencia, porque depende de cuánto se abre la mano (medido: 0,397 abriéndola al mínimo y 0,513 abierta normal; la mano abierta relajada ya marca 0,34–0,44, y los dedos bien separados 0,55–0,57).
    - Umbrales (separación): "separados" al superar el 70 % del rango personal entre dedos juntos y separados de la minicalibración; "juntos" al bajar del 35 %, con histéresis y confirmación por tiempo.
    - Rango mínimo de separación de 0,10 (con los dedos quietos la separación varía 0,02–0,03, así que es de 3 a 5 veces el ruido), igual que con la apertura: si queda bajo el mínimo, invita con calma a repetir la minicalibración; si en el segundo intento sigue bajo, continúa con su rango ampliado al mínimo alrededor de su punto medio y avisa que el abanico será más sensible.
    - Solo cuenta con la apertura sobre el filtro y la palma de frente. La separación solo se evalúa dentro del abanico: al tocar el meñique sube hasta 0,62.
11. ¿Cómo se sintió tu mano? (fase 5): tres botones grandes con ícono y texto: "Cómoda", "Con algo de esfuerzo" y "Sentí molestia". Con "Sentí molestia" aparece: "Gracias por contarlo. Coméntalo con tu kinesiólogo/a antes de tu próxima rutina."
12. Cierre: mensaje final, resumen en texto de las repeticiones de cada ejercicio (solo las que se hicieron; un ejercicio saltado se muestra con un texto calmado, nunca como 0), botón "Escuchar la melodía de hoy", la flor nueva en el jardín, cámara apagada y botón "Volver al inicio".

- Durante cada ejercicio están siempre visibles: el contador en texto ("3 de 5") con una barra de progreso accesible, "Detener" y "Saltar este ejercicio".
- Intensidad en Ajustes:
  - Suave, por defecto: flor 5, piano 2 vueltas, abanico 3.
  - Habitual: flor 8, piano 3 vueltas, abanico 5.

## 9. Sonido
- Crea o reanuda el `AudioContext` en el primer clic de la persona (política de reproducción automática).
- Tonos senoidales o triangulares con envolvente suave (ataque ~15 ms, cola ~1 s) y volumen moderado. Todo en pentatónica de Do, para que cualquier combinación suene armoniosa.
- Guarda en memoria, solo durante la sesión, cada nota tocada con su tiempo. "Escuchar la melodía de hoy" las reproduce con el mismo ritmo, comprimido a un máximo de 20 s.
- Botón de sonido sí/no siempre a mano. Todo lo que comunica el sonido se comunica también con texto y con lo visual.
- Guía por voz opcional (apagada por defecto) con `speechSynthesis`, usando solo voces en español con `localService === true`. Si no hay ninguna, la opción no se muestra.

## 10. Accesibilidad (WCAG 2.2 AA)
- `<html lang="es">`.
- Uso completo con teclado: Tab y Shift+Tab en orden lógico, Enter y Espacio para activar, y Esc equivale a "Detener" durante un ejercicio.
- Foco siempre visible: contorno de 3 px con buen contraste, también en alto contraste.
- Al cambiar de pantalla, el foco pasa al `h1` de la nueva pantalla (`tabindex="-1"`).
- HTML semántico: header, main y footer; un `h1` por pantalla; `<button>` reales; labels en todos los controles; texto alternativo en los SVG informativos y `aria-hidden` en los decorativos.
- Región `aria-live="polite"` para "Repetición 3 de 5", "Te veo" y "No alcanzo a ver tu mano", sin saturar: como máximo un aviso de estado cada 2 s (las repeticiones siempre se anuncian).
- Botones de al menos 48 × 48 px, con texto visible.
- Alto contraste con interruptor, que al inicio respeta `prefers-contrast: more`:
  - fondo negro, texto blanco y acentos amarillos, incluido el dibujo sobre la cámara;
  - compatible con `forced-colors`.
- Tamaño de texto con A− / A+ (100 % a 150 %) usando rem. Nada se corta ni aparece scroll horizontal, incluso con zoom del navegador al 200 %.
- Con `prefers-reduced-motion`, sin animaciones decorativas; la flor y el abanico siguen reflejando el movimiento.
- El significado nunca depende solo del color: siempre hay texto o ícono.
- Mobile-first, probado a 360 px de ancho:
  - en celular, la cámara arriba y la instrucción y el contador abajo, visibles sin scroll;
  - en escritorio, cámara y visual lado a lado;
  - el pie con la derivación es compacto en celular, pero siempre visible.

## 11. Guardado local
- Solo `localStorage` (siempre con try/catch), con estas claves:
  - `mqs:ajustes`: sonido, voz, alto contraste, tamaño de texto, intensidad, inicio con gesto y ver imagen o solo trazo.
  - `mqs:calibracion`: los valores numéricos del rango cómodo.
  - `mqs:registro`: por sesión, solo la fecha (AAAA-MM-DD), las fases completadas, las repeticiones y cómo se sintió.
- Nunca imágenes, landmarks, nombres ni otros datos personales. La app no pide nombre ni correo.
- En Ajustes: "Recalibrar" y "Borrar mi registro" (con confirmación; también reinicia el jardín).

## 12. Pruebas y entregables
- Pruebas con Vitest para `src/detection/` usando landmarks sintéticos:
  - toque con histéresis, sin dobles conteos al temblar cerca del umbral;
  - ciclos de abrir y cerrar;
  - sostención de 3 s que se pausa al soltar;
  - calibración;
  - pausa al perder la mano.
- `npm run build` sin errores ni advertencias de TypeScript, y consola del navegador limpia.
- Revisa el código para confirmar que no hay fetch, XHR, WebSocket, sendBeacon ni URLs externas en tiempo de ejecución.
- Despliegue en Google Cloud Run con Docker (no se usa Vercel):
  - `Dockerfile` multietapa: una etapa `node:22-alpine` que ejecuta `npm ci` y `npm run build` (el prebuild copia wasm) y una etapa nginx que sirve `dist/`. `.dockerignore` con node_modules, dist y .git.
  - nginx escucha en el puerto 8080, sirve `.wasm` como `application/wasm`, `index.html` sin caché y `assets/` con caché larga.
  - Agrega en nginx los encabezados de seguridad: `Permissions-Policy` con `camera=(self)` y `microphone=()`, `X-Content-Type-Options: nosniff` y una Content-Security-Policy con `connect-src 'self'`. Verifica que la detección siga funcionando; si la CSP la rompe, avísame.
- `README.md` en español: qué es, cómo instalar, cómo probar con cámara en localhost, cómo desplegar en Cloud Run con `gcloud run deploy --source . --allow-unauthenticated` (la cámara exige HTTPS), una sección "Privacidad" en lenguaje simple y los créditos de MediaPipe.
- `CLAUDE.md` en la raíz con las reglas permanentes del proyecto: privacidad de la cámara, accesibilidad, tono, derivación, dependencias permitidas y cambios mínimos sin reescribir archivos completos.

## 13. Lista final de aceptación
- [ ] Se recorren las 5 fases de principio a fin usando la cámara.
- [ ] La cámara se enciende solo tras una acción de la persona y se apaga al terminar, al detener y al ocultar la pestaña.
- [ ] No se pide ningún dato personal y no hay peticiones a otros dominios (pestaña Red).
- [ ] Alto contraste y tamaño de texto funcionan en todas las pantallas.
- [ ] Todo se usa con teclado, el foco siempre se ve y el orden es comprensible.
- [ ] Nada se corta a 360 px de ancho ni con zoom al 200 %.
- [ ] "Borrar mi registro" funciona.
- [ ] El mensaje de derivación es visible en todas las pantallas.
- [ ] Ningún texto diagnostica, promete curar ni transmite urgencia.
- [ ] La consola no muestra errores.