# Manos que Suenan

App web terapéutica que acompaña una rutina de movilidad de la mano. Usa la cámara para reconocer la mano en tiempo real, cuenta las repeticiones, guía la rutina paso a paso y convierte cada movimiento en música. Todo se procesa en el dispositivo de la persona: ninguna imagen se guarda ni se envía.

Fue creada para un seminario sobre inclusión.

## Para quién es

Para personas adultas que están recuperando la movilidad de la mano y los dedos (por ejemplo, después de retirar un yeso de muñeca o por rigidez) y tienen indicada una rutina en casa. La rutina dura unos 5 minutos y tiene cinco fases:

1. Preparación y rango cómodo (calibración de cada sesión).
2. La flor: abrir y cerrar la mano.
3. Piano de dedos: tocar con el pulgar la punta de cada dedo.
4. El abanico: separar los dedos y sostener.
5. Cierre: cómo se sintió la mano y la melodía del día.

**Esta app acompaña la rutina; no reemplaza a tu kinesiólogo/a ni a tu equipo de salud.** No diagnostica, no mide de forma clínica y no promete curar: los valores que muestra son solo referenciales. Si sientes dolor, hormigueo o algo no se siente bien, detente y consulta.

## Requisitos

- **Node.js 22.12 o superior** (con npm).
- Un navegador actual con cámara (Chrome, Edge, Firefox o Safari).
- Para la imagen de Docker: Docker. **En Windows, abre Docker Desktop antes de construir la imagen** y espera a que esté en marcha.
- Para desplegar: la CLI de Google Cloud (`gcloud`) con un proyecto y facturación activos, y un dominio administrado en Cloudflare.

## Instalar y probar en tu equipo

```bash
npm install
npm run dev
```

