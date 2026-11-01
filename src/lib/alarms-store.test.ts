import { afterEach, describe, expect, it, vi } from 'vitest'
import { cycle, dateKey, examples } from './alarms'
import { loadSchedule, saveSchedule, validateSchedule } from './alarms-store'

type Stored = { datos: unknown | null }

/** App Android simulada: guarda en memoria lo que la web le pide guardar. */
function installLocalBridge(initial: unknown | null = null) {
  const store: Stored = { datos: initial }
  const writes: unknown[] = []
  const bridge = {
    cargarDatos: vi.fn(() => JSON.stringify({ ok: true, datos: store.datos })),
    guardarDatos: vi.fn((json: string) => {
      store.datos = JSON.parse(json)
      writes.push(store.datos)
      return JSON.stringify({ ok: true })
    }),
  }
  Object.defineProperty(window, 'CompasNativo', {
    value: bridge,
    configurable: true,
    writable: true,
  })
  return { store, writes, bridge }
}

async function fails(promise: Promise<unknown>) {
  try {
    await promise
  } catch {
    return true
  }
  return false
}

afterEach(() => {
  delete (window as unknown as { CompasNativo?: unknown }).CompasNativo
  vi.unstubAllGlobals()
})

const alarm = {
  id: 'a1',
  name: '  Turno  ',
  start: '2026-11-02',
  enabled: true,
  tone: 'Sirena',
  days: ['05:00', null, '17:30'],
}

describe('en un navegador (servidor)', () => {
  it('carga de /api/alarms', async () => {
    const data = { alarms: examples('2026-11-02'), vacations: ['2026-12-24'] }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => data,
    })
    vi.stubGlobal('fetch', fetchMock)
    expect(await loadSchedule()).toEqual(data)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/alarms')
  })

  it('falla si el servidor responde con error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    expect(await fails(loadSchedule())).toBe(true)
    expect(await fails(saveSchedule({ alarms: [], vacations: [] }))).toBe(true)
  })

  it('guarda con PUT y devuelve lo que responde el servidor', async () => {
    const body = { alarms: [], vacations: ['2026-12-24'] }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => body,
    })
    vi.stubGlobal('fetch', fetchMock)
    expect(await saveSchedule(body)).toEqual(body)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/alarms')
    expect(fetchMock.mock.calls[0][1].method).toBe('PUT')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(body)
  })
})

describe('dentro de la app (en el móvil)', () => {
  it('en el primer uso crea los ejemplos y los guarda, sin usar el servidor', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { writes } = installLocalBridge(null)
    const data = await loadSchedule()
    expect(data.alarms).toEqual(examples(dateKey(new Date())))
    expect(data.vacations).toEqual([])
    expect(writes).toHaveLength(1)
    expect(writes[0]).toEqual(data)
    expect(fetchMock.mock.calls).toHaveLength(0)
  })

  it('devuelve lo ya guardado y no lo sobrescribe con ejemplos', async () => {
    const saved = { alarms: [{ ...alarm, name: 'Turno' }], vacations: ['2026-12-24'] }
    const { writes } = installLocalBridge(saved)
    expect(await loadSchedule()).toEqual(saved)
    expect(writes).toHaveLength(0)
  })

  it('convierte las alarmas del formato antiguo', async () => {
    installLocalBridge({
      alarms: [
        { id: 'old', name: 'Antigua', time: '06:00', work: 2, rest: 1, start: '2026-11-02', enabled: true, tone: 'Brisa' },
      ],
    })
    const data = await loadSchedule()
    expect(data.alarms[0].days).toEqual(cycle(2, 1, '06:00'))
    expect(data.vacations).toEqual([])
  })

  it('si no puede leer los datos, falla y no los sobrescribe', async () => {
    const { bridge, writes } = installLocalBridge(null)
    bridge.cargarDatos.mockReturnValue('{"ok":false}')
    expect(await fails(loadSchedule())).toBe(true)
    expect(writes).toHaveLength(0)
  })

  it('si los datos guardados están dañados, falla sin tocarlos', async () => {
    const { writes } = installLocalBridge({ alarms: 'roto' })
    expect(await fails(loadSchedule())).toBe(true)
    expect(writes).toHaveLength(0)
  })

  it('guarda los datos limpios: nombre sin espacios y vacaciones ordenadas y sin repetir', async () => {
    const { store } = installLocalBridge({ alarms: [], vacations: [] })
    const saved = await saveSchedule({
      alarms: [alarm],
      vacations: ['2026-12-25', '2026-12-24', '2026-12-25'],
    })
    expect(saved.alarms[0].name).toBe('Turno')
    expect(saved.vacations).toEqual(['2026-12-24', '2026-12-25'])
    expect(store.datos).toEqual(saved)
  })

  it('no guarda datos no válidos', async () => {
    const { writes } = installLocalBridge({ alarms: [], vacations: [] })
    expect(await fails(saveSchedule({ alarms: [{ ...alarm, tone: 'Rock' }], vacations: [] }))).toBe(true)
    expect(await fails(saveSchedule({ alarms: [{ ...alarm, days: [] }], vacations: [] }))).toBe(true)
    expect(writes).toHaveLength(0)
  })

  it('falla si la app no puede guardar', async () => {
    const { bridge } = installLocalBridge({ alarms: [], vacations: [] })
    bridge.guardarDatos.mockReturnValue('{"ok":false}')
    expect(await fails(saveSchedule({ alarms: [alarm], vacations: [] }))).toBe(true)
  })
})

describe('validateSchedule (mismas reglas que el servidor)', () => {
  const ok = { alarms: [alarm], vacations: [] }

  it('acepta datos correctos', () => {
    expect(validateSchedule(ok).alarms).toHaveLength(1)
  })

  it('rechaza fechas, horas, tonos y tamaños fuera de regla', () => {
    const bad = (patch: object) =>
      expect(() => validateSchedule({ alarms: [{ ...alarm, ...patch }], vacations: [] })).toThrow()
    bad({ start: '2026-02-30' })
    bad({ start: '02/11/2026' })
    bad({ days: ['25:00'] })
    bad({ days: ['7:00'] })
    bad({ days: Array(121).fill(null) })
    bad({ name: '   ' })
    bad({ name: 'x'.repeat(61) })
    bad({ id: '' })
    bad({ enabled: 'sí' })
    expect(() => validateSchedule({ alarms: [], vacations: ['2026-13-01'] })).toThrow()
    expect(() => validateSchedule({ alarms: Array(101).fill(alarm), vacations: [] })).toThrow()
    expect(() => validateSchedule({ alarms: [], vacations: Array(1001).fill('2026-12-24') })).toThrow()
    expect(() => validateSchedule(null)).toThrow()
  })
})
