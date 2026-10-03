# Decisiones tomadas con mediciones reales

"Manos que Suenan" se construyó por hitos. En cada uno, la persona probó la app con su cámara y sus mediciones cambiaron el diseño. Este documento resume esas decisiones: qué se midió, qué se decidió y por qué.

Todas las distancias están divididas por el tamaño de la palma (muñeca → base del dedo medio), así que no dependen de la distancia a la cámara. Las mediciones son de una sola persona y sirven para entender el comportamiento de la detección, no como valores de referencia: por eso los umbrales de los ejercicios salen del rango de cada persona (decisión 5).

## 1. Privacidad: la versión de MediaPipe que no envía telemetría

- **Qué se encontró.** `@mediapipe/tasks-vision` 1.0.1 hace un `fetch` POST a `odml.pa.googleapis.com/v1/log` cada 60 s, con métricas de uso, y no ofrece una opción para desactivarlo.
- **Qué se decidió.** Fijar la versión 0.10.35, donde esas cadenas no aparecen. Solo aparece `type.googleapis.com/...`, que son nombres de tipos protobuf, no direcciones de red.
- **Por qué.** La app promete que nada sale del dispositivo. Una petición periódica a otro dominio rompe esa promesa, aunque no lleve imágenes.
- **Cómo se cuida.** Antes de actualizar la librería se buscan las cadenas `odml.pa.googleapis.com`, `googleapis.com`, `clearcut` y `/v1/log` en todos sus archivos, y se revisa la pestaña Red.

## 2. Prueba de Red: cero peticiones a otros dominios

- **Qué se midió.** Con la pestaña Red abierta, "Keep log" activado y el filtro `-domain:localhost`: **0 de 108 peticiones a otros dominios en más de 40 minutos** de uso.
- **Con la imagen de Docker.** El archivo `.wasm` responde 200 con `application/wasm` y gzip: 3,8 MB transferidos de 11,2 MB (medido con `curl`: 3.821.628 de 11.153.617 bytes). En una prueba automática con Chrome y cámara simulada contra la imagen: 7 peticiones, todas al mismo origen, y 0 violaciones de la Content-Security-Policy.
- **Cómo se refuerza.** nginx envía una Content-Security-Policy con `default-src 'self'` y `connect-src 'self'`: aunque el código lo intentara, el navegador no dejaría conectar con otro dominio. Además, `Permissions-Policy` declara `microphone=()`.

## 3. De la flexión a la apertura

Se necesitaba distinguir la mano abierta del puño, para la flor y para que un puño cerrado nunca cuente como toque.

| Métrica | Mano abierta | Puño | Problema |
| --- | --- | --- | --- |
| Flexión (ángulos de las articulaciones) | ~6° | casi siempre ~130° | saltos momentáneos a 21° y 29° con el puño cerrado |
| Apertura (distancia de las puntas a la muñeca) | ~1,82 | 0,51–0,74 quieto | estable; ruido de 0,01–0,02 con la mano quieta |

- **Otros datos de la flexión.** Al tocar el anular, el dedo medio se dobla a 40°; al tocar el meñique, este llega a 62°. Un filtro por flexión habría bloqueado toques legítimos.
- **Qué se decidió.** La apertura es la métrica principal de la flor y el filtro de los toques. La flexión queda solo como dato informativo en el panel de depuración.
- **Margen medido.** Durante los toques, la apertura mínima fue 1,54–1,67 según el dedo: queda por encima del filtro.

## 4. Toques falsos: de 6 a 0

- **Qué se midió antes de los filtros.** 6 toques falsos al entrar y salir la mano del cuadro, y 1 al girar el puño. Al entrar al cuadro los puntos llegan deformados: el puño alcanzó una apertura de hasta 1,29.
- **Qué se decidió.**
  - Ignorar los primeros 300 ms después de detectar la mano, y reiniciar el estado del toque al perderla.
  - Contar solo con la palma de frente, usando la normal de la palma (muñeca, base del índice y base del meñique).
  - Confirmar cada cambio de estado por tiempo (150 ms) y no por número de fotogramas, porque los fps variaron entre 29 y 60.
  - Toque por debajo de 0,33 y soltar por encima de 0,45: con 0,30, el anular oscilaba.
- **Resultado.** 0 toques falsos en ambos casos, incluso con el toque mínimo bajando a 0,081–0,099. Después de las correcciones: 5 de 5 toques en índice, medio, anular y meñique.

### Orientación de la palma

| Postura | Componente z de la normal |
| --- | --- |
| Palma de frente | −0,96 a −0,99 |
| Dorso | 0,99 |
| De canto, con la mano quieta | −0,39 a 0,13 |
| De canto, al intentar tocar | −0,24 a 0,31 |

- Las dos filas "de canto" vienen de pruebas distintas; en ambas, |z| queda bajo el límite de 0,5.
- Con la mano abierta de dorso (apertura 1,53–1,94, toque 0,111) y de canto (toque 0,202), el filtro de apertura no alcanzaba: **solo la orientación bloqueó esos toques**.
- Cada mano tiene el signo contrario. Con la otra mano, el signo registrado fue "+" y contó 8 de 8 toques. Por eso el signo se registra en la calibración y nunca se usa la etiqueta izquierda/derecha del modelo, que además depende del espejo.
- Quien sale de un yeso puede tener limitado el giro de la muñeca: si la palma no llega a |z| = 0,65, la app lo avisa con calma, sin pedir que fuerce el giro.

