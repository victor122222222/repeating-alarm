# Compás para Android

Envoltorio Android de la web de Compás (`https://repeating-alarm.netlify.app`) con alarmas
nativas: suenan a su hora con el móvil bloqueado, en reposo o reiniciado.

## Cómo funciona

- La app abre la web en una WebView y le da un puente, `window.CompasNativo`
  (ver `src/lib/native-alarms.ts` en la web).
- La web calcula las próximas alarmas con su propio código (planes por día, vacaciones) y se
  las entrega a la app nativa.
- La app nativa programa la siguiente con `AlarmManager.setAlarmClock`, la misma vía que
  usan las apps de despertador. Al sonar, un servicio en primer plano reproduce el tono en
  bucle, vibra y muestra la pantalla de deslizar para parar sobre el bloqueo.
- Tras sonar, programa la siguiente de la lista sin necesitar la web. Tras un reinicio,
  vuelve a programarla sola.
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

Si la compilación falla, copia el error del registro.

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

- **Las alarmas de la app y las del navegador son espacios separados.** La web guarda las
  alarmas ligadas a una cookie del dispositivo, y la app tiene la suya. Al abrirla por
  primera vez verás las alarmas de ejemplo: hay que volver a crear tus planes dentro de la
  app. Si desinstalas la app o borras sus datos, pierdes ese espacio.
- Se programan los próximos 120 días cada vez que se abre la app. Si no la abres en más de
  cuatro meses, las alarmas se acaban. Abrirla las renueva.
- Si cambias de zona horaria, abre la app para que recalcule las horas.
- Si fuerzas el cierre de la app desde Ajustes, Android cancela sus alarmas hasta que la
  abras otra vez.
- El código no se ha podido compilar ni probar en un móvil real en el entorno donde se
  escribió. La lógica de tonos y del puente web sí se comprobó con pruebas.
