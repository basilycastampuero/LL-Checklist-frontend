import { useCallback, useEffect, useRef } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { t } from '@/i18n/en'

interface EpisodeStepperProps {
  value: number
  /** Total de episodios. `0` = desconocido (en emisión): no hay tope. */
  max: number
  /** Nombre del título, solo para los `aria-label` de los botones. */
  name: string
  onChange: (next: number) => void
  disabled?: boolean
  className?: string
}

/** Cuánto hay que mantener apretado antes de que arranque la repetición. */
const REPEAT_DELAY_MS = 400
const REPEAT_INTERVAL_MS = 120

/**
 * `– N +` con repetición al mantener apretado (doc 06). Presentación pura: no
 * sabe de mutaciones ni de cache, solo avisa el valor nuevo por `onChange`.
 *
 * El tope superior es **UX, no validación**: el modelo de Chano no acota
 * `lv_episodes` y el backend solo rechaza negativos. Con `max === 0` no hay
 * tope porque eso significa "desconocido / en emisión", nunca "cero
 * episodios" (misma convención que `totalEpisodes` en todo el contrato).
 */
export function EpisodeStepper({
  value,
  max,
  name,
  onChange,
  disabled,
  className,
}: EpisodeStepperProps) {
  // El valor vive en una ref además de en la prop porque la repetición corre
  // dentro de un `setInterval`, que capturaría el valor del render en el que
  // arrancó y se quedaría clavado sumando siempre sobre el mismo número.
  const valueRef = useRef(value)
  const timers = useRef<{
    delay?: ReturnType<typeof setTimeout>
    repeat?: ReturnType<typeof setInterval>
  }>({})
  // Una repetición termina disparando también el `click` del pointer-up; sin
  // esto, mantener apretado suma un episodio de más al soltar.
  const repeated = useRef(false)

  useEffect(() => {
    valueRef.current = value
  }, [value])

  const stop = useCallback(() => {
    if (timers.current.delay) clearTimeout(timers.current.delay)
    if (timers.current.repeat) clearInterval(timers.current.repeat)
    timers.current = {}
  }, [])

  useEffect(() => stop, [stop])

  const step = useCallback(
    (direction: 1 | -1) => {
      const next = valueRef.current + direction
      if (next < 0) return
      if (direction === 1 && max > 0 && next > max) return
      valueRef.current = next
      onChange(next)
    },
    [max, onChange],
  )

  const startRepeat = useCallback(
    (direction: 1 | -1) => {
      repeated.current = false
      timers.current.delay = setTimeout(() => {
        timers.current.repeat = setInterval(() => {
          repeated.current = true
          step(direction)
        }, REPEAT_INTERVAL_MS)
      }, REPEAT_DELAY_MS)
    },
    [step],
  )

  // El paso "de a uno" va en `onClick` y no en el pointer-down para que el
  // teclado (Enter/Space) funcione igual que el mouse.
  const handleClick = useCallback(
    (direction: 1 | -1) => {
      if (repeated.current) {
        repeated.current = false
        return
      }
      step(direction)
    },
    [step],
  )

  const atCeiling = max > 0 && value >= max

  return (
    <div className={cn('flex shrink-0 items-center gap-1', className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        aria-label={t.lists.entry.decrease(name)}
        // Sin `disabled` en el piso/tope (hallazgo #24): el navegador devuelve
        // el foco al `<body>` cuando el elemento enfocado pasa a `disabled`, y
        // quien navega por teclado perdía su lugar en una lista larga justo al
        // llegar a 0 o al total. `handleClick` ya corta el paso fuera de
        // rango, así que el click es un no-op; `aria-disabled` lo comunica sin
        // sacar el control del orden de tabulación.
        aria-disabled={disabled || value <= 0}
        disabled={disabled}
        onClick={() => handleClick(-1)}
        onPointerDown={() => startRepeat(-1)}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
      >
        <Minus className="size-4" aria-hidden />
      </Button>
      {/* Región viva (hallazgo #24): subir o bajar episodios es la acción
          central de la app y **nada se anunciaba** — el `aria-label` de los
          botones es estático y el valor no estaba en ninguna región viva, así
          que quien usa lector de pantalla no tenía confirmación de que su
          acción hizo algo. `aria-atomic` para que se lea el valor completo y
          no solo el dígito que cambió. El contenedor existe siempre, así que
          la actualización es una mutación de una región ya presente, que es la
          forma confiable de que se anuncie. */}
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="min-w-7 text-center text-sm font-medium tabular-nums text-foreground"
      >
        {/* El número visible NO cambia: el doc 06 manda en el layout y un
            arreglo de accesibilidad no debería rediseñar el control. El texto
            completo para el lector va aparte, en `sr-only`. */}
        <span aria-hidden>{value}</span>
        <span className="sr-only">
          {max > 0 ? `${value} / ${max}` : value}
        </span>
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        aria-label={t.lists.entry.increase(name)}
        aria-disabled={disabled || atCeiling}
        disabled={disabled}
        onClick={() => handleClick(1)}
        onPointerDown={() => startRepeat(1)}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
      >
        <Plus className="size-4" aria-hidden />
      </Button>
    </div>
  )
}
