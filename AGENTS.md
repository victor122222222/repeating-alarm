# Compás

Aplicación web en español de alarmas por turnos. React 19, TypeScript estricto, TanStack Start, Vite y Tailwind CSS 4, desplegada en Netlify.

## Arquitectura

- `src/routes/index.tsx`: pantalla principal, navegación interna, formularios y calendario, control de audio y disparo de alarmas.
- `src/routes/__root.tsx`: documento HTML en español, metadatos, proveedores y avisos.
- `src/lib/alarms.ts`: modelo Alarm, ejemplos iniciales y cálculo de días activos y siguiente alarma. Los ciclos se calculan con fechas de calendario UTC para evitar desfases de horario de verano; las horas se interpretan localmente.
- `src/styles.css`: tema visual cálido con acentos verdes y estilos responsivos. Tipografías DM Sans y Manrope.
- `src/components/ui`: componentes accesibles de Radix UI; el editor usa Dialog y las alarmas usan Switch.
- `netlify/functions/alarms.mts`: GET/PUT `/api/alarms`, validación Zod, separación de datos mediante cookie de dispositivo HttpOnly y comprobación de origen en escrituras. No devuelve el identificador de dispositivo en el cuerpo.
- `db/schema.ts`: tabla schedules con propietario y lista de alarmas JSONB.
- `drizzle.config.ts` y `netlify/database/migrations`: esquema y migraciones que Netlify aplica automáticamente al desplegar.

## Convenciones

Mantén las cadenas visibles en español. Usa hooks React y el alias `@/`. No accedas a APIs del navegador durante SSR. Respeta los estados de carga, error y guardado; no muestres un cambio como guardado si falla la API. Los ejemplos se crean una vez para cada navegador nuevo. No uses localStorage para guardar alarmas; la persistencia está en Netlify Database.

Drizzle requiere las versiones beta que incluyen el adaptador `drizzle-orm/netlify-db`. Cambiar el esquema requiere generar una migración; no apliques migraciones manualmente. Las funciones se inicializan dentro del handler.

El audio requiere activación manual por sesión. La web necesita la pestaña abierta y el dispositivo despierto. No prometas alarmas con el navegador cerrado ni bloqueo de pantalla. No hay cuentas ni sincronización entre dispositivos. Borrar la cookie pierde el acceso al espacio anterior.

El árbol de rutas es generado por TanStack. Para desarrollo usa `netlify dev --port 8889`. En ejecuciones automatizadas respeta las restricciones de validación de la plataforma, que ejecuta su propio build.
