import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { FranchiseCarousel } from '@/features/catalog/components/FranchiseCarousel'
import type { FranchiseSummary } from '@/features/catalog/types'
import { t } from '@/i18n/en'

function franchise(id: number, name: string): FranchiseSummary {
  return {
    id,
    name,
    imageUrl: null,
    genres: [],
    yearRange: { from: 2000, to: 2001 },
    contentCounts: { games: 0, videos: 1 },
  } as FranchiseSummary
}

const renderCarousel = (props: Parameters<typeof FranchiseCarousel>[0]) =>
  render(
    <MemoryRouter>
      <FranchiseCarousel {...props} />
    </MemoryRouter>,
  )

describe('FranchiseCarousel', () => {
  it('should render the title and one linked card per franchise', () => {
    renderCarousel({
      title: 'Row title',
      items: [franchise(1, 'Alpha'), franchise(2, 'Beta')],
    })

    expect(
      screen.getByRole('heading', { level: 2, name: 'Row title' }),
    ).toBeInTheDocument()
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(within(links[0]!).getByText('Alpha')).toBeInTheDocument()
    expect(within(links[1]!).getByText('Beta')).toBeInTheDocument()
  })

  it('should render nothing at all when there are no items (no orphan title)', () => {
    const { container } = renderCarousel({ title: 'Row title', items: [] })
    expect(container).toBeEmptyDOMElement()
  })

  it('should flag only the franchises the predicate says are in the library', () => {
    renderCarousel({
      title: 'Row',
      items: [franchise(1, 'Alpha'), franchise(2, 'Beta')],
      isInLibrary: (id) => id === 2,
    })

    const [alpha, beta] = screen.getAllByRole('link')
    expect(within(alpha!).queryByText(t.card.inYourList)).toBeNull()
    expect(within(beta!).getByText(t.card.inYourList)).toBeInTheDocument()
  })

  it('should not flag anything when no predicate is given', () => {
    renderCarousel({ title: 'Row', items: [franchise(1, 'Alpha')] })
    expect(screen.queryByText(t.card.inYourList)).toBeNull()
  })
})
