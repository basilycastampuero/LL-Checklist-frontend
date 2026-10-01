import axios, { AxiosError, type AxiosInstance } from 'axios'
import { env } from '@/lib/env'
import {
  ApiError,
  errorEnvelopeSchema,
  type ApiErrorCode,
} from '@/types/api.types'
import { useSessionStore } from '@/store/sessionStore'

/** Mapea un status HTTP a un código de error del contrato (fallback INTERNAL). */
function statusToCode(status: number): ApiErrorCode {
  switch (status) {
    case 401:
      return 'UNAUTHORIZED'
    case 403:
      return 'FORBIDDEN'
    case 404:
      return 'NOT_FOUND'
    case 409:
      return 'ALREADY_LINKED'
    case 422:
      return 'VALIDATION'
    default:
      return 'INTERNAL'
  }
}

/**
 * Traduce cualquier fallo de axios (HTTP, red, timeout) al ApiError normalizado
 * que consume el resto de la app. Extrae el envelope `{ error: {...} }` del
 * contrato (doc 04) cuando está presente.
 */
export function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (error instanceof AxiosError) {
    const status = error.response?.status ?? null
    const parsed = errorEnvelopeSchema.safeParse(error.response?.data)
    if (parsed.success) {
      const { code, message, existing, field } = parsed.data.error
      return new ApiError(code, message, status, existing ?? null, field ?? null)
    }
    if (status === null) {
      // Marcador técnico, NO texto de cara al usuario: `apiErrorMessage` solo
      // propaga el `message` del backend para los códigos donde el contrato lo
      // promete (VALIDATION, ALREADY_LINKED), así que esto nunca se renderiza.
      // Antes sí llegaba a pantalla — hallazgo #22.
      return new ApiError('INTERNAL', 'Network error', null)
    }
    return new ApiError(statusToCode(status), error.message, status)
  }

  return new ApiError('INTERNAL', 'Unexpected error')
}

export function createHttpClient(): AxiosInstance {
  const client = axios.create({
    baseURL: env.apiBaseUrl,
    withCredentials: true, // ADR-005: la sesión viaja por cookie
    headers: {
      Accept: 'application/json',
      // ADR-016: defensa CSRF por header custom. Sin esto, el backend real
      // responde 403 FORBIDDEN a cualquier POST/PATCH/DELETE (GET no lo exige,
      // pero se manda siempre para no tener que distinguir por método acá).
      //
      // El valor sigue siendo 'anitrack' y no 'll-checklist' aunque el
      // proyecto se renombró (ADR-023): el backend compara contra esta cadena
      // exacta en `ll_webpage`, así que cambiarla acá sin cambiarla allá
      // rompería toda la escritura con un 403. Es un identificador de
      // protocolo, no un nombre de cara al usuario.
      'X-Requested-With': 'anitrack',
    },
  })

  // Inyección de fallos para probar los estados de error de la UI sin tocar
  // código (tarea 4.4): `?mockError=INTERNAL` en la URL del navegador se
  // traduce al header que los handlers de MSW ya sabían leer.
  //
  // Esto faltaba, y por eso el mecanismo estaba documentado pero no funcionaba:
  // `injectedError` en `handlers.ts` busca el parámetro en la URL de la
  // **request de API**, y nadie lo ponía ahí — el `?mockError=` de la barra de
  // direcciones no viajaba a ninguna parte. Verificado en el navegador antes de
  // escribir esto: con el parámetro puesto, `/catalog` cargaba normal.
  //
  // Solo en modo mock, y la comprobación es deliberadamente redundante con el
  // hecho de que MSW no corra en modo real: mandarle al backend de verdad un
  // header que le pide fallar es la clase de cosa que no debe depender de un
  // solo guardarraíl.
  //
  // Se lee en cada request y no una vez al crear el cliente: así alcanza con
  // navegar a la URL con el parámetro, sin recargar.
  if (env.apiMode === 'mock') {
    client.interceptors.request.use((config) => {
      const code = new URLSearchParams(window.location.search).get('mockError')
      if (code) {
        config.headers.set('x-mock-error', code)
      }
      return config
    })
  }

  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      const apiError = normalizeError(error)
      // 401 => la cookie caducó o no hay sesión: reflejarlo en el store para que
      // los guards de ruta reaccionen. No redirigimos desde aquí (lo hace
      // <RequireAuth>) para mantener el interceptor testeable y sin side-effects
      // de navegación.
      if (apiError.code === 'UNAUTHORIZED') {
        useSessionStore.getState().clearSession()
      }
      return Promise.reject(apiError)
    },
  )

  return client
}

export const http = createHttpClient()
