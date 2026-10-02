import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { RequireAuth } from '@/components/layout/RequireAuth'
import { authKeys } from '@/features/auth/hooks/queryKeys'
import { authService } from '@/features/auth/services/auth.service'
import { useSessionStore } from '@/store/sessionStore'
import { t } from '@/i18n/en'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const user = {
  id: 7,
  odooUserId: 21,
  name: 'Alex Rivera',
  email: 'alex@example.com',
  avatarUrl: null,
}

beforeEach(() => {
  useSessionStore.setState({ user: null, status: 'idle' })
})

/** Sonda de ruta: sin ella no hay forma de afirmar que NO hubo redirect. */
function Location() {
  const location = useLocation()
  return (
    <span data-testid="location">{location.pathname + location.search}</span>
  )
}

function renderGuard(client = new QueryClient()) {
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/my-lists']}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/my-lists" element={<div>private content</div>} />
          </Route>
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
        <Location />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return client
}

describe('RequireAuth — sesión no resuelta (4.4)', () => {
  it('should show the session error and not redirect when status is unresolved', () => {
    useSessionStore.setState({ user: null, status: 'unresolved' })
    renderGuard()

    expect(screen.getByText(t.states.sessionErrorTitle)).toBeInTheDocument()
    expect(screen.getByTestId('location').textContent).toBe('/my-lists')
    expect(screen.queryByText('login page')).not.toBeInTheDocument()
    expect(screen.queryByText('private content')).not.toBeInTheDocument()
  })

  it('should still redirect to /login?next=... when status is unauthenticated', async () => {
    useSessionStore.setState({ user: null, status: 'unauthenticated' })
    renderGuard()

    await waitFor(() =>
      expect(screen.getByTestId('location').textContent).toBe(
        `/login?next=${encodeURIComponent('/my-lists')}`,
      ),
    )
    expect(screen.queryByText(t.states.sessionErrorTitle)).not.toBeInTheDocument()
  })

  it('should render the protected content when authenticated', () => {
    useSessionStore.setState({ user, status: 'authenticated' })
    renderGuard()
    expect(screen.getByText('private content')).toBeInTheDocument()
  })

  it('should refetch the auth/me query when the retry button is clicked', async () => {
    let calls = 0
    server.use(
      http.get('/api/v1/auth/me', () => {
        calls += 1
        return HttpResponse.json(
          { error: { code: 'INTERNAL', message: 'boom' } },
          { status: 500 },
        )
      }),
    )
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    // refetchQueries solo toca queries que ya existen en el cache (en la app
    // las crea useMe): se siembra una, fallida, como la del escenario real.
    await client
      .fetchQuery({ queryKey: authKeys.me(), queryFn: () => authService.me() })
      .catch(() => undefined)
    expect(calls).toBe(1)

    useSessionStore.setState({ user: null, status: 'unresolved' })
    renderGuard(client)

    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: t.common.retry }))

    await waitFor(() => expect(calls).toBe(2))
  })
})
