import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import NotFoundPage from '@/pages/NotFoundPage'
import { t } from '@/i18n/en'

function Location() {
  return <span data-testid="location">{useLocation().pathname}</span>
}

describe('NotFoundPage', () => {
  it('should explain the page does not exist and offer a way home', async () => {
    const ui = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/nope']}>
        <Routes>
          <Route path="*" element={<NotFoundPage />} />
          <Route path="/" element={<span>home reached</span>} />
        </Routes>
        <Location />
      </MemoryRouter>,
    )

    expect(screen.getByText(t.states.notFoundTitle)).toBeInTheDocument()
    expect(screen.getByText(t.states.notFoundBody)).toBeInTheDocument()

    await ui.click(screen.getByRole('link', { name: t.nav.home }))
    expect(screen.getByTestId('location').textContent).toBe('/')
    expect(screen.getByText('home reached')).toBeInTheDocument()
  })
})
