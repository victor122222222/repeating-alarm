import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import {
  AlarmClock,
  AudioLines,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coffee,
  HelpCircle,
  LayoutGrid,
  Moon,
  MoreHorizontal,
  Plus,
  Repeat2,
  Settings2,
  Sun,
  Sunrise,
  Volume2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { activeOn, dateKey, nextAlarm, type Alarm } from '@/lib/alarms'

export const Route = createFileRoute('/')({ component: Home })
const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const icons = [Sunrise, Sun, Moon]
function Home() {
  const [alarms, setAlarms] = useState<Alarm[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [now, setNow] = useState<Date | null>(null)
  const [view, setView] = useState('Alarmas')
  const [filter, setFilter] = useState('Todas')
  const [monthOffset, setMonthOffset] = useState(0)
  const [edit, setEdit] = useState<Alarm | null>(null)
  const [help, setHelp] = useState(false)
  const [ringing, setRinging] = useState<Alarm | null>(null)
  const [sound, setSound] = useState(false)
  const [snoozed, setSnoozed] = useState<{ alarm: Alarm; at: number } | null>(
    null,
  )
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const audio = useRef<AudioContext | null>(null)
  const fired = useRef(new Set<string>())
  async function load() {
    setLoading(true)
    setFailed(false)
    try {
      const res = await fetch('/api/alarms')
      if (!res.ok) throw Error()
      setAlarms(await res.json())
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void load()
    setNow(new Date())
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  function play(tone = 'Amanecer') {
    const ctx = audio.current
    if (!ctx) return
    void ctx.resume()
    for (let i = 0; i < 3; i++) {
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value =
        (tone === 'Brisa' ? 660 : tone === 'Órbita' ? 440 : 880) + i * 110
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.35)
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.35 + 0.03)
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + i * 0.35 + 0.3,
      )
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.start(ctx.currentTime + i * 0.35)
      oscillator.stop(ctx.currentTime + i * 0.35 + 0.32)
    }
  }
  useEffect(() => {
    if (!now) return
    for (const a of alarms) {
      const key = `${a.id}-${dateKey(now)}-${a.time}`
      if (
        a.enabled &&
        activeOn(a, now) &&
        now.toTimeString().slice(0, 5) === a.time &&
        !fired.current.has(key)
      ) {
        fired.current.add(key)
        setRinging(a)
      }
    }
    if (snoozed && now.getTime() >= snoozed.at) {
      if (alarms.some((a) => a.id === snoozed.alarm.id && a.enabled))
        setRinging(snoozed.alarm)
      setSnoozed(null)
    }
  }, [now, alarms, snoozed])
  useEffect(() => {
    if (!ringing || !sound) return
    play(ringing.tone)
    const timer = setInterval(() => play(ringing.tone), 2500)
    return () => clearInterval(timer)
  }, [ringing, sound])
  async function persist(next: Alarm[]) {
    setSaving(true)
    try {
      const res = await fetch('/api/alarms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      if (!res.ok) throw Error()
      setAlarms(next)
      return true
    } catch {
      toast.error('No se han guardado los cambios. Vuelve a intentarlo.')
      return false
    } finally {
      setSaving(false)
    }
  }
  async function enableSound() {
    try {
      audio.current ??= new AudioContext()
      await audio.current.resume()
      setSound(true)
      play()
      toast.success('Sonido activado en esta pestaña')
    } catch {
      toast.error('Este navegador no permite activar el audio.')
    }
  }
  const today = now ?? new Date('2026-10-25T12:00:00')
  const upcoming = alarms
    .map((a) => ({ alarm: a, date: nextAlarm(a, today) }))
    .filter((x) => x.date)
    .sort((a, b) => a.date!.getTime() - b.date!.getTime())
  const next = upcoming[0]
  const hours = next
    ? Math.floor((next.date!.getTime() - today.getTime()) / 3600000)
    : 0
  const minutes = next
    ? Math.floor((next.date!.getTime() - today.getTime()) / 60000) % 60
    : 0
  const month = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
  const monthLabel = month.toLocaleDateString('es', {
    month: 'long',
    year: 'numeric',
  })
  const gridStart = new Date(month)
  gridStart.setDate(1 - ((month.getDay() + 6) % 7))
  const calendar = Array.from(
    {
      length:
        35 +
        (((month.getDay() + 6) % 7) +
          new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() >
        35
          ? 7
          : 0),
    },
    (_, i) => {
      const d = new Date(gridStart)
      d.setDate(d.getDate() + i)
      return d
    },
  )
  const visible = alarms.filter(
    (a) =>
      filter === 'Todas' || (filter === 'Activas' ? a.enabled : !a.enabled),
  )
  function newAlarm() {
    setEdit({
      id: crypto.randomUUID(),
      name: '',
      time: '07:00',
      work: 4,
      rest: 2,
      start: dateKey(today),
      enabled: true,
      tone: 'Amanecer',
    })
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/">
          <span className="brand-icon">
            <AudioLines size={25} />
          </span>
          compás<span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">TU TIEMPO, A TU RITMO</div>
        <nav aria-label="Navegación principal">
          {[
            { name: 'Alarmas', icon: AlarmClock },
            { name: 'Mis ciclos', icon: Repeat2 },
            { name: 'Calendario', icon: CalendarDays },
          ].map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${view === name ? 'active' : ''}`}
              onClick={() => setView(name)}
            >
              <Icon size={19} />
              {name}
              {name === 'Alarmas' && (
                <span className="nav-count">{alarms.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="little-clock">
            <Clock3 size={27} />
          </div>
          <h3>Cada turno tiene su ritmo.</h3>
          <p>Encuentra el tuyo. Nosotros te ayudamos a seguirlo.</p>
          <div className="sidebar-rule" />
          <button className="nav-item" onClick={() => setView('Ajustes')}>
            <Settings2 size={18} />
            Ajustes
          </button>
          <button className="nav-item" onClick={() => setHelp(true)}>
            <HelpCircle size={18} />
            Ayuda y consejos
          </button>
          <div className="version">
            <span className="green-dot" /> Hecho para tus días <span>v1.0</span>
          </div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <span>
            Tu espacio personal <ChevronRight size={13} />{' '}
            <strong>{view}</strong>
          </span>
          <div className="today">
            <span className="green-dot" />
            {now
              ? today.toLocaleDateString('es', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })
              : 'Tu reloj personal'}
            <span className="avatar">T</span>
          </div>
        </header>
        <div className="page">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                UN POCO DE ORDEN, MUCHA TRANQUILIDAD
              </div>
              <h1>
                {view === 'Alarmas'
                  ? 'Tus alarmas. Tu ritmo.'
                  : view === 'Mis ciclos'
                    ? 'Un ciclo para cada turno.'
                    : view === 'Calendario'
                      ? 'Tus días, de un vistazo.'
                      : 'A tu manera.'}
              </h1>
              <p>El trabajo cambia de turno. Tus alarmas se adaptan a ti.</p>
            </div>
            <button
              className="primary"
              onClick={newAlarm}
              disabled={loading || failed}
            >
              <Plus size={18} /> Nueva alarma
            </button>
          </div>
          {view === 'Ajustes' ? (
            <section className="settings-panel">
              <Volume2 size={27} />
              <h2>Sonido de las alarmas</h2>
              <p>
                Activa el sonido al abrir la aplicación. Mantén esta pestaña
                abierta y el dispositivo despierto para escuchar las alarmas. El
                navegador puede suspenderlas en segundo plano.
              </p>
              <button className="primary" onClick={enableSound}>
                {sound ? 'Probar sonido' : 'Activar sonido'}
              </button>
              <p>
                Las horas y los ciclos utilizan la zona horaria de este
                dispositivo:{' '}
                {now ? Intl.DateTimeFormat().resolvedOptions().timeZone : '—'}.
                Las alarmas se guardan para este navegador mediante una cookie.
              </p>
            </section>
          ) : (
            <>
              <section className="next-banner">
                <div className="next-info">
                  <div className="next-label">
                    <span className="live-dot" />{' '}
                    {next ? 'PRÓXIMA ALARMA' : 'TU PRÓXIMO COMIENZO'}
                  </div>
                  <div className="next-time">
                    {next ? next.alarm.time : '— : —'}
                    <span>
                      {next ? next.alarm.name : 'Sin alarmas activas'}
                      <small>
                        {next
                          ? `${next.date!.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' })} · En ${hours} h ${minutes} min`
                          : 'Crea una alarma y encuentra tu ritmo'}
                      </small>
                    </span>
                  </div>
                  <div className="banner-tags">
                    <span>
                      <Repeat2 size={13} />
                      {next
                        ? `${next.alarm.work} días de trabajo · ${next.alarm.rest} de descanso`
                        : 'Ciclos a tu medida'}
                    </span>
                    <span>
                      <Volume2 size={13} />
                      {next ? next.alarm.tone : 'Sonidos suaves'}
                    </span>
                  </div>
                </div>
                <div className="clock-art" aria-hidden="true">
                  <div className="clock-ring">
                    <span className="clock-number n12">12</span>
                    <span className="clock-number n3">3</span>
                    <span className="clock-number n6">6</span>
                    <span className="clock-number n9">9</span>
                    <div className="hand hour" />
                    <div className="hand minute" />
                    <div className="clock-center" />
                  </div>
                  <div className="orbit-dot" />
                </div>
                <span className="banner-caption">Un nuevo día. A tu hora.</span>
              </section>
              <div
                className={`content-grid ${view === 'Calendario' ? 'calendar-view' : ''}`}
              >
                <section className="alarms-section">
                  <div className="section-heading">
                    <h2>
                      {view === 'Mis ciclos' ? 'Mis ciclos' : 'Mis alarmas'}{' '}
                      <span>{alarms.length}</span>
                    </h2>
                    <div className="segmented" aria-label="Filtrar alarmas">
                      {['Todas', 'Activas', 'Pausadas'].map((f) => (
                        <button
                          key={f}
                          onClick={() => setFilter(f)}
                          className={filter === f ? 'selected' : ''}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  {loading ? (
                    <div className="loading-state">Cargando tus alarmas…</div>
                  ) : failed ? (
                    <div className="empty-state">
                      <AlarmClock />
                      <h3>No hemos podido cargar tus alarmas</h3>
                      <button className="text-button" onClick={load}>
                        Volver a intentar
                      </button>
                    </div>
                  ) : visible.length === 0 ? (
                    <div className="empty-state">
                      <AlarmClock />
                      <h3>Un espacio para tu próximo turno</h3>
                      <p>
                        {filter === 'Todas'
                          ? 'Añade tu primera alarma para empezar.'
                          : 'No hay alarmas en este filtro.'}
                      </p>
                      <button className="text-button" onClick={newAlarm}>
                        Crear alarma
                      </button>
                    </div>
                  ) : (
                    visible.map((a, i) => {
                      const Icon = icons[i % 3]
                      return (
                        <article
                          className={`alarm-card ${!a.enabled ? 'paused' : ''}`}
                          key={a.id}
                        >
                          <div className="alarm-main">
                            <span className={`shift-icon shift-${i % 3}`}>
                              <Icon size={22} />
                            </span>
                            <button
                              className="alarm-edit"
                              onClick={() => setEdit({ ...a })}
                            >
                              <span className="alarm-time">
                                {a.time}
                                <span>
                                  {a.enabled ? 'Programada' : 'En pausa'}
                                </span>
                              </span>
                              <h3>{a.name}</h3>
                            </button>
                            <Switch
                              aria-label={`Activar ${a.name}`}
                              checked={a.enabled}
                              disabled={saving}
                              onCheckedChange={(enabled) =>
                                void persist(
                                  alarms.map((x) =>
                                    x.id === a.id ? { ...x, enabled } : x,
                                  ),
                                )
                              }
                            />
                          </div>
                          <div className="alarm-details">
                            <span className="cycle-pill">
                              <Repeat2 size={13} />
                              {a.work} trabajo <span> / </span> {a.rest}{' '}
                              descanso
                            </span>
                            <span className="alarm-tone">
                              <Volume2 size={13} />
                              {a.tone}
                            </span>
                            <button
                              className="icon-button"
                              aria-label={`Editar ${a.name}`}
                              onClick={() => setEdit({ ...a })}
                            >
                              <MoreHorizontal size={20} />
                            </button>
                          </div>
                          {view === 'Mis ciclos' && (
                            <div className="cycle-preview">
                              {Array.from(
                                { length: Math.min(20, a.work + a.rest) },
                                (_, j) => (
                                  <span
                                    key={j}
                                    className={j < a.work ? 'work' : 'rest'}
                                  >
                                    {j < a.work ? 'T' : 'D'}
                                  </span>
                                ),
                              )}
                              <small>
                                Se repite cada {a.work + a.rest} días
                              </small>
                            </div>
                          )}
                        </article>
                      )
                    })
                  )}
                  <button
                    className="add-alarm"
                    disabled={loading || failed}
                    onClick={newAlarm}
                  >
                    <span>
                      <Plus size={20} />
                    </span>
                    <div>
                      Añade un nuevo ritmo
                      <small>Crea una alarma con tu propio ciclo</small>
                    </div>
                    <Plus size={18} />
                  </button>
                  <div className="saved-note">
                    <Check size={13} />
                    {saving
                      ? 'Guardando cambios…'
                      : failed
                        ? 'Sin conexión con tus alarmas'
                        : 'Tus cambios se guardan automáticamente'}
                  </div>
                </section>
                <aside className="calendar-panel">
                  <div className="calendar-title">
                    <h2>Tu calendario</h2>
                    <CalendarDays size={18} />
                  </div>
                  <div className="month-nav">
                    <strong>{monthLabel}</strong>
                    <div>
                      <button
                        className="icon-button"
                        aria-label="Mes anterior"
                        onClick={() => setMonthOffset((m) => m - 1)}
                      >
                        <ChevronLeft size={17} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label="Mes siguiente"
                        onClick={() => setMonthOffset((m) => m + 1)}
                      >
                        <ChevronRight size={17} />
                      </button>
                    </div>
                  </div>
                  <div className="calendar-grid">
                    {days.map((d, i) => (
                      <span className="weekday" key={i}>
                        {d}
                      </span>
                    ))}
                    {calendar.map((d) => {
                      const work = alarms.some(
                        (a) => a.enabled && activeOn(a, d),
                      )
                      return (
                        <button
                          aria-label={d.toLocaleDateString('es', {
                            day: 'numeric',
                            month: 'long',
                          })}
                          key={dateKey(d)}
                          onClick={() => setSelectedDay(d)}
                          className={`calendar-day ${d.getMonth() !== month.getMonth() ? 'outside' : ''} ${dateKey(d) === dateKey(today) ? 'is-today' : ''} ${selectedDay && dateKey(d) === dateKey(selectedDay) ? 'is-selected' : ''}`}
                        >
                          <span>{d.getDate()}</span>
                          <i className={work ? 'work-dot' : 'rest-dot'} />
                        </button>
                      )
                    })}
                  </div>
                  <div className="legend">
                    <span>
                      <i className="work-dot" /> Trabajo
                    </span>
                    <span>
                      <i className="rest-dot" /> Descanso
                    </span>
                    <span>
                      <i className="today-dot" /> Hoy
                    </span>
                  </div>
                  <div className="calendar-summary">
                    {selectedDay ? (
                      <>
                        <h3>
                          {selectedDay.toLocaleDateString('es', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                          })}
                        </h3>
                        {alarms
                          .filter((a) => a.enabled && activeOn(a, selectedDay))
                          .map((a) => (
                            <p key={a.id}>
                              {a.time} · {a.name}
                            </p>
                          ))}
                        {!alarms.some(
                          (a) => a.enabled && activeOn(a, selectedDay),
                        ) && <p>Un día sin alarmas. Disfruta del descanso.</p>}
                      </>
                    ) : (
                      <>
                        <span className="summary-icon">
                          <Coffee size={20} />
                        </span>
                        <div>
                          <h3>El descanso también cuenta</h3>
                          <p>
                            Tus alarmas respetan los días libres de cada ciclo.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </aside>
              </div>
              <div className="tip">
                <span className="tip-icon">
                  <LayoutGrid size={19} />
                </span>
                <div>
                  <strong>No todos los turnos son de lunes a viernes.</strong>
                  <p>
                    Combina ciclos de trabajo y descanso. Nosotros nos
                    encargamos de llevar la cuenta.
                  </p>
                </div>
                <span className="tip-badge">A TU MEDIDA</span>
              </div>
            </>
          )}
          <footer>
            <span>Menos pendientes. Más tiempo para ti.</span>
            <button onClick={() => setHelp(true)}>
              Conoce cómo funciona <ChevronRight size={14} />
            </button>
          </footer>
        </div>
      </main>
      <Dialog
        open={!!edit}
        onOpenChange={(open) => {
          if (!open && !saving) setEdit(null)
        }}
      >
        <DialogContent className="alarm-dialog">
          <DialogHeader>
            <DialogTitle>
              {alarms.some((a) => a.id === edit?.id)
                ? 'Editar alarma'
                : 'Un nuevo ritmo'}
            </DialogTitle>
            <DialogDescription>
              Elige tu hora y los días de trabajo y descanso que se repiten.
            </DialogDescription>
          </DialogHeader>
          {edit && (
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const next = alarms.some((a) => a.id === edit.id)
                  ? alarms.map((a) => (a.id === edit.id ? edit : a))
                  : [...alarms, edit]
                if (await persist(next)) {
                  setEdit(null)
                  toast.success('Alarma guardada')
                }
              }}
            >
              <div className="form-row">
                <label>
                  Hora
                  <input
                    required
                    type="time"
                    value={edit.time}
                    onChange={(e) => setEdit({ ...edit, time: e.target.value })}
                  />
                </label>
                <label>
                  Nombre
                  <input
                    autoFocus
                    required
                    maxLength={60}
                    placeholder="Por ejemplo, turno de mañana"
                    value={edit.name}
                    onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  />
                </label>
              </div>
              <label className="field-label">
                Ciclo rápido
                <div className="presets">
                  {[
                    [4, 2],
                    [5, 2],
                    [2, 2],
                    [3, 3],
                  ].map(([work, rest]) => (
                    <button
                      type="button"
                      key={work + ':' + rest}
                      className={
                        edit.work === work && edit.rest === rest
                          ? 'selected'
                          : ''
                      }
                      onClick={() => setEdit({ ...edit, work, rest })}
                    >
                      {work} / {rest}
                    </button>
                  ))}
                </div>
              </label>
              <div className="form-row">
                <label>
                  Días de trabajo
                  <input
                    required
                    type="number"
                    min="1"
                    max="60"
                    value={edit.work}
                    onChange={(e) =>
                      setEdit({ ...edit, work: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  Días de descanso
                  <input
                    required
                    type="number"
                    min="0"
                    max="60"
                    value={edit.rest}
                    onChange={(e) =>
                      setEdit({ ...edit, rest: Number(e.target.value) })
                    }
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Primer día de trabajo
                  <input
                    required
                    type="date"
                    min="2000-01-01"
                    max="2100-12-31"
                    value={edit.start}
                    onChange={(e) =>
                      setEdit({ ...edit, start: e.target.value })
                    }
                  />
                </label>
                <label>
                  Sonido
                  <select
                    value={edit.tone}
                    onChange={(e) => setEdit({ ...edit, tone: e.target.value })}
                  >
                    <option>Amanecer</option>
                    <option>Brisa</option>
                    <option>Órbita</option>
                  </select>
                </label>
              </div>
              <p className="form-hint">
                <Repeat2 size={15} /> {edit.work} días con alarma y {edit.rest}{' '}
                sin alarma. El ciclo vuelve a empezar automáticamente.
              </p>
              <div className="dialog-actions">
                {alarms.some((a) => a.id === edit.id) && (
                  <button
                    disabled={saving}
                    type="button"
                    className="delete-button"
                    onClick={async () => {
                      if (
                        await persist(alarms.filter((a) => a.id !== edit.id))
                      ) {
                        setEdit(null)
                        toast.success('Alarma eliminada')
                      }
                    }}
                  >
                    Eliminar
                  </button>
                )}
                <button className="primary" disabled={saving} type="submit">
                  {saving ? 'Guardando…' : 'Guardar alarma'}
                  <Check size={16} />
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tu tiempo, a tu ritmo</DialogTitle>
            <DialogDescription>
              Cómo funcionan tus alarmas por turnos
            </DialogDescription>
          </DialogHeader>
          <div className="help-copy">
            <h3>1. Elige tu ciclo</h3>
            <p>
              Por ejemplo, 4 días de trabajo y 2 de descanso. La alarma suena
              durante los 4 primeros y descansa durante los 2 siguientes,
              repitiéndose sin depender de los días de la semana.
            </p>
            <h3>2. Marca el inicio</h3>
            <p>
              La fecha de inicio es el primer día de trabajo del ciclo. Usa
              distintas fechas para alternar turnos.
            </p>
            <h3>3. Activa el sonido</h3>
            <p>
              Esta es una aplicación web: necesita la pestaña abierta y el
              dispositivo despierto. No puede garantizar alarmas con la pantalla
              bloqueada o el navegador cerrado.
            </p>
            <button className="primary" onClick={enableSound}>
              <Volume2 size={16} />
              {sound ? 'Probar sonido' : 'Activar sonido'}
            </button>
            <p>
              Tus alarmas se guardan para este navegador. Borrar las cookies
              impide recuperar este espacio. Las tres alarmas iniciales son
              ejemplos editables.
            </p>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!ringing}
        onOpenChange={(open) => {
          if (!open) setRinging(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <AlarmClock /> {ringing?.time}
            </DialogTitle>
            <DialogDescription>
              {ringing?.name} · Es tu momento
            </DialogDescription>
          </DialogHeader>
          <button className="primary" onClick={() => setRinging(null)}>
            Detener alarma
          </button>
          <button
            className="text-button"
            onClick={() => {
              if (ringing)
                setSnoozed({ alarm: ringing, at: Date.now() + 5 * 60000 })
              setRinging(null)
              toast('Alarma pospuesta 5 minutos')
            }}
          >
            Posponer 5 minutos
          </button>
        </DialogContent>
      </Dialog>
      {!sound && (
        <button className="sound-enable" onClick={enableSound}>
          <Volume2 size={15} />
          Activar sonido<span>Con la página abierta</span>
        </button>
      )}
    </div>
  )
}
