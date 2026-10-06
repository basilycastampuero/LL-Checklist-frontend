import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { t } from '@/i18n/en'

interface SelectableItem {
  id: number
  name: string
}

interface MultiSelectFilterProps {
  /** Nombre accesible del control y prefijo visible del trigger, ej. "Genres". */
  label: string
  /** Texto del trigger cuando no hay nada seleccionado, ej. "All genres". */
  allLabel: string
  items: SelectableItem[]
  selectedIds: number[] | undefined
  onChange: (ids: number[] | undefined) => void
}

/**
 * Select múltiple genérico (doc 06: géneros y plataformas). Se apoya en
 * DropdownMenuCheckboxItem en vez de un <Select multiple> nativo porque
 * Radix Select no soporta selección múltiple; evita traer una librería nueva.
 */
export function MultiSelectFilter({
  label,
  allLabel,
  items,
  selectedIds,
  onChange,
}: MultiSelectFilterProps) {
  const selected = selectedIds ?? []

  function toggle(id: number) {
    const next = selected.includes(id)
      ? selected.filter((selectedId) => selectedId !== id)
      : [...selected, id]
    onChange(next.length ? next : undefined)
  }

  const triggerText = selected.length ? t.catalog.itemsSelected(selected.length) : allLabel

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* SIN `aria-label`, y es deliberado. `aria-label` no complementa el
            texto visible: lo REEMPLAZA. Con `aria-label={label}` este botón
            mostraba "Genres: 2 selected" y su nombre accesible era solo
            "Genres", así que un lector de pantalla perdía justamente el estado
            del filtro, y quien navega por voz decía lo que veía y el comando no
            matcheaba. El texto propio del botón ya es un nombre accesible
            correcto y además informa la selección. Lo detectó Lighthouse en 4.5
            (`label-content-name-mismatch`); el barrido de 4.3 no lo vio porque
            verificaba que los controles TUVIERAN nombre accesible, no que
            COINCIDIERA con el texto visible. */}
        <Button variant="outline" size="sm">
          {label}: {triggerText}
          <ChevronDown className="size-3.5 opacity-50" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">
            {t.catalog.noOptions}
          </div>
        ) : (
          items.map((item) => (
            <DropdownMenuCheckboxItem
              key={item.id}
              checked={selected.includes(item.id)}
              onSelect={(event) => {
                // Sin esto, Radix cierra el menú en cada click: rompe la
                // selección múltiple (habría que reabrirlo por cada ítem).
                event.preventDefault()
                toggle(item.id)
              }}
            >
              {item.name}
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
