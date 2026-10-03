# Despliegue en una VM de Compute Engine con Docker y Cloudflare Tunnel

Guía paso a paso desde Windows (PowerShell) con `gcloud`. La app corre en una VM con Docker Compose y se publica en tu propio dominio con un túnel de Cloudflare.

- **Cloudflare entrega el HTTPS** (la cámara lo exige). No hace falta Caddy, certificados, IP estática ni abrir puertos.
- **El túnel sale desde la VM hacia Cloudflare.** Nadie se conecta a la VM desde internet: el firewall no necesita reglas de entrada para la web.
- **nginx sigue enviando los encabezados de seguridad** (`seguridad.conf`). Cloudflare los deja pasar.

Los nombres de los menús de Google Cloud y de Cloudflare cambian con el tiempo: si alguno no coincide, busca la función por su nombre.

## Antes de empezar

- Un proyecto de Google Cloud con facturación activa y la CLI `gcloud` instalada y con sesión iniciada (`gcloud auth login`).
- Un dominio administrado en Cloudflare (sus servidores de nombres apuntan a Cloudflare).
- Este repositorio en GitHub.

En los comandos, cambia `TU_PROYECTO`, la zona y `rutina.tudominio.cl` por tus valores.

## 1. Crear la VM

```powershell
gcloud config set project TU_PROYECTO
gcloud compute instances create manos-que-suenan --zone=southamerica-west1-a --machine-type=e2-small --image-family=debian-12 --image-project=debian-cloud --boot-disk-size=20GB
```

**Tipo de máquina.** La imagen se construye en la propia VM (`npm ci` y `npm run build`), y eso necesita memoria:

- `e2-small` (2 GB): recomendada. Construye sin ajustes.
- `e2-micro` (1 GB): puede quedarse sin memoria al construir. Si la eliges, agrega swap antes de construir (paso 3). Google ofrece un nivel gratuito para `e2-micro` solo en algunas regiones de Estados Unidos: revisa las condiciones vigentes antes de elegir la zona.

Para servir la app ya construida alcanza con muy poco: nginx solo entrega archivos, y todo el procesamiento ocurre en el dispositivo de cada persona.

**Firewall: no abras puertos.** No agregues las etiquetas `http-server` ni `https-server`, ni reglas de entrada para los puertos 80, 443 u 8080. El túnel es una conexión de salida. La única entrada que se usa es SSH (puerto 22), que la red por defecto ya permite para `gcloud compute ssh`.

## 2. Conectarse

```powershell
gcloud compute ssh manos-que-suenan --zone=southamerica-west1-a
```

La primera vez, `gcloud` crea una clave SSH. Todo lo que sigue se ejecuta dentro de la VM, salvo que se indique lo contrario.

## 3. (Solo con e2-micro) Agregar swap

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h   # debe mostrar 2,0G de swap
```

## 4. Instalar Docker (método oficial para Debian)

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

Cierra la sesión (`exit`) y vuelve a conectarte para que el grupo `docker` quede activo. Comprueba con:

```bash
docker version
docker compose version
```

## 5. Clonar el repositorio

**Si es público:**

```bash
git clone https://github.com/Felipe-Martinez-Contreras/app-rehabilitacion.git
cd app-rehabilitacion
```

**Si es privado**, usa una clave de despliegue (solo lectura y solo para este repositorio):

```bash
ssh-keygen -t ed25519 -C "vm-manos-que-suenan" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

Copia la clave pública que se muestra y agrégala en GitHub: repositorio → Settings → Deploy keys → Add deploy key, sin marcar "Allow write access". Luego:

```bash
git clone git@github.com:Felipe-Martinez-Contreras/app-rehabilitacion.git
cd app-rehabilitacion
```

## 6. Crear el túnel y el hostname público en Cloudflare

En el panel de Cloudflare (desde tu navegador, no en la VM):

