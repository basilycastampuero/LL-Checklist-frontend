import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { authService } from '@/features/auth/services/auth.service'
import { authKeys } from '@/features/auth/hooks/queryKeys'
import { useSessionStore } from '@/store/sessionStore'
import { ApiError } from '@/types/api.types'

/**
 * Resuelve la sesión actual vía GET /auth/me y la sincroniza con el store.
 * Un 401 no se reintenta (la cookie no existe): status pasa a unauthenticated.
 * Cualquier otro fallo pasa a `unresolved`, que NO es lo mismo — ver el
 * comentario del efecto más abajo.
 */
export function useMe() {
  const setUser = useSessionStore((s) => s.setUser)
  const clearSession = useSessionStore((s) => s.clearSession)
  const setUnresolved = useSessionStore((s) => s.setUnresolved)

  const query = useQuery({
    queryKey: authKeys.me(),
    queryFn: () => authService.me(),
    retry: (count, error) =>
      error instanceof ApiError && error.code === 'UNAUTHORIZED'
        ? false
        : count < 1,
    staleTime: 5 * 60_000,
  })

  useEffect(() => {
    // Gatear por estado, no por presencia de `data`: en v5 `data` sobrevive
    // a la transición a error (retiene el último valor bueno), así que
    // chequear `isError` primero evita reautenticar con un usuario vencido.
    if (query.isError) {
      // Solo un 401 significa "no hay sesión". Antes se llamaba
      // `clearSession()` ante CUALQUIER error, así que un 500 en `/auth/me`
      // marcaba al usuario como no autenticado y `<RequireAuth>` lo expulsaba
      // al login — con su cookie intacta, y donde volver a loguearse no
      // arregla nada porque el servidor sigue fallando (tarea 4.4).
      if (query.error instanceof ApiError && query.error.code === 'UNAUTHORIZED') {
        clearSession()
      } else if (useSessionStore.getState().user === null) {
        // No se pudo averiguar y no hay ningún usuario resuelto de antes:
        // estado propio para que el guard muestre un error con retry en vez de
        // un redirect.
        setUnresolved()
      }
      // Si ya había un usuario resuelto, no se toca nada: un refetch fallido
      // no es razón para cerrarle la sesión a alguien que la tenía. Los
      // errores de datos concretos los muestra cada página.
    } else if (query.isSuccess) {
      setUser(query.data)
    }
  }, [
    query.isSuccess,
    query.isError,
    query.error,
    query.data,
    setUser,
    clearSession,
    setUnresolved,
  ])

  return query
}
