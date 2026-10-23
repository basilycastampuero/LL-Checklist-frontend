import { t } from '@/i18n/en'

/**
 * Nombre visible de una franquicia o un content del catálogo (tarea 4.22).
 *
 * El backend emite `""` cuando la franquicia o el content no tiene NINGÚN
 * nombre en Odoo (`_display_name` de `api_common.py`, tarea 4.16): principal →
 * alternativo de menor id → `""`. Mostrarlo tal cual deja una card sin título
 * y, peor, un `<Link>` sin nombre accesible: el lector de pantalla anuncia
 * solo "enlace". Por eso el reemplazo vive acá y no en el schema Zod, que valida
 * la forma y no la presentación (ADR-025).
 */
export function displayName(name: string): string {
  return name.trim() === '' ? t.catalog.untitled : name
}
