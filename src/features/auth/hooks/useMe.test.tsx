import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { server } from '@/mocks/server'
import { useMe } from '@/features/auth/hooks/useMe'
import { useSessionStore } from '@/store/sessionStore'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

beforeEach(() => {
  useSessionStore.setState({ user: null, status: 'idle' })
})

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

describe('useMe', () => {
  it('una sesión vencida (401 en refetch) limpia el store aunque TanStack Query retenga el `data` viejo', async () => {
    const client = new QueryClient()
    const { result } = renderHook(() => useMe(), { wrapper: wrapper(client) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(useSessionStore.getState().status).toBe('authenticated')

    // El backend dice que la cookie venció. TanStack Query v5 retiene el
    // último `data` bueno en la transición a error (no lo pisa con
    // `undefined`) — por eso el bug de #1 chequeaba `if (query.data)` primero
    // y nunca llegaba a ver el error.
    server.use(
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Session expired' } },
          { status: 401 },
        ),
      ),
    )

    await act(async () => {
      await result.current.refetch()
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    // Prueba de la trampa: el `data` viejo sigue ahí a pesar del error.
    expect(result.current.data).toBeDefined()
    expect(useSessionStore.getState().status).toBe('unauthenticated')
    expect(useSessionStore.getState().user).toBeNull()
  })

  it('should mark the session unauthenticated on a 401 with no prior user', async () => {
    server.use(
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'No active session' } },
          { status: 401 },
        ),
      ),
    )
    const { result } = renderHook(() => useMe(), {
      wrapper: wrapper(new QueryClient()),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    await waitFor(() =>
      expect(useSessionStore.getState().status).toBe('unauthenticated'),
    )
  })

  it('should mark the session unresolved, not unauthenticated, on a 500 with no prior user', async () => {
    server.use(
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL', message: 'boom' } },
          { status: 500 },
        ),
      ),
    )
    const { result } = renderHook(() => useMe(), {
      wrapper: wrapper(
        new QueryClient({ defaultOptions: { queries: { retry: false } } }),
      ),
    })

    // useMe define su propio `retry` (un reintento para errores no-401, con
    // backoff de ~1s), que pisa el del QueryClient: de ahí el timeout holgado.
    await waitFor(() => expect(result.current.isError).toBe(true), {
      timeout: 5000,
    })
    await waitFor(() =>
      expect(useSessionStore.getState().status).toBe('unresolved'),
    )
    expect(useSessionStore.getState().user).toBeNull()
  })

  it('should keep an already resolved user when a refetch fails with a 500', async () => {
    const { result } = renderHook(() => useMe(), {
      wrapper: wrapper(new QueryClient()),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const resolved = useSessionStore.getState().user
    expect(resolved).not.toBeNull()
    expect(useSessionStore.getState().status).toBe('authenticated')

    server.use(
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL', message: 'boom' } },
          { status: 500 },
        ),
      ),
    )
    await act(async () => {
      await result.current.refetch()
    })
    await waitFor(() => expect(result.current.isError).toBe(true), {
      timeout: 5000,
    })

    expect(useSessionStore.getState().status).toBe('authenticated')
    expect(useSessionStore.getState().user).toBe(resolved)
  })
})
