// Copia los archivos wasm de MediaPipe a public/wasm/ para servirlos desde
// el mismo origen (nada se carga desde CDN). Se ejecuta en predev y prebuild.
// Sin dependencias: solo módulos nativos de Node.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const origen = join(raiz, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const destino = join(raiz, 'public', 'wasm');

if (!existsSync(origen)) {
  console.error(`No se encontró ${origen}. Ejecuta "npm install" primero.`);
  process.exit(1);
}

rmSync(destino, { recursive: true, force: true });
mkdirSync(destino, { recursive: true });
cpSync(origen, destino, { recursive: true });
console.log('Archivos wasm de MediaPipe copiados a public/wasm/');
