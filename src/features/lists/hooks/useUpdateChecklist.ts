import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { listsService } from '@/features/lists/services/lists.service'
import { listKeys } from '@/features/lists/hooks/queryKeys'
import { patchChecklistNode } from '@/features/lists/utils/checklistTree'
import { apiErrorMessage } from '@/features/lists/utils/apiErrorMessage'
import type {
  ChecklistNode,
  CosmeticChecklistPatch,
} from '@/features/lists/types'

interface UpdateChecklistContext {
  previousTree: ChecklistNode[] | undefined
}

/**
 * Renombrar/publicar una carpeta (doc 12 §5, 3.4). Optimistic porque es una
 * edición idempotente sobre un nodo que ya existe en cache (a diferencia de
 * crear/borrar): el usuario espera ver el cambio al instante en el árbol.
 *
 * `onMutate` cancela cualquier fetch de `tree()` en vuelo (si no, esa
 * respuesta podría llegar después del patch optimista y pisarlo con datos
 * viejos), guarda el árbol completo como snapshot y escribe el nodo
 * modificado recorriéndolo. `onError` restaura el snapshot ENTERO en vez de
 * revertir el nodo puntual: más simple y más seguro si, por ejemplo, la
 * mutación falla justo cuando otra ya había cambiado el árbol.
 *
 * El `id` llega como argumento del hook y no en las variables de la mutación
 * porque `scope` es una opción **estática** de `useMutation`: TanStack la lee
 * al crear el observer, antes de que exista variable alguna. Como
 * `ChecklistNodeMenu` se monta una vez por nodo, cada instancia queda con su
 * propio scope, que es exactamente el grano que hace falta.
 *
 * El patch solo admite campos cosméticos (deuda #6, doc 15 §4.1): mover o
 * reordenar una carpeta es estructural y no puede ir por el camino optimista,
 * porque `patchChecklistNode` no sabe hacerlo. Mover/reordenar es la tarea 4.10.
 */
interface UpdateChecklistOptions {
  /**
   * Mensaje de fallback para el toast de error. Se declara **por instancia del
   * hook** y no al llamar a `mutate` porque TanStack v5 gatea los callbacks
   * pasados por llamada con `hasListeners()` del observer: si el componente se
   * desmontó —colapsar la carpeta padre, o cambiar de bottom tab—, nunca
   * corren y el fallo queda **silencioso**. Los de las opciones del hook los
   * invoca la mutación misma. Mismo criterio que `useDeleteLink`, que ya lo
   * documenta para el toast de "deshacer" del wizard.
   *
   * Es opcional porque no todos los llamadores lo quieren: el renombre muestra
   * su error inline en el diálogo, así que un toast sería un aviso duplicado.
   */
  errorToast?: string
}

export function useUpdateChecklist(
  checklistId: number,
  options: UpdateChecklistOptions = {},
) {
  const queryClient = useQueryClient()
  const { errorToast } = options

  return useMutation<
    ChecklistNode,
    unknown,
    CosmeticChecklistPatch,
    UpdateChecklistContext
  >({
    /**
     * Serializa las mutaciones del MISMO nodo (hallazgo #20, tarea 4.12).
     *
     * Sin esto, dos ediciones del mismo nodo en vuelo se pisan: cada
     * `onMutate` guarda como snapshot el árbol que ve en ese momento, así que
     * el de la segunda ya incluye el patch optimista de la primera. Si la
     * primera falla, su `onError` restaura un árbol **anterior a las dos** y
     * borra de pantalla el cambio de la segunda, que puede haber salido bien.
     * El caso fácil de provocar es el toggle de publicar, que no abre diálogo:
     * dos clicks seguidos y ya hay dos `PATCH` en vuelo.
     *
     * Se auto-corregía en el `invalidateQueries` de `onSettled`, así que era
     * un parpadeo y no corrupción — por eso la severidad baja. Con el scope,
     * la segunda mutación no corre su `onMutate` hasta que la primera liquida,
     * y cada snapshot vuelve a corresponder al estado que realmente lo precede.
     *
     * Mismo patrón que `useUpdateEntryProgress` desde el Sprint 3b. Nodos
     * distintos siguen en paralelo: el scope los separa por id.
     */
    scope: { id: `checklist-${checklistId}` },

    mutationFn: (patch) => listsService.updateChecklist(checklistId, patch),

    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: listKeys.tree() })

      const previousTree = queryClient.getQueryData<ChecklistNode[]>(
        listKeys.tree(),
      )
      if (previousTree) {
        queryClient.setQueryData(
          listKeys.tree(),
          patchChecklistNode(previousTree, checklistId, patch),
        )
      }

      return { previousTree }
    },

    onError: (error, _variables, context) => {
      if (context?.previousTree) {
        queryClient.setQueryData(listKeys.tree(), context.previousTree)
      }
      if (errorToast) toast.error(apiErrorMessage(error, errorToast))
    },

    // Reconciliación obligatoria en AMBOS caminos: el patch optimista es una
    // suposición nuestra, no la verdad del servidor. Si el backend normaliza
    // el nombre (trim, colisión resuelta con sufijo) o toca campos derivados,
    // sin esto el árbol se queda con la suposición hasta el próximo refetch
    // (staleTime 60s, o nunca si la vista no se desmonta). En el camino de
    // error, además, el snapshot restaurado puede ser viejo de por sí.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listKeys.tree() })
    },
  })
}
