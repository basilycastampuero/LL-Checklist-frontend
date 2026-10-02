import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { EpisodeStepper } from '@/components/ui/EpisodeStepper'

afterEach(() => {
  vi.useRealTimers()
})

function renderStepper(props: Partial<React.ComponentProps<typeof EpisodeStepper>> = {}) {
  const onChange = vi.fn()
  render(
    <EpisodeStepper value={3} max={12} name="Demon Slayer" onChange={onChange} {...props} />,
  )
  return {
    onChange,
    minus: screen.getByRole('button', { name: 'One episode less of Demon Slayer' }),
    plus: screen.getByRole('button', { name: 'One episode more of Demon Slayer' }),
  }
}

describe('EpisodeStepper', () => {
  it('suma y resta de a uno', () => {
    const { onChange, plus } = renderStepper()
    fireEvent.click(plus)
    expect(onChange).toHaveBeenCalledWith(4)
  })

  // Los dos afirmaban `toBeDisabled()`. Cambió por el hallazgo #24: el
  // navegador devuelve el foco al `<body>` cuando el elemento enfocado pasa a
  // `disabled`, así que quien navega por teclado perdía su lugar justo al
  // llegar al piso o al tope. Ahora el control sigue enfocable, lo comunica
  // con `aria-disabled`, y lo que importa —que el click no haga nada— se
  // afirma directamente.
  it('no baja de cero: avisa por aria-disabled y el click es un no-op', () => {
    const { onChange, minus } = renderStepper({ value: 0 })
    expect(minus).toHaveAttribute('aria-disabled', 'true')
    expect(minus).not.toBeDisabled()
    fireEvent.click(minus)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('no pasa del total: avisa por aria-disabled y el click es un no-op', () => {
    const { onChange, plus } = renderStepper({ value: 12, max: 12 })
    expect(plus).toHaveAttribute('aria-disabled', 'true')
    expect(plus).not.toBeDisabled()
    fireEvent.click(plus)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('con total desconocido (max 0, en emisión) no hay tope', () => {
    const { onChange, plus } = renderStepper({ value: 40, max: 0 })
    expect(plus).not.toBeDisabled()
    fireEvent.click(plus)
    expect(onChange).toHaveBeenCalledWith(41)
  })

  it('mantener apretado repite, y soltar no suma uno de más', () => {
    vi.useFakeTimers()
    const { onChange, plus } = renderStepper({ value: 0, max: 0 })

    fireEvent.pointerDown(plus)
    act(() => {
      vi.advanceTimersByTime(400 + 120 * 3) // arranque + tres repeticiones
    })
    fireEvent.pointerUp(plus)
    fireEvent.click(plus) // el click que el navegador dispara al soltar

    expect(onChange).toHaveBeenCalledTimes(3)
    expect(onChange).toHaveBeenLastCalledWith(3)
  })

  it('soltar detiene la repetición', () => {
    vi.useFakeTimers()
    const { onChange, plus } = renderStepper({ value: 0, max: 0 })

    fireEvent.pointerDown(plus)
    act(() => vi.advanceTimersByTime(400 + 120))
    fireEvent.pointerUp(plus)
    act(() => vi.advanceTimersByTime(120 * 5))

    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('disabled apaga los dos botones', () => {
    const { minus, plus } = renderStepper({ disabled: true })
    expect(minus).toBeDisabled()
    expect(plus).toBeDisabled()
  })
})
