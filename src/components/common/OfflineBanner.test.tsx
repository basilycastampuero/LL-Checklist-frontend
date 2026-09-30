import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { OfflineBanner } from '@/components/common/OfflineBanner'
import { t } from '@/i18n/en'

/**
 * `navigator.onLine` es de solo lectura, así que se redefine la propiedad.
 * Se restaura en `afterEach` para no filtrar el estado a otros archivos.
 */
function setOnLine(value: boolean) {
  Object.defineProperty(navigator, 'onLine', {
    value,
    configurable: true,
    writable: true,
  })
}

afterEach(() => {
  setOnLine(true)
})

/** Dispara el evento del navegador dentro de `act`, como haría la red real. */
function fireConnectivity(type: 'online' | 'offline') {
  act(() => {
    window.dispatchEvent(new Event(type))
  })
}

describe('OfflineBanner (4.4)', () => {
  it('no se muestra mientras hay conexión', () => {
    setOnLine(true)
    render(<OfflineBanner />)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('aparece al perder la conexión y avisa que los cambios pueden no guardarse', () => {
    setOnLine(true)
    render(<OfflineBanner />)

    setOnLine(false)
    fireConnectivity('offline')

    const banner = screen.getByRole('status')
    expect(banner).toHaveTextContent(t.offline.title)
    // Lo que de verdad importa comunicar: leer sigue funcionando, escribir no.
    expect(banner).toHaveTextContent(t.offline.body)
  })

  it('desaparece al volver la conexión', () => {
    setOnLine(false)
    render(<OfflineBanner />)
    expect(screen.getByRole('status')).toBeInTheDocument()

    setOnLine(true)
    fireConnectivity('online')

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('ya montado offline, se muestra sin esperar ningún evento', () => {
    // Este es el caso que `useSyncExternalStore` cubre y que el par
    // `useState` + `useEffect` erraría en el primer render: el usuario abre la
    // app ya sin conexión, así que no hay ningún evento `offline` por llegar.
    setOnLine(false)
    render(<OfflineBanner />)

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('usa role="status" y no role="alert"', () => {
    setOnLine(false)
    render(<OfflineBanner />)

    // `alert` interrumpe al lector de pantalla cortando lo que esté leyendo;
    // un cambio de conectividad no lo justifica.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
