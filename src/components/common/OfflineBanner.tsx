import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { t } from '@/i18n/en'

/**
 * Aviso de que el navegador está sin conexión (tarea 4.4).
 *
 * Es un **banner y no una página**: quedarse sin red no invalida lo que ya está
 * en pantalla. El cache de TanStack Query sigue sirviendo el catálogo y las
 * listas que ya se cargaron, así que reemplazar todo por una pantalla de
 * "estás offline" le quitaría al usuario contenido que sí puede seguir leyendo.
 * Lo que sí hace falta advertir es lo que deja de funcionar: escribir.
 *
 * `role="status"` y no `role="alert"`: un cambio de conectividad es información
 * de estado, y `alert` interrumpe al lector de pantalla cortando lo que esté
 * leyendo. Con `status` el aviso se anuncia cuando termina la frase en curso,
 * que es el comportamiento correcto para algo que el usuario no tiene que
 * atender de inmediato.
 *
 * No hay confirmación de "volviste a estar online" a propósito: el banner
 * desaparece solo, y eso ya comunica lo mismo sin sumar un temporizador y un
 * estado más.
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  // El contenedor con `role="status"` se renderiza SIEMPRE y solo alterna su
  // contenido (hallazgo #33). Antes el `return null` montaba la región viva
  // junto con su texto, y una región que se **inserta** al mismo tiempo que su
  // contenido es de anuncio poco confiable: la tecnología asistiva necesita
  // observar mutaciones de una región que ya existía. Con `role="alert"` la
  // inserción sí se anuncia, pero interrumpir al lector por un cambio de
  // conectividad no se justifica — el razonamiento del componente era correcto
  // y la implementación lo contradecía sin querer.
  return (
    <div role="status" aria-live="polite">
      {!isOnline && (
        <div className="flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-900 dark:text-amber-200">
          <WifiOff className="size-4 shrink-0" aria-hidden />
          <p>
            <span className="font-medium">{t.offline.title}</span>{' '}
            <span className="text-amber-900/80 dark:text-amber-200/80">
              {t.offline.body}
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
