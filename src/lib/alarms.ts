// Cada plan de turnos es una secuencia de días: una hora ("05:00") si hay turno
// o null si es descanso. La secuencia se repite desde `start` (Día 1).
export type Alarm = {
  id: string
  name: string
  start: string
  enabled: boolean
  tone: string
  days: (string | null)[]
}
export const tones = ['Sirena', 'Pitido', 'Amanecer', 'Brisa', 'Órbita'] as const
export const MAX_DAYS = 120
export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const dayNumber = (d: Date) =>
  Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000
const startParts = (a: Alarm) => a.start.split('-').map(Number)
function offsetFromStart(a: Alarm, date: Date) {
  const [y, m, d] = startParts(a)
  return Math.round(dayNumber(date) - Date.UTC(y, m - 1, d) / 86400000)
}
export const cycle = (work: number, rest: number, time: string) => [
  ...Array<string | null>(work).fill(time),
  ...Array<string | null>(rest).fill(null),
]
// Convierte alarmas guardadas con el formato anterior (hora + días de trabajo y descanso).
export function normalize(
  a: Partial<Alarm> & { time?: string; work?: number; rest?: number },
): Alarm {
  return {
    id: a.id ?? crypto.randomUUID(),
    name: a.name ?? 'Plan de turnos',
    start: a.start ?? dateKey(new Date()),
    enabled: a.enabled ?? true,
    tone: a.tone ?? 'Sirena',
    days: Array.isArray(a.days)
      ? a.days
      : cycle(a.work ?? 1, a.rest ?? 0, a.time ?? '07:00'),
  }
}
/** Posición (0…n-1) del ciclo en una fecha, o null si el plan aún no ha empezado. */
export function cycleIndex(a: Alarm, date: Date) {
  const offset = offsetFromStart(a, date)
  return offset < 0 || !a.days.length ? null : offset % a.days.length
}
export function shiftTime(a: Alarm, date: Date) {
  const i = cycleIndex(a, date)
  return i === null ? null : a.days[i]
}
/** Próxima fecha en la que cae un día concreto del ciclo, desde `from` incluido. */
export function dateForDay(a: Alarm, index: number, from: Date) {
  const offset = offsetFromStart(a, from)
  if (offset < 0) {
    const [y, m, d] = startParts(a)
    return new Date(y, m - 1, d + index)
  }
  const len = a.days.length
  const delta = (index - (offset % len) + len) % len
  return new Date(from.getFullYear(), from.getMonth(), from.getDate() + delta)
}
export function nextAlarm(
  a: Alarm,
  now: Date,
  vacations: ReadonlySet<string>,
): Date | null {
  if (!a.enabled || !a.days.some(Boolean)) return null
  const [year, month, day] = startParts(a)
  const first = new Date(year, month - 1, day)
  const base = first > now ? first : now
  // Margen extra para saltar periodos largos de vacaciones.
  for (let i = 0; i <= a.days.length + 400; i++) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)
    if (vacations.has(dateKey(d))) continue
    const time = shiftTime(a, d)
    if (!time) continue
    const [h, m] = time.split(':').map(Number)
    d.setHours(h, m, 0, 0)
    if (d > now) return d
  }
  return null
}
export function examples(start: string): Alarm[] {
  return [
    {
      id: 'rotating',
      name: 'Turnos rotativos',
      start,
      enabled: true,
      tone: 'Sirena',
      days: ['05:00', '05:00', '17:00', '17:00', null, null],
    },
    {
      id: 'morning',
      name: 'Turno de mañana',
      start,
      enabled: false,
      tone: 'Pitido',
      days: cycle(4, 2, '06:00'),
    },
    {
      id: 'night',
      name: 'Turno de noche',
      start,
      enabled: false,
      tone: 'Órbita',
      days: cycle(2, 2, '22:00'),
    },
  ]
}
