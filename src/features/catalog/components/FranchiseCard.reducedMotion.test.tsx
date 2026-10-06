import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type * as MotionReact from 'motion/react'
import { FranchiseCard } from '@/features/catalog/components/FranchiseCard'
import { franchises } from '@/mocks/seed/franchises'
import { toSummary } from '@/mocks/seed/derive'

/**
 * `prefers-reduced-motion` es un requisito de accesibilidad del doc 06, y su
 * mitad JS se pierde con un solo borrado: sacar el `useReducedMotion()` de
 * `FranchiseCard` devuelve las animaciones sin que nada falle ni se vea
 * distinto en desarrollo, donde nadie suele tener la preferencia activada.
 *
 * Se mockea el hook y no `window.matchMedia`, porque no funciona: `motion`
 * se suscribe al media query cuando se carga el módulo, así que reemplazar
 * `matchMedia` después no cambia nada. Se intentó y el test pasaba igual con
 * la preferencia "activada" — un falso verde.
 *
 * Esto afirma el contrato del componente: cuando el hook dice que hay que
 * reducir, la card no anima. Que el hook lea bien la preferencia es
 * responsabilidad de `motion`, y se verificó en Chromium emulando el media
 * feature por CDP: con `reduce` las cards quedan en `opacity: 1` y
 * `transform: none`, y sin él arrancan en `0.6` con los `translateY`
 * escalonados. La mitad CSS tampoco se puede afirmar acá —jsdom no evalúa
 * media queries— y se verificó por el mismo camino.
 */
const { useReducedMotionMock } = vi.hoisted(() => ({
  useReducedMotionMock: vi.fn<() => boolean>(),
}))

vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof MotionReact>()),
  useReducedMotion: useReducedMotionMock,
}))

function renderCard() {
  const summary = toSummary(franchises[0]!)
  return render(
    <MemoryRouter>
      <FranchiseCard franchise={summary} inLibrary={false} index={3} />
    </MemoryRouter>,
  )
}

describe('FranchiseCard y prefers-reduced-motion', () => {
  it('sin la preferencia, la card entra animada desde su estado inicial', () => {
    useReducedMotionMock.mockReturnValue(false)
    const { container } = renderCard()

    // La variante de entrada arranca en 0.6 y no en 0, a propósito: un fade
    // desde cero retrasaría el LCP, porque Chrome no cuenta como pintado un
    // elemento totalmente transparente.
    expect((container.firstElementChild as HTMLElement).style.opacity).toBe(
      '0.6',
    )
  })

  it('con la preferencia activa, la card se monta ya en su estado final', () => {
    useReducedMotionMock.mockReturnValue(true)
    const { container } = renderCard()

    expect((container.firstElementChild as HTMLElement).style.opacity).not.toBe(
      '0.6',
    )
    // Y el contenido sigue estando: la accesibilidad no se paga perdiendo nada.
    expect(
      screen.getByRole('heading', { name: franchises[0]!.name }),
    ).toBeInTheDocument()
  })
})
