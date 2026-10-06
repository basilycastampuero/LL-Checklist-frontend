import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { server } from '@/mocks/server'
import { http as apiClient } from '@/lib/http'
import { holdUntilMocksReady, mocksReady } from '@/lib/mswGate'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  server.events.removeAllListeners()
})
afterAll(() => server.close())

describe('compuerta de MSW', () => {
  it('abierta por defecto: no hace esperar a nadie', async () => {
    let resuelta = false
    void mocksReady().then(() => {
      resuelta = true
    })

    // Dos microtasks alcanzan para una promesa ya resuelta. Esto es lo que
    // mantiene a la suite entera sin cambios: los tests usan el server de Node
    // y nunca cierran la compuerta.
    await Promise.resolve()
    await Promise.resolve()

    expect(resuelta).toBe(true)
  })

  it('la capa HTTP retiene la request hasta que la compuerta se abre', async () => {
    const empezadas: string[] = []
    server.events.on('request:start', ({ request }) => {
      empezadas.push(request.url)
    })

    // El `finally` no es decorativo: si una aserción falla acá y la compuerta
    // queda cerrada, cuelga todas las requests del resto de la suite.
    const abrir = holdUntilMocksReady()
    try {
      const enVuelo = apiClient.get('/genres')

      await new Promise((resolve) => setTimeout(resolve, 60))
      expect(empezadas).toEqual([])

      abrir()

      const respuesta = await enVuelo
      expect(respuesta.status).toBe(200)
      expect(empezadas).toHaveLength(1)
    } finally {
      abrir()
    }
  })

  it('una vez abierta, vuelve a ser gratis', async () => {
    const abrir = holdUntilMocksReady()
    abrir()

    let resuelta = false
    void mocksReady().then(() => {
      resuelta = true
    })
    await Promise.resolve()
    await Promise.resolve()

    expect(resuelta).toBe(true)
  })
})
