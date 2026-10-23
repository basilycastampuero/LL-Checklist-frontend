import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { listsService } from '@/features/lists/services/lists.service'
import { listKeys } from '@/features/lists/hooks/queryKeys'
import { identityOf, isSameSessionOwner, useSessionStore } from '@/store/sessionStore'
import {
  findEntry,
  patchEntryFields,
  pickPatchedFields,
} from '@/features/lists/utils/entryTree'
import { isFeatureEnabled } from '@/lib/features'
import { t } from '@/i18n/en'
import type { EntryMetaPatch } from '@/features/lists/utils/entryTree'
import type { ListEntry, UpdateLinkRequest } from '@/features/lists/types'

interface MutationContext {
  /** Valores previos de SOLO los campos que este patch escribe (tarea 4.17). */
  previousFields: Partial<EntryMetaPatch> | undefined
  /** Dueño del snapshot; ver `isSameSessionOwner`. */
  ownerId: number | null
}

/**
 * Editar notas, puntaje y fechas de un entry (tarea 3.11).
 *
 * Reusa el **patrón** de `useUpdateEntryProgress` —snapshot, rollback, toast,
 * `onSettled`— pero no su helper: `patchEntryFields` no aplica ningún delta
 * porque estos campos no mueven el agregado del padre.
 *
 * **Qué invalida** (§3.2): solo `entries(checklistId)`. No `tree()` ni
 * `libraryIndex()`, porque nada estructural cambió; y tampoco el prefijo
 * entero aunque el link sea sincronizado: lo que Odoo propaga entre copias es
 * `lv_episodes`, no la descripción ni los `[EXT]`.
 *
 * Los campos detrás de flag se filtran **acá**, no en el componente: que el
 * control no se renderice no alcanzaría si el body igual los mandara. Contra
 * el backend real —donde `rating` y las fechas no existen— el `PATCH` sale sin
 * ellos (ADR-004).
 */
export function useUpdateEntryMeta(checklistId: number, linkId: number) {
  const queryClient = useQueryClient()
  const queryKey = useMemo(() => listKeys.entries(checklistId), [checklistId])

  return useMutation<
    ListEntry,
    unknown,
    Partial<EntryMetaPatch>,
    MutationContext
  >({
    /**
     * El **mismo** id que `useUpdateEntryProgress` (hallazgos F3 y F4 de la
     * auditoría del 2026-10-01). Dos cosas distintas se arreglan acá:
     *
     * F3: sin `scope`, dos ediciones del mismo entry en vuelo se pisaban — el
     * `onMutate` de la segunda tomaba como snapshot un array que ya incluía el
     * patch optimista de la primera, así que el `onError` de la primera
     * borraba de pantalla el resultado de la segunda. Es la misma forma del
     * hallazgo #20, en el único hook optimista que la tarea 4.12 no tocó.
     *
     * F4, y es la razón de compartir el id en vez de usar uno propio: este
     * hook y `useUpdateEntryProgress` escriben la **misma** `queryKey` y los
     * dos restauran el **array entero** en su rollback. Con ids distintos
     * nunca se serializarían entre sí, y entonces el rollback de uno borra el
     * resultado exitoso del otro: subir un episodio y, dentro de los 400 ms
     * del debounce, guardar una nota; si después falla el PATCH de progreso,
     * su rollback se lleva también la nota que el servidor ya había guardado.
     * Un scope por **link** y no por hook es lo que lo evita.
     *
     * Desde la tarea 4.17 el rollback ya no restaura el array entero sino solo
     * los campos de este link, así que el scope compartido sirve para ORDENAR
     * las escrituras del mismo link, no para proteger a otros links.
     */
    scope: { id: `entry-${linkId}` },

    mutationFn: (patch) => {
      const body: UpdateLinkRequest = {}
      if ('notes' in patch) body.notes = patch.notes ?? null
      if (isFeatureEnabled('ratings') && 'rating' in patch) {
        body.rating = patch.rating ?? null
      }
      if (isFeatureEnabled('watchDates')) {
        if ('startedAt' in patch) body.startedAt = patch.startedAt ?? null
        if ('finishedAt' in patch) body.finishedAt = patch.finishedAt ?? null
      }
      return listsService.updateLink(linkId, body)
    },

    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey })
      const current = queryClient.getQueryData<ListEntry[]>(queryKey)
      const target = current && findEntry(current, linkId)
      if (current) {
        queryClient.setQueryData(
          queryKey,
          patchEntryFields(current, linkId, patch),
        )
      }
      return {
        previousFields: target ? pickPatchedFields(target, patch) : undefined,
        ownerId: identityOf(useSessionStore.getState()),
      }
    },

    onError: (_error, _patch, context) => {
      // Rollback QUIRÚRGICO (tarea 4.17): se deshacen solo los campos de este
      // link, aplicados sobre el cache ACTUAL. Restaurar el array entero
      // llevaba por delante el cambio ya aceptado de otro link que corría en
      // paralelo (su scope es distinto). Además, tras un 401 el cache privado
      // se vació: `getQueryData` da `undefined` y no se resucita nada, y el
      // guard de dueño cubre el caso de que ya haya otro usuario cargado.
      if (context?.previousFields && isSameSessionOwner(context.ownerId)) {
        const current = queryClient.getQueryData<ListEntry[]>(queryKey)
        if (current) {
          queryClient.setQueryData(
            queryKey,
            patchEntryFields(current, linkId, context.previousFields),
          )
        }
      }
      toast.error(t.lists.entry.metaError)
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey })
    },
  })
}
