import { Search } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { FilterBar } from '@/features/catalog/components/FilterBar'
import { FranchiseCard } from '@/features/catalog/components/FranchiseCard'
import { PaginationControls } from '@/features/catalog/components/PaginationControls'
import { useCatalogFilters } from '@/features/catalog/hooks/useCatalogFilters'
import { useFranchiseList } from '@/features/catalog/hooks/useFranchiseList'
import { useGenres } from '@/features/catalog/hooks/useGenres'
import { usePlatforms } from '@/features/catalog/hooks/usePlatforms'
import { useInLibrary } from '@/features/lists/hooks/useInLibrary'
import { t } from '@/i18n/en'

/**
 * Página de resultados de búsqueda (doc 06 tarea 2.6): reusa el grid, el
 * `FilterBar` y la paginación del catálogo — la única diferencia real con
 * `CatalogPage` es que `q` llega fijo por URL (desde el `SearchBar` o un Enter
 * sin selección) y, si falta, no tiene sentido pedir el catálogo completo.
 */
export default function SearchPage() {
  const { filters, setFilters, clearFilters } = useCatalogFilters()
  const query = filters.q?.trim()

  const franchises = useFranchiseList(filters, { enabled: Boolean(query) })
  const library = useInLibrary()
  const genres = useGenres()
  const platforms = usePlatforms()

  if (!query) {
    return (
      <PageWrapper>
        <EmptyState
          icon={<Search className="size-6" aria-hidden />}
          title={t.search.promptTitle}
          description={t.search.promptBody}
        />
      </PageWrapper>
    )
  }

  const filterBar = (
    <FilterBar
      filters={filters}
      setFilters={setFilters}
      // Preserva `q` (hallazgo #27): el usuario pide soltar los filtros, no
        // la búsqueda.
        clearFilters={() => clearFilters(['q'])}
      hasActiveFilters
      genres={genres.data ?? []}
      platforms={platforms.data ?? []}
    />
  )

  if (franchises.isPending) {
    return (
      <PageWrapper className="space-y-6">
        <h1 className="text-xl font-semibold">{t.search.resultsFor(query)}</h1>
        {filterBar}
        <LoadingSkeleton variant="card-grid" count={12} />
      </PageWrapper>
    )
  }

  if (franchises.isError) {
    return (
      <PageWrapper className="space-y-6">
        <h1 className="text-xl font-semibold">{t.search.resultsFor(query)}</h1>
        {filterBar}
        <ErrorState onRetry={() => franchises.refetch()} />
      </PageWrapper>
    )
  }

  const { items, page, pageSize, total } = franchises.data

  return (
    <PageWrapper className="space-y-6">
      <h1 className="text-xl font-semibold">{t.search.resultsFor(query)}</h1>
      {filterBar}

      {items.length === 0 ? (
        <EmptyState
          title={t.search.noResultsTitle}
          description={t.search.noResultsBody(query)}
          action={
            <Button variant="outline" size="sm" onClick={() => clearFilters(['q'])}>
              {t.common.clearFilters}
            </Button>
          }
        />
      ) : (
        <>
          {/* `h2` sr-only (tarea 4.3): el `h1` de la página saltaba directo a
              los `h3` de las tarjetas. El nivel de la tarjeta no se toca
              porque en la home es correcto (h1 → h2 del carrusel → h3). */}
          <section aria-labelledby="search-results">
            <h2 id="search-results" className="sr-only">
              {t.catalog.resultsHeading}
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {items.map((franchise, index) => (
                <FranchiseCard
                  key={franchise.id}
                  index={index}
                  franchise={franchise}
                  inLibrary={library.hasFranchise(franchise.id)}
                />
              ))}
            </div>
          </section>
          <PaginationControls
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={(next) => setFilters({ page: next })}
          />
        </>
      )}
    </PageWrapper>
  )
}
