import {
  dateKey,
  examples,
  MAX_DAYS,
  normalize,
  tones,
  type Alarm,
} from './alarms'
import {
  hasLocalData,
  readLocalData,
  writeLocalData,
} from './native-alarms'

/**
 * Dónde viven las alarmas. En un navegador, en el servidor (`/api/alarms`, ligado a una
 * cookie). Dentro de la app Android, en el propio móvil, sin depender de ningún servidor.
 */
export type Schedule = { alarms: Alarm[]; vacations: string[] }

const HOUR = /^([01]\d|2[0-3]):[0-5]\d$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const MAX_ALARMS = 100
const MAX_VACATIONS = 1000

function isRealDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  )
}

/**
 * Valida lo que se va a guardar con las mismas reglas que el servidor
 * (netlify/functions/alarms.mts). Devuelve los datos limpios o lanza un error.
 */
export function validateSchedule(input: unknown): Schedule {
  const fail = () => new Error('Datos de alarmas no válidos')
  if (typeof input !== 'object' || input === null) throw fail()
  const { alarms, vacations } = input as Record<string, unknown>
  if (!Array.isArray(alarms) || alarms.length > MAX_ALARMS) throw fail()
  if (!Array.isArray(vacations) || vacations.length > MAX_VACATIONS) throw fail()

  const cleanAlarms = alarms.map((raw): Alarm => {
    if (typeof raw !== 'object' || raw === null) throw fail()
    const a = raw as Record<string, unknown>
    if (typeof a.id !== 'string' || a.id.length < 1 || a.id.length > 100)
      throw fail()
    if (typeof a.name !== 'string') throw fail()
    const name = a.name.trim()
    if (name.length < 1 || name.length > 60) throw fail()
    if (!isRealDate(a.start)) throw fail()
    if (typeof a.enabled !== 'boolean') throw fail()
    if (typeof a.tone !== 'string' || !(tones as readonly string[]).includes(a.tone))
      throw fail()
    if (!Array.isArray(a.days) || a.days.length < 1 || a.days.length > MAX_DAYS)
      throw fail()
    const days = a.days.map((day: unknown) => {
      if (day === null) return null
      if (typeof day !== 'string' || !HOUR.test(day)) throw fail()
      return day
    })
    return {
      id: a.id,
      name,
      start: a.start,
      enabled: a.enabled,
      tone: a.tone,
      days,
    }
  })

  const cleanVacations = vacations.map((v: unknown) => {
    if (!isRealDate(v)) throw fail()
    return v
  })
  return {
    alarms: cleanAlarms,
    vacations: [...new Set(cleanVacations)].sort(),
  }
}

/** Carga las alarmas y las vacaciones. Lanza un error si no se pueden cargar. */
export async function loadSchedule(): Promise<Schedule> {
  if (hasLocalData()) {
    const stored = readLocalData()
    if (stored === null) {
      // Primer uso en este móvil: los mismos ejemplos que crea el servidor.
      const initial: Schedule = {
        alarms: examples(dateKey(new Date())),
        vacations: [],
      }
      writeLocalData(initial)
      return initial
    }
    if (typeof stored !== 'object') throw new Error('Datos guardados dañados')
    const { alarms, vacations } = stored as Partial<Schedule>
    if (!Array.isArray(alarms)) throw new Error('Datos guardados dañados')
    return {
      alarms: alarms.map(normalize),
      vacations: Array.isArray(vacations) ? vacations : [],
    }
  }
  const res = await fetch('/api/alarms')
  if (!res.ok) throw Error()
  return (await res.json()) as Schedule
}

/** Guarda las alarmas y las vacaciones y devuelve lo guardado. Lanza un error si falla. */
export async function saveSchedule(body: Schedule): Promise<Schedule> {
  if (hasLocalData()) {
    const clean = validateSchedule(body)
    writeLocalData(clean)
    return clean
  }
  const res = await fetch('/api/alarms', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw Error()
  return (await res.json()) as Schedule
}
