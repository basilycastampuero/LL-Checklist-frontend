import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { server } from '@/mocks/server'
import CatalogPage from '@/pages/CatalogPage'
import { t } from '@/i18n/en'
import { franchises } from '@/mocks/seed/franchises'
import { toSummary } from '@/mocks/seed/derive'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  server.events.removeAllListeners()
})
afterAll(() => server.close())

function renderCatalog(url = '/catalog') {
  // Sin reintentos: un error del handler debe pintar el ErrorState de inmediato.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }
  return render(<CatalogPage />, { wrapper: Wrapper })
}

describe('CatalogPage', () => {
  it('pinta el grid de franquicias cuando hay datos', async () => {
    renderCatalog()

    expect(
      await screen.findByRole('heading', { name: 'Fullmetal Alchemist' }),
    ).toBeInTheDocument()
    // Cada card es un link al detalle de la franquicia.
    expect(screen.getAllByRole('link').length).toBeGreaterThan(1)
  })

  it('respeta los filtros de la URL', async () => {
    renderCatalog('/catalog?q=Fullmetal')

    expect(
      await screen.findByRole('heading', { name: 'Fullmetal Alchemist' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  it('muestra "sin resultados" con acción de limpiar cuando el filtro no matchea', async () => {
    renderCatalog('/catalog?q=noexisteestaserie')

    expect(await screen.findByText(t.states.noResultsTitle)).toBeInTheDocument()
    // Hay dos: el del FilterBar (siempre montado) y el de la acción del EmptyState.
    expect(
      screen.getAllByRole('button', { name: t.common.clearFilters }),
    ).toHaveLength(2)
  })

  it('sin filtros activos, el vacío no ofrece limpiar filtros', async () => {
    server.use(
      http.get('/api/v1/franchises', () =>
        HttpResponse.json({ items: [], page: 1, pageSize: 24, total: 0 }),
      ),
    )
    renderCatalog()

    expect(
      await screen.findByText(t.states.emptyCatalogTitle),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: t.common.clearFilters }),
    ).not.toBeInTheDocument()
  })

  it('pinta el ErrorState si la petición falla', async () => {
    server.use(
      http.get('/api/v1/franchises', () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL', message: 'boom' } },
          { status: 500 },
        ),
      ),
    )
    renderCatalog()

    expect(await screen.findByText(t.states.errorTitle)).toBeInTheDocument()
  })

  it('no muestra paginación cuando todo entra en una página', async () => {
    renderCatalog()

    await screen.findByRole('heading', { name: 'Fullmetal Alchemist' })
    expect(
      screen.queryByRole('navigation', { name: /pagination/i }),
    ).not.toBeInTheDocument()
  })

  // Hallazgo #21 (doc 18): con `colorIndex: z.number().min(1).max(11)` un único
  // género sin color en Odoo (el serializer emite `genre_color or 0`) tiraba el
  // `parse` del array paginado entero y la página caía en ErrorState.
  it.each([
    ['0 (género sin color en Odoo)', 0],
    ['mayor a 11 (el otro lado del rango viejo)', 12],
  ])(
    '#21: un género con colorIndex %s no tira el catálogo',
    async (_label, colorIndex) => {
      const fma = franchises.find((f) => f.name === 'Fullmetal Alchemist')!
      const summary = toSummary(fma)
      const genre = summary.genres[0]!
      server.use(
        http.get('/api/v1/franchises', () =>
          HttpResponse.json({
            items: [
              {
                ...summary,
                genres: [{ ...genre, colorIndex }, ...summary.genres.slice(1)],
              },
            ],
            page: 1,
            pageSize: 24,
            total: 1,
          }),
        ),
      )
      renderCatalog()

      expect(
        await screen.findByRole('heading', { name: 'Fullmetal Alchemist' }),
      ).toBeInTheDocument()
      // El género con el índice fuera de rango se sigue mostrando (badge neutro).
      expect(screen.getByText(genre.name)).toBeInTheDocument()
      expect(screen.queryByText(t.states.errorTitle)).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: t.common.retry }),
      ).not.toBeInTheDocument()
    },
  )

  // Hallazgo #26. Esta rama estaba sin test por la misma premisa falsa que
  // dejó a #21, #22 y #30 sin cubrir (ver sección 9 del doc 18): un
  // `server.use` produce la respuesta sin problema. Ni el mock ni el backend
  // real clampean `page`, los dos devuelven `items: []` con el `total`
  // verdadero.
  it('#26: con ?page= fuera de rango no miente "catálogo vacío" y deja cómo volver', async () => {
    server.use(
      http.get('/api/v1/franchises', () =>
        HttpResponse.json({ items: [], page: 3, pageSize: 24, total: 50 }),
      ),
    )
    renderCatalog('/catalog?page=3')

    expect(
      await screen.findByText(t.catalog.pageOutOfRangeTitle),
    ).toBeInTheDocument()

    // Lo que hacía del hallazgo un bug y no una molestia: decía que el
    // catálogo estaba vacío —falso, `total` es 50— y, como el `return`
    // temprano ocurría antes de `PaginationControls`, no quedaba ningún
    // control para volver. Las dos mitades se afirman por separado.
    expect(
      screen.queryByText(t.states.emptyCatalogTitle),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: t.catalog.backToFirstPage }),
    ).toBeInTheDocument()
  })
})
