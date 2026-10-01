import { describe, it, expect, vi } from 'vitest'
import { createQueryClient } from '@/lib/queryClient'
import { ApiError } from '@/types/api.types'

/** Corre un fetch que siempre falla y devuelve cuántas veces se ejecutó el queryFn. */
async function attemptsUntilGiveUp(error: unknown): Promise<number> {
  const client = createQueryClient()
  const queryFn = vi.fn().mockRejectedValue(error)
  await client
    .fetchQuery({ queryKey: ['policy'], queryFn, retryDelay: 0 })
    .catch(() => undefined)
  return queryFn.mock.calls.length
}

describe('createQueryClient — política global', () => {
  it('should keep data fresh for 60 seconds', () => {
    const opts = createQueryClient().getDefaultOptions()
    expect(opts.queries?.staleTime).toBe(60_000)
  })

  it('should not refetch on window focus and never retry mutations', () => {
    const opts = createQueryClient().getDefaultOptions()
    expect(opts.queries?.refetchOnWindowFocus).toBe(false)
    expect(opts.mutations?.retry).toBe(false)
  })

  it('should NOT retry a 4xx: repeating a 403 does not fix it', async () => {
    expect(
      await attemptsUntilGiveUp(new ApiError('FORBIDDEN', 'nope', 403)),
    ).toBe(1)
    expect(
      await attemptsUntilGiveUp(new ApiError('NOT_FOUND', 'nope', 404)),
    ).toBe(1)
  })

  it('should retry a 5xx exactly once (2 attempts total)', async () => {
    expect(
      await attemptsUntilGiveUp(new ApiError('INTERNAL', 'boom', 500)),
    ).toBe(2)
  })

  it('should retry once on a network failure with no status', async () => {
    expect(
      await attemptsUntilGiveUp(new ApiError('INTERNAL', 'Network error', null)),
    ).toBe(2)
  })

  it('should retry once on a non-ApiError failure', async () => {
    expect(await attemptsUntilGiveUp(new Error('weird'))).toBe(2)
  })

  it('should return a fresh client per call (no shared cache between tests)', () => {
    expect(createQueryClient()).not.toBe(createQueryClient())
  })
})
