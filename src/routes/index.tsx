import { createFileRoute } from '@tanstack/react-router'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
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
  ListOrdered,
  Moon,
  MoreHorizontal,
  Plus,
  Repeat2,
  Settings2,
  Sun,
  Sunrise,
  TreePalm,
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
import {
  cycle,
  cycleIndex,
  dateForDay,
  dateKey,
  MAX_DAYS,
  nextAlarm,
  shiftTime,
  tones,
  type Alarm,
} from '@/lib/alarms'
import { playTone } from '@/lib/sound'
import {
  isNativeApp,
  openNativeSettings,
  syncNativeAlarms,
  testNativeAlarm,
} from '@/lib/native-alarms'
import { PlanView } from '@/components/plan-view'
import { SlideToUnlock } from '@/components/slide-to-unlock'

export const Route = createFileRoute('/')({ component: Home })
const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const icons = [Sunrise, Sun, Moon]
const hm = (d: Date) => d.toTimeString().slice(0, 5)
// El puente de la app Android no cambia mientras la página está abierta.
const noSubscribe = () => () => {}
type DayEdit = {
  planId: string
  index: number
  time: string | null
  isNew: boolean
}
function Home() {
  const [alarms, setAlarms] = useState<Alarm[]>([])
  const [vacations, setVacations] = useState<string[]>([])
  const vacationSet = useMemo(() => new Set(vacations), [vacations])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [now, setNow] = useState<Date | null>(null)
  const [view, setView] = useState('Alarmas')
  const [filter, setFilter] = useState('Todas')
  const [monthOffset, setMonthOffset] = useState(0)
  const [edit, setEdit] = useState<Alarm | null>(null)
  const [quickTime, setQuickTime] = useState('07:00')
  const [planId, setPlanId] = useState<string | null>(null)
  const [dayEdit, setDayEdit] = useState<DayEdit | null>(null)
  const [vacationMode, setVacationMode] = useState(false)
  const [help, setHelp] = useState(false)
  const [ringing, setRinging] = useState<{
    alarm: Alarm
    time: string
    key: string
  } | null>(null)
  const [sound, setSound] = useState(false)
  // Verdadero solo dentro de la app Android; en el servidor y en un navegador es falso.
  const native = useSyncExternalStore(noSubscribe, isNativeApp, () => false)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const audio = useRef<AudioContext | null>(null)
  const fired = useRef(new Set<string>())
  async function load() {
    setLoading(true)
    setFailed(false)
    try {
      const res = await fetch('/api/alarms')
      if (!res.ok) throw Error()
      const data: { alarms: Alarm[]; vacations: string[] } = await res.json()
      setAlarms(data.alarms)
      setVacations(data.vacations)
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
  function play(tone = 'Sirena') {
    if (audio.current) playTone(audio.current, tone)
  }
  // Dentro de la app Android, la app nativa hace sonar las alarmas con el móvil bloqueado.
  // Aquí solo le entregamos las próximas; la web no debe sonar a la vez.
  useEffect(() => {
    if (loading || failed) return
    syncNativeAlarms(alarms, (a, from) => nextAlarm(a, from, vacationSet))
  }, [alarms, vacationSet, loading, failed])
  useEffect(() => {
    if (native || !now || vacationSet.has(dateKey(now))) return
    for (const a of alarms) {
      const time = shiftTime(a, now)
      const key = `${a.id}-${dateKey(now)}-${time}`
      if (a.enabled && time === hm(now) && !fired.current.has(key)) {
        fired.current.add(key)
        setRinging({ alarm: a, time, key })
      }
    }
  }, [now, alarms, vacationSet, native])
  // Suena y vibra sin parar hasta que se desliza el control de desbloqueo.
  useEffect(() => {
    if (!ringing) return
    const ring = () => {
      if (sound && audio.current) playTone(audio.current, ringing.alarm.tone)
      navigator.vibrate?.([900, 300, 700])
    }
    ring()
    const timer = setInterval(ring, 2000)
    return () => {
      clearInterval(timer)
      navigator.vibrate?.(0)
    }
  }, [ringing, sound])
  async function persist(next: { alarms?: Alarm[]; vacations?: string[] }) {
    setSaving(true)
    try {
      const body = {
        alarms: next.alarms ?? alarms,
        vacations: next.vacations ?? vacations,
      }
      const res = await fetch('/api/alarms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw Error()
      const saved: typeof body = await res.json()
      setAlarms(saved.alarms)
      setVacations(saved.vacations)
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
    .map((a) => ({ alarm: a, date: nextAlarm(a, today, vacationSet) }))
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
  const plan = alarms.find((a) => a.id === planId) ?? alarms[0]
  const dayPlan = alarms.find((a) => a.id === dayEdit?.planId)
  function newAlarm() {
    setQuickTime('07:00')
    setEdit({
      id: crypto.randomUUID(),
      name: '',
      start: dateKey(today),
      enabled: true,
      tone: 'Sirena',
      days: cycle(4, 2, '07:00'),
    })
  }
  function editAlarm(a: Alarm) {
    setQuickTime(a.days.find(Boolean) ?? '07:00')
    setEdit({ ...a, days: [...a.days] })
  }
  const togglePlan = (a: Alarm, enabled: boolean) =>
    void persist({
      alarms: alarms.map((x) => (x.id === a.id ? { ...x, enabled } : x)),
    })
  async function saveDay(d: DayEdit) {
    const p = alarms.find((a) => a.id === d.planId)
    if (!p) return null
    const days = d.isNew
      ? [...p.days, d.time]
      : p.days.map((t, i) => (i === d.index ? d.time : t))
    if (!d.isNew && p.days[d.index] === d.time) return days
    const ok = await persist({
      alarms: alarms.map((a) => (a.id === p.id ? { ...a, days } : a)),
    })
    return ok ? days : null
  }
  async function toggleVacation(d: Date) {
    if (saving) return
    const key = dateKey(d)
    const on = !vacationSet.has(key)
    if (
      await persist({
        vacations: on
          ? [...vacations, key]
          : vacations.filter((v) => v !== key),
      })
    )
      toast.success(
        on
          ? 'Día marcado como vacaciones: no sonará ninguna alarma'
          : 'Vacaciones quitadas de este día',
      )
  }
  const selectedVacation = selectedDay && vacationSet.has(dateKey(selectedDay))
  const selectedShifts = selectedDay
    ? alarms
        .filter((a) => a.enabled)
        .map((a) => ({ a, time: shiftTime(a, selectedDay) }))
        .filter((x) => x.time)
    : []
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
            { name: 'Planificación', icon: ListOrdered },
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
                  : view === 'Planificación'
                    ? 'Cada día de tu ciclo.'
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
              <Plus size={18} />{' '}
              {view === 'Planificación' ? 'Nuevo plan' : 'Nueva alarma'}
            </button>
          </div>
          {view === 'Ajustes' ? (
            <section className="settings-panel">
              {native ? (
                <>
                  <AlarmClock size={27} />
                  <h2>Alarmas del móvil</h2>
                  <p>
                    Las alarmas suenan aunque el móvil esté bloqueado, siempre
                    que hayas preparado el móvil.
                  </p>
                  <div className="native-actions">
                    <button
                      className="primary"
                      onClick={() => openNativeSettings('ajustes')}
                    >
                      Preparar el móvil
                    </button>
                    <button
                      className="primary"
                      onClick={() =>
                        testNativeAlarm(
                          alarms.find((a) => a.enabled)?.tone ?? 'Sirena',
                        )
                      }
                    >
                      Probar alarma
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Volume2 size={27} />
                  <h2>Sonido de las alarmas</h2>
                  <p>
                    Activa el sonido al abrir la aplicación. Mantén esta pestaña
                    abierta y el dispositivo despierto para escuchar las
                    alarmas. El navegador puede suspenderlas en segundo plano.
                  </p>
                  <button className="primary" onClick={enableSound}>
                    {sound ? 'Probar sonido' : 'Activar sonido'}
                  </button>
                </>
              )}
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
                    {next ? hm(next.date!) : '— : —'}
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
                        ? `Ciclo de ${next.alarm.days.length} días · ${next.alarm.days.filter(Boolean).length} con turno`
                        : 'Ciclos a tu medida'}
                    </span>
                    <span>
                      <Volume2 size={13} />
                      {next ? next.alarm.tone : 'Sonido fuerte'}
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
                {view === 'Planificación' && !loading && !failed ? (
                  <PlanView
                    alarms={alarms}
                    plan={plan}
                    today={today}
                    vacations={vacationSet}
                    saving={saving}
                    onSelect={setPlanId}
                    onNew={newAlarm}
                    onEdit={editAlarm}
                    onToggle={togglePlan}
                    onDay={(p, index) =>
                      setDayEdit({
                        planId: p.id,
                        index,
                        time: p.days[index],
                        isNew: false,
                      })
                    }
                    onAddDay={(p) =>
                      setDayEdit({
                        planId: p.id,
                        index: p.days.length,
                        time: p.days.slice().reverse().find(Boolean) ?? '07:00',
                        isNew: true,
                      })
                    }
                  />
                ) : (
                <section className="alarms-section">
                  <div className="section-heading">
                    <h2>
                      Mis alarmas <span>{alarms.length}</span>
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
                      const upcomingDate = nextAlarm(a, today, vacationSet)
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
                              onClick={() => editAlarm(a)}
                            >
                              <span className="alarm-time">
                                {upcomingDate
                                  ? hm(upcomingDate)
                                  : (a.days.find(Boolean) ?? '—:—')}
                                <span>
                                  {!a.enabled
                                    ? 'En pausa'
                                    : upcomingDate
                                      ? upcomingDate.toLocaleDateString('es', {
                                          weekday: 'short',
                                          day: 'numeric',
                                        })
                                      : 'Programada'}
                                </span>
                              </span>
                              <h3>{a.name}</h3>
                            </button>
                            <Switch
                              aria-label={`Activar ${a.name}`}
                              checked={a.enabled}
                              disabled={saving}
                              onCheckedChange={(enabled) =>
                                togglePlan(a, enabled)
                              }
                            />
                          </div>
                          <div className="alarm-details">
                            <span className="cycle-pill">
                              <Repeat2 size={13} />
                              {a.days.filter(Boolean).length} turno{' '}
                              <span> / </span>{' '}
                              {a.days.filter((t) => !t).length} descanso
                            </span>
                            <span className="alarm-tone">
                              <Volume2 size={13} />
                              {a.tone}
                            </span>
                            <button
                              className="icon-button"
                              aria-label={`Editar ${a.name}`}
                              onClick={() => editAlarm(a)}
                            >
                              <MoreHorizontal size={20} />
                            </button>
                          </div>
                          <div className="cycle-preview">
                            {a.days.slice(0, 28).map((t, j) => (
                              <span
                                key={j}
                                className={`${t ? 'work' : 'rest'} ${j === cycleIndex(a, today) ? 'now' : ''}`}
                                title={`Día ${j + 1}: ${t ?? 'Descanso'}`}
                              >
                                {t ? 'T' : 'D'}
                              </span>
                            ))}
                            <button
                              className="text-button"
                              onClick={() => {
                                setPlanId(a.id)
                                setView('Planificación')
                              }}
                            >
                              Ver planificación de {a.days.length} días
                            </button>
                          </div>
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
                )}
                {view === 'Planificación' && (loading || failed) && (
                  <section className="alarms-section">
                    {loading ? (
                      <div className="loading-state">Cargando tus planes…</div>
                    ) : (
                      <div className="empty-state">
                        <h3>No hemos podido cargar tus planes</h3>
                        <button className="text-button" onClick={load}>
                          Volver a intentar
                        </button>
                      </div>
                    )}
                  </section>
                )}
                <aside className="calendar-panel">
                  <div className="calendar-title">
                    <h2>Tu calendario</h2>
                    <button
                      className={`vacation-toggle ${vacationMode ? 'on' : ''}`}
                      aria-pressed={vacationMode}
                      disabled={loading || failed}
                      onClick={() => setVacationMode((v) => !v)}
                    >
                      <TreePalm size={14} />
                      {vacationMode ? 'Listo' : 'Vacaciones'}
                    </button>
                  </div>
                  {vacationMode && (
                    <p className="vacation-hint">
                      Pulsa los días de vacaciones. Ese día no sonará ninguna
                      alarma y el ciclo sigue contando igual.
                    </p>
                  )}
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
                      const vacation = vacationSet.has(dateKey(d))
                      const work = alarms.some(
                        (a) => a.enabled && shiftTime(a, d),
                      )
                      return (
                        <button
                          aria-label={`${d.toLocaleDateString('es', {
                            day: 'numeric',
                            month: 'long',
                          })}${vacation ? ', vacaciones' : ''}`}
                          aria-pressed={vacationMode ? vacation : undefined}
                          key={dateKey(d)}
                          onClick={() => {
                            setSelectedDay(d)
                            if (vacationMode) void toggleVacation(d)
                          }}
                          className={`calendar-day ${d.getMonth() !== month.getMonth() ? 'outside' : ''} ${dateKey(d) === dateKey(today) ? 'is-today' : ''} ${selectedDay && dateKey(d) === dateKey(selectedDay) ? 'is-selected' : ''} ${vacation ? 'is-vacation' : ''}`}
                        >
                          <span>{d.getDate()}</span>
                          <i
                            className={
                              vacation
                                ? 'vacation-dot'
                                : work
                                  ? 'work-dot'
                                  : 'rest-dot'
                            }
                          />
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
                      <i className="vacation-dot" /> Vacaciones
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
                        {selectedVacation ? (
                          <p>
                            De vacaciones: no sonará ninguna alarma este día.
                          </p>
                        ) : (
                          selectedShifts.map(({ a, time }) => (
                            <p key={a.id}>
                              {time} · {a.name} · Día{' '}
                              {(cycleIndex(a, selectedDay) ?? 0) + 1}
                            </p>
                          ))
                        )}
                        {!selectedVacation && !selectedShifts.length && (
                          <p>Un día sin alarmas. Disfruta del descanso.</p>
                        )}
                        <button
                          className="text-button"
                          disabled={saving}
                          onClick={() => void toggleVacation(selectedDay)}
                        >
                          {selectedVacation
                            ? 'Quitar vacaciones'
                            : 'Marcar como vacaciones'}
                        </button>
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
                            Marca tus vacaciones y no sonarán esos días.
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
                ? 'Configurar plan'
                : 'Nuevo plan de turnos'}
            </DialogTitle>
            <DialogDescription>
              Nombre, Día 1 del ciclo y sonido. Cada día se ajusta desde la
              planificación.
            </DialogDescription>
          </DialogHeader>
          {edit && (
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const next = alarms.some((a) => a.id === edit.id)
                  ? alarms.map((a) => (a.id === edit.id ? edit : a))
                  : [...alarms, edit]
                if (await persist({ alarms: next })) {
                  setPlanId(edit.id)
                  setEdit(null)
                  toast.success('Plan guardado')
                }
              }}
            >
              <label className="field-label">
                Nombre
                <input
                  autoFocus
                  required
                  maxLength={60}
                  placeholder="Por ejemplo, turnos rotativos"
                  value={edit.name}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                />
              </label>
              <div className="form-row">
                <label>
                  Hora para el ciclo rápido
                  <input
                    type="time"
                    value={quickTime}
                    onChange={(e) => setQuickTime(e.target.value || '07:00')}
                  />
                </label>
                <label>
                  Sonido
                  <select
                    value={edit.tone}
                    onChange={(e) => setEdit({ ...edit, tone: e.target.value })}
                  >
                    {tones.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="field-label">
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
                      onClick={() =>
                        setEdit({ ...edit, days: cycle(work, rest, quickTime) })
                      }
                    >
                      {work} / {rest}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-row">
                <label>
                  Fecha del Día 1
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
              </div>
              <p className="form-hint">
                <Repeat2 size={15} /> {edit.days.length} días ·{' '}
                {edit.days.map((t) => t ?? 'Descanso').join(', ')}
              </p>
              <div className="dialog-actions">
                {alarms.some((a) => a.id === edit.id) && (
                  <button
                    disabled={saving}
                    type="button"
                    className="delete-button"
                    onClick={async () => {
                      if (
                        await persist({
                          alarms: alarms.filter((a) => a.id !== edit.id),
                        })
                      ) {
                        setEdit(null)
                        toast.success('Plan eliminado')
                      }
                    }}
                  >
                    Eliminar
                  </button>
                )}
                <button className="primary" disabled={saving} type="submit">
                  {saving ? 'Guardando…' : 'Guardar plan'}
                  <Check size={16} />
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!dayEdit}
        onOpenChange={(open) => {
          if (!open && !saving) setDayEdit(null)
        }}
      >
        <DialogContent className="alarm-dialog">
          <DialogHeader>
            <DialogTitle>
              {dayEdit?.isNew ? 'Añadir' : 'Configurar'} Día{' '}
              {(dayEdit?.index ?? 0) + 1}
            </DialogTitle>
            <DialogDescription>
              {dayPlan && dayEdit
                ? `${dayPlan.name} · próxima vez: ${dateForDay(dayPlan, dayEdit.index, today).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {dayEdit && dayPlan && (
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (await saveDay(dayEdit)) setDayEdit(null)
              }}
            >
              <div className="presets">
                <button
                  type="button"
                  className={dayEdit.time ? 'selected' : ''}
                  onClick={() =>
                    setDayEdit({ ...dayEdit, time: dayEdit.time ?? '07:00' })
                  }
                >
                  Turno
                </button>
                <button
                  type="button"
                  className={dayEdit.time ? '' : 'selected'}
                  onClick={() => setDayEdit({ ...dayEdit, time: null })}
                >
                  Descanso
                </button>
              </div>
              {dayEdit.time && (
                <div className="form-row">
                  <label>
                    Hora
                    <input
                      required
                      type="time"
                      value={dayEdit.time}
                      onChange={(e) =>
                        setDayEdit({ ...dayEdit, time: e.target.value })
                      }
                    />
                  </label>
                </div>
              )}
              <div className="dialog-actions">
                {!dayEdit.isNew && dayPlan.days.length > 1 && (
                  <button
                    type="button"
                    className="delete-button"
                    disabled={saving}
                    onClick={async () => {
                      const days = dayPlan.days.filter(
                        (_, i) => i !== dayEdit.index,
                      )
                      if (
                        await persist({
                          alarms: alarms.map((a) =>
                            a.id === dayPlan.id ? { ...a, days } : a,
                          ),
                        })
                      )
                        setDayEdit(null)
                    }}
                  >
                    Quitar día
                  </button>
                )}
                {!dayEdit.isNew && dayPlan.days.length < MAX_DAYS && (
                  <button
                    type="button"
                    className="text-button"
                    disabled={saving}
                    onClick={async () => {
                      const days = await saveDay(dayEdit)
                      if (days)
                        setDayEdit({
                          planId: dayPlan.id,
                          index: days.length,
                          time: days.findLast(Boolean) ?? '07:00',
                          isNew: true,
                        })
                    }}
                  >
                    Guardar y añadir otro
                  </button>
                )}
                <button className="primary" disabled={saving} type="submit">
                  {saving ? 'Guardando…' : 'Guardar día'}
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
            {native ? (
              <>
                <h3>3. Prepara el móvil</h3>
                <p>
                  En Ajustes, pulsa «Preparar el móvil» y activa los permisos
                  que se indican. Después usa «Probar alarma» con el móvil
                  bloqueado para comprobar que suena.
                </p>
              </>
            ) : (
              <>
                <h3>3. Activa el sonido</h3>
                <p>
                  Esta es una aplicación web: necesita la pestaña abierta y el
                  dispositivo despierto. No puede garantizar alarmas con la
                  pantalla bloqueada o el navegador cerrado.
                </p>
                <button className="primary" onClick={enableSound}>
                  <Volume2 size={16} />
                  {sound ? 'Probar sonido' : 'Activar sonido'}
                </button>
              </>
            )}
            <p>
              Tus alarmas se guardan para este navegador. Borrar las cookies
              impide recuperar este espacio. Las tres alarmas iniciales son
              ejemplos editables.
            </p>
          </div>
        </DialogContent>
      </Dialog>
      {ringing && (
        <div className="ringing-screen" role="alertdialog" aria-modal="true">
          <AlarmClock size={42} />
          <div className="ringing-time">{ringing.time}</div>
          <p>
            {ringing.alarm.name} · Día{' '}
            {(cycleIndex(ringing.alarm, today) ?? 0) + 1}
          </p>
          {!sound && (
            <button className="primary" onClick={enableSound}>
              <Volume2 size={16} /> Activar sonido
            </button>
          )}
          <SlideToUnlock
            label="Desliza para detener"
            onUnlock={() => {
              setRinging(null)
              toast.success('Alarma detenida')
            }}
          />
        </div>
      )}
      {!sound && !native && (
        <button className="sound-enable" onClick={enableSound}>
          <Volume2 size={15} />
          Activar sonido<span>Con la página abierta</span>
        </button>
      )}
    </div>
  )
}