## 5. El rango es de cada persona

- **Qué se propuso primero.** Usar valores "conservadores" por defecto cuando el rango calibrado fuera pequeño.
- **Por qué se descartó.** Esos valores eran de una sola mano. Una persona con rigidez que se mueve entre 1,10 y 1,30 nunca habría alcanzado umbrales construidos con ellos: la app habría excluido justo a quienes está dirigida.
- **Qué se decidió.**
  - Los umbrales salen siempre del rango calibrado de la persona: en la flor, cerrada bajo el 30 % y abierta sobre el 70 %; el filtro de toques, al 60 %.
  - Rango mínimo de apertura de **0,15**, porque el ruido con la mano quieta es de 0,01–0,02. Si el rango queda por debajo, la app invita a repetir la calibración; si en el segundo intento sigue bajo, lo amplía a 0,15 alrededor de su punto medio y avisa que la flor será más sensible.
  - El valor fijo (1,40 para el filtro de toques) solo rige mientras no hay calibración.
- **Un detalle de la flor.** El estado inicial no cuenta: como el ejercicio empieza después del gesto de mano abierta, la primera repetición exige cerrar y luego abrir.

## 6. El abanico tiene su propia minicalibración

| Postura | Separación entre puntas vecinas |
| --- | --- |
| Dedos juntos | 0,25–0,26 |
| Mano abierta relajada | 0,34–0,44 |
| Dedos bien separados | 0,55–0,57 |

- **Qué se encontró.** La calibración inicial registró una separación máxima de 0,397 o de 0,513 según cómo se abría la mano. Con esos valores, el abanico habría contado una mano simplemente abierta, sin trabajar la separación.
- **Qué se decidió.** Al empezar el abanico, 3 s con los dedos juntos y 3 s con los dedos separados hasta donde sea cómodo. Los umbrales (juntos bajo el 35 %, separados sobre el 70 %) salen de ese rango. La separación de la calibración inicial queda solo como referencia.
- **Rango mínimo de 0,10.** El ruido de la separación con los dedos quietos es de 0,02–0,03, así que 0,10 es de 3 a 5 veces el ruido. Se aplica la misma regla que con la apertura: repetir y, al segundo intento, ampliar.
- **Medido en una prueba.** Juntos 0,255 y separados 0,428 (rango 0,173): umbrales en 0,316 y 0,376.

## 7. La calibración no se guarda

- **Qué se propuso primero.** Guardar el rango cómodo para no calibrar en cada sesión.
- **Qué se decidió.** Calibrar en cada sesión y no guardar nada de la mano. En el dispositivo solo quedan los ajustes y un registro simple (fecha, fases completadas, repeticiones y cómo se sintió).
- **Por qué.**
  - En rehabilitación el rango cambia día a día: usar el de un día bueno en un día rígido haría que la flor no cuente.
  - El rango de movimiento se acerca a un dato clínico, y la app no guarda información clínica.

## 8. La flor nace también con "Terminar por hoy"

- **Qué se propuso primero.** Dar una flor del jardín solo al completar la rutina.
- **Qué se decidió.** Nace una flor siempre que haya al menos una repetición, tanto al llegar al cierre como al terminar antes.
- **Por qué.** Quien termina por molestia está siguiendo la indicación de detenerse. Quitarle la flor castigaría justo la conducta que la app pide. El jardín no tiene rachas ni fechas: las flores nunca se marchitan.
- **En la misma línea.** El resumen del cierre muestra solo lo que se hizo; un ejercicio saltado aparece con un texto calmado, nunca como 0.

## 9. La flor suena en escala mayor

- **Qué se propuso primero.** Todo en pentatónica de Do, para que cualquier combinación suene bien.
- **Qué se escuchó.** Las notas de la flor siempre van en orden, y el oído espera Fa después de Mi.
- **Qué se decidió.** La flor sube por la escala mayor de Do: Do, Re, Mi, Fa, Sol, La, Si, Do agudo. Con 8 repeticiones completa una octava exacta; con 5 termina en Sol, y un acorde suave de Do resuelve la melodía. El piano, donde el orden sí puede variar, mantiene Do, Mi, Sol y Do agudo.
- **Otros ajustes de sonido hechos al escuchar.**
  - El acorde del abanico sonaba como un zumbido grave: pasó a Do4–Mi4–Sol4, y su volumen cambia con rampas suaves, nunca con saltos.
  - Con el botón "Sonido" apagado no se crea ninguna nota.
  - La melodía del día recorta los silencios a 1,5 s, dura como máximo 20 s y separa las notas al menos 150 ms. En una rutina corta duró 13–14 s.

## Lo que estas decisiones tienen en común

- **Medir antes de decidir.** Varias ideas razonables en el papel (la flexión, los valores por defecto, la separación de la calibración inicial) fallaron al medirlas con una mano real.
- **La responsabilidad es de la app.** Si la detección falla, la app dice "No alcanzo a ver tu mano"; nunca culpa a la persona.
- **Nunca empujar más allá del rango cómodo**, y nunca castigar por detenerse.
- **La privacidad se verifica.** No basta con prometerla: se revisó el código de la librería, la pestaña Red y los encabezados del servidor.
