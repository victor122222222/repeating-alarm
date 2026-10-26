import { afterEach, describe, expect, it, vi } from 'vitest'
import { dateKey, examples, nextAlarm, shiftTime } from './alarms'
import {
  isNativeApp,
  syncNativeAlarms,
  upcomingEvents,
} from './native-alarms'

function setBridge(bridge: unknown) {
  Object.defineProperty(window, 'CompasNativo', {
    value: bridge,
    configurable: true,
    writable: true,
  })
}
afterEach(() => {
  delete (window as unknown as { CompasNativo?: unknown }).CompasNativo
})

const now = new Date(2026, 9, 25, 12)
// Ejemplos de la web: solo "Turnos rotativos" (05:00, 05:00, 17:00, 17:00, libre, libre) está activo.
const alarms = examples('2026-10-25').map((a) => ({ ...a, enabled: true }))
const none = new Set<string>()
const next = (vacations: ReadonlySet<string> = none) => (
  a: (typeof alarms)[number],
  from: Date,
) => nextAlarm(a, from, vacations)

/** Cálculo independiente, día a día, de las alarmas esperadas. */
function expected(
  alarm: (typeof alarms)[number],
  days: number,
  vacations: ReadonlySet<string> = none,
) {
  const out: number[] = []
  for (let d = 0; d <= days + 1; d++) {
    const date = new Date(2026, 9, 25 + d)
    if (vacations.has(dateKey(date))) continue
    const time = shiftTime(alarm, date)
    if (!time) continue
    const [h, m] = time.split(':').map(Number)
    date.setHours(h, m, 0, 0)
    if (
      date.getTime() > now.getTime() &&
      date.getTime() <= now.getTime() + days * 86_400_000
    )
      out.push(date.getTime())
  }
  return out
}

describe('upcomingEvents', () => {
  it('coincide con el cálculo día a día de cada plan', () => {
    const events = upcomingEvents(alarms, next(), now, 60)
    for (const alarm of alarms) {
      const got = events
        .filter((e) => e.id.startsWith(`${alarm.id}:`))
        .map((e) => e.ts)
      expect(got).toEqual(expected(alarm, 60))
      expect(got.length).toBeGreaterThan(0)
    }
  })

  it('devuelve eventos ordenados, con su hora y dentro del horizonte', () => {
    const events = upcomingEvents(alarms, next(), now, 30)
    for (let i = 1; i < events.length; i++)
      expect(events[i].ts).toBeGreaterThanOrEqual(events[i - 1].ts)
    for (const e of events) {
      expect(e.ts).toBeGreaterThan(now.getTime())
      expect(e.ts).toBeLessThanOrEqual(now.getTime() + 30 * 86_400_000)
      expect(e.hora).toMatch(/^\d\d:\d\d$/)
      const alarm = alarms.find((a) => e.id.startsWith(`${a.id}:`))!
      expect(e.nombre).toBe(alarm.name)
      expect(e.tono).toBe(alarm.tone)
    }
  })

  it('no incluye alarmas desactivadas', () => {
    const off = alarms.map((a) => ({ ...a, enabled: a.id === 'rotating' }))
    const events = upcomingEvents(off, next(), now, 30)
    expect(events.length).toBeGreaterThan(0)
    expect(events.every((e) => e.id.startsWith('rotating:'))).toBe(true)
  })

  it('salta los días de vacaciones sin mover el ciclo', () => {
    const rotating = alarms[0]
    const vacations = new Set(
      [0, 1, 2, 3, 10].map((d) => dateKey(new Date(2026, 9, 25 + d))),
    )
    const events = upcomingEvents([rotating], next(vacations), now, 40)
    expect(events.map((e) => e.ts)).toEqual(expected(rotating, 40, vacations))
    for (const e of events) expect(vacations.has(dateKey(new Date(e.ts)))).toBe(false)
  })

  it('el tope reparte el cupo entre alarmas en vez de agotarlo con la primera', () => {
    const events = upcomingEvents(alarms, next(), now, 120, 10)
    expect(events).toHaveLength(10)
    const ids = new Set(events.map((e) => e.id.split(':')[0]))
    expect(ids.size).toBeGreaterThan(1)
    const all = upcomingEvents(alarms, next(), now, 120, 10_000)
    expect(events.map((e) => e.ts)).toEqual(all.slice(0, 10).map((e) => e.ts))
  })

  it('no supera el tope con 100 alarmas', () => {
    const many = Array.from({ length: 100 }, (_, i) => ({
      ...alarms[0],
      id: `a${i}`,
    }))
    expect(upcomingEvents(many, next(), now).length).toBeLessThanOrEqual(2000)
  })
})

describe('puente nativo', () => {
  it('no hace nada en un navegador normal', () => {
    expect(isNativeApp()).toBe(false)
    expect(syncNativeAlarms(alarms, next())).toBe(false)
  })

  it('entrega la lista a la app nativa como JSON', () => {
    const programar = vi.fn().mockReturnValue('{"ok":true,"total":1}')
    setBridge({ programar })
    expect(isNativeApp()).toBe(true)
    expect(syncNativeAlarms(alarms, next())).toBe(true)
    const sent = JSON.parse(programar.mock.calls[0][0])
    expect(sent.length).toBeGreaterThan(0)
    expect(typeof sent[0].ts).toBe('number')
    expect(sent[0].hora).toMatch(/^\d\d:\d\d$/)
    expect(typeof sent[0].nombre).toBe('string')
    expect(typeof sent[0].tono).toBe('string')
  })

  it('devuelve false si la app nativa rechaza los datos', () => {
    const programar = vi.fn().mockReturnValue('{"ok":false,"error":"x"}')
    setBridge({ programar })
    expect(syncNativeAlarms(alarms, next())).toBe(false)
  })
})
