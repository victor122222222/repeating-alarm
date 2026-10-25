# Compás · Alarmas por turnos

Aplicación en español para organizar alarmas mediante ciclos de trabajo y descanso, inspirada en la claridad del reloj de Xiaomi. Permite crear, editar, pausar y eliminar alarmas; combinar ciclos y fechas de inicio; consultar el calendario; elegir entre tres sonidos y posponer cinco minutos.

## Tecnologías

React 19, TypeScript, TanStack Start, Vite, Tailwind CSS y componentes Radix UI. Netlify Functions expone la API y Netlify Database conserva las alarmas con Drizzle ORM. Web Audio genera los tonos en el navegador.

## Desarrollo local

Con Node 22.13 o superior y pnpm:

```bash
pnpm install
netlify dev --port 8889
```

Abre http://localhost:8889 para utilizar la aplicación con emulación de los servicios de Netlify. Vincula el proyecto a tu sitio Netlify cuando trabajes fuera de este entorno. El esquema está en `db/schema.ts`; las migraciones se generan con `pnpm exec drizzle-kit generate --name nombre_descriptivo` y la plataforma las aplica al desplegar.

## Cómo usarla

Crea una alarma, indica su hora y establece el número de días de trabajo y de descanso. La fecha de inicio corresponde al primer día de trabajo. El ciclo se repite sin depender de la semana. Por ejemplo, 4/2 alterna cuatro días con alarma y dos sin ella. Las alarmas iniciales son ejemplos que puedes modificar o eliminar.

Activa el sonido mediante el botón de la página o desde Ajustes. Debes mantener la pestaña abierta y el dispositivo despierto: los navegadores pueden suspender la ejecución en segundo plano y esta web no sustituye una alarma nativa con el teléfono bloqueado. Las horas utilizan la zona horaria local del dispositivo.

Las alarmas se asocian a este navegador mediante una cookie de dispositivo HttpOnly. No hay inicio de sesión ni sincronización entre dispositivos; borrar la cookie hace que se cree un nuevo espacio. Los fallos de guardado se indican y los cambios solo se muestran como guardados tras confirmación del servidor.
