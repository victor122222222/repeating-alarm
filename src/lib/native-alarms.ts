/**
 * Puente con la app Android de Compás (window.CompasNativo).
 *
 * La web sigue calculando cuándo toca cada alarma (turnos, planes por día, vacaciones).
 * Este módulo calcula las próximas ocurrencias y se las entrega a la app nativa, que las
 * programa en el sistema para que suenen con el móvil bloqueado. En un navegador normal,
 * donde no existe el puente, todas las funciones no hacen nada.
 */

export type NativeEvent = {
  id: string
  /** Milisegundos desde 1970 en que debe sonar. */
  ts: number
  nombre: string
  /** "HH:MM" en la hora local del móvil. */
  hora: string
  tono: string
}

type Bridge = {
  programar(json: string): string
  cancelarTodas(): void
  estado(): string
  abrir(tipo: string): void
  probar(tono: string): void
}

export type NativeStatus = {
  nativa: true
  version: string
  fabricante: string
  notificaciones: boolean
  pantallaCompleta: boolean
  bateria: boolean
  alarmasExactas: boolean
  total: number
  hasta: number | null
  proxima: number | null
}

export type NativeSettingsKind =
  | 'ajustes'
  | 'notificaciones'
  | 'pantallaCompleta'
  | 'bateria'
  | 'inicioAutomatico'
  | 'permisosXiaomi'
  | 'app'

/** Lo mínimo que necesita una alarma para convertirse en eventos (compatible con `Alarm`). */
export type AlarmLike = { id: string; name: string; tone: string }

/** Días hacia delante que se programan. La web renueva la lista cada vez que se abre. */
export const HORIZON_DAYS = 120
/** Tope total de eventos, por seguridad. La app nativa admite hasta 3000. */
export const MAX_EVENTS = 2000

function bridge(): Bridge | null {
  if (typeof window === 'undefined') return null
  const b = (window as unknown as { CompasNativo?: Bridge }).CompasNativo
  return b ?? null
}

/** Verdadero cuando la web corre dentro de la app Android. */
export function isNativeApp(): boolean {
  return bridge() !== null
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/**
 * Calcula las próximas ocurrencias de todas las alarmas.
 * `next` debe devolver la siguiente vez que suena una alarma después de `from`
 * (en la web, `nextAlarm(alarm, from, vacations)`).
 */
export function upcomingEvents<A extends AlarmLike>(
  alarms: A[],
  next: (alarm: A, from: Date) => Date | null,
  now: Date = new Date(),
  horizonDays: number = HORIZON_DAYS,
  maxEvents: number = MAX_EVENTS,
): NativeEvent[] {
  const limit = now.getTime() + horizonDays * 86_400_000
  const events: NativeEvent[] = []
  for (const alarm of alarms) {
    let from = now
    // Cada alarma tiene como mucho una ocurrencia al día. No se corta por el tope aquí:
    // si no, las primeras alarmas se quedarían con todo el cupo y las demás sin ninguna.
    for (let i = 0; i <= horizonDays + 1; i++) {
      const when = next(alarm, from)
      if (!when || when.getTime() > limit) break
      events.push({
        id: `${alarm.id}:${when.getTime()}`,
        ts: when.getTime(),
        nombre: alarm.name,
        hora: `${pad(when.getHours())}:${pad(when.getMinutes())}`,
        tono: alarm.tone,
      })
      from = when
    }
  }
  return events.sort((a, b) => a.ts - b.ts).slice(0, maxEvents)
}

/**
 * Entrega las próximas alarmas a la app nativa. Llámala al cargar las alarmas y cada vez
 * que se guarden cambios (alarmas, planes o vacaciones). Devuelve false si no hay app
 * nativa o si falla.
 */
export function syncNativeAlarms<A extends AlarmLike>(
  alarms: A[],
  next: (alarm: A, from: Date) => Date | null,
): boolean {
  const b = bridge()
  if (!b) return false
  try {
    const result = JSON.parse(
      b.programar(JSON.stringify(upcomingEvents(alarms, next))),
    ) as { ok: boolean }
    return result.ok === true
  } catch {
    return false
  }
}

export function nativeStatus(): NativeStatus | null {
  const b = bridge()
  if (!b) return null
  try {
    return JSON.parse(b.estado()) as NativeStatus
  } catch {
    return null
  }
}

export function openNativeSettings(kind: NativeSettingsKind = 'ajustes') {
  bridge()?.abrir(kind)
}

/** Hace sonar una alarma real dentro de unos segundos, para probar con el móvil bloqueado. */
export function testNativeAlarm(tone: string = 'Amanecer') {
  bridge()?.probar(tone)
}
