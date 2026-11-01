# Compás para Android

La web de Compás empaquetada dentro de una app Android, con alarmas nativas: suenan a su
hora con el móvil bloqueado, en reposo o reiniciado. **No necesita internet ni ningún
servidor**: la web va dentro de la app y las alarmas se guardan en el propio móvil.

## Cómo funciona

- Al compilar, la web se construye como páginas estáticas (`vite.android.config.ts`) y se
  copia a `app/src/main/assets/web`. La app las sirve en `https://appassets.androidplatform.net`,
  un dominio reservado por Android que nunca sale a internet. (`file:///android_asset/` no
  sirve: Android bloquea los módulos de JavaScript desde `file://`.)
- La web guarda las alarmas en un archivo del móvil mediante el puente `window.CompasNativo`
  (`cargarDatos` / `guardarDatos`). Ver `src/lib/alarms-store.ts`.
- La web calcula las próximas alarmas (planes por día, vacaciones) y se las entrega a la app
  nativa con `programar`.
- La app nativa programa la siguiente con `AlarmManager.setAlarmClock`, la misma vía que
  usan las apps de despertador. Al sonar, un servicio en primer plano reproduce el tono en
  bucle, vibra y muestra la pantalla de deslizar para parar sobre el bloqueo.
- Tras sonar, programa la siguiente de la lista sin abrir la web. Tras un reinicio, vuelve a
  programarla sola.
- **Aviso de la próxima alarma:** desde 12 horas antes aparece una notificación silenciosa
  "Próxima alarma: HH:MM" (con "mañana" si es de otro día), visible en el bloqueo. Es fija: si la deslizas
  vuelve a aparecer, y se quita sola al sonar la alarma. Android decide dónde se dibuja: el icono de la app sale arriba a
  la izquierda en la barra de estado, y el texto en la lista de avisos del bloqueo. Una app
  no puede pintar texto suelto en una esquina del bloqueo. Además, `setAlarmClock` hace que
  Android muestre su propia "próxima alarma" en muchos móviles.
- Los cinco tonos (Sirena, Pitido, Amanecer, Brisa, Órbita) usan las mismas notas que la
  web. Se comprobaron contra el audio real del navegador: mismas frecuencias y armónicos. La
  web pasa el sonido por un compresor que la app no imita, así que el volumen y los barridos
  de la Sirena pueden diferir un poco.

## Obtener el APK sin instalar nada

1. En este repositorio de GitHub, abre **Actions > Compilar APK > Run workflow**.
2. Cuando termine (unos minutos), abre la ejecución y, abajo, en **Artifacts**, descarga
   `compas-apk`. Es un zip con `app-debug.apk` dentro.
3. Pásalo al móvil, descomprímelo e instálalo (Android pedirá permitir instalar apps de
   esta fuente; si Xiaomi o Google Play Protect avisan, elige instalar de todos modos).

La compilación primero construye la web y falla si no llega a meterse en la app. Si falla,
copia el error del registro.

## Primer arranque

La app abre una lista con los ajustes que hacen falta. En Xiaomi son imprescindibles:

1. Avisos permitidos.
2. Alarma a pantalla completa (Android 14 o superior).
3. Batería "Sin restricciones" para Compás.
4. Inicio automático activado.
5. En Permisos: "Mostrar en la pantalla de bloqueo" y "Mostrar ventanas emergentes mientras
   se ejecuta en segundo plano".
6. Fijar la app en Recientes (candado), porque Xiaomi puede cancelar las alarmas al limpiar
   aplicaciones.

Después pulsa **Probar alarma**, bloquea el móvil y comprueba que suena a los 8 segundos.

## Límites

- **Las alarmas viven solo en el móvil.** Las de la web en el navegador son otro espacio
  distinto y no se copian. Al abrir la app por primera vez verás las alarmas de ejemplo: crea
  tus planes dentro de la app. Si desinstalas la app o borras sus datos, se pierden.
- Se programan los próximos 120 días cada vez que se abre la app. Si no la abres en más de
  cuatro meses, las alarmas se acaban. Abrirla las renueva.
- Si cambias de zona horaria, abre la app para que recalcule las horas.
- Si fuerzas el cierre de la app desde Ajustes, Android cancela sus alarmas hasta que la
  abras otra vez.
- Las tipografías se descargan de Google Fonts si hay internet; sin conexión se usa la del
  sistema. El resto funciona sin conexión.
- El código no se ha podido compilar ni probar en un móvil real en el entorno donde se
  escribió. La lógica de tonos, del almacén de datos y del puente web sí se comprobó con
  pruebas.
