import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { useSessionStore } from '@/store/sessionStore'
import { authKeys } from '@/features/auth/hooks/queryKeys'
import { paths } from '@/router/paths'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { ErrorState } from '@/components/common/ErrorState'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { t } from '@/i18n/en'

/**
 * Guard de rutas privadas (doc 06). Mientras la sesión no está resuelta muestra
 * skeleton; si no hay sesión redirige a login con `next` para volver después.
 *
 * El tercer caso, `unresolved`, se agregó en la tarea 4.4: la sesión no se pudo
 * **averiguar** (500, red caída, timeout), que no es lo mismo que no tenerla.
 * Antes caía en el mismo cajón que el 401 y el usuario terminaba en el login
 * con su cookie intacta, frente a un formulario que no iba a arreglar nada
 * porque el servidor seguía fallando. Ahora ve un error con retry.
 */
export function RequireAuth() {
  const status = useSessionStore((s) => s.status)
  const location = useLocation()
  const queryClient = useQueryClient()
  // El store no sabe que hay un reintento en vuelo (sigue en `unresolved`
  // hasta que resuelva), así que la señal de "estoy reintentando" se toma de
  // la query misma. Sin esto, el botón de retry no daría ninguna devolución.
  const isRetrying = useIsFetching({ queryKey: authKeys.me() }) > 0

  if (status === 'idle' || (status === 'unresolved' && isRetrying)) {
    return (
      <PageWrapper>
        <LoadingSkeleton variant="list-rows" />
      </PageWrapper>
    )
  }

  if (status === 'unresolved') {
    return (
      <PageWrapper>
        <ErrorState
          title={t.states.sessionErrorTitle}
          description={t.states.sessionErrorBody}
          // `refetchQueries` solo actúa sobre queries que YA existen en el
          // cache; no crea ninguna. Funciona porque `useMe` vive en
          // `RootLayout`, que es el padre de este guard y por lo tanto siempre
          // está montado cuando esto se renderiza. Es un acoplamiento
          // implícito: si alguna vez se monta `RequireAuth` sin `useMe` activo,
          // este botón no haría nada y no se quejaría.
          onRetry={() => {
            void queryClient.refetchQueries({ queryKey: authKeys.me() })
          }}
        />
      </PageWrapper>
    )
  }

  if (status === 'unauthenticated') {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`${paths.login}?next=${next}`} replace />
  }

  return <Outlet />
}
