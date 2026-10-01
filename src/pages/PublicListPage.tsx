import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { FranchiseEntryGroup } from '@/features/lists/components/FranchiseEntryGroup'
import { ListEntryRow } from '@/features/lists/components/ListEntryRow'
import { isVersionEntry } from '@/features/lists/types'
import { useProfile } from '@/features/profile/hooks/useProfile'
import { usePublicEntries } from '@/features/profile/hooks/usePublicEntries'
import { parseIdParam, profilePath } from '@/utils/slug'
import { t } from '@/i18n/en'
import { ApiError } from '@/types/api.types'
import type { ChecklistNode } from '@/features/lists/types'

function findPublished(
  nodes: ChecklistNode[],
  id: number,
): ChecklistNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const found = findPublished(node.children, id)
    if (found) return found
  }
  return null
}

/**
 * Vista de solo lectura de una lista publicada (doc 06, tarea 3.10).
 *
 * Reusa `ListEntryRow` y `FranchiseEntryGroup` **tal cual**, sin pasarles
 * `checklistId`: sin él no renderizan el stepper. Es exactamente para lo que
 * quedaron separados de la mutación en 3.6 — acá el visitante no puede
 * escribir, y por contrato tampoco existe el endpoint para hacerlo.
 */
export default function PublicListPage() {
  const { userId: userIdParam, checklistId: checklistIdParam } = useParams()
  const userId = parseIdParam(userIdParam)
  const checklistId = parseIdParam(checklistIdParam)
  const profile = useProfile(userId)
  const entries = usePublicEntries(userId, checklistId)

  // Guarda de id nulo (hallazgo #29): sin ella, una URL mal formada como
  // `/profile/abc/list/12` dejaba la query en `enabled: false`, que en TanStack
  // v5 es `status: 'pending'` para siempre — y la página mostraba el skeleton
  // **eterno**, que es peor que un error porque no se distingue de una app
  // colgada. Las otras tres páginas de detalle ya la tenían.
  if (userId == null || checklistId == null) {
    return (
      <PageWrapper>
        <EmptyState
          title={t.profile.listUnavailableTitle}
          description={t.profile.listUnavailableBody}
        />
      </PageWrapper>
    )
  }

  if (entries.isPending || profile.isPending) {
    return (
      <PageWrapper className="space-y-4">
        <LoadingSkeleton variant="list-rows" count={5} />
      </PageWrapper>
    )
  }

  // Solo un `NOT_FOUND` significa "privada o inexistente" (hallazgo #23).
  // Antes **cualquier** error caía acá, así que un 500 o un corte de red le
  // afirmaban al visitante algo falso sobre el estado de la lista —y encima
  // sin retry, porque un `EmptyState` no lo ofrece—. Es la misma conflación
  // que la tarea 4.4 arregló para `/auth/me`: este era el hermano que quedó
  // vivo. El patrón correcto ya estaba en `ProfilePage`.
  //
  // Para el 404 el mensaje ambiguo es deliberado: una lista privada y una
  // inexistente dan el MISMO `404` (doc 04 §5.4), y distinguirlas confirmaría
  // que el id existe.
  const esNotFound =
    entries.error instanceof ApiError && entries.error.code === 'NOT_FOUND'

  if (entries.isError && esNotFound) {
    return (
      <PageWrapper>
        <EmptyState
          title={t.profile.listUnavailableTitle}
          description={t.profile.listUnavailableBody}
        />
      </PageWrapper>
    )
  }

  if (entries.isError) {
    return (
      <PageWrapper>
        <ErrorState onRetry={() => void entries.refetch()} />
      </PageWrapper>
    )
  }

  const owner = profile.data
  const checklist =
    owner && checklistId != null
      ? findPublished(owner.publishedChecklists, checklistId)
      : null

  return (
    <PageWrapper className="space-y-4">
      {owner && (
        <Link
          to={profilePath(owner.id)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t.profile.backToProfile(owner.name)}
        </Link>
      )}
      <h1 className="text-2xl font-semibold text-foreground">
        {checklist?.name ?? t.profile.publishedLists}
      </h1>

      {entries.data.length === 0 ? (
        <EmptyState
          title={t.profile.listEmptyTitle}
          description={t.profile.listEmptyBody}
        />
      ) : (
        <ul className="space-y-2">
          {entries.data.map((entry) => (
            <li key={entry.linkId}>
              {isVersionEntry(entry) ? (
                <ListEntryRow entry={entry} />
              ) : (
                <FranchiseEntryGroup entry={entry} />
              )}
            </li>
          ))}
        </ul>
      )}
    </PageWrapper>
  )
}
