import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { t } from '@/i18n/en'

interface YearRangeInputProps {
  yearFrom: number | undefined
  yearTo: number | undefined
  onChange: (patch: { yearFrom?: number; yearTo?: number }) => void
}

function parseYear(raw: string): number | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const n = Number(trimmed)
  return Number.isInteger(n) && n > 0 ? n : undefined
}

/**
 * Rango de años con dos inputs numéricos (doc 06 sugiere slider, pero no hay
 * librería de sliders en el proyecto y no vale la pena traer una para esto).
 * Estado local + commit en blur/Enter: evita reescribir la URL en cada
 * tecla mientras el usuario todavía está escribiendo el año.
 */
export function YearRangeInput({ yearFrom, yearTo, onChange }: YearRangeInputProps) {
  const [from, setFrom] = useState(yearFrom?.toString() ?? '')
  const [to, setTo] = useState(yearTo?.toString() ?? '')

  // Sincroniza el input si el filtro cambia desde afuera (ej. clearFilters).
  useEffect(() => setFrom(yearFrom?.toString() ?? ''), [yearFrom])
  useEffect(() => setTo(yearTo?.toString() ?? ''), [yearTo])

  /**
   * Commit que **normaliza el input a lo que de verdad se aplicó** (hallazgo
   * #35). Antes, escribir `19.5` y salir del campo borraba el filtro pero
   * dejaba "19.5" en pantalla: como el valor nuevo y el viejo eran los dos
   * `undefined`, el efecto de sincronización de arriba no se disparaba, y la
   * pantalla afirmaba un filtro que no estaba aplicado.
   */
  function commitFrom() {
    const parsed = parseYear(from)
    setFrom(parsed?.toString() ?? '')
    onChange({ yearFrom: parsed })
  }

  function commitTo() {
    const parsed = parseYear(to)
    setTo(parsed?.toString() ?? '')
    onChange({ yearTo: parsed })
  }

  // Rango al revés (From 2020 / To 2010): el backend devuelve vacío y el
  // usuario ve "No results" sin pista de la causa. Se avisa en vez de
  // corregirlo solo, para no cambiarle el filtro por debajo.
  const rangoInvertido =
    yearFrom != null && yearTo != null && yearFrom > yearTo

  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        inputMode="numeric"
        placeholder={t.catalog.yearFrom}
        aria-label={t.catalog.yearFrom}
        value={from}
        onChange={(e) => setFrom(e.target.value)}
        onBlur={() => commitFrom()}
        onKeyDown={(e) => e.key === 'Enter' && commitFrom()}
        className="w-24"
      />
      <span className="text-sm text-muted-foreground" aria-hidden>
        –
      </span>
      <Input
        type="number"
        inputMode="numeric"
        placeholder={t.catalog.yearTo}
        aria-label={t.catalog.yearTo}
        value={to}
        onChange={(e) => setTo(e.target.value)}
        onBlur={() => commitTo()}
        onKeyDown={(e) => e.key === 'Enter' && commitTo()}
        className="w-24"
      />
      {rangoInvertido && (
        <span role="alert" className="text-xs text-destructive">
          {t.catalog.yearRangeInverted}
        </span>
      )}
    </div>
  )
}
