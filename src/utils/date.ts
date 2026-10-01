/**
 * Formatea una fecha `date` del contrato (doc 04, p. ej. "2022-11-18"). Se fija
 * `timeZone: 'UTC'` porque `new Date('2022-11-18')` parsea como medianoche UTC:
 * sin fijarlo, formatear en una zona horaria con offset negativo (ej. América)
 * corre la fecha un día hacia atrás.
 */
export function formatReleaseDate(iso: string | null): string {
  // `null` es posible desde el backend real (hallazgo #30): se muestra un
  // guion en vez de romper el formateo o imprimir "Invalid Date".
  if (iso == null) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}
