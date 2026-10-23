import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { listKeys } from '@/features/lists/hooks/queryKeys'
import { identityOf, useSessionStore } from '@/store/sessionStore'

/**
 * Prefijos de queryKey con datos de un usuario autenticado. Todo prefijo con
 * datos privados se registra acá. Quedan fuera a propósito: `authKeys` (su
 * ciclo lo manejan login/register/logout; vaciarlo haría que `useMe` pida
 * /auth/me al instante) y `profileKeys` (perfiles públicos).
 */
export const PRIVATE_QUERY_PREFIXES = [listKeys.all] as const

/**
 * Vincula el cache privado de TanStack Query a la identidad de la sesión.
 *
 * Problema: el cache vive aparte del store de sesión. Si la cookie vence (401 →
 * `clearSession`) y otro usuario entra en la misma pestaña, TanStack le
 * serviría los datos del anterior durante `staleTime`. Acá se escucha el store
 * (Zustand llama a los listeners sincrónicamente, antes de que React
 * renderice) y se reacciona al cambio de identidad, sin importar quién lo
 * provocó (interceptor 401, login, register, logout).
 *
 * - Misma identidad (p. ej. refetch de `me`): no se hace nada.
 * - Pasa a "nadie": `removeQueries`, sin refetch con la sesión muerta.
 * - Pasa a otro usuario: `resetQueries`, que además avisa a los observers
 *   montados; `removeQueries` los dejaría colgados de la query vieja.
 */
export function usePrivateCacheReset() {
  const queryClient = useQueryClient()

  useEffect(() => {
    return useSessionStore.subscribe((state, prev) => {
      const next = identityOf(state)
      if (identityOf(prev) === next) return

      for (const queryKey of PRIVATE_QUERY_PREFIXES) {
        if (next === null) {
          queryClient.removeQueries({ queryKey })
        } else {
          void queryClient.resetQueries({ queryKey })
        }
      }
    })
  }, [queryClient])
}
