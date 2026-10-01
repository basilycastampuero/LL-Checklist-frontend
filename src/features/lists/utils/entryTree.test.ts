import { describe, it, expect } from 'vitest'
import { patchEntryProgress, patchEntryFields } from '@/features/lists/utils/entryTree'
import type { ListEntry } from '@/features/lists/types'

function versionEntry(
  linkId: number,
  watched: number,
  abbreviation: string | null,
): ListEntry {
  return {
    linkId,
    kind: 'version',
    displayName: `Entry ${linkId}`,
    imageUrl: null,
    order: 0,
    contentType: 'V',
    franchiseId: 1,
    notes: null,
    version: {
      versionId: linkId * 10,
      contentId: 1,
      abbreviation,
      watchedEpisodes: watched,
      totalEpisodes: 25,
      isSynced: false,
    },
  }
}

function group(children: ListEntry[]): ListEntry {
  return {
    linkId: 900,
    kind: 'franchise',
    displayName: 'Spy x Family',
    imageUrl: null,
    order: 0,
    contentType: 'V',
    franchiseId: 1,
    notes: null,
    showProgress: true,
    childEntries: children,
    aggregatedProgress: {
      groups: children.map((child) => ({
        abbreviation: child.version?.abbreviation ?? child.displayName,
        watched: child.version?.watchedEpisodes ?? 0,
        total: child.version?.totalEpisodes ?? 0,
      })),
    },
  }
}

describe('patchEntryProgress', () => {
  it('escribe el progreso de un version-link suelto', () => {
    const entries = [versionEntry(1, 3, 'S1')]
    const result = patchEntryProgress(entries, 1, 7)
    expect(result[0]?.version?.watchedEpisodes).toBe(7)
  })

  it('mueve el grupo del padre por delta, no recalculando la agregación', () => {
    const entries = [
      group([versionEntry(1, 25, 'S1'), versionEntry(2, 3, 'S2')]),
    ]

    const result = patchEntryProgress(entries, 2, 5)

    const groups = result[0]?.aggregatedProgress?.groups
    expect(groups?.[1]).toEqual({ abbreviation: 'S2', watched: 5, total: 25 })
    // El otro grupo queda intacto: la mutación solo puede mover uno.
    expect(groups?.[0]).toEqual({ abbreviation: 'S1', watched: 25, total: 25 })
  })

  it('aplica el delta también cuando el progreso baja', () => {
    const entries = [group([versionEntry(1, 25, 'S1')])]
    const result = patchEntryProgress(entries, 1, 20)
    expect(result[0]?.aggregatedProgress?.groups[0]?.watched).toBe(20)
  })

  it('no toca el total del grupo: sale del catálogo, no del progreso', () => {
    const entries = [group([versionEntry(1, 0, 'S1')])]
    const result = patchEntryProgress(entries, 1, 12)
    expect(result[0]?.aggregatedProgress?.groups[0]?.total).toBe(25)
  })

  it('preserva la identidad de las ramas que no cambiaron (structural sharing)', () => {
    const untouched = versionEntry(1, 3, 'S1')
    const entries = [untouched, versionEntry(2, 4, 'S2')]

    const result = patchEntryProgress(entries, 2, 9)

    expect(result).not.toBe(entries)
    expect(result[0]).toBe(untouched)
  })

  it('con dos hijos de la misma abreviación mueve solo el que se tocó', () => {
    // La original y la doblada del mismo content comparten
    // `content_abbreviation`, así que el padre tiene dos grupos "S1". Antes se
    // matcheaba por etiqueta y el agregado se movía el doble.
    const entries = [
      group([versionEntry(1, 10, 'S1'), versionEntry(2, 4, 'S1')]),
    ]

    const result = patchEntryProgress(entries, 2, 6)

    const groups = result[0]?.aggregatedProgress?.groups
    expect(groups?.[0]?.watched).toBe(10)
    expect(groups?.[1]?.watched).toBe(6)
  })

  it('devuelve la misma referencia si el linkId no está en la lista', () => {
    const entries = [versionEntry(1, 3, 'S1')]
    expect(patchEntryProgress(entries, 999, 5)).toBe(entries)
  })

  it('usa el displayName como etiqueta cuando el hijo no tiene abreviación', () => {
    const entries = [group([versionEntry(1, 2, null)])]
    const result = patchEntryProgress(entries, 1, 6)
    expect(result[0]?.aggregatedProgress?.groups[0]).toEqual({
      abbreviation: 'Entry 1',
      watched: 6,
      total: 25,
    })
  })
})

describe('patchEntryFields', () => {
  it('actualiza notas, puntaje y fechas de un entry suelto sin tocar el progreso', () => {
    const entries = [versionEntry(1, 3, 'S1'), versionEntry(2, 5, 'S2')]
    const result = patchEntryFields(entries, 1, {
      notes: 'great',
      rating: 9,
      startedAt: '2025-01-01',
    })
    expect(result[0]).toMatchObject({
      notes: 'great',
      rating: 9,
      startedAt: '2025-01-01',
    })
    expect(result[0]?.version?.watchedEpisodes).toBe(3)
  })

  it('actualiza un hijo de grupo y deja intacto el agregado del padre', () => {
    const entries = [group([versionEntry(1, 3, 'S1'), versionEntry(2, 5, 'S2')])]
    const before = entries[0]?.aggregatedProgress
    const result = patchEntryFields(entries, 2, { notes: 'child note' })

    expect(result[0]?.childEntries?.[1]?.notes).toBe('child note')
    expect(result[0]?.childEntries?.[0]?.notes).toBeNull()
    expect(result[0]?.aggregatedProgress).toBe(before)
  })

  it('comparte estructura: solo cambia el padre y el hijo editados', () => {
    const other = versionEntry(7, 1, 'X')
    const entries = [other, group([versionEntry(1, 3, 'S1'), versionEntry(2, 5, 'S2')])]
    const result = patchEntryFields(entries, 1, { rating: 4 })

    expect(result[0]).toBe(other)
    expect(result[1]).not.toBe(entries[1])
    expect(result[1]?.childEntries?.[1]).toBe(entries[1]?.childEntries?.[1])
  })

  it('devuelve el mismo array si el linkId no existe', () => {
    const entries = [group([versionEntry(1, 3, 'S1')]), versionEntry(7, 1, 'X')]
    expect(patchEntryFields(entries, 999, { notes: 'x' })).toBe(entries)
  })

  it('no muta el array de entrada', () => {
    const entries = [versionEntry(1, 3, 'S1')]
    patchEntryFields(entries, 1, { notes: 'x' })
    expect(entries[0]?.notes).toBeNull()
  })
})
