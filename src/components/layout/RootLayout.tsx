import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { BottomTabs } from '@/components/layout/BottomTabs'
import { useApplyTheme } from '@/hooks/useApplyTheme'
import { useMe } from '@/features/auth/hooks/useMe'
import { usePrivateCacheReset } from '@/features/auth/hooks/usePrivateCacheReset'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { OfflineBanner } from '@/components/common/OfflineBanner'

/**
 * Shell de la app: aplica el tema, resuelve la sesión, y monta header + bottom
 * tabs alrededor del contenido de ruta. El padding inferior deja sitio a la
 * bottom tab bar en mobile.
 */
export function RootLayout() {
  useApplyTheme()
  useMe()
  usePrivateCacheReset()

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <Header />
      {/* Debajo del header y fuera del `<main>`: es un aviso sobre el estado de
          la app entera, no contenido de la página, y así no lo tapa ni lo
          desmonta un cambio de ruta. */}
      <OfflineBanner />
      <main className="flex-1 pb-20 md:pb-8">
        <Suspense
          fallback={
            <div className="mx-auto max-w-7xl px-4 py-6">
              <LoadingSkeleton variant="card-grid" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <BottomTabs />
    </div>
  )
}
