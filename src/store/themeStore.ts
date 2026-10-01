import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemePreference = 'light' | 'dark' | 'system'

interface ThemeState {
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
  toggle: () => void
}

/**
 * Preferencia de tema persistida en localStorage (doc 06: default system).
 * La aplicación al <html> vive en el hook useApplyTheme para reaccionar también
 * a cambios del sistema cuando la preferencia es "system".
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      preference: 'system',
      setPreference: (preference) => set({ preference }),
      toggle: () => {
        const current = get().preference
        set({ preference: current === 'dark' ? 'light' : 'dark' })
      },
    }),
    // La clave de localStorage conserva el nombre viejo tras el renombre a
    // "LL Checklist" (ADR-023): cambiarla haría que cada visitante que ya
    // eligió un tema volviera a 'system' en su próxima visita, porque la
    // clave nueva estaría vacía. No vale perder esa preferencia por prolijidad.
    { name: 'anitrack-theme' },
  ),
)
