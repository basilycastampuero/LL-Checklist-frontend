import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse, delay } from 'msw'
import type { ReactNode } from 'react'
import { server } from '@/mocks/server'
import { useUpdateChecklist } from '@/features/lists/hooks/useUpdateChecklist'
import { usePrivateCacheReset } from '@/features/auth/hooks/usePrivateCacheReset'
import { useSessionStore } from '@/store/sessionStore'
import { listKeys } from '@/features/lists/hooks/queryKeys'
import type { ChecklistNode } from '@/features/lists/types'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

/** Árbol mínimo con un nodo anidado, para probar que el patch lo alcanza. */
function fakeTree(): ChecklistNode[] {
  return [
    {
      id: 1,
      name: 'Watching',
      description: null,
      imageUrl: null,
      order: 0,
      sortingMode: 'N',
      isPublished: true,
      linkCount: 2,
      children: [],
    },
    {
      id: 3,
      name: 'Favorites',
      description: null,
      imageUrl: null,
      order: 1,
      sortingMode: 'C',
      isPublished: false,
      linkCount: 0,
      children: [
        {
          id: 4,
          name: 'All-time',
          description: null,
          imageUrl: null,
          order: 0,
          sortingMode: 'C',
          isPublished: false,
          linkCount: 1,
          children: [],
        },
      ],
    },
  ]
}

function findNode(
  tree: ChecklistNode[] | undefined,
  id: number,
): ChecklistNode | undefined {
  if (!tree) return undefined
  for (const node of tree) {
    if (node.id === id) return node
    const found = findNode(node.children, id)
    if (found) return found
  }
  return undefined
}

describe('useUpdateChecklist', () => {
  it('renombra un nodo anidado de forma optimista antes de que resuelva el request', async () => {
    // Este test necesita una ventana optimista observable, así que se pone su
    // PROPIA latencia en vez de depender de la del mock general: esa es cero
    // bajo Vitest a propósito (ver `handlers.ts`), porque una request en vuelo
    // al terminar el archivo aterriza con jsdom ya desmontado. El handler
    // devuelve `undefined`, que en MSW significa "seguí al siguiente": solo
    // agrega la demora y deja que responda el handler real.
    server.use(
      http.patch('/api/v1/me/checklists/:id', async () => {
        await delay(200)
      }),
    )

    const client = new QueryClient()
    client.setQueryData(listKeys.tree(), fakeTree())

    const { result } = renderHook(() => useUpdateChecklist(4), {
      wrapper: wrapper(client),
    })

    result.current.mutate({ name: 'Renamed live' })

    await waitFor(() => {
      expect(findNode(client.getQueryData(listKeys.tree()), 4)?.name).toBe(
        'Renamed live',
      )
    })
    expect(result.current.isSuccess).toBe(false)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // El resto del árbol (nodo hermano no tocado) queda intacto.
    expect(findNode(client.getQueryData(listKeys.tree()), 1)?.name).toBe(
      'Watching',
    )
  })

  it('ante un error inyectado revierte el snapshot completo del árbol', async () => {
    server.use(
      // El delay replica el handler base (doc 12 §5): sin él, el error
      // llega tan rápido que el `waitFor` de abajo nunca alcanza a observar
      // el estado optimista antes de que el rollback ya haya ocurrido.
      http.patch('/api/v1/me/checklists/:id', async () => {
        await delay(200)
        return HttpResponse.json(
          { error: { code: 'INTERNAL', message: 'boom' } },
          { status: 500 },
        )
      }),
    )
    const client = new QueryClient()
    const original = fakeTree()
    client.setQueryData(listKeys.tree(), original)

    const { result } = renderHook(() => useUpdateChecklist(1), {
      wrapper: wrapper(client),
    })

    result.current.mutate({ name: 'Should roll back' })

    // Optimista: el nombre cambia de entrada...
    await waitFor(() => {
      expect(findNode(client.getQueryData(listKeys.tree()), 1)?.name).toBe(
        'Should roll back',
      )
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    // ...y el error restaura el snapshot entero, no solo el nodo tocado.
    expect(client.getQueryData(listKeys.tree())).toEqual(original)
  })

  // Tarea 4.12 / hallazgo #20.
  it('serializa dos ediciones del mismo nodo en vez de dejarlas solaparse', async () => {
    let inFlight = 0
    let maxConcurrent = 0
    const bodies: string[] = []

    server.use(
      http.patch('/api/v1/me/checklists/:id', async ({ request }) => {
        inFlight += 1
        maxConcurrent = Math.max(maxConcurrent, inFlight)
        const body = (await request.json()) as { name?: string }
        bodies.push(body.name ?? '')
        await delay(80)
        inFlight -= 1
        return HttpResponse.json({
          id: 1,
          name: body.name ?? 'Watching',
          description: null,
          imageUrl: null,
          order: 0,
          sortingMode: 'N',
          isPublished: false,
          linkCount: 0,
          children: [],
        })
      }),
    )

    const client = new QueryClient()
    client.setQueryData(listKeys.tree(), fakeTree())

    const { result } = renderHook(() => useUpdateChecklist(1), {
      wrapper: wrapper(client),
    })

    // Las dos salen en el mismo tick, que es justo el caso que el hallazgo
    // describe: dos clicks seguidos en el toggle de publicar, o dos renombres
    // rápidos del mismo nodo.
    result.current.mutate({ name: 'Primero' })
    result.current.mutate({ name: 'Segundo' })

    await waitFor(() => expect(bodies).toHaveLength(2), { timeout: 3000 })

    // Lo que arregla el bug: la segunda no arranca su `onMutate` —ni su
    // request— hasta que la primera liquidó, así que cada snapshot de rollback
    // corresponde al estado que de verdad lo precede. Sin `scope` esto daría 2.
    expect(maxConcurrent).toBe(1)
    expect(bodies).toEqual(['Primero', 'Segundo'])
  })

  it('un 401 en el PATCH vacía el cache y el rollback NO lo resucita con datos del usuario anterior', async () => {
    useSessionStore.setState({
      user: { id: 1, odooUserId: 11, name: 'Alex', email: 'a@x.dev', avatarUrl: null },
      status: 'authenticated',
    })
    server.use(
      http.patch('/api/v1/me/checklists/:id', () =>
        HttpResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'expired' } },
          { status: 401 },
        ),
      ),
    )
    const client = new QueryClient()
    client.setQueryData(listKeys.tree(), fakeTree())

    // RootLayout monta el reset; acá se monta junto al hook bajo prueba.
    const { result } = renderHook(
      () => {
        usePrivateCacheReset()
        return useUpdateChecklist(1)
      },
      { wrapper: wrapper(client) },
    )

    result.current.mutate({ name: 'Nope' })
    await waitFor(() => expect(result.current.isError).toBe(true))

    // El interceptor corre ANTES que `onError`: sin el guard de dueño, el
    // rollback haría `setQueryData(snapshot)` y devolvería el árbol de Alex.
    expect(client.getQueryData(listKeys.tree())).toBeUndefined()
  })
})