Abre la dirección que muestra la terminal (por ejemplo, http://localhost:5173). La cámara solo funciona en `localhost` o con HTTPS: es una regla de los navegadores.

- `npm run dev` y `npm run build` copian antes los archivos WebAssembly de MediaPipe a `public/wasm/` (carpeta ignorada por git). El modelo de la mano está en `public/models/`.
- Para ver las métricas en vivo, los umbrales calibrados y los fps, agrega `?debug=1` a la dirección.

### Pruebas y compilación

```bash
npm test        # pruebas con Vitest (detección, sonido, guardado y voz)
npm run build   # compila a dist/ sin errores ni advertencias
npm run preview # sirve dist/ en tu equipo
```

La lógica de detección, de sonido y de guardado está en funciones puras con pruebas, porque no se puede probar una cámara de forma automática.

## Imagen de Docker

La imagen compila la app con Node y la sirve con nginx en el puerto 8080.

```bash
docker build -t app-rehabilitacion .
docker run --rm -p 8080:8080 app-rehabilitacion
```

Luego abre http://localhost:8080.

nginx envía estos encabezados de seguridad (archivo `seguridad.conf`):

- `Permissions-Policy: camera=(self), microphone=(), geolocation=()`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `Content-Security-Policy` con `default-src 'self'` y `connect-src 'self'`: todo se carga desde el mismo origen y la página no puede conectarse a otros dominios. `'wasm-unsafe-eval'` es lo que MediaPipe necesita para compilar su WebAssembly; no habilita `eval()` de JavaScript.

Para comprobarlos:

```bash
curl -I http://localhost:8080/
curl -I http://localhost:8080/wasm/vision_wasm_internal.wasm   # Content-Type: application/wasm
```

## Desplegar

La app se publica en una VM de Google Compute Engine con Docker Compose, y llega a internet por un túnel de Cloudflare en un dominio propio. Cloudflare entrega el HTTPS que la cámara necesita, así que no hay que abrir puertos, reservar una IP ni administrar certificados.

`docker-compose.yml` tiene dos servicios:

- `app`: la imagen de este proyecto. No publica puertos hacia afuera.
- `cloudflared`: el túnel. Lee su token de `TUNNEL_TOKEN`, en un archivo `.env` que no se sube al repositorio (usa `.env.example` como referencia). El hostname público se configura en el panel de Cloudflare apuntando a `http://app:8080`.

En la VM:

```bash
cp .env.example .env   # y pega el token del túnel
docker compose up -d --build
```

La guía completa, paso a paso, está en [`docs/despliegue-vm.md`](docs/despliegue-vm.md): crear la VM, instalar Docker, crear el túnel, qué funciones de Cloudflare dejar desactivadas para cuidar la privacidad, cómo verificar los encabezados y la pestaña Red después de publicar, cómo actualizar y cómo borrar todo para no generar costos. Incluye la alternativa con `cloudflared` instalado fuera de Docker (`docker-compose.puerto-local.yml`).

## Privacidad

En lenguaje simple:

- **La cámara se usa solo para ver el movimiento de tu mano.** Todo ocurre en tu dispositivo.
- **Ninguna imagen se graba, se guarda ni se envía.** Tampoco los puntos de la mano que la app calcula.
- **Nunca se usa el micrófono.** Solo se analiza la mano, nunca el rostro.
- **La cámara se enciende solo cuando tú lo eliges** y se apaga al terminar, al pulsar "Detener" y cuando cambias de pestaña. Mientras está encendida se ve el aviso "Cámara activa · procesamiento local", con un botón para apagarla.
- **La app no se conecta a otros sitios.** No tiene cuentas, analítica ni cookies, y no pide tu nombre ni tu correo.
- **La página llega a tu navegador a través de Cloudflare.** Como cualquier servidor web, Cloudflare ve las solicitudes de los archivos de la app (por ejemplo, desde qué dirección de internet y a qué hora se pidieron). Nunca recibe imágenes ni datos de tu rutina, porque la app no los envía.
- **Qué se guarda en tu dispositivo:** solo tus ajustes y un registro simple de cada rutina (la fecha, los ejercicios hechos, las repeticiones y cómo se sintió tu mano). Con ese registro crece "Tu jardín".
- **Qué no se guarda:** las medidas de tu mano. El rango cómodo se calcula de nuevo en cada sesión.
- **Cómo borrarlo:** en Ajustes, con "Borrar mi registro".
- La guía por voz, si la activas, usa solo voces instaladas en tu dispositivo.

Las decisiones técnicas detrás de estas promesas están en [`docs/decisiones.md`](docs/decisiones.md).

## Advertencias conocidas en la consola

Al cargar el reconocimiento de la mano, la consola del navegador muestra dos advertencias internas de MediaPipe (`vision_wasm_internal.js`). No son errores de la app y la detección funciona bien:

- `OpenGL error checking is disabled`: aviso informativo del motor gráfico de MediaPipe.
- `landmark_projection_calculator.cc:81 Using NORM_RECT without IMAGE_DIMENSIONS is only supported for the square ROI`: aparece porque el video de la cámara no es cuadrado. No afecta a la detección.

No se corrigen, porque hacerlo implicaría cambiar la detección.

## Documentación del proyecto

- [`docs/especificacion.md`](docs/especificacion.md): la especificación completa.
- [`docs/decisiones.md`](docs/decisiones.md): decisiones tomadas con mediciones reales.
- [`docs/despliegue-vm.md`](docs/despliegue-vm.md): guía de despliegue en una VM con Docker y Cloudflare Tunnel.
- [`CLAUDE.md`](CLAUDE.md): reglas permanentes del proyecto.

## Créditos

- Reconocimiento de la mano: [MediaPipe Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) (`@mediapipe/tasks-vision` 0.10.35 y el modelo `hand_landmarker.task`), de Google, con licencia Apache 2.0.
- Interfaz: React, con Vite y TypeScript. Pruebas con Vitest.
- Sonido sintetizado con la Web Audio API del navegador. Ilustraciones SVG propias; el proyecto no usa fotografías de personas.
