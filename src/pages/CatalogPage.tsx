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

/** Grid de franquicias del catálogo (doc 06). Filtros vienen de la URL, con el FilterBar como control visual. */
export default function CatalogPage() {
  const { filters, setFilters, clearFilters } = useCatalogFilters()
  const franchises = useFranchiseList(filters)
  const library = useInLibrary()
  const genres = useGenres()
  const platforms = usePlatforms()

  const hasActiveFilters = Boolean(
    filters.q ||
    filters.contentType ||
    filters.videoType ||
    filters.genreIds?.length ||
    filters.platformIds?.length ||
    filters.yearFrom ||
    filters.yearTo ||
    filters.sort,
  )

  // El FilterBar se mantiene montado en los 4 estados (doc 06: es "sticky",
  // el usuario debe poder ajustar filtros incluso sin resultados o con error).
  const filterBar = (
    <FilterBar
      filters={filters}
      setFilters={setFilters}
      clearFilters={() => clearFilters()}
      hasActiveFilters={hasActiveFilters}
      genres={genres.data ?? []}
      platforms={platforms.data ?? []}
    />
  )

  if (franchises.isPending) {
    return (
      <PageWrapper className="space-y-6">
        {filterBar}
        <LoadingSkeleton variant="card-grid" count={12} />
      </PageWrapper>
    )
  }

  if (franchises.isError) {
    return (
      <PageWrapper className="space-y-6">
        {filterBar}
        <ErrorState onRetry={() => franchises.refetch()} />
      </PageWrapper>
    )
  }

  const { items, page, pageSize, total } = franchises.data

  // `?page=` fuera de rango (hallazgo #26). Ni el mock ni el backend clampean
  // `page`: los dos devuelven `items: []` con el `total` verdadero. Sin esta
  // rama se mostraba "The catalog is empty" —falso, el catálogo tiene cientos
  // de franquicias— y, como el `return` temprano ocurre antes de
  // `PaginationControls`, **no quedaba ningún control para volver**: la única
  // salida era la navegación global.
  const paginaFueraDeRango = items.length === 0 && page > 1 && total > 0

  if (paginaFueraDeRango) {
    return (
      <PageWrapper className="space-y-6">
        {filterBar}
        <EmptyState
          title={t.catalog.pageOutOfRangeTitle}
          description={t.catalog.pageOutOfRangeBody}
          action={
            <Button variant="outline" size="sm" onClick={() => setFilters({ page: 1 })}>
              {t.catalog.backToFirstPage}
            </Button>
          }
        />
      </PageWrapper>
    )
  }

  if (items.length === 0) {
    return (
      <PageWrapper className="space-y-6">
        {filterBar}
        <EmptyState
          title={
            hasActiveFilters
              ? t.states.noResultsTitle
              : t.states.emptyCatalogTitle
          }
          description={
            hasActiveFilters
              ? t.states.noResultsBody
              : t.states.emptyCatalogBody
          }
          action={
            hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={() => clearFilters()}>
                {t.common.clearFilters}
              </Button>
            )
          }
        />
      </PageWrapper>
    )
  }

  return (
    <PageWrapper className="space-y-6">
      {/* Encabezados `sr-only` (tarea 4.3): esta página no tenía NINGÚN
          heading, así que quien navega por encabezados no podía saber en qué
          página estaba, y las tarjetas (`h3`) quedaban colgando sin un `h1`/`h2`
          encima. Van invisibles porque el layout del doc 06 no lleva título
          visible acá y el arreglo de accesibilidad no debería cambiar el
          diseño. */}
      <h1 className="sr-only">{t.catalog.pageHeading}</h1>
      {filterBar}
      <section aria-labelledby="catalog-results">
        <h2 id="catalog-results" className="sr-only">
          {t.catalog.resultsHeading}
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {items.map((franchise) => (
            <FranchiseCard
              key={franchise.id}
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
    </PageWrapper>
  )
}
