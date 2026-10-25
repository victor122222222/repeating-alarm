import { useRef, useState, type CSSProperties } from 'react'
import { ChevronsRight } from 'lucide-react'

// Control deslizante: solo llama a onUnlock cuando el pulgar llega al final.
export function SlideToUnlock({
  label,
  onUnlock,
}: {
  label: string
  onUnlock: () => void
}) {
  const [progress, setProgress] = useState(0)
  const drag = useRef<{ x: number; from: number; width: number } | null>(
    null,
  )
  const [dragging, setDragging] = useState(false)
  function finish(value: number) {
    drag.current = null
    setDragging(false)
    if (value >= 0.92) {
      setProgress(1)
      onUnlock()
    } else setProgress(0)
  }
  return (
    <div
      className={`slide-unlock ${dragging ? 'dragging' : ''}`}
      style={{ '--p': progress } as CSSProperties}
    >
      <span className="slide-fill" aria-hidden="true" />
      <span className="slide-label" aria-hidden="true">
        {label}
      </span>
      <button
        type="button"
        className="slide-thumb"
        role="slider"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-valuetext={`${Math.round(progress * 100)} %`}
        onPointerDown={(e) => {
          const track = e.currentTarget.parentElement
          if (!track) return
          e.currentTarget.setPointerCapture(e.pointerId)
          drag.current = {
            x: e.clientX,
            from: progress,
            width: track.clientWidth - e.currentTarget.offsetWidth - 12,
          }
          setDragging(true)
        }}
        onPointerMove={(e) => {
          const d = drag.current
          if (!d) return
          setProgress(
            Math.min(1, Math.max(0, d.from + (e.clientX - d.x) / d.width)),
          )
        }}
        onPointerUp={() => finish(progress)}
        onPointerCancel={() => finish(0)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault()
            const next = Math.min(1, progress + 0.25)
            if (next >= 1) finish(1)
            else setProgress(next)
          } else if (e.key === 'End') {
            e.preventDefault()
            finish(1)
          } else if (
            e.key === 'ArrowLeft' ||
            e.key === 'ArrowDown' ||
            e.key === 'Home'
          ) {
            e.preventDefault()
            setProgress(0)
          }
        }}
      >
        <ChevronsRight size={26} />
      </button>
    </div>
  )
}
