import { cn } from '@/lib/utils'
import { formatProgress } from '@/utils/progress'
import type { Progress } from '@/features/lists/types'

interface ProgressBarProps {
  progress: Progress
  className?: string
}

/**
 * Barra de progreso de episodios (doc 06, design system: reemplaza
 * `ProgressTracker` del brief). Recibe un `Progress` ya derivado
 * (`src/utils/progress.ts::toProgress`), nunca `watched`/`total` crudos —
 * así el caso "total desconocido" (`total: null`) se resuelve en un solo
 * lugar para toda la UI.
 *
 * `total === null` (backend manda `0`, contenido en emisión) renderiza
 * indeterminada: sin `aria-valuenow`/`aria-valuemax` (no hay un valor que
 * anunciar) y una barra llena con `animate-pulse` en vez de un ancho fijo.
 */
export function ProgressBar({ progress, className }: ProgressBarProps) {
  const isIndeterminate = progress.total === null
  const label = formatProgress(progress)

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        role="progressbar"
        aria-valuetext={label}
        // Clampeado al total (hallazgo #31): si en Odoo se corrige a la baja
        // el total de una versión sobre un entry que ya tenía más vistos,
        // quedaba `valuenow` > `valuemax`, combinación inválida en ARIA con la
        // que algunos lectores anuncian porcentajes absurdos. El
        // `aria-valuetext` sigue siendo honesto ("24/12").
        aria-valuenow={
          isIndeterminate
            ? undefined
            : progress.total != null
              ? Math.min(progress.watched, progress.total)
              : progress.watched
        }
        aria-valuemin={isIndeterminate ? undefined : 0}
        aria-valuemax={isIndeterminate ? undefined : (progress.total ?? undefined)}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            'h-full rounded-full bg-primary',
            isIndeterminate ? 'w-full animate-pulse opacity-50' : 'transition-[width]',
          )}
          style={isIndeterminate ? undefined : { width: `${progress.percent ?? 0}%` }}
        />
      </div>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{label}</span>
    </div>
  )
}
