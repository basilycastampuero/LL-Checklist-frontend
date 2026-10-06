import { Link } from 'react-router-dom'
import { motion, useReducedMotion, type Variants } from 'motion/react'
import { Check, Gamepad2, Film } from 'lucide-react'
import { GenreBadge } from '@/components/common/GenreBadge'
import { cn } from '@/lib/utils'
import { franchisePath } from '@/utils/slug'
import { t } from '@/i18n/en'
import type { FranchiseSummary } from '@/features/catalog/types'

interface FranchiseCardProps {
  franchise: FranchiseSummary
  inLibrary?: boolean
  /**
   * Posición en el grid/carrusel. Si viene, la card hace una entrada
   * escalonada; si no, aparece sin animar (uso suelto, tests de componente).
   */
  index?: number
}

/** Pasos del stagger (doc 06: 50 ms) y tope de posiciones que escalonan. */
const STAGGER_STEP_S = 0.05
const STAGGER_MAX_ITEMS = 8

/*
 * Entrada escalonada, con variants y `custom` (el índice) en lugar de un
 * `staggerChildren` en un contenedor, por dos razones:
 *  - `staggerChildren` suma 50 ms por hijo sin techo: la card 24 entraría
 *    1,2 s tarde. Con `custom` el delay se acota en 8 * 50 = 400 ms.
 *  - No exige un `motion.div` padre en cada grid (catálogo, búsqueda y
 *    carrusel tienen estructuras distintas), así que esos archivos no
 *    importan `motion` y no hace falta un contenedor común.
 *
 * NO parte de `opacity: 0`: el LCP lo define la imagen de una card y Chrome
 * ignora los elementos con opacidad 0 hasta que dejan de serlo, así que un
 * fade-in desde cero retrasaría la métrica por el delay entero. Parte de
 * 0.6 + un desplazamiento de 12 px: se ve la entrada, pero el elemento ya
 * cuenta como pintado en el primer frame.
 */
const enterVariants: Variants = {
  hidden: { opacity: 0.6, y: 12 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: 'easeOut',
      delay: Math.min(index, STAGGER_MAX_ITEMS) * STAGGER_STEP_S,
    },
  }),
}

function TypeBadge({ games, videos }: { games: number; videos: number }) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
      {/* `role="img"` explícito más el `aria-label` (hallazgo #36): lucide no
          agrega el rol solo, así que el soporte del `aria-label` sobre un
          `<svg>` pelado es dispar según navegador y lector. */}
      {videos > 0 && (
        <Film className="size-3" role="img" aria-label={t.card.videos} />
      )}
      {games > 0 && (
        <Gamepad2 className="size-3" role="img" aria-label={t.card.games} />
      )}
    </div>
  )
}

/**
 * Card de franquicia (doc 06): poster 2:3, nombre, hasta 2 géneros, badge de
 * tipo, indicador "in your list" y hover animado con motion.
 */
export function FranchiseCard({
  franchise,
  inLibrary,
  index,
}: FranchiseCardProps) {
  // `motion` no respeta `prefers-reduced-motion` por defecto. Se resuelve acá
  // y no con un `<MotionConfig>` en el shell: eso importaría `motion/react` en
  // el chunk de entrada, que es justo lo que ADR de performance evita.
  const reduceMotion = useReducedMotion()
  const animateEntry = index !== undefined && !reduceMotion
  const { from, to } = franchise.yearRange
  const years = from ? (to && to !== from ? `${from}–${to}` : `${from}`) : null

  return (
    <motion.div
      variants={enterVariants}
      custom={index ?? 0}
      initial={animateEntry ? 'hidden' : false}
      animate="visible"
      whileHover={reduceMotion ? undefined : { y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
    >
      <Link
        to={franchisePath(franchise.id, franchise.name)}
        viewTransition
        className="group block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="relative overflow-hidden rounded-lg border border-border bg-muted shadow-sm transition-shadow group-hover:shadow-md">
          <div className="aspect-[2/3] w-full">
            {franchise.imageUrl ? (
              <img
                src={franchise.imageUrl}
                alt={franchise.name}
                loading="lazy"
                className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground">
                <Film className="size-8" aria-hidden />
              </div>
            )}
          </div>
          <div className="absolute left-2 top-2">
            <TypeBadge
              games={franchise.contentCounts.games}
              videos={franchise.contentCounts.videos}
            />
          </div>
          {inLibrary && (
            <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground">
              <Check className="size-3" aria-hidden />
              {/* `sr-only` y no solo `title` (hallazgo #36): el `title` de un
                  div genérico la mayoría de los lectores no lo anuncia, así
                  que "ya está en tu lista" se perdía por completo. Mismo
                  patrón que `ScoreDisplay`. */}
              <span className="sr-only">{t.card.inYourList}</span>
            </div>
          )}
        </div>

        <div className="mt-2 space-y-1">
          <h3
            className={cn(
              'line-clamp-1 text-sm font-semibold text-foreground',
              'group-hover:text-primary',
            )}
          >
            {franchise.name}
          </h3>
          {years && <p className="text-xs text-muted-foreground">{years}</p>}
          <div className="flex flex-wrap gap-1 pt-0.5">
            {franchise.genres.slice(0, 2).map((genre) => (
              <GenreBadge key={genre.id} genre={genre} />
            ))}
            {franchise.genres.length > 2 && (
              <span className="text-xs text-muted-foreground">
                +{franchise.genres.length - 2}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
