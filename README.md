# Manos que Suenan

App web terapéutica que usa la cámara para reconocer la mano, contar repeticiones y convertirlas en música. Todo se procesa en el dispositivo. El README completo (instalación, pruebas con cámara, despliegue, privacidad y créditos) se escribe en el Hito 5.

## Advertencias conocidas en la consola

Al cargar el reconocimiento de la mano, la consola del navegador muestra dos advertencias internas de MediaPipe (`vision_wasm_internal.js`). No son errores de la app y la detección funciona bien:

- `OpenGL error checking is disabled`: aviso informativo del motor gráfico de MediaPipe.
- `landmark_projection_calculator.cc:81 Using NORM_RECT without IMAGE_DIMENSIONS is only supported for the square ROI`: aparece porque el video de la cámara no es cuadrado. No afecta a la detección.

No se corrigen, porque hacerlo implicaría cambiar la detección.
