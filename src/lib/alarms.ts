export type Alarm = {
  id: string
  name: string
  time: string
  work: number
  rest: number
  start: string
  enabled: boolean
  tone: string
}
export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export function activeOn(a: Alarm, date: Date) {
  const [y, m, d] = a.start.split('-').map(Number)
  const offset = Math.round(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
      Date.UTC(y, m - 1, d)) /
      86400000,
  )
  return offset >= 0 && offset % (a.work + a.rest) < a.work
}
export function nextAlarm(a: Alarm, now: Date): Date | null {
  if (!a.enabled) return null
  const [year, month, day] = a.start.split('-').map(Number)
  const first = new Date(year, month - 1, day)
  const base = first > now ? first : now
  for (let i = 0; i <= a.work + a.rest; i++) {
    const d = new Date(base)
    d.setDate(d.getDate() + i)
    const [h, m] = a.time.split(':').map(Number)
    d.setHours(h, m, 0, 0)
    if (d > now && activeOn(a, d)) return d
  }
  return null
}
export function examples(start: string): Alarm[] {
  return [
    {
      id: 'morning',
      name: 'Turno de mañana',
      time: '06:00',
      work: 4,
      rest: 2,
      start,
      enabled: true,
      tone: 'Amanecer',
    },
    {
      id: 'afternoon',
      name: 'Turno de tarde',
      time: '14:00',
      work: 3,
      rest: 3,
      start,
      enabled: true,
      tone: 'Brisa',
    },
    {
      id: 'night',
      name: 'Turno de noche',
      time: '22:00',
      work: 2,
      rest: 2,
      start,
      enabled: false,
      tone: 'Órbita',
    },
  ]
}
