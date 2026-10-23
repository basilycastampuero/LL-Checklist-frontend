import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { FranchiseCard } from '@/features/catalog/components/FranchiseCard'
import { FranchiseHeader } from '@/features/catalog/components/FranchiseHeader'
import { ContentSection } from '@/features/catalog/components/ContentSection'
import { displayName } from '@/features/catalog/utils/displayName'
import { allContents, franchises } from '@/mocks/seed/franchises'
import { toSummary } from '@/mocks/seed/derive'
import { t } from '@/i18n/en'
import { TooltipProvider } from '@/components/ui/tooltip'

/**
 * Tarea 4.22: una franquicia o un content sin NINGÚN nombre en Odoo llega como
 * `""` (tarea 4.16). Sin reemplazo, la card queda sin título y su `<Link>` sin
 * nombre accesible. MSW nunca produce este caso —el seed tiene nombres en
 * todo—, así que solo lo cubre un test que lo fabrique a propósito.
 */
const seed = franchises[0]!
const nameless = { ...seed, name: '' }

describe('displayName', () => {
  it('reemplaza un nombre vacío o de solo espacios', () => {
    expect(displayName('')).toBe(t.catalog.untitled)
    expect(displayName('   ')).toBe(t.catalog.untitled)
  })

  it('deja intacto un nombre real', () => {
    expect(displayName('Fullmetal Alchemist')).toBe('Fullmetal Alchemist')
  })
})

describe('catálogo con una franquicia sin nombre', () => {
  it('la card tiene título y su enlace un nombre accesible', () => {
    render(
      <MemoryRouter>
        <FranchiseCard franchise={toSummary(nameless)} />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: t.catalog.untitled }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: new RegExp(t.catalog.untitled) }),
    ).toBeInTheDocument()
  })

  it('el header del detalle tiene un h1 con texto', () => {
    render(<FranchiseHeader franchise={nameless} />)

    expect(
      screen.getByRole('heading', { level: 1, name: t.catalog.untitled }),
    ).toBeInTheDocument()
  })

  it('un content sin nombre se enlaza con texto', () => {
    const content = { ...allContents()[0]!, name: '' }
    render(
      // La tabla de versiones usa tooltips: en la app los provee `App.tsx`.
      <TooltipProvider>
        <MemoryRouter>
          <ContentSection
            content={content}
            franchiseId={seed.id}
            franchiseName={seed.name}
          />
        </MemoryRouter>
      </TooltipProvider>,
    )

    expect(
      screen.getByRole('link', { name: t.catalog.untitled }),
    ).toBeInTheDocument()
  })
})