1. Zero Trust → Networks → Tunnels → **Create a tunnel** → tipo **Cloudflared**. Ponle un nombre, por ejemplo `manos-que-suenan`.
2. En la pantalla de instalación, Cloudflare muestra un comando con un **token** largo (empieza con `eyJ…`). Copia solo el token. No hace falta instalar nada: el túnel corre en el contenedor `cloudflared`.
3. En **Public hostnames**, agrega uno:
   - Subdomain y Domain: por ejemplo `rutina` y `tudominio.cl`.
   - Type: `HTTP`.
   - URL: `app:8080`.

   `app` es el nombre del servicio en `docker-compose.yml`: los dos contenedores comparten una red interna, y por eso la app no necesita publicar ningún puerto.
4. Guarda el túnel. Cloudflare crea el registro DNS del hostname.

El token es un secreto: quien lo tenga puede conectar un túnel a tu cuenta. No lo subas al repositorio ni lo pegues en capturas.

En la VM, crea el archivo `.env` con el token:

```bash
cp .env.example .env
nano .env          # pega el token después de TUNNEL_TOKEN=
chmod 600 .env
```

`.env` está en `.gitignore` y en `.dockerignore`: no se sube al repositorio ni entra en la imagen.

## 7. Levantar

```bash
docker compose up -d --build
docker compose ps
docker compose logs cloudflared | tail -20
```

- `app` y `cloudflared` deben quedar en estado `running`.
- En los logs de `cloudflared` deben aparecer líneas de conexión registrada con Cloudflare. En el panel, el túnel debe verse como **Healthy**.
- Los dos servicios tienen `restart: unless-stopped`: vuelven a arrancar solos si la VM se reinicia.

## 8. Ajustes de Cloudflare para cuidar la privacidad

La app promete que la página no se conecta a otros dominios ni carga scripts de terceros. Algunas funciones de Cloudflare inyectan scripts en el HTML o hacen que el navegador se conecte a otros dominios. **Deja desactivadas estas funciones** para el dominio:

| Función | Por qué desactivarla |
| --- | --- |
| Web Analytics / Browser Insights con inyección automática (RUM) | Inserta un script de medición que envía datos a Cloudflare desde el navegador. |
| Rocket Loader | Reescribe y carga los scripts de la página a través de un script propio. |
| Email Address Obfuscation | Inserta un script para ocultar correos (la app no tiene correos). |
| Zaraz | Carga herramientas de terceros desde el borde de Cloudflare. |

Revisa también, si están disponibles en tu plan:

- **Bot Fight Mode / JavaScript Detections y desafíos:** pueden insertar un script desde `/cdn-cgi/`.
- **Network Error Logging (NEL):** si Cloudflare agrega los encabezados `NEL` y `Report-To`, el navegador puede enviar informes de errores de red a un dominio de Cloudflare. Esos informes no aparecen como peticiones de la página en la pestaña Red, así que hay que mirar los encabezados (ver abajo).
- **Cloudflare Fonts, Mirage y otras optimizaciones** que modifiquen el HTML.

Conviene activar **Always Use HTTPS**.

La Content-Security-Policy de nginx es una red de seguridad: si alguna de estas funciones quedara activa, el navegador bloquearía sus scripts y conexiones externas, y la consola mostraría el aviso. Pero lo correcto es dejarlas desactivadas.

## 9. Verificar después de publicar

**Encabezados** (desde tu equipo, en PowerShell):

```powershell
curl.exe -I https://rutina.tudominio.cl/
curl.exe -I https://rutina.tudominio.cl/wasm/vision_wasm_internal.wasm
```

Deben llegar intactos, igual que en local:

