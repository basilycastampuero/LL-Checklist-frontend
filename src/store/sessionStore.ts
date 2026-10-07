import { create } from 'zustand'
import type { UserSession } from '@/features/auth/types'

/**
 * `unauthenticated` y `unresolved` son distintos a propósito (tarea 4.4):
 * el primero significa "el servidor dijo que no hay sesión" (401), el segundo
 * "no se pudo averiguar" (500, red caída, timeout). Tratarlos igual hacía que
 * un error del servidor expulsara al login a alguien con una cookie
 * perfectamente válida, y volver a loguearse no arregla un 500.
 */
type SessionStatus = 'idle' | 'authenticated' | 'unauthenticated' | 'unresolved'

interface SessionState {
  user: UserSession | null
  status: SessionStatus
  setUser: (user: UserSession) => void
  clearSession: () => void
  /** La sesión no se pudo resolver por un fallo que NO es un 401. */
  setUnresolved: () => void
}

/**
 * Sesión del usuario en memoria (ADR-005: la cookie HttpOnly es la verdad;
 * el store solo cachea el perfil resuelto por GET /auth/me). El interceptor 401
 * llama clearSession() para reflejar el cierre de sesión en la UI.
 */
export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  status: 'idle',
  setUser: (user) => set({ user, status: 'authenticated' }),
  clearSession: () => set({ user: null, status: 'unauthenticated' }),
  // No toca `user`: si ya había uno resuelto, un refetch fallido no es razón
  // para olvidarlo. Solo se llama cuando no hay ninguno (ver `useMe`).
  setUnresolved: () => set({ status: 'unresolved' }),
}))

/**
 * Identidad del dueño de los datos privados del cache: el id del usuario si hay
 * sesión autenticada, `null` en cualquier otro estado. Es la vara con la que se
 * decide si lo que hay en TanStack Query "sigue siendo de quien mira".
 */
export function identityOf(
  s: Pick<SessionState, 'status' | 'user'>,
): number | null {
  return s.status === 'authenticated' ? (s.user?.id ?? null) : null
}

/**
 * ¿La sesión actual sigue siendo la de `ownerId`? Los rollbacks optimistas lo
 * consultan antes de restaurar un snapshot: si la identidad cambió mientras la
 * mutación volaba (típico: el 401 que expulsó al usuario), restaurar volvería a
 * crear en el cache datos del dueño anterior.
 */
export function isSameSessionOwner(ownerId: number | null): boolean {
  return identityOf(useSessionStore.getState()) === ownerId
}
