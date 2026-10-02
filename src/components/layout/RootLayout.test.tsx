import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '@/mocks/server'
import { RootLayout } from '@/components/layout/RootLayout'
import { useThemeStore } from '@/store/themeStore'
import { useSessionStore } from '@/store/sessionStore'
import { t } from '@/i18n/en'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true })
  document.documentElement.classList.remove('dark')
  useThemeStore.setState({ preference: 'system' })
  useSessionStore.setState({ user: null, status: 'idle' })
})
afterAll(() => server.close())

function renderLayout() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/child']}>
        <Routes>
          <Route element={<RootLayout />}>
            <Route path="/child" element={<p>route content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('RootLayout', () => {
  it('should render header, route content inside main, and the bottom tabs', async () => {
    renderLayout()

    expect(await screen.findByText('route content')).toBeInTheDocument()
    expect(screen.getByRole('main')).toContainElement(screen.getByText('route content'))
    expect(screen.getByRole('banner')).toBeInTheDocument()
    // Hay dos navegaciones (header desktop + tabs mobile): la de tabs trae el link Profile.
    expect(screen.getAllByRole('link', { name: t.nav.profile }).length).toBeGreaterThan(0)
  })

  it('should apply the theme preference to <html>', async () => {
    useThemeStore.setState({ preference: 'dark' })
    renderLayout()
    await screen.findByText('route content')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('should resolve the session on mount (useMe) and settle the store', async () => {
    renderLayout()
    await waitFor(() => expect(useSessionStore.getState().status).not.toBe('idle'))
  })

  it('should show the offline banner outside <main>, and hide it when back online', async () => {
    renderLayout()
    await screen.findByText('route content')
    expect(screen.queryByText(t.offline.title)).toBeNull()

    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true })
    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    const banner = await screen.findByText(t.offline.title)
    expect(screen.getByRole('main')).not.toContainElement(banner)

    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true })
    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(screen.queryByText(t.offline.title)).toBeNull()
  })
})