- `Permissions-Policy: camera=(self), microphone=(), geolocation=()`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; …`
- en el `.wasm`, además, `Content-Type: application/wasm`.

Cloudflare agrega sus propios encabezados (`server: cloudflare`, `cf-ray`, `cf-cache-status`): es normal. Si aparecen `nel` o `report-to`, busca "Network Error Logging" en el panel y desactívalo.

**HTML sin scripts agregados:**

```powershell
curl.exe -s https://rutina.tudominio.cl/ | Select-String "script"
```

Debe aparecer un solo `<script type="module" … src="./assets/index-….js">`. Si aparece otro (por ejemplo, con `cloudflareinsights`, `rocket-loader`, `email-decode` o `/cdn-cgi/`), queda una función por desactivar.

**En el navegador** (ventana privada, sin extensiones):

1. Abre `https://rutina.tudominio.cl` y las herramientas de desarrollo.
2. Pestaña **Red**: activa "Preserve log" y filtra con `-domain:rutina.tudominio.cl`. Recorre la rutina completa: la lista filtrada debe quedar vacía. Sin el filtro, tampoco deben aparecer rutas `/cdn-cgi/`.
3. Pestaña **Consola**: solo las dos advertencias conocidas de MediaPipe, sin mensajes de "Content Security Policy".
4. **Cámara**: el navegador debe pedir el permiso, la detección debe funcionar y la cámara debe apagarse al terminar, al pulsar "Detener" y al cambiar de pestaña.

## 10. Actualizar la app

En la VM:

```bash
cd ~/app-rehabilitacion
git pull
docker compose up -d --build
docker image prune -f      # opcional: borra las imágenes antiguas
```

Para actualizar el cliente del túnel: `docker compose pull cloudflared && docker compose up -d`.

**Caché de Cloudflare.** Normalmente no hace falta purgarla:

- `index.html` no se guarda en la caché de Cloudflare por defecto, y nginx lo envía con `Cache-Control: no-cache`.
- Los archivos de `assets/` llevan un hash en el nombre: cada versión tiene nombres nuevos.
- Los `.wasm` y el modelo se envían con `Cache-Control: no-cache`, así que se revalidan.

Si después de actualizar ves una versión antigua, purga la caché: panel de Cloudflare → tu dominio → Caching → Configuration → **Purge Everything** (o "Custom Purge" con la dirección del archivo), y recarga con Ctrl+F5.

## 11. Logs, detener y borrar

```bash
docker compose logs -f app           # peticiones que llegan a nginx
docker compose logs -f cloudflared   # estado del túnel
docker compose down                  # detiene y quita los contenedores
```

Desde tu equipo:

```powershell
gcloud compute instances stop manos-que-suenan --zone=southamerica-west1-a     # apaga la VM
gcloud compute instances start manos-que-suenan --zone=southamerica-west1-a    # la vuelve a encender
gcloud compute instances delete manos-que-suenan --zone=southamerica-west1-a   # la borra, con su disco
```

Al borrar la VM, borra también el túnel y el hostname en el panel de Cloudflare.

## Costos

Esta guía no incluye precios, porque cambian. Estos elementos pueden tener costo:

- **La VM encendida**, según el tipo de máquina y las horas de uso.
- **El disco**, que se cobra aunque la VM esté apagada. Solo deja de cobrarse al borrar la VM con su disco.
- **La dirección IP externa** de la VM y el **tráfico de salida** de red.
- **El dominio** y, si corresponde, el plan de Cloudflare.

Dónde revisarlos: la calculadora de precios y la sección Facturación → Informes de Google Cloud, y la sección de facturación de Cloudflare. Conviene crear un presupuesto con alertas en Facturación → Presupuestos y alertas.

Para no generar costos cuando ya no uses la app: borra la VM (no basta con apagarla) y revisa en Compute Engine que no queden discos ni direcciones IP reservadas.

## Alternativa: cloudflared ya instalado en la VM, fuera de Docker

Si en la VM ya tienes `cloudflared` como servicio del sistema, no uses el contenedor del túnel. Levanta solo la app, publicada únicamente en `127.0.0.1`:

```bash
cp .env.example .env     # ajusta PUERTO_LOCAL si el 8080 está ocupado; TUNNEL_TOKEN puede quedar vacío
docker compose -f docker-compose.yml -f docker-compose.puerto-local.yml up -d --build app
```

En el panel de Cloudflare, el hostname público apunta entonces a `http://localhost:8080` (o al puerto que hayas puesto en `PUERTO_LOCAL`).

La app queda accesible solo desde la propia VM: `127.0.0.1` no se expone a internet y el firewall sigue sin puertos abiertos. El resto de la guía (ajustes de Cloudflare, verificación y actualización) es igual, usando siempre los dos archivos `-f` en los comandos de Compose.
