import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '@/mocks/server'
import HomePage from '@/pages/HomePage'
import { useSessionStore } from '@/store/sessionStore'
import { t } from '@/i18n/en'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  useSessionStore.setState({ user: null, status: 'idle' })
})
afterAll(() => server.close())

function Location() {
  return <span data-testid="location">{useLocation().pathname}</span>
}

function renderHome() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<span>elsewhere</span>} />
        </Routes>
        <Location />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

type TestGenre = { id: number; name: string; colorIndex: number }

function summary(id: number, name: string, genres: TestGenre[], yearTo: number) {
  return {
    id,
    name,
    imageUrl: null,
    genres,
    yearRange: { from: yearTo - 1, to: yearTo },
    contentCounts: { games: 0, videos: 1 },
  }
}

function serveFranchises(items: ReturnType<typeof summary>[]) {
  server.use(
    http.get('/api/v1/franchises', () =>
      HttpResponse.json({ items, page: 1, pageSize: 24, total: items.length }),
    ),
  )
}

const skeletons = (c: HTMLElement) => c.querySelectorAll('[data-slot="skeleton"]')

describe('HomePage', () => {
  it('should show the hero and a skeleton grid while loading', () => {
    const { container } = renderHome()

    expect(
      screen.getByRole('heading', { level: 1, name: t.home.heroTitle }),
    ).toBeInTheDocument()
    expect(skeletons(container).length).toBeGreaterThan(0)
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull()
  })

  it('should render "Recently added" sorted by last year, newest first', async () => {
    serveFranchises([
      summary(1, 'Old', [], 1999),
      summary(2, 'Newest', [], 2024),
      summary(3, 'Middle', [], 2010),
    ])
    renderHome()

    const section = (
      await screen.findByRole('heading', { level: 2, name: t.home.recentlyAdded })
    ).closest('section')!
    expect(
      within(section)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(['Newest', 'Middle', 'Old'])
  })

  it('should add genre rows only for genres shared by at least 3 franchises, capped at 3 rows', async () => {
    const g = (id: number, name: string) => ({ id, name, colorIndex: id })
    const A = g(1, 'GenreA') // 3 franquicias -> fila
    const B = g(2, 'GenreB') // 2 franquicias -> sin fila
    const C = g(3, 'GenreC')
    const D = g(4, 'GenreD')
    const E = g(5, 'GenreE')
    serveFranchises([
      summary(1, 'F1', [A, C, D, E], 2001),
      summary(2, 'F2', [A, B, C, D, E], 2002),
      summary(3, 'F3', [A, B, C, D, E], 2003),
      summary(4, 'F4', [C, D, E], 2004),
    ])
    renderHome()

    await screen.findByRole('heading', { level: 2, name: t.home.recentlyAdded })
    const rows = screen
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent)
    // B queda fuera (solo 2); E queda fuera por el tope de 3 filas.
    expect(rows).toEqual([t.home.recentlyAdded, 'GenreA', 'GenreC', 'GenreD'])
  })

  it('should not create a row for a genre shared by only 2 franchises', async () => {
    const pair = { id: 1, name: 'Pair', colorIndex: 1 }
    serveFranchises([
      summary(1, 'F1', [pair], 2001),
      summary(2, 'F2', [pair], 2002),
      summary(3, 'F3', [], 2003),
    ])
    renderHome()

    await screen.findByRole('heading', { level: 2, name: t.home.recentlyAdded })
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent),
    ).toEqual([t.home.recentlyAdded])
  })

  it('should link the hero buttons to catalog and search', async () => {
    const ui = userEvent.setup()
    renderHome()
    await ui.click(screen.getByRole('link', { name: t.home.browseCatalog }))
    expect(screen.getByTestId('location').textContent).toBe('/catalog')
  })

  it('should link the search button to /search', async () => {
    const ui = userEvent.setup()
    renderHome()
    await ui.click(screen.getByRole('link', { name: t.common.search }))
    expect(screen.getByTestId('location').textContent).toBe('/search')
  })

  it('should show the empty state, with the hero, when the catalog is empty', async () => {
    server.use(
      http.get('/api/v1/franchises', () =>
        HttpResponse.json({ items: [], page: 1, pageSize: 24, total: 0 }),
      ),
    )
    renderHome()

    expect(
      await screen.findByText(t.states.emptyCatalogTitle),
    ).toBeInTheDocument()
    expect(screen.getByText(t.states.emptyCatalogBody)).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: t.home.heroTitle }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull()
  })

  it('should show the error state and recover on retry', async () => {
    const ui = userEvent.setup()
    server.use(
      http.get(
        '/api/v1/franchises',
        () =>
          HttpResponse.json(
            { error: { code: 'INTERNAL', message: 'boom' } },
            { status: 500 },
          ),
        { once: true },
      ),
    )
    renderHome()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      t.states.errorTitle,
    )
    await ui.click(screen.getByRole('button', { name: t.common.retry }))

    expect(
      await screen.findByRole('heading', { level: 2, name: t.home.recentlyAdded }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('should flag only the franchises present in the user library index', async () => {
    useSessionStore.setState({
      user: { id: 1, odooUserId: 1, name: 'U', email: 'u@anitrack.dev', avatarUrl: null },
      status: 'authenticated',
    })
    serveFranchises([
      summary(1, 'InLibrary', [], 2001),
      summary(2, 'NotInLibrary', [], 2002),
    ])
    server.use(
      http.get('/api/v1/me/library-index', () =>
        HttpResponse.json({ versionIds: [], franchiseIds: [1] }),
      ),
    )
    renderHome()

    const section = (
      await screen.findByRole('heading', { level: 2, name: t.home.recentlyAdded })
    ).closest('section')!
    const [first, second] = within(section).getAllByRole('link')
    // Orden por año descendente: NotInLibrary (2002) primero, InLibrary después.
    expect(within(first!).queryByText(t.card.inYourList)).toBeNull()
    await waitFor(() =>
      expect(within(second!).getByText(t.card.inYourList)).toBeInTheDocument(),
    )
    useSessionStore.setState({ user: null, status: 'idle' })
  })
})
