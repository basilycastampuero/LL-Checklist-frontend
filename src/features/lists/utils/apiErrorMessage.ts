import { ApiError, type ApiErrorCode } from '@/types/api.types'

/**
 * Mensaje de error a mostrar al usuario para una mutación de listas (doc 12
 * §3.5b: las cuatro operaciones necesitan estado de error visible). Un
 * `ApiError` reconocido manda su propio mensaje (el backend ya lo redacta
 * pensando en el usuario, p. ej. VALIDATION); cualquier otra cosa (error de
 * red, `ZodError` por drift de contrato) cae al mensaje genérico de la
 * operación — nunca se muestra un mensaje técnico crudo (mismo criterio que
 * `LoginForm`/`RegisterForm`, doc 12 §5, ficha 3.2).
 */
/**
 * Códigos donde el contrato (doc 04) promete que `message` está redactado
 * para el usuario. Para el resto gana el fallback de la operación.
 */
const MENSAJE_PARA_EL_USUARIO = new Set<ApiErrorCode>([
  'VALIDATION',
  'ALREADY_LINKED',
])

export function apiErrorMessage(error: unknown, fallback: string): string {
  // Filtrar por código y no simplemente "es un ApiError" (hallazgo #22 de la
  // auditoría del 2026-10-01). `normalizeError` construye el `ApiError` con el
  // `message` de axios cuando la respuesta NO trae el envelope del contrato —
  // un 500 de Odoo con traceback, por ejemplo—, así que el usuario terminaba
  // leyendo "Request failed with status code 500" en el diálogo de renombrar.
  // Era invisible en desarrollo porque los handlers de MSW siempre mandan el
  // envelope. El docstring de arriba ya prometía esto; faltaba cumplirlo.
  if (error instanceof ApiError && MENSAJE_PARA_EL_USUARIO.has(error.code)) {
    return error.message
  }
  return fallback
}
