import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/button'
import { paths } from '@/router/paths'
import { env } from '@/lib/env'
import { t } from '@/i18n/en'

/** Texto técnico del error, solo para el `<details>` de desarrollo. */
function describeError(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText}`
  }
  if (error instanceof Error) {
    return error.stack ?? `${error.name}: ${error.message}`
  }
  return String(error)
}

/**
 * Página de error de ruta (tarea 4.4): lo que se ve cuando una página revienta
 * al renderizar, en lugar de la pantalla en blanco que dejaba antes.
 *
 * Va montada como `errorElement` de **cada ruta**, no solo de la raíz, y esa
 * diferencia es el punto: React Router hace burbujear el error hasta el
 * `errorElement` más cercano, así que colgándolo de cada página el error queda
 * contenido en el `<Outlet>` y el header y las bottom tabs **siguen en pie**.
 * El usuario sigue teniendo cómo irse a otra parte de la app en vez de quedar
 * encerrado. La raíz también lleva uno, como último recurso para el caso en que
 * lo que falle sea el layout mismo.
 *
 * El detalle técnico se muestra **solo en desarrollo**: un stack trace en
 * producción filtra rutas de archivos y estructura interna sin darle nada útil
 * a quien lo lee.
 */
export default function ErrorPage() {
  const error = useRouteError()

  return (
    <PageWrapper>
      <div
        role="alert"
        className="flex flex-col items-center justify-center gap-4 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-12 text-center"
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-6" aria-hidden />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-foreground">
            {t.states.crashTitle}
          </h1>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            {t.states.crashBody}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {/* `window.location.reload()` y no `navigate(0)`: si el error vino de
              un módulo que quedó en mal estado, hace falta un ciclo de vida
              nuevo de verdad, no un re-render del mismo árbol. */}
          <Button size="sm" onClick={() => window.location.reload()}>
            {t.states.reload}
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to={paths.home}>{t.nav.home}</Link>
          </Button>
        </div>
        {env.isDev && (
          <details className="w-full max-w-xl text-left">
            <summary className="cursor-pointer text-xs text-muted-foreground">
              {t.states.crashDetails}
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted p-3 text-xs whitespace-pre-wrap text-muted-foreground">
              {describeError(error)}
            </pre>
          </details>
        )}
      </div>
    </PageWrapper>
  )
}
