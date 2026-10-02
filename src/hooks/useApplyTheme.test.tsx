import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useApplyTheme } from '@/hooks/useApplyTheme'
import { useThemeStore } from '@/store/themeStore'

type Listener = () => void

/** matchMedia controlable: permite variar `matches` y disparar `change`. */
function stubSystemTheme(initialDark: boolean) {
  const listeners = new Set<Listener>()
  const media = {
    matches: initialDark,
    addEventListener: vi.fn((_: string, l: Listener) => listeners.add(l)),
    removeEventListener: vi.fn((_: string, l: Listener) => listeners.delete(l)),
  }
  vi.stubGlobal('matchMedia', () => media)
  // El hook lee `window.matchMedia`; stubGlobal en jsdom cubre `window`.
  return {
    media,
    listeners,
    setDark(value: boolean) {
      media.matches = value
      listeners.forEach((l) => l())
    },
  }
}

const isDark = () => document.documentElement.classList.contains('dark')

beforeEach(() => {
  document.documentElement.classList.remove('dark')
  useThemeStore.setState({ preference: 'system' })
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.documentElement.classList.remove('dark')
})

describe('useApplyTheme', () => {
  it('should add the dark class when the preference is dark', () => {
    stubSystemTheme(false)
    useThemeStore.setState({ preference: 'dark' })
    renderHook(() => useApplyTheme())
    expect(isDark()).toBe(true)
  })

  it('should remove the dark class when the preference is light, even if the system is dark', () => {
    stubSystemTheme(true)
    document.documentElement.classList.add('dark')
    useThemeStore.setState({ preference: 'light' })
    renderHook(() => useApplyTheme())
    expect(isDark()).toBe(false)
  })

  it('should follow the system when the preference is system', () => {
    stubSystemTheme(true)
    renderHook(() => useApplyTheme())
    expect(isDark()).toBe(true)
  })

  it('should react to system changes while the preference is system', () => {
    const sys = stubSystemTheme(false)
    renderHook(() => useApplyTheme())
    expect(isDark()).toBe(false)

    act(() => sys.setDark(true))
    expect(isDark()).toBe(true)
    act(() => sys.setDark(false))
    expect(isDark()).toBe(false)
  })

  it('should ignore system changes once the preference is explicit', () => {
    const sys = stubSystemTheme(false)
    useThemeStore.setState({ preference: 'light' })
    renderHook(() => useApplyTheme())

    expect(sys.media.addEventListener).not.toHaveBeenCalled()
    act(() => sys.setDark(true))
    expect(isDark()).toBe(false)
  })

  it('should re-apply when the store preference changes and unsubscribe from the old listener', () => {
    const sys = stubSystemTheme(false)
    renderHook(() => useApplyTheme())
    expect(sys.listeners.size).toBe(1)

    act(() => useThemeStore.getState().setPreference('dark'))
    expect(isDark()).toBe(true)
    expect(sys.media.removeEventListener).toHaveBeenCalledTimes(1)
    expect(sys.listeners.size).toBe(0)
  })

  it('should unsubscribe from the system listener on unmount', () => {
    const sys = stubSystemTheme(false)
    const { unmount } = renderHook(() => useApplyTheme())
    unmount()
    expect(sys.listeners.size).toBe(0)
  })
})
