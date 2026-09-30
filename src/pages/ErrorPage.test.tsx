import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter, Outlet, Link } from 'react-router-dom'
import ErrorPage from '@/pages/ErrorPage'
import { t } from '@/i18n/en'

/**
 * React Router escribe el error en la consola al atraparlo, que es correcto
 * pero ensucia la salida de la suite. Se silencia solo acá.
 */
afterEach(() => {
  vi.restoreAllMocks()
})

function Boom(): never {
  throw new Error('estallido de prueba')
}

/** Layout mínimo que imita a `RootLayout`: algo de chrome más el `<Outlet>`. */
function Shell() {
  return (
    <div>
      <nav>
        <Link to="/">chrome de navegación</Link>
      </nav>
      <Outlet />
    </div>
  )
}

function renderCrashingRoute() {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const router = createMemoryRouter(
    [
      {
        element: <Shell />,
        children: [
          { path: '/', element: <p>home</p> },
          { path: '/boom', element: <Boom />, errorElement: <ErrorPage /> },
        ],
      },
    ],
    { initialEntries: ['/boom'] },
  )
  return render(<RouterProvider router={router} />)
}

describe('ErrorPage (4.4)', () => {
  it('muestra la página de error en vez de una pantalla en blanco', () => {
    renderCrashingRoute()

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: t.states.crashTitle }),
    ).toBeInTheDocument()
    expect(screen.getByText(t.states.crashBody)).toBeInTheDocument()
  })

  it('el error queda contenido: el chrome de navegación sigue en pie', () => {
    renderCrashingRoute()

    // Esto es la razón de colgar el `errorElement` de cada ruta y no solo de la
    // raíz. Si burbujeara hasta arriba, el layout entero se reemplazaría y el
    // usuario quedaría encerrado en la pantalla de error, sin forma de salir.
    expect(
      screen.getByRole('link', { name: 'chrome de navegación' }),
    ).toBeInTheDocument()
  })

  it('ofrece recargar y volver al inicio', () => {
    renderCrashingRoute()

    expect(
      screen.getByRole('button', { name: t.states.reload }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: t.nav.home })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('en desarrollo muestra el detalle técnico del error', () => {
    renderCrashingRoute()

    // `env.isDev` es true bajo Vitest (no es un build de producción), así que
    // este es el camino que se ejercita. El contrario —que en producción NO se
    // filtre el stack— no se puede afirmar acá sin remockear `lib/env`, y está
    // anotado como lo que el test no cubre.
    expect(screen.getByText(t.states.crashDetails)).toBeInTheDocument()
    expect(screen.getByText(/estallido de prueba/)).toBeInTheDocument()
  })
})

/**
 * Los tests de arriba montan su propio `errorElement`, así que prueban el
 * componente y no el cableado. Esto cubre el cableado real: que **toda** ruta
 * del router de producción tenga uno. Sin este test, una ruta agregada a mano
 * fuera de `withErrorElement` volvería a la pantalla en blanco y nada lo
 * delataría hasta que algo fallara en producción.
 */
describe('cableado del router (4.4)', () => {
  it('toda ruta del router tiene errorElement', async () => {
    const { router } = await import('@/router')

    const sinBoundary: string[] = []
    const visitar = (routes: typeof router.routes, prefijo = '') => {
      for (const route of routes) {
        const nombre = `${prefijo}/${route.path ?? '(sin path)'}`
        if (!route.errorElement) sinBoundary.push(nombre)
        if (route.children) visitar(route.children, nombre)
      }
    }
    visitar(router.routes)

    expect(sinBoundary).toEqual([])
  })
})
