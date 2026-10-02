import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { BottomTabs } from '@/components/layout/BottomTabs'
import { useSessionStore } from '@/store/sessionStore'
import { t } from '@/i18n/en'

function Location() {
  return <span data-testid="location">{useLocation().pathname}</span>
}

function renderTabs(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <BottomTabs />
      <Location />
    </MemoryRouter>,
  )
}

const activeLabels = () =>
  screen
    .getAllByRole('link')
    .filter((a) => a.getAttribute('aria-current') === 'page')
    .map((a) => a.textContent)

beforeEach(() => {
  useSessionStore.setState({ user: null, status: 'unauthenticated' })
})

describe('BottomTabs', () => {
  it('should render the five destinations in order', () => {
    renderTabs('/catalog')
    expect(screen.getAllByRole('link').map((a) => a.textContent)).toEqual([
      t.nav.home,
      t.nav.catalog,
      t.nav.search,
      t.nav.myLists,
      t.nav.profile,
    ])
  })

  it('should mark only Catalog as active on /catalog', () => {
    renderTabs('/catalog')
    expect(activeLabels()).toEqual([t.nav.catalog])
  })

  it('should mark Home as active only on exactly "/" (end matching)', () => {
    renderTabs('/')
    expect(activeLabels()).toEqual([t.nav.home])
  })

  it('should NOT mark Home as active on a nested route', () => {
    renderTabs('/my-lists/3')
    expect(activeLabels()).toEqual([t.nav.myLists])
  })

  it('should send Profile to /login when there is no session', () => {
    renderTabs('/')
    expect(screen.getByRole('link', { name: t.nav.profile })).toHaveAttribute(
      'href',
      '/login',
    )
  })

  it('should send Profile to the own profile when logged in', () => {
    useSessionStore.setState({
      user: {
        id: 7,
        odooUserId: 21,
        name: 'Alex',
        email: 'alex@example.com',
        avatarUrl: null,
      },
      status: 'authenticated',
    })
    renderTabs('/')
    expect(screen.getByRole('link', { name: t.nav.profile })).toHaveAttribute(
      'href',
      '/profile/7',
    )
  })

  it('should navigate and move the active mark when a tab is clicked', async () => {
    const ui = userEvent.setup()
    renderTabs('/')
    await ui.click(screen.getByRole('link', { name: t.nav.search }))

    expect(screen.getByTestId('location').textContent).toBe('/search')
    expect(activeLabels()).toEqual([t.nav.search])
  })
})
