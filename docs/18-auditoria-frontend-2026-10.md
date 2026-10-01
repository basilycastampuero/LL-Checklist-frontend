# 18 — Auditoría del frontend (2026-10-01)

> Registro de una auditoría del frontend de LL Checklist pedida por el dueño
> del proyecto. Rama `sprint4/errores-y-barrido-a11y`, fecha 2026-10-01.
>
> **Para qué sirve este documento.** (1) Decidir qué se arregla primero.
> (2) Que ningún hallazgo se pierda. El segundo objetivo es el crítico: los
> hallazgos #9 a #14 se anotaron sin archivo, sin línea y sin escenario y se
> cerraron como irreconstruibles (ver
> [13-sprint3a-avance.md](./13-sprint3a-avance.md)). Por eso **cada hallazgo
> conserva archivo:línea, escenario reproducible y severidad**, aunque el
> documento quede largo. No resumir esas tres cosas.
>
> **Estado de los hallazgos: 26 cerrados, 0 abiertos (2026-10-01).** F1 y F2
> se cerraron primero; los otros 24 (#21 a #36 y F3 a F10) se cerraron en la
> segunda tanda del mismo día. Cada ficha **conserva intacto** su escenario,
> su archivo:línea y su falso verde —son el registro de por qué el hallazgo
> existía— y termina con un bloque **Cierre** que dice qué se cambió. Los
> números de línea de las fichas son **los de antes del arreglo**. Ningún
> hallazgo fue tarea numerada del plan
> ([07-plan-de-trabajo.md](./07-plan-de-trabajo.md)): vinieron de la
> auditoría. Los cierres **no se verificaron en el navegador ni contra el
> Odoo real**; ver la sección 9.

## 1. Alcance y método

- **Pedido:** bugs, seguridad, problemas de interfaz, desbordamientos, códigos
  de error y código muerto, en el frontend de los últimos sprints (del 3a en
  adelante) más una pasada general. **El backend (`ll-odoo`) quedó fuera de
  alcance.**
- **Alcance medido:** 13.744 líneas de producción y 6.844 de tests; 102
  archivos de producción tocados desde el commit `aa6158f` (arranque del
  Sprint 3a).
- **Tres fuentes:**
  1. **Revisión general** (hallazgos **#21 a #36**). Los #1 a #20 ya estaban
     usados en los docs 13 y 16.
  2. **Auditoría de antipatrones recurrentes** (hallazgos **F1 a F10**):
     buscó reincidencias de patrones que el proyecto ya pagó más de una vez.
     Ninguno de los diez es de los #9 a #20 ya cerrados.
  3. **Barrido mecánico** (código muerto, open redirect, XSS, tipos).
- **Total: 26 hallazgos** (16 + 10). **Cerrados: 26. Abiertos: 0.** (F1 y
  F2 el 2026-10-01 en una primera tanda; los otros 24 el mismo día en la
  segunda.)

### Marcas de verificación

Cada hallazgo declara con qué se sostiene. Se respetan tal cual las marcas
con que llegaron:

- **[verificado]**: confirmado por lectura del código.
- **[verificado contra el serializer]**: además contrastado con el serializer
  real de `ll-odoo` (solo lectura, sin modificarlo).
- **[verificado por el dueño del proyecto]**: el dueño releyó el código.
- **[sospecha]**: la causa en el código está verificada, el comportamiento
  en el navegador o con lector de pantalla **no se reprodujo**.

### Lo que la auditoría NO cubrió

- **El backend quedó fuera.** Consecuencia concreta: el invariante real de
  `isSynced` en Odoo (F5) no se verificó contra la fuente; para F5 se usó el
  invariante que el propio mock declara.
- **Nada se reprodujo en el navegador.** F1 en particular **no es observable
  contra MSW**: se verifica contra el Odoo local o inyectando `delay(700)`.
  #28 y #33 tienen su experimento escrito y no se corrió.
- **Ninguna de las dos auditorías corrió la suite.** No tocaron código; el
  estado verde (335 tests, `typecheck`/`lint` limpios) viene de la
  verificación previa del dueño del proyecto, no de esta auditoría.
- **No se auditó qué tests faltan para cada hallazgo**, salvo notar que los
  caminos de #21, #22, #26 y #30 **no pueden tener test hoy** porque el mock
  nunca produce esos datos ni esas respuestas. Eso es un hallazgo sobre el
  mock, no sobre los tests.
- **Un primer intento de la revisión general murió por límite de uso** y se
  relanzó con alcance recortado. Lo recortado fue lo ya cubierto, no zonas
  sin mirar.

## 2. Veredicto y orden sugerido

Revisión general: 16 hallazgos, 1 High, 7 Medium, 8 Low, **ninguno
crítico**. Riesgo general **bajo-moderado**, concentrado en un solo lugar
conceptual: **el borde con el Odoo real**. Los dos más caros (#21 y #22) son
del mismo tipo: el frontend asume datos y respuestas de error más prolijos de
los que el backend puede emitir, y MSW no lo delata porque el seed y los
handlers solo producen el camino válido.

Recomendación de la auditoría: **#21 antes de cualquier despliegue contra el
backend real**, con #22 y #23 en el mismo lote. **Los tres están cerrados**
(2026-10-01), sin haberse probado contra el Odoo real.

Antipatrones: F1 era el único hallazgo de toda la auditoría que podía dejar el
servidor con un valor distinto del que el usuario vio, sin auto-corrección.
**Cerrado el 2026-10-01** junto con F2; ver sus fichas.

### Tabla resumen

| # | Sev. | Título | Ubicación principal | Marca | Estado |
|---|---|---|---|---|---|
| #21 | High | Género sin color tira abajo 4 páginas | `catalog/services/schemas.ts:15` | verificado (dueño) | Cerrado 2026-10-01 |
| #22 | Medium | Texto técnico de axios en la UI | `lib/http.ts:44,46` | verificado (dueño) | Cerrado 2026-10-01 |
| #23 | Medium | `PublicListPage` dice "privada" ante cualquier error | `pages/PublicListPage.tsx:53-62` | verificado | Cerrado 2026-10-01 |
| #24 | Medium | Stepper mudo para lector de pantalla; foco se pierde | `ui/EpisodeStepper.tsx:119-128` | verificado | Cerrado 2026-10-01 |
| #25 | Medium | "Add" del wizard sin efecto si no hay nombres | `WizardTargetStep.tsx:93-126` | verificado | Cerrado 2026-10-01 |
| #26 | Medium | `?page=` fuera de rango: callejón sin salida | `pages/CatalogPage.tsx:24-93` | verificado | Cerrado 2026-10-01 |
| #27 | Medium | "Clear filters" borra el término buscado | `pages/SearchPage.tsx:49,87` | verificado | Cerrado 2026-10-01 |
| #28 | Medium | Menú por nodo no descubrible en touch | `ChecklistNodeActions.tsx:24` | sospecha | Cerrado 2026-10-01 |
| #29 | Low | `PublicListPage` sin guarda de id nulo | `pages/PublicListPage.tsx:37-48` | verificado | Cerrado 2026-10-01 |
| #30 | Low | `releaseDate` no admite `null` | `catalog/services/schemas.ts:54` | verificado (serializer) | Cerrado 2026-10-01 |
| #31 | Low | `aria-valuenow` mayor que `aria-valuemax` | `ui/ProgressBar.tsx:30-32` | verificado | Cerrado 2026-10-01 |
| #32 | Low | `aria-label="Pagination"` hardcodeado | `PaginationControls.tsx:27` | verificado | Cerrado 2026-10-01 |
| #33 | Low | Banner offline monta su propio `role="status"` | `OfflineBanner.tsx:27,31` | sospecha | Cerrado 2026-10-01 |
| #34 | Low | `EntryNotesDialog` pisa lo escrito en un refetch | `EntryNotesDialog.tsx:52-58` | verificado el código | Cerrado 2026-10-01 |
| #35 | Low | `YearRangeInput`: valor no entero y rango invertido | `YearRangeInput.tsx:11-16,41,55` | verificado | Cerrado 2026-10-01 |
| #36 | Low | Indicadores de card invisibles al lector | `FranchiseCard.tsx:18-19,65` | verificado | Cerrado 2026-10-01 |
| F1 | Media-alta | Flush del cleanup saltea `scope`, PATCH en paralelo | `useUpdateEntryProgress.ts:155-187` | verificado (dueño) | Cerrado 2026-10-01 |
| F2 | Media | Toast de error del publicar en `mutate()` | `ChecklistNodeMenu.tsx:52-55` | verificado (dueño) | Cerrado 2026-10-01 |
| F3 | Baja | `useUpdateEntryMeta` sin `scope` | `useUpdateEntryMeta.ts:37-78` | verificado (dueño) | Cerrado 2026-10-01 |
| F4 | Baja | Rollback de array entero pisado entre dos hooks | `useUpdateEntryMeta.ts:56-73` | sin marca explícita | Cerrado 2026-10-01 |
| F5 | Baja | Mock deja `isSynced: true` en copia huérfana | `mocks/handlers.ts:668-699` | sin marca explícita | Cerrado 2026-10-01 |
| F6 | Baja | Agregado escrito a mano en el seed | `mocks/seed/lists.ts:160-166` | sin marca explícita | Cerrado 2026-10-01 |
| F7 | Baja, latente | Mock no renumera `order` | `mocks/handlers.ts:683-695` | sin marca explícita | Cerrado 2026-10-01 |
| F8 | Baja | `AddToListButton` manda al login a sesión sin resolver | `AddToListButton.tsx:124` | sin marca explícita | Cerrado 2026-10-01 |
| F9 | Baja, higiene | Dos aserciones de ruta por substring | `SearchBar.test.tsx:94,124` | sin marca explícita | Cerrado 2026-10-01 |
| F10 | Informativo | Flush invalida más de lo que declara el fan-out | `useUpdateEntryProgress.ts:177-180` | sin marca explícita | Cerrado 2026-10-01 |

"Sin marca explícita": la auditoría de antipatrones no etiquetó el nivel de
verificación de estos hallazgos. No se infiere uno aquí.

Todas las rutas de este documento son relativas a `ll-checklist-frontend/`,
salvo las que empiezan con `ll-odoo/`.

## 3. Hallazgos de la revisión general (#21 a #36)

### #21 — HIGH. Un género sin color tira abajo catálogo, home, búsqueda y detalle

- **Ubicación:** `src/features/catalog/services/schemas.ts:15` declara
  `colorIndex: z.number().min(1).max(11)`, consumido por
  `franchiseSummarySchema:79` y `contentDetailSchema:70`. El serializer real
  (`ll-odoo/odoo-modules/ll_webpage/controllers/api_catalog.py:62`) emite
  `"colorIndex": genre.genre_color or 0`, o sea **0** cuando el género no
  tiene color. El `parse` es del array paginado entero
  (`catalog.service.ts:44`).
- **Escenario:** en Odoo, elegir "sin color" en el `color_picker` o importar
  géneros sin color (el default del modelo es aleatorio 1–11, pero el campo
  es un `Integer` sin restricción). **Un** género fuera de rango tira la
  respuesta completa con `ZodError`: `CatalogPage` cae en `ErrorState` con un
  "Try again" que nunca va a funcionar, y lo mismo `HomePage`, `SearchPage` y
  `FranchiseDetailPage`. El `queryClient` no reintenta ante esto, así que es
  permanente hasta corregir el dato en Odoo.
- **Por qué es absurdo:** la UI ya tiene el fallback.
  `src/components/common/GenreBadge.tsx:38` hace
  `DOT_CLASS[genre.colorIndex] ?? 'bg-muted-foreground'`. El `min/max` del
  schema es lo único que convierte un detalle estético en una caída total.
  MSW no puede delatarlo porque su seed solo produce 1–11.
- **Arreglo sugerido:** aflojar a `z.number().int()` (o `.catch(0)`) y dejar
  que `GenreBadge` resuelva, documentando que el rango 1–11 del doc 05 es una
  convención de paleta y no un invariante del backend.
- **Severidad:** High. **Verificación:** verificado en los dos lados por el
  dueño del proyecto (schema, serializer Python y fallback de `GenreBadge`).
- **Cierre (2026-10-01).** Archivo: `catalog/services/schemas.ts`.
  `colorIndex` pasó de `z.number().min(1).max(11)` a `z.number().int()`. El
  rango 1–11 del doc 05 es una convención de paleta y no un invariante del
  backend, y `GenreBadge` ya resolvía cualquier índice fuera de rango. Regla
  que queda: **Zod valida forma, no convenciones estéticas** (ADR-025). Sin
  test propio: el seed de MSW solo emite 1–11 y ninguna prueba puede producir
  el caso (sección 9).

### #22 — MEDIUM. Un 500 sin envelope o un corte de red muestran el texto técnico de axios

- **Ubicación:** `src/lib/http.ts:46` usa `error.message` de axios cuando la
  respuesta no matchea `errorEnvelopeSchema`; `:44` hardcodea
  `'Network error'`. `src/features/lists/utils/apiErrorMessage.ts:13` lo pasa
  textual (`error instanceof ApiError ? error.message : fallback`).
- **Escenario:** el usuario renombra una carpeta y Odoo devuelve un 500 por
  una excepción no manejada (HTML o JSON-RPC con traceback, que no matchea el
  envelope). El diálogo muestra **"Request failed with status code 500"**.
  Sin red, muestra **"Network error"**, que además es un string de UI
  hardcodeado fuera de `i18n/en.ts` y viola ADR-007.
- **Contradicción con la documentación del propio código:** el docstring de
  `apiErrorMessage` afirma que "nunca se muestra un mensaje técnico crudo", y
  es exactamente lo que pasa. Invisible en desarrollo porque los handlers de
  MSW **siempre** mandan el envelope.
- **Arreglo sugerido:** filtrar por código. El `message` del backend solo es
  texto de cara al usuario donde el contrato lo promete (`VALIDATION`,
  `ALREADY_LINKED`); para el resto debería ganar el `fallback` de la
  operación.
- **Severidad:** Medium. **Verificación:** verificado por el dueño del
  proyecto (`normalizeError` y `apiErrorMessage`).
- **Cierre (2026-10-01).** Archivos: `features/lists/utils/apiErrorMessage.ts`
  y `lib/http.ts`. `apiErrorMessage` filtra por código: solo `VALIDATION` y
  `ALREADY_LINKED` propagan el `message` del backend; el resto cae al fallback
  de la operación. El `'Network error'` de `lib/http.ts` quedó marcado en el
  código como **marcador técnico, no texto de UI**, porque ya no se renderiza.
  **Tres tests afirmaban el bug** (esperaban ver el `message` crudo de un
  `ApiError` de código `INTERNAL`) y se actualizaron:
  `StarterListsPrompt.test.tsx` y dos en `ChecklistNodeMenu.test.tsx`; se
  agregó uno que afirma que un `VALIDATION` **sí** propaga su mensaje. Sin
  test del caso original (respuesta de error sin envelope): el mock siempre
  manda el envelope (sección 9).

### #23 — MEDIUM. `PublicListPage` afirma "la lista es privada" ante cualquier error, y sin retry

- **Ubicación:** `src/pages/PublicListPage.tsx:53-62`.
- **Escenario:** un visitante abre una lista publicada y existente mientras el
  backend devuelve 500, o sin red. `entries.isError` sin discriminar código
  muestra "This list is private or is no longer available." Se le afirma algo
  **falso** sobre el estado de la lista, y como es un `EmptyState` y no un
  `ErrorState`, **no hay botón de reintentar**.
- **Contexto:** es la misma conflación que la tarea 4.4 arregló para
  `/auth/me` (ADR-024); este es el hermano que quedó vivo.
  `ProfilePage.tsx:60-80` ya tiene el patrón correcto (solo `NOT_FOUND` →
  EmptyState; el resto → ErrorState con retry).
- **Severidad:** Medium. **Verificación:** verificado.
- **Cierre (2026-10-01).** Archivo: `pages/PublicListPage.tsx`. Solo un
  `NOT_FOUND` significa "privada o inexistente"; cualquier otro error pasa a
  `ErrorState` con retry, el patrón que `ProfilePage` ya tenía.

### #24 — MEDIUM. El contador de episodios cambia en silencio para un lector de pantalla, y el foco se pierde al llegar al tope

- **Ubicación:** `src/components/ui/EpisodeStepper.tsx:119-121` (el `<span>`
  del valor) y `:128` (`disabled={disabled || atCeiling}`). No existe
  **ningún** `aria-live` en el proyecto fuera de `LinkWizard.tsx:73`.
- **Escenario (a):** activar "Increase episodes": el número sube y la barra
  se mueve pero **nada se anuncia**; el `aria-label` del botón es estático y
  el valor no está en una región viva. Es la acción central de la app.
- **Escenario (b):** al llegar a `watched === total` el botón enfocado pasa a
  `disabled`, el navegador devuelve el foco al `<body>` y el usuario pierde
  su lugar en una lista larga. Lo mismo con `–` al llegar a 0 (`:110`).
- **Por qué no lo vio 4.3:** el barrido automatizado mide contraste, nombres,
  encabezados y anillo de foco estático; no puede ver ninguna de las dos.
- **Arreglo sugerido:** `role="spinbutton"` con `aria-valuenow/min/max/text`
  sobre un elemento focusable (patrón ARIA de este widget, resuelve las dos
  cosas a la vez); o como mínimo envolver el valor en `aria-live="polite"
  aria-atomic="true"`. Para el tope, mantener el botón habilitado y hacer
  no-op (`step()` ya corta en `:67`).
- **Severidad:** Medium. **Verificación:** verificado.
- **Cierre (2026-10-01).** Archivo: `components/ui/EpisodeStepper.tsx`, dos
  cambios. (a) El valor vive en una región viva (`role="status"
  aria-live="polite" aria-atomic`) con el **número visible sin cambios** y el
  texto completo (`valor / total`) en un `sr-only`: el doc 06 manda en el
  layout y un arreglo de accesibilidad no debía rediseñar el control. (b) Los
  botones pasaron de `disabled` a **`aria-disabled`** en el piso y el tope: el
  navegador devuelve el foco al `<body>` cuando el elemento enfocado pasa a
  `disabled`. `handleClick` ya cortaba el paso fuera de rango, así que el
  click es un no-op. **Dos tests afirmaban `toBeDisabled()`** y se
  actualizaron para afirmar lo que importa: el control sigue enfocable y el
  click no hace nada. Se eligió la región viva y no el `spinbutton` que
  sugería la ficha.

### #25 — MEDIUM. El botón "Add" del wizard no hace nada, sin mensaje, si el content no tiene nombres alternativos

- **Ubicación:** `src/features/lists/components/WizardTargetStep.tsx:93-104`
  (guarda doble) contra `:119-123` (el `role="alert"` cubre solo la falta de
  carpeta) y `:126` (`contentNames.length > 0 &&`).
- **Escenario:** un content sin ningún `AltName` es posible por modelo
  (`content_name_ids` no es `required`). `displayNameId` nace `null`, el
  `NameSelect` no se renderiza y `handleSubmit` hace `return` silencioso. El
  usuario elige carpeta, toca "Add" y **no pasa nada**, sin explicación y sin
  forma de avanzar.
- **Severidad:** Medium. **Verificación:** verificado el código; que exista
  un content sin nombres es posible por modelo, **no observado en el seed**.
- **Cierre (2026-10-01).** Archivo: `WizardTargetStep.tsx`. Un `role="alert"`
  propio cuando falta el nombre a mostrar; antes "Add" era un click sin efecto
  ni mensaje.

### #26 — MEDIUM. `?page=` fuera de rango deja el catálogo en un callejón sin salida que además miente

- **Ubicación:** `src/pages/CatalogPage.tsx:68-93` (la rama vacía no mira
  `page`) y `:24-33` (`hasActiveFilters` no incluye `page`). Ni el handler de
  MSW (`src/mocks/handlers.ts:205-215`) ni el backend real
  (`api_catalog.py:362-399`) clampean `page`: devuelven `items: []` con el
  `total` verdadero.
- **Escenario:** abrir `/catalog?page=99` muestra "Nothing here yet / The
  catalog is empty. Check back soon." — **falso**, el catálogo tiene 137
  franquicias. Como el `return` temprano ocurre antes de
  `PaginationControls`, **no hay ningún control para volver a la página 1**.
  Reproducible en modo mock.
- **Severidad:** Medium. **Verificación:** verificado.
- **Cierre (2026-10-01).** Archivo: `pages/CatalogPage.tsx`. Rama nueva para
  `?page=` fuera de rango (`items` vacío, `page > 1`, `total > 0`) con mensaje
  propio y un botón "Go to first page". Antes decía "The catalog is empty",
  falso, y no quedaba ningún control para volver.

### #27 — MEDIUM. "Clear filters" en la búsqueda borra también el término buscado

- **Ubicación:** `src/pages/SearchPage.tsx:87` y `:49`, apoyados en
  `src/features/catalog/hooks/useCatalogFilters.ts:80-83`, donde
  `clearFilters` vacía **todos** los params incluido `q`.
- **Escenario:** buscar "gate", filtrar, quedar en cero resultados, tocar
  "Clear filters": se pierde el término, la URL queda `/search` y la página
  cae al estado "Search the catalog". El usuario pidió soltar los filtros, no
  la búsqueda.
- **Severidad:** Medium. **Verificación:** verificado.
- **Cierre (2026-10-01).** Archivos: `useCatalogFilters.ts` y
  `pages/SearchPage.tsx`. `clearFilters` acepta `keep`, y `SearchPage` pasa
  `['q']` en sus dos puntos de entrada. **Un test afirmaba el bug** (esperaba
  caer al estado "Search the catalog", o sea que el término se borrara) y se
  actualizó.

### #28 — MEDIUM. En touch, el menú de acciones por nodo no es descubrible

- **Ubicación:** `src/features/lists/components/ChecklistNodeActions.tsx:24`
  (`opacity-0 … group-hover:opacity-100 group-focus-within:opacity-100`) y
  `ChecklistNodeMenu.tsx:64` (`tabIndex={-1}` en el trigger).
- **Causa:** el kebab de tres puntos solo se revela por `:hover` del
  `div.group` o por `:focus-within` de ese mismo div. En touch no hay hover
  real, y tocar el nodo pone el foco en el `<li role="treeitem">`, que es el
  **padre** del `.group`, así que `:focus-within` tampoco se cumple. El atajo
  Shift+F10 no existe en mobile.
- **Consecuencia posible:** todo el CRUD de carpetas queda de hecho solo en
  desktop, en un proyecto cuya decisión responsive es que se usa "tipo app"
  en el celular.
- **Matiz que hay que conservar:** los navegadores mobile emulan `:hover`
  pegajoso sobre el elemento tocado, así que probablemente el kebab aparezca
  tras el primer tap. Eso lo haría funcional **por accidente, no por
  diseño**.
- **Experimento que lo cierra (no corrido):** abrir `/my-lists` con el
  Chromium de Playwright en emulación táctil a 360px, tocar un nodo y mirar
  la opacidad computada del span.
- **Severidad:** Medium. **Verificación:** sospecha; causa del CSS
  verificada, no reproducido.
- **Cierre (2026-10-01).** Archivo: `ChecklistNodeActions.tsx`. El kebab pasó
  de `opacity-0` a `opacity-100 md:opacity-0`: **siempre visible por debajo de
  `md`**. Sin test dedicado, y el experimento en emulación táctil que cerraba
  la sospecha **sigue sin correrse**.

### #29 — LOW. `PublicListPage` es la única página de detalle sin guarda de id nulo: skeleton eterno

- **Ubicación:** `src/pages/PublicListPage.tsx:37-48`. Las otras tres sí la
  tienen: `ProfilePage.tsx:38-48`, `ContentDetailPage.tsx:33-43` y
  `FranchiseDetailPage.tsx:28-38`.
- **Escenario:** con una URL mal formada (`/profile/abc/list/12`),
  `parseIdParam` devuelve `null`, la query queda `enabled: false` y en
  TanStack v5 eso es `status: 'pending'` para siempre: **skeleton eterno**,
  peor que un error porque no se distingue de una app colgada.
- **Severidad:** Low. **Verificación:** verificado.
- **Cierre (2026-10-01).** Archivo: `pages/PublicListPage.tsx`. Se agregó la
  guarda de id nulo que las otras tres páginas de detalle ya tenían; evita el
  skeleton eterno con una URL mal formada.

### #30 — LOW. `releaseDate` no admite `null` y el serializer puede emitirlo

- **Ubicación:** `src/features/catalog/services/schemas.ts:54`
  (`releaseDate: z.string()`) contra `api_catalog.py:112`
  (`... if version.version_date else None`).
- **Escenario:** hoy casi imposible (`version_date` es `required=True` en el
  modelo), pero el serializer se cubrió por algo. Si pasa, mismo mecanismo
  que #21: `ErrorState` permanente en el detalle de franquicia y de content.
- **Severidad:** Low. **Verificación:** verificado contra el serializer.
- **Cierre (2026-10-01).** Archivos: `catalog/services/schemas.ts`,
  `formatReleaseDate` y `mocks/seed/derive.ts`. `releaseDate` pasó a
  `.nullable()`; `formatReleaseDate` acepta `null` y devuelve un guion. Hubo
  que guardar `yearsOf` en `derive.ts`, que hacía `new Date(v.releaseDate)` y
  con `null` habría envenenado el rango de años con un `NaN`. Misma regla que
  #21 (ADR-025). Sin test propio: el mock no emite un `releaseDate` nulo
  (sección 9).

### #31 — LOW. `ProgressBar` emite `aria-valuenow` mayor que `aria-valuemax`

- **Ubicación:** `src/components/ui/ProgressBar.tsx:30-32`.
- **Escenario:** en Odoo se corrige a la baja el total de episodios de una
  versión (24 → 12) sobre un entry con 24 vistos. La barra se ve bien (el
  porcentaje está clampeado en `utils/progress.ts`) pero el `progressbar`
  queda con `valuenow=24` y `valuemax=12`, combinación inválida en ARIA;
  algunos lectores anuncian 200%.
- **Arreglo sugerido:** `aria-valuenow={Math.min(watched, total)}`
  conservando el `aria-valuetext` honesto, que ya está en `:28`.
- **Severidad:** Low. **Verificación:** verificado.
- **Cierre (2026-10-01).** Archivo: `ui/ProgressBar.tsx`. `aria-valuenow`
  clampeado al total, conservando el `aria-valuetext` honesto.

### #32 — LOW. `aria-label="Pagination"` hardcodeado

- **Ubicación:** `src/features/catalog/components/PaginationControls.tsx:27`.
- **Detalle:** es el **único** string de UI de producción fuera de
  `i18n/en.ts` (verificado por grep; los de `DevUiPage` no cuentan). Un
  `aria-label` es texto de cara al usuario. Viola ADR-007 y el Definition of
  Done.
- **Severidad:** Low. **Verificación:** verificado.
- **Cierre (2026-10-01).** Archivo: `PaginationControls.tsx`. El
  `aria-label="Pagination"` pasó a `t.common.pagination`. Era el último string
  de UI de producción fuera de i18n.

### #33 — LOW. El banner de offline se monta junto con su propio `role="status"`

- **Ubicación:** `src/components/common/OfflineBanner.tsx:27`
  (`if (isOnline) return null`) y `:31`.
- **Causa:** una región viva `polite` que se **inserta** en el DOM al mismo
  tiempo que su contenido es de anuncio poco confiable: la tecnología
  asistiva necesita observar mutaciones de una región que ya existía. El
  docstring argumenta bien por qué `role="alert"` sería invasivo; el
  razonamiento es correcto y la implementación lo contradice sin querer.
- **Arreglo sugerido:** renderizar siempre el contenedor y alternar solo el
  contenido.
- **Severidad:** Low. **Verificación:** sospecha, basada en el comportamiento
  documentado de las live regions; no verificado con un lector real. Es un
  candidato concreto para la sesión de lector de pantalla que ya es deuda
  abierta.
- **Cierre (2026-10-01).** Archivo: `OfflineBanner.tsx`. El contenedor con
  `role="status"` se renderiza **siempre** y solo alterna su contenido. **Dos
  tests afirmaban la ausencia del rol** y se actualizaron para afirmar la
  ausencia del **texto**. Sigue sin probarse con un lector real.

### #34 — LOW. `EntryNotesDialog` borra lo que el usuario está escribiendo si llega un refetch

- **Ubicación:** `src/features/lists/components/EntryNotesDialog.tsx:52-58`,
  efecto con dependencias `[open, entry]`.
- **Escenario:** el usuario escribe un párrafo y la data se refresca
  trayendo **algún** cambio: `entry` es un objeto nuevo, el efecto vuelve a
  correr con `open === true` y pisa `notes`/`rating`/fechas con los valores
  del servidor. Pierde el texto sin aviso. `[open, entry.linkId]` alcanzaría
  y conserva el motivo original del efecto.
- **Dos lecturas, que se registran ambas:** la revisión general lo reporta
  como bug; la auditoría de antipatrones miró este mismo efecto y **no pudo
  escribir un escenario reproducible**, lo dejó como latente, y dice que lo
  que lo protege es el structural sharing de TanStack y no el array de
  dependencias. Coinciden en el diagnóstico y difieren en la confianza.
- **Severidad:** Low. **Verificación:** verificado el código; el disparo
  exacto no se reprodujo.
- **Cierre (2026-10-01).** Archivo: `EntryNotesDialog.tsx`. El efecto depende
  de `[open, entry.linkId]` y no de `[open, entry]`, con un `eslint-disable`
  puntual. Con el objeto, cualquier refetch con algún cambio pisaba lo que el
  usuario escribía; lo que lo protegía era el structural sharing de TanStack,
  no el array de dependencias.

### #35 — LOW. `YearRangeInput`: un valor no entero borra el filtro en silencio, y el rango invertido no se valida

- **Ubicación:** `src/features/catalog/components/YearRangeInput.tsx:11-16`
  y `:41`/`:55`.
- **Escenario A:** escribir `19.5` en "From" y salir del campo. `parseYear`
  devuelve `undefined`, el filtro se borra, pero como ya era `undefined` el
  efecto de sincronización no se dispara y el input **sigue mostrando
  "19.5"**: la pantalla afirma un filtro que no está aplicado.
- **Escenario B:** From 2020 / To 2010: se mandan los dos, el backend
  devuelve vacío y el usuario ve "No results" sin pista de que el rango está
  al revés.
- **Severidad:** Low. **Verificación:** verificado.
- **Cierre (2026-10-01).** Archivo: `YearRangeInput.tsx`. El commit
  **normaliza el input al valor que de verdad se aplicó**, así que escribir
  `19.5` ya no deja la pantalla afirmando un filtro inexistente; el rango
  invertido muestra un `role="alert"` con un string nuevo en i18n.

### #36 — LOW. Indicadores de la card que no existen para un lector de pantalla

- **Ubicación:** `src/features/catalog/components/FranchiseCard.tsx:65`
  (`title={t.card.inYourList}` sobre un `<div>` sin rol, con el `Check` en
  `aria-hidden`) y `:18-19` (`aria-label` sobre un `<svg>` de lucide sin
  `role="img"`).
- **Detalle:** el marcador "ya está en tu lista" se comunica **solo** por el
  `title` de un div genérico, que la mayoría de las tecnologías asistivas no
  anuncia: la información se pierde. El barrido de 4.3 no lo ve porque para
  él son decorativos. `ScoreDisplay.tsx:23` ya usa el patrón correcto
  (`sr-only` al lado del icono).
- **Severidad:** Low. **Verificación:** verificado.
- **Cierre (2026-10-01).** Archivo: `FranchiseCard.tsx`. El marcador "ya está
  en tu lista" pasó del `title` de un div genérico a un `<span
  className="sr-only">` (mismo patrón que `ScoreDisplay`), y los iconos de
  tipo ganaron `role="img"` explícito porque lucide no lo agrega solo. **Dos
  tests usaban `getByTitle`** y se actualizaron a `getByText`, que prueba lo
  que recibe un lector de pantalla.

## 4. Hallazgos de antipatrones recurrentes (F1 a F10)

### F1 — MEDIA-ALTA. El flush del cleanup saltea `scope` y puede correr en paralelo con el commit en vuelo

> **CERRADO el 2026-10-01** (rama `sprint4/errores-y-barrido-a11y`, sin
> commitear). La ficha original queda abajo intacta, con sus números de
> línea de antes del arreglo; la sección "Cierre" va al final de la ficha.

- **Ubicación:** `src/features/lists/hooks/useUpdateEntryProgress.ts:155-187`,
  la llamada directa de la línea 168. El cleanup del `useEffect` manda el
  commit pendiente llamando `listsService.updateLink` **directo**, salteando
  `mutate` y por lo tanto el `scope: { id: 'entry-<linkId>' }` de la línea 74.
- **Escenario** (requiere un PATCH más lento que los 400 ms del debounce, o
  sea el backend real, no MSW):
  1. Click `+` (12→13).
  2. t=400: sale el PATCH de 13 y queda `inFlight`.
  3. t=450: segundo click (13→14).
  4. t=850: el timer vence pero `if (burst.current.inFlight) return` corta y
     deja `pending=14` **sin nada agendado**.
  5. t=900: el usuario cambia de carpeta y el cleanup dispara el PATCH de 14
     **con el de 13 todavía en vuelo**.
- **Efecto:** dos PATCH absolutos del mismo link sin serializar. Si el
  servidor liquida el de 13 último, el valor final es **13** y el usuario
  vio 14. Además el `invalidateQueries` con `refetchType: 'all'` de la línea
  177 se dispara antes de que aterricen los dos, así que el refetch puede
  traer 13 y **nada lo vuelve a corregir**. El docstring de las líneas
  162-165 promete lo contrario ("no puede perder el episodio que el usuario
  ya vio subir").
- **Por qué es el más grave:** es el único hallazgo que puede dejar el
  servidor con un valor distinto del que el usuario vio, **sin
  auto-corrección**. No es observable contra MSW (su PATCH tarda 150 ms).
- **Falso verde:** `useUpdateEntryProgress.test.tsx:228` desmonta **antes**
  de que venza el debounce, así que `inFlight` es `false` y solo cuenta que
  haya 1 PATCH. El caso "desmontar con uno en vuelo y uno pendiente" no está
  cubierto.
- **Severidad:** Media-alta. **Verificación:** verificado por el dueño del
  proyecto leyendo el cleanup completo.
- **Cierre (2026-10-01).** Archivo: `useUpdateEntryProgress.ts`. El ref
  `Burst` ganó `inFlightPromise?: Promise<boolean>`. Los dos sitios que
  disparan un commit (el del debounce y el de arrastre de `onSettled`)
  pasaron de `mutate(x)` a `mutateAsync(x).then(() => true, () => false)`,
  guardando la promesa. El cleanup **la espera** antes de mandar el commit
  de arrastre, así la serialización se respeta aunque el flush siga yendo
  por `listsService.updateLink` directo (a propósito: el observer ya no
  existe y sus callbacks no correrían). Efecto colateral: el hook ya no usa
  `mutate`, solo `mutateAsync`, y el array de dependencias de `setProgress`
  se actualizó.
  - **Matiz que la ficha no mencionaba (cadena abortada).** Si el commit en
    vuelo **falla**, el de arrastre no se manda. La política del hook es
    abortar la cadena cuando un commit falla: su `onError` revierte el
    cache y avisa por toast, y mandar lo pendiente después "volvería a
    separar la pantalla de lo que el usuario acaba de ver revertirse". El
    flush del desmontaje tenía que respetarla; por eso la promesa resuelve
    a un **booleano** y no a `void`.
  - **Tests que ahora lo cubren**, en `useUpdateEntryProgress.test.tsx`:
    *"desmontar con uno en vuelo y uno pendiente no los manda en paralelo"*
    (afirma concurrencia máxima de PATCH `=== 1` y orden `[13, 14]`) y
    *"si el commit en vuelo falla, el desmontaje NO manda el de arrastre"*
    (afirma que solo salió el 13). El test viejo (*"desmontar con un commit
    pendiente lo manda igual"*) sigue siendo válido pero no cubría esto,
    como dice el falso verde de arriba.
  - **Trampa metodológica del test.** El primer intento devolvía
    `HttpResponse.json({ ok: true })` desde el handler y fallaba con un solo
    PATCH en vez de dos. La causa no era el arreglo: ese objeto no pasa la
    validación Zod del service, el commit contaba como fallido y el flush
    abortaba la cadena, correctamente. Se resolvió con
    `await request.clone().json()` (cuenta sin consumir el body) y
    `return undefined` para que responda el handler real.
  - **Verificación:** los dos tests **fallan sin el arreglo** (revirtiendo
    el código temporalmente): el de concurrencia con `expected 2 to be 1`,
    el de la cadena abortada con `expected [ 13, 14 ] to deeply equal
    [ 13 ]`. **No se verificó en el navegador ni contra el Odoo real**; F1
    sigue sin ser observable en uso normal contra MSW y los tests inyectan
    `delay(700)` para superar el debounce de 400 ms.

### F2 — MEDIA. El toast de error del toggle de publicar va en las opciones de `mutate()`, no del hook

> **CERRADO el 2026-10-01** (misma rama, sin commitear). Ficha original
> intacta; el "Cierre" va al final.

- **Ubicación:** `src/features/lists/components/ChecklistNodeMenu.tsx:52-55`.
  TanStack v5 gatea los callbacks pasados por llamada con `hasListeners()`
  del observer, así que si el componente se desmonta no corren.
- **Reincidencia:** es **la misma forma** del toast de "deshacer" del wizard
  que ya se arregló, y la lección está escrita en dos archivos del repo que
  la citan explícitamente (`useDeleteLink.ts:24-29` y `useSignOut.ts:17-21`).
  Acá quedó sin aplicar.
- **Escenarios a mano:** expandir "Favorites" → menú de la sub-carpeta →
  "Publish" → **colapsar "Favorites"** antes de que liquide el PATCH (el
  `<li>` se desmonta con el menú); o tocar otra bottom tab enseguida (se
  desmonta `MyListsPage` entera). Con el PATCH fallando, **no hay toast**:
  el `onError` del hook sí revierte, pero el usuario no se enteró y
  probablemente no vea el revert porque el nodo no está en pantalla. Se
  queda creyendo que publicó una lista que sigue privada.
- **Falso verde:** `ChecklistNodeMenu.test.tsx:293` mantiene el árbol montado
  de punta a punta, así que el observer siempre tiene listeners; pasaría
  idéntico si el callback estuviera condenado a no correr.
- **Severidad:** Media. **Verificación:** verificado por el dueño del
  proyecto.
- **Cierre (2026-10-01).** Archivos: `useUpdateChecklist.ts` y
  `ChecklistNodeMenu.tsx`. `useUpdateChecklist(checklistId, options?)`
  acepta ahora un `errorToast?: string` opcional; el `onError` **del hook**
  dispara el toast solo si se lo pasaron, con `apiErrorMessage` para el
  fallback. `ChecklistNodeMenu` usa **dos instancias** del hook con nombres
  explícitos: `togglePublish` (con `errorToast`) y `renameChecklist` (sin
  él). Comparten el `scope`, así que siguen serializándose sobre el mismo
  nodo.
  - **Matiz (por qué no bastaba mover el toast al hook).** Mover el toast
    al `onError` sin más habría hecho que **el renombre también** mostrara
    toast, y el renombre ya muestra su error inline en el diálogo: aviso
    duplicado. La misma instancia servía a los dos llamadores, de ahí el
    parámetro opcional y las dos instancias.
  - **Test que ahora lo cubre**, en `ChecklistNodeMenu.test.tsx`, en un
    `describe` propio: *"publicar y desmontar antes de que falle el PATCH
    igual avisa"* (desmonta el árbol con el PATCH en vuelo y afirma que el
    toast corre igual). El helper `renderTree` pasó a devolver el resultado
    de RTL para poder desmontar. El test viejo (*"ante un error inyectado,
    revierte el toggle y avisa por toast"*) mantiene el árbol montado y
    seguiría pasando con el callback condenado, como dice el falso verde.
  - **Verificación:** el test nuevo **falla** al volver el toast a las
    opciones de `mutate()`. No se verificó en el navegador.

### F3 — BAJA. `useUpdateEntryMeta` es la mutación optimista que quedó sin `scope`

- **Ubicación:** `src/features/lists/hooks/useUpdateEntryMeta.ts:37-78`.
  Misma forma del hallazgo #20, en el único hook optimista que la tarea 4.12
  no tocó. Verificado por inventario: de las 11 `useMutation` del repo, solo
  `useUpdateChecklist` y `useUpdateEntryProgress` declaran `scope`.
- **Escenario:** abrir el lápiz de un entry, escribir una nota, Save (el
  diálogo cierra enseguida y el PATCH queda en vuelo); reabrir, cambiar el
  puntaje, Save antes de que liquide el primero. El `onMutate` del segundo
  toma como snapshot un array que ya incluye el patch optimista del primero;
  si falla el primero, su `onError` borra de pantalla el puntaje del
  segundo.
- **Severidad:** Baja, con el mismo criterio con que se cerró #20: parpadeo,
  no corrupción. **Verificación:** verificado por el dueño del proyecto.
- **Cierre (2026-10-01).** Archivo: `useUpdateEntryMeta.ts`, con
  ``scope: { id: `entry-${linkId}` }``, el **mismo id** que
  `useUpdateEntryProgress`. Se cerró junto con F4 por pedido explícito del dueño del proyecto. Un id propio
  habría bastado para F3 pero no para F4.

### F4 — BAJA. El rollback de array completo se pisa entre `useUpdateEntryMeta` y `useUpdateEntryProgress`

- **Ubicación:** `useUpdateEntryMeta.ts:56-73` y
  `useUpdateEntryProgress.ts:78-96` (ambos en `src/features/lists/hooks/`).
- **Qué tiene de nuevo:** variante del patrón. No es un hook contra sí mismo
  sino **dos hooks distintos sobre la misma `queryKey`**
  (`listKeys.entries(checklistId)`), uno con scope por entry y el otro sin
  ninguno, así que nunca se serializan ni para el mismo `linkId`.
- **Escenario:** entry con 12 episodios y sin notas. Click `+`: el cache pasa
  a 13 y el snapshot guarda (12, notas null), timer de 400 ms. Dentro de
  esos 400 ms: abrir el lápiz, escribir "hi", Save: el PATCH de notas sale y
  el servidor las guarda bien. A t=400 sale el PATCH de progreso y
  **falla**: su `onError` restaura el snapshot del paso 1 y **la nota recién
  guardada desaparece de pantalla** junto con el +1.
- **Importante para el arreglo:** poner `scope` solo en `useUpdateEntryMeta`
  (F3) **no alcanza**. Hace falta que las dos mutaciones del mismo link
  compartan el id de scope, o que el rollback sea por campo en vez de por
  array entero.
- **Severidad:** Baja. **Verificación:** sin marca explícita.
- **Cierre (2026-10-01).** Archivo: `useUpdateEntryMeta.ts`. Compartir el
  `scope` con `useUpdateEntryProgress` es el punto del arreglo y no un
  detalle: los dos hooks escriben la misma `queryKey` y los dos restauran el
  array entero, así que con ids distintos nunca se serializan entre sí y el
  rollback de uno borra el resultado exitoso del otro. Un scope **por link** y
  no por hook lo evita. Test nuevo en `useUpdateEntryProgress.test.tsx` (el
  escenario cruzado, midiendo concurrencia máxima); su primera versión era un
  falso verde, ver sección 9.

### F5 — BAJA. El mock deja `isSynced: true` en la copia huérfana al borrar su par

- **Ubicación:** `src/mocks/handlers.ts:668-699` (`DELETE /me/links/:id`). El
  propio mock declara el invariante en `handlers.ts:164-184` ("el par se
  reconoce por `isSynced && versionId`") y el handler no lo mantiene.
- **Escenario:** con el par 5006/5007 del seed, desvincular 5007 deja a 5006
  con `isSynced: true` y cero copias: `ListEntryRow.tsx:146` sigue pintando
  el badge "Synced", y `useUpdateEntryProgress` sigue invalidando el prefijo
  entero `listKeys.all` en cada click para propagar a copias que no existen.
- **Falso verde:** `src/mocks/links.test.ts:189` y `:199` cubren el borrado
  del último hijo y la salida del library-index, pero **ninguno borra un
  miembro de un par sincronizado**.
- **Límite:** el invariante real de `isSynced` en Odoo no se verificó (el
  backend quedó fuera de alcance); se usó el que declara el mock.
- **Severidad:** Baja. **Verificación:** sin marca explícita.
- **Cierre (2026-10-01).** Archivo: `mocks/handlers.ts`, `DELETE
  /me/links/:id`. Al borrar un miembro de un par sincronizado, si queda una
  sola aparición de ese `versionId` se le baja `isSynced` a `false`. Test
  dedicado: **no registrado en el reporte del cierre; pendiente de
  confirmar**. El invariante real de `isSynced` en Odoo sigue sin verificarse.

### F6 — BAJA. Queda un agregado escrito a mano en el seed

- **Ubicación:** `src/mocks/seed/lists.ts:160-166`, el `aggregatedProgress`
  del franchise-link 5001.
- **Detalle:** es el **residuo** de la limpieza de ADR-022: `linkCount`, las
  `stats`, `publishedChecklists` y `libraryIndex` sí se derivan.
  `refreshAggregates` solo corre en el PATCH y el DELETE, nunca en la
  lectura inicial, así que el `[S1 25/25] - [S2 03/-]` del primer render sale
  del string tipeado a mano. Hoy coincide por casualidad; cambiar un
  `watchedEpisodes` del seed sin tocar el agregado deja el mock mintiendo y
  cualquier test seguiría verde contra el valor equivocado, exactamente el
  patrón que ADR-022 vino a cerrar.
- **Severidad:** Baja. **Verificación:** sin marca explícita.
- **Cierre (2026-10-01).** Archivos: `mocks/seed/lists.ts` y
  `mocks/handlers.ts`. Se eliminó el `aggregatedProgress` escrito a mano del
  franchise-link 5001 y `GET /me/checklists/:id/entries` llama ahora
  `refreshAggregates`. Antes solo corría en el PATCH y el DELETE, así que el
  agregado del primer render salía de un literal. Hace cumplir ADR-022 también
  en la lectura.

### F7 — BAJA, LATENTE. El mock no renumera `order` de los entries

- **Ubicación:** `src/mocks/handlers.ts:683-695` (DELETE sin renumerar)
  contra `:594` y `:609` (`order: entries.length` al crear). El mismo
  archivo **sí** renumera los hermanos de una carpeta y deja el razonamiento
  escrito en `:422-427`.
- **Escenario:** borrar el entry de order 0 y vincular algo nuevo produce un
  `order` repetido. Hoy nada ordena por ese campo; importa antes de la
  tarea 4.10 (mover/reordenar), que es cuando algo va a empezar a leerlo.
- **Severidad:** Baja, latente. **Verificación:** sin marca explícita.
- **Cierre (2026-10-01).** Archivo: `mocks/handlers.ts`, `DELETE
  /me/links/:id`. Se renumera el `order` de los hermanos, igual que ya hacía
  el handler de checklists. Test dedicado: **no registrado en el reporte del
  cierre; pendiente de confirmar**. Sigue siendo prerrequisito de 4.10 que
  este arreglo esté en su lugar.

### F8 — BAJA. `AddToListButton` manda al login a quien tiene sesión sin resolver

- **Ubicación:** `src/features/lists/components/AddToListButton.tsx:124`
  (`status === 'authenticated' ? <LinkWizard> : <SignInPrompt>`). El `else`
  se come dos estados más: `idle` (bootstrap en curso) y `unresolved`
  (ADR-024).
- **Escenario:** recargar `/franchise/3` y tocar "Add to list" antes de que
  resuelva `/auth/me` muestra "Sign in to add to a list" a alguien
  logueado, y después parpadea al wizard. Con `unresolved` es peor: le
  ofrece loguearse a quien tuvo un 500, que es justo lo que ADR-024 vino a
  evitar.
- **Severidad:** Baja. **Verificación:** sin marca explícita.
- **Cierre (2026-10-01).** Archivo: `AddToListButton.tsx`. `idle` muestra un
  skeleton en el diálogo y `unresolved` muestra el error de sesión con retry,
  en vez de ofrecer "iniciá sesión" a alguien logueado o a alguien que tuvo un
  500: justo lo que ADR-024 vino a evitar.

### F9 — BAJA, HIGIENE. Dos aserciones de ruta por substring

- **Ubicación:** `src/features/catalog/components/SearchBar.test.tsx:94` y
  `:124`.
- **Detalle:** la auditoría revisó **los 10 usos** de `toHaveTextContent` del
  repo; los otros ocho afirman texto de mensajes dentro de un
  `alert`/`status`/`tooltip`, donde el substring es lo correcto. Estos dos
  comparan **rutas** contra el `data-testid="location"`, la forma exacta que
  ya produjo dos falsos verdes: pasarían igual con
  `/search?q=gate&page=2`. El remedio ya está escrito en el propio repo, en
  `MyListsPage.test.tsx:70-73`.
- **Severidad:** Baja, higiene. **Verificación:** sin marca explícita.
- **Cierre (2026-10-01).** Archivo: `SearchBar.test.tsx`. Las dos aserciones
  de ruta pasaron de `toHaveTextContent` a comparación exacta con
  `.textContent).toBe()`.

### F10 — INFORMATIVO. El flush de desmontaje invalida más de lo que declara el fan-out

- **Ubicación:** `src/features/lists/hooks/useUpdateEntryProgress.ts:177-180`.
  Invalida `listKeys.all` con `refetchType: 'all'` aunque el entry no sea
  sincronizado, mientras la tabla de [15-diseno-sprint3b.md](./15-diseno-sprint3b.md)
  §3.2 y el docstring de las líneas 36-38 del propio hook dicen que este
  hook **no** invalida `tree()` ni `libraryIndex()`.
- **Detalle:** es deliberado y benigno (un GET extra). Si se deja así,
  conviene que el docstring lo diga, para que la próxima revisión no lo lea
  como un bug.
- **Severidad:** Informativo. **Verificación:** sin marca explícita.
- **Cierre (2026-10-01).** Archivo: `useUpdateEntryProgress.ts`. El docstring
  ahora **dice** que el flush del desmontaje invalida `listKeys.all` aunque el
  entry no sea sincronizado, y por qué. Antes afirmaba lo contrario. Solo
  cambió un comentario.

## 5. Código muerto y barrido mecánico

- **i18n:** de 235 claves, solo dos muertas: `t.app.tagline` y
  `t.lists.entry.saving`.
  - Caso de `t.lists.entry.saving` ('Saving…'), registrado entero: todas sus
    hermanas se usan menos ella, porque `EntryNotesDialog.handleSave` cierra
    el diálogo en la línea siguiente al `mutate`, así que un estado
    "guardando" nunca podría verse. Es un sobrante de un diseño anterior.
  - **Dato metodológico:** 3 de 5 candidatos del barrido de i18n eran
    **falsos positivos** (`onHold`, `dropped`, `planToWatch` se usan por
    acceso dinámico vía `STARTER_LIST_KEYS`). Cualquier búsqueda textual de
    código muerto las marca y no lo están.
- **Exports de producción:** de 214, el único realmente muerto es
  **`src/pages/PlaceholderPage.tsx`**, huérfano desde que `SettingsPage`
  dejó de ser placeholder en 4.13. `checklistResponseSchema` y
  `libraryIndexSchema` figuran sin uso pero se exportaron **a propósito** en
  B10 para el checkpoint de contrato; de paso revela que ese checkpoint es
  un proceso manual, porque nada automatizado los consume.
- **Open redirect:** sano. Los tres lectores de `?next=` usan `safeNext`;
  `OAuthButtons` recibe el valor saneado y ancla las URLs a
  `window.location.origin`; al volver, `useAuthCallback` lo sanea otra vez.
- **XSS:** cero `dangerouslySetInnerHTML` y cero `.innerHTML` en todo `src/`.
- **Tipos:** cero `: any` y cero `as any` fuera de `src/components/ui/` y los
  tests.

**Cierre del barrido mecánico (2026-10-01).** Se borró
`src/pages/PlaceholderPage.tsx` y las dos claves i18n muertas
(`t.app.tagline` y `t.lists.entry.saving`). Las claves de acceso dinámico y
los exports de B10 no se tocaron.

## 6. Zonas revisadas y declaradas sanas

Para poder cerrarlas con fundamento.

**Revisión general**

- **Códigos de error:** los 30 call sites de `instanceof ApiError`,
  `.code ===`, `catch` y `apiErrorMessage`. `UNAUTHORIZED` bien cubierto en
  rutas privadas (`RequireAuth`, con la distinción de 4.4) y públicas
  (`AddToListButton`). `LoginForm`/`RegisterForm` manejan `UNAUTHORIZED`,
  `VALIDATION` con `field`, `FORBIDDEN` y el `ZodError` por drift, sin tratar
  ningún fallo como éxito. `ALREADY_LINKED` tiene sus tres salidas y degrada
  bien cuando el payload `existing` no valida. Los dos `catch {}` vacíos de
  `useUpdateEntryProgress.ts:169,181` están justificados.
- **Schemas Zod contra el doc 04:** los cuatro `schemas.ts` campo por campo,
  y contra los serializers. **No hay laxitud:** ni `z.any()`, ni
  `passthrough()`, ni `optional()` de más (los de `listEntrySchema`
  corresponden a campos condicionales por `kind` y a los `[EXT]` de
  ADR-004). Los dos problemas son de **estrictez excesiva** (#21, #30), lo
  contrario de lo que se buscaba.
- **Desbordamientos:** `toProgress`/`formatProgress`/
  `formatAggregatedProgress`/`formatEpisodeCount` con `total = 0`,
  `watched > total` y 3–4 dígitos; `EpisodeStepper` con `max = 0`; paginación
  con `total = 0` y última página; `truncate`/`line-clamp` presentes en
  nombres de card, filas de entry, nodos del árbol y label de progreso
  agregado; `loading="lazy"` y `aspect-ratio` fijo en todas las imágenes.
- **Rendimiento:** keys estables en los cuatro grids/listas; `useInLibrary`
  con `Set` memoizado; code-splitting por ruta en las 14 páginas.
  `useFranchiseList({})` de `HomePage` y `CatalogPage` hashean a la **misma**
  query key, así que no hay refetch duplicado. Nada de severidad media o
  mayor.
- **Accesibilidad no automatizable:** roving tabindex del árbol con los dos
  botones internos en `tabIndex={-1}`; `aria-expanded` solo cuando hay hijos
  y `aria-selected` reflejando la URL; corte de burbujeo de teclado; trampas
  de foco y retorno de foco en los **cinco** diálogos (Radix más
  `onCloseAutoFocus` explícito, incluido el caso del nodo borrado);
  `aria-live` del título de paso del wizard; `RatingStars` como radiogroup
  real; `aria-current` de `NavLink`.

**Antipatrones**

- Los arreglos de los hallazgos **#15 a #18 están en su lugar y no se
  rompieron**; no hay una nueva pérdida de foco.
- El fan-out de invalidación de los cuatro hooks de la tabla del doc 15
  **coincide** con lo declarado, salvo F10.
- Los nueve handlers de escritura de MSW **escriben estado real**, no ecoan
  el body; `linkCount`, `stats`, `publishedChecklists` y `libraryIndex` están
  derivados (ADR-022 aplicado). Los agujeros son F5, F6 y F7.
- Los 4 sitios con callbacks a nivel de `mutate()`: `LoginForm.tsx:62` y
  `RegisterForm.tsx:72` son **seguros**, confirmado contra el router (esas
  rutas no están detrás de ningún guard y no hay "redirect-if-authenticated",
  así que el formulario no se desmonta). `useLinkWizard.ts:88` está correcto
  y documentado. El que falla es F2.
  - **Advertencia a registrar:** si alguna vez se agrega un guard de
    "redirect-if-authenticated", `LoginForm` y `RegisterForm` se rompen de
    golpe por el mismo mecanismo de F2.
- Controles a11y con inputs `sr-only` (`RatingStars.tsx:54`,
  `SettingsPage.tsx:38`): ya dibujan el anillo con
  `has-[:focus-visible]:ring-2` sobre el contenedor visible. Patrón cerrado.
- Deltas por etiqueta sobre el agregado del padre: `entryTree.ts:16-28`
  identifica el grupo **por posición** y no por `abbreviation`, con el
  comentario que explica el caso de dos versiones del mismo content.
  Cerrado.

## 7. Patrones transversales (lectura de conjunto)

- **El borde con el Odoo real** (#21, #22, #23, #30, y en parte #26): el
  frontend asume datos y errores más prolijos que los que el backend emite.
  Mientras el seed y los handlers de MSW solo produzcan el camino válido,
  estos caminos no pueden tener test (ver "No cubrió", arriba).
- **Reincidencias de lecciones ya pagadas:** callbacks a nivel de `mutate()`
  (F2, ya resuelto en `useDeleteLink`/`useSignOut` y, el 2026-10-01, en
  `useUpdateChecklist`), `scope` ausente (F3, F4;
  ya resuelto en #20), conflación de error con estado vacío (#23, ya
  resuelto para `/auth/me`), aserción de ruta por substring (F9).
- **Falsos verdes** nombrados: F1, F2, F5, F9 y los caminos de #21/#22/#26/
  #30 sin test posible. Al cerrar aparecieron dos más, de otra clase (tests
  que afirmaban el bug y un test nuevo que pasaba sin el arreglo): sección 9.
- **Accesibilidad que el barrido de 4.3 no ve:** #24, #31, #33, #36. La
  prueba con lector de pantalla real sigue siendo deuda abierta.

## 8. Estado y siguiente paso

**26 hallazgos, 26 cerrados, 0 abiertos** (2026-10-01). Los cierres se
registraron en cada ficha y en [17-sprint4-avance.md](./17-sprint4-avance.md),
no como tarea del plan. Todo está en la rama
`sprint4/errores-y-barrido-a11y`, **sin commitear y sin pasar por CI**.

Lo que queda **no son hallazgos abiertos sino verificación pendiente**:

- Nada se verificó en el navegador ni contra el Odoo real. #28 y #33 siguen
  con su experimento escrito y sin correr; F1 sigue sin ser observable contra
  MSW.
- La prueba con lector de pantalla real sigue siendo deuda abierta; #24, #31,
  #33 y #36 son candidatos concretos.
- El mock no puede emitir las formas que harían testeables #21, #22 y #30
  (sección 9).

## 9. Tests del cierre: qué fijaban, qué falta

Verificación real de la tanda: `npm run typecheck` y `npm run lint` limpios,
`npm run test` **340/340 en 60 archivos** (338 al cerrar F1 y F2 según
[17-sprint4-avance.md](./17-sprint4-avance.md); 335 antes de esa tanda).

### Tests que afirmaban el bug

Al aplicar #22 fallaron **tres** tests, y los tres **fijaban el comportamiento
equivocado**: esperaban ver el `message` crudo de un `ApiError` de código
`INTERNAL`. No eran falsos verdes (un test que no prueba lo que dice) sino
una categoría distinta: tests que **sí** probaban algo, pero el
comportamiento erróneo. Se actualizaron al contrato nuevo.

Solo **un** test más entra en esta misma categoría: el de #27, que esperaba
que "Clear filters" borrara el término buscado — o sea que afirmaba el
resultado equivocado de cara al usuario.

**Conviene no confundirlos con otros seis** que también rompieron al aplicar
los arreglos, porque son una categoría distinta y más benigna: afirmaban
**detalles de implementación** que el arreglo cambió, no el comportamiento
defectuoso. Los dos de #24 esperaban `toBeDisabled()` (el `disabled` pasó a
`aria-disabled`); los dos de #33, la ausencia del rol (el contenedor pasó a
existir siempre); los dos de #36 usaban `getByTitle` (el `title` pasó a
`sr-only`). Que un refactor rompa aserciones de implementación es normal y no
dice nada malo del test — aunque sí sugiere que afirmar el **efecto** (el
click no hace nada, el texto no está) habría sido más resistente que afirmar
el mecanismo.

Lección de las dos categorías juntas: cuando un arreglo rompe un test, hay
que decidir si el test detectaba una regresión, documentaba el defecto, o
solo se apoyaba en el mecanismo viejo. Las tres cosas se arreglan distinto.

### El falso verde del test de F4

La primera versión del test de F4 (`useUpdateEntryProgress.test.tsx`)
**pasaba igual sin el `scope`**. Con un PATCH de 250 ms, el de notas
terminaba **antes** de que el debounce de 400 ms disparara el de progreso,
así que nunca se solapaban. Se arregló subiendo la demora a 700 ms, o sea
haciendo la ventana más larga que el debounce; recién entonces falla sin el
arreglo, con `expected 2 to be 1`. Apareció porque se comprobó que el test
fallara sin el arreglo; sin esa comprobación seguiría ahí.

### Sin test propio

- **Marcado y accesibilidad** (#28, #31, #32, #33 en parte, #36): cubiertos
  por **tests existentes actualizados**, no por tests nuevos dedicados.
- **#21, #22 y #30 no pueden tener test contra MSW hoy**: el mock no produce
  un `colorIndex` fuera de rango, una respuesta de error sin el envelope del
  contrato ni un `releaseDate` nulo. Es un hallazgo sobre el mock, no sobre
  los tests, y queda como **trabajo pendiente**: que el mock pueda emitir
  esas formas es lo que permitiría cubrirlos. Los arreglos de #21 y #30
  quedan sin red de seguridad automática.
- **F5 y F7**: no consta un test nuevo (pendiente de confirmar).
