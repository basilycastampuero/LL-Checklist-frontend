import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter, Outlet, Link } from 'react-router-dom'
import ErrorPage from '@/pages/ErrorPage'
import { t } from '@/i18n/en'

/**
 * Tarea 4.2 x 4.4: una navegación con `viewTransition` que cae en una ruta que
 * revienta tiene que seguir terminando en el `errorElement` de ESA ruta, con el
 * chrome de navegación vivo. jsdom no trae `startViewTransition`, así que se
 * stubea con la forma real (ejecuta el callback de actualización) para que
 * React Router tome el camino de la transición y no el de fallback.
 */
afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(document, 'startViewTransition')
})

function Boom(): never {
  throw new Error('estallido de prueba')
}

function Shell() {
  return (
    <div>
      <nav>
        <Link to="/boom" viewTransition>
          ir a la ruta rota
        </Link>
      </nav>
      <Outlet />
    </div>
  )
}

describe('View Transitions + errorElement por ruta', () => {
  it('navegar con viewTransition a una ruta rota deja el error contenido', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const startViewTransition = vi.fn((update: () => void) => {
      update()
      const done = Promise.resolve()
      return { ready: done, finished: done, updateCallbackDone: done, skipTransition: () => {} }
    })
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: startViewTransition,
    })

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
      { initialEntries: ['/'] },
    )
    render(<RouterProvider router={router} />)

    await userEvent.click(screen.getByRole('link', { name: 'ir a la ruta rota' }))

    expect(
      await screen.findByRole('heading', { name: t.states.crashTitle }),
    ).toBeInTheDocument()
    expect(startViewTransition).toHaveBeenCalled()
    expect(
      screen.getByRole('link', { name: 'ir a la ruta rota' }),
    ).toBeInTheDocument()
  })
})
