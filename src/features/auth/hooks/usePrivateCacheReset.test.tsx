import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { server } from '@/mocks/server'
import { http as apiClient } from '@/lib/http'
import { authService } from '@/features/auth/services/auth.service'
import { usePrivateCacheReset } from '@/features/auth/hooks/usePrivateCacheReset'
import { useChecklists } from '@/features/lists/hooks/useChecklists'
import { listKeys } from '@/features/lists/hooks/queryKeys'
import { useSessionStore } from '@/store/sessionStore'
import type { UserSession } from '@/features/auth/types'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const alex: UserSession = {
  id: 1,
  odooUserId: 11,
  name: 'Alex Rivera',
  email: 'alex@example.com',
  avatarUrl: null,
}

beforeEach(() => {
  useSessionStore.setState({ user: alex, status: 'authenticated' })
})

/** Monta lo mismo que RootLayout + una pantalla que mira el árbol. */
function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const hook = renderHook(
    () => {
      usePrivateCacheReset()
      return useChecklists()
    },
    { wrapper },
  )
  return { client, hook }
}

describe('usePrivateCacheReset', () => {
  it('un 401 real del interceptor vacía el cache privado', async () => {
    const { client } = setup()
    await waitFor(() =>
      expect(client.getQueryData(listKeys.tree())).toBeDefined(),
    )

    await act(async () => {
      await apiClient
        .get('/me/library-index', { headers: { 'x-mock-error': 'UNAUTHORIZED' } })
        .catch(() => undefined)
    })

    await waitFor(() =>
      expect(client.getQueryData(listKeys.tree())).toBeUndefined(),
    )
  })

  it('al entrar OTRO usuario el observer deja de mostrar el árbol del anterior', async () => {
    const { client, hook } = setup()
    await waitFor(() => expect(hook.result.current.data).toBeDefined())
    const alexTree = hook.result.current.data

    // Como hacen useLogin/useRegister: login real (el mock cambia de usuario)
    // y después setUser.
    const sam = await authService.login({
      login: 'sam@example.com',
      password: 'password123',
    })
    expect(sam.id).not.toBe(alex.id)
    act(() => useSessionStore.getState().setUser(sam))

    // Sincrónico: el reset no espera a ningún refetch.
    expect(client.getQueryData(listKeys.tree())).not.toBe(alexTree)
    await waitFor(() => expect(hook.result.current.data).toBeDefined())
    expect(hook.result.current.data).not.toEqual(alexTree)
  })

  it('setUser del mismo usuario no borra el cache', async () => {
    const { client } = setup()
    await waitFor(() =>
      expect(client.getQueryData(listKeys.tree())).toBeDefined(),
    )
    const before = client.getQueryData(listKeys.tree())

    act(() => {
      useSessionStore.getState().setUser({ ...alex })
      useSessionStore.getState().setUser({ ...alex })
    })

    expect(client.getQueryData(listKeys.tree())).toBe(before)
  })
})
