import {
  ChevronRight,
  Coffee,
  Moon,
  Plus,
  Settings2,
  Sun,
  Sunrise,
  TreePalm,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import {
  cycleIndex,
  dateForDay,
  dateKey,
  MAX_DAYS,
  type Alarm,
} from '@/lib/alarms'

export function shiftIcon(time: string) {
  const hour = Number(time.slice(0, 2))
  return hour >= 4 && hour < 11 ? Sunrise : hour >= 11 && hour < 19 ? Sun : Moon
}

export function PlanView({
  alarms,
  plan,
  today,
  vacations,
  saving,
  onSelect,
  onNew,
  onEdit,
  onToggle,
  onDay,
  onAddDay,
}: {
  alarms: Alarm[]
  plan: Alarm | undefined
  today: Date
  vacations: ReadonlySet<string>
  saving: boolean
  onSelect: (id: string) => void
  onNew: () => void
  onEdit: (plan: Alarm) => void
  onToggle: (plan: Alarm, enabled: boolean) => void
  onDay: (plan: Alarm, index: number) => void
  onAddDay: (plan: Alarm) => void
}) {
  const todayIndex = plan ? cycleIndex(plan, today) : null
  const tomorrow = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1,
  )
  return (
    <section className="alarms-section plan-section">
      <div className="section-heading">
        <h2>
          Planificación de turnos <span>{alarms.length}</span>
        </h2>
      </div>
      <div className="plan-tabs" aria-label="Planes de turnos">
        {alarms.map((a) => (
          <button
            key={a.id}
            aria-pressed={a.id === plan?.id}
            className={a.id === plan?.id ? 'selected' : ''}
            onClick={() => onSelect(a.id)}
          >
            <span className={a.enabled ? 'green-dot' : 'paused-dot'} />
            {a.name}
          </button>
        ))}
        <button className="plan-new" onClick={onNew}>
          <Plus size={13} /> Nuevo plan
        </button>
      </div>
      {plan ? (
        <article className={`plan-card ${plan.enabled ? '' : 'paused'}`}>
          <header className="plan-header">
            <div>
              <h3>{plan.name}</h3>
              <p>
                Ciclo de {plan.days.length}{' '}
                {plan.days.length === 1 ? 'día' : 'días'} · Día 1 el{' '}
                {new Date(`${plan.start}T12:00:00`).toLocaleDateString('es', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
                {todayIndex === null && ' · Aún no ha empezado'}
              </p>
            </div>
            <Switch
              aria-label={`Activar ${plan.name}`}
              checked={plan.enabled}
              disabled={saving}
              onCheckedChange={(enabled) => onToggle(plan, enabled)}
            />
            <button
              className="icon-button"
              aria-label={`Configurar ${plan.name}`}
              onClick={() => onEdit(plan)}
            >
              <Settings2 size={18} />
            </button>
          </header>
          <ol className="plan-days">
            {plan.days.map((time, i) => {
              const isToday = i === todayIndex
              const date = dateForDay(plan, i, today)
              const key = dateKey(date)
              const Icon = time ? shiftIcon(time) : Coffee
              return (
                <li key={i}>
                  <button
                    className={`plan-day ${time ? 'shift' : 'rest'} ${isToday ? 'is-today' : ''}`}
                    aria-current={isToday ? 'date' : undefined}
                    onClick={() => onDay(plan, i)}
                  >
                    <span className="plan-day-name">
                      Día {i + 1}
                      {isToday && <strong className="today-tag">| Hoy</strong>}
                      <small>
                        {isToday
                          ? 'Hoy'
                          : key === dateKey(tomorrow)
                            ? 'Mañana'
                            : date.toLocaleDateString('es', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                              })}
                        {vacations.has(key) && (
                          <em>
                            <TreePalm size={11} /> Vacaciones
                          </em>
                        )}
                      </small>
                    </span>
                    <span className="plan-day-value">
                      <Icon size={17} />
                      {time ?? 'Descanso'}
                    </span>
                    <ChevronRight size={16} className="plan-day-arrow" />
                  </button>
                </li>
              )
            })}
          </ol>
          <button
            className="add-alarm"
            disabled={saving || plan.days.length >= MAX_DAYS}
            onClick={() => onAddDay(plan)}
          >
            <span>
              <Plus size={20} />
            </span>
            <div>
              Añadir día al ciclo
              <small>
                Será el Día {plan.days.length + 1}. Después se vuelve al Día 1.
              </small>
            </div>
            <Plus size={18} />
          </button>
        </article>
      ) : (
        <div className="empty-state">
          <h3>Todavía no tienes planes de turnos</h3>
          <button className="text-button" onClick={onNew}>
            Crear plan
          </button>
        </div>
      )}
    </section>
  )
}
