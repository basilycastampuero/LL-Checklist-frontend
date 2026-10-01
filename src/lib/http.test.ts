import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AxiosError, AxiosHeaders, type AxiosInstance } from 'axios'
import { createHttpClient, normalizeError } from '@/lib/http'
import { ApiError } from '@/types/api.types'
import { useSessionStore } from '@/store/sessionStore'

function axiosErrorWith(status: number, data: unknown): AxiosError {
  const err = new AxiosError('Request failed')
  err.response = {
    status,
    statusText: '',
    data,
    headers: {},
    config: { headers: new AxiosHeaders() },
  }
  return err
}

describe('createHttpClient', () => {
  it('manda X-Requested-With: anitrack (ADR-016, defensa CSRF)', () => {
    const client = createHttpClient()
    expect(client.defaults.headers['X-Requested-With']).toBe('anitrack')
  })
})

/** Cliente cuyo adapter devuelve 200 y anota los headers de cada request. */
function clientCapturingHeaders(): { client: AxiosInstance; seen: (string | undefined)[] } {
  const client = createHttpClient()
  const seen: (string | undefined)[] = []
  client.defaults.adapter = async (config) => {
    const value = AxiosHeaders.from(config.headers).get('x-mock-error')
    seen.push(typeof value === 'string' ? value : undefined)
    return { status: 200, statusText: 'OK', data: {}, headers: {}, config }
  }
  return { client, seen }
}

describe('interceptor de inyección de fallos (4.4)', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('should send x-mock-error when ?mockError= is in the browser URL', async () => {
    window.history.replaceState(null, '', '/my-lists?mockError=INTERNAL')
    const { client, seen } = clientCapturingHeaders()
    await client.get('/whatever')
    expect(seen).toEqual(['INTERNAL'])
  })

  it('should not send x-mock-error when the param is absent', async () => {
    window.history.replaceState(null, '', '/my-lists?other=1')
    const { client, seen } = clientCapturingHeaders()
    await client.get('/whatever')
    expect(seen).toEqual([undefined])
  })

  it('should re-read the URL on every request, not once at client creation', async () => {
    const { client, seen } = clientCapturingHeaders()
    await client.get('/whatever')
    window.history.replaceState(null, '', '/?mockError=FORBIDDEN')
    await client.get('/whatever')
    window.history.replaceState(null, '', '/')
    await client.get('/whatever')
    expect(seen).toEqual([undefined, 'FORBIDDEN', undefined])
  })
})

describe('normalizeError', () => {
  it('extrae el envelope de error del contrato', () => {
    const result = normalizeError(
      axiosErrorWith(404, { error: { code: 'NOT_FOUND', message: 'nope' } }),
    )
    expect(result).toBeInstanceOf(ApiError)
    expect(result.code).toBe('NOT_FOUND')
    expect(result.message).toBe('nope')
    expect(result.status).toBe(404)
  })

  it('conserva el detalle en ALREADY_LINKED', () => {
    const existing = [{ linkId: 1 }]
    const result = normalizeError(
      axiosErrorWith(409, {
        error: { code: 'ALREADY_LINKED', message: 'dup', existing },
      }),
    )
    expect(result.code).toBe('ALREADY_LINKED')
    expect(result.detail).toEqual(existing)
  })

  it('conserva el field en VALIDATION (extensión doc 12 §5, 3.2)', () => {
    const result = normalizeError(
      axiosErrorWith(422, {
        error: { code: 'VALIDATION', message: 'dup', field: 'email' },
      }),
    )
    expect(result.code).toBe('VALIDATION')
    expect(result.field).toBe('email')
  })

  it('mapea el status cuando no hay envelope', () => {
    const result = normalizeError(axiosErrorWith(403, '<html>error</html>'))
    expect(result.code).toBe('FORBIDDEN')
  })

  it('trata un fallo sin response como error de red', () => {
    const result = normalizeError(new AxiosError('Network Error'))
    expect(result.code).toBe('INTERNAL')
    expect(result.status).toBeNull()
  })

  it('devuelve tal cual un ApiError ya normalizado', () => {
    const original = new ApiError('VALIDATION', 'x', 422)
    expect(normalizeError(original)).toBe(original)
  })
})

describe('interceptor 401', () => {
  beforeEach(() => {
    useSessionStore.setState({ user: null, status: 'idle' })
  })

  it('limpia la sesión ante un 401 y rechaza con ApiError', async () => {
    const client = createHttpClient()
    client.defaults.adapter = async () => {
      throw axiosErrorWith(401, {
        error: { code: 'UNAUTHORIZED', message: 'no session' },
      })
    }

    await expect(client.get('/whatever')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    })
    expect(useSessionStore.getState().status).toBe('unauthenticated')
  })
})
