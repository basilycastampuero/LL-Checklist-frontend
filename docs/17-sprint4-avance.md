# 17 — Bitácora: Avance Sprint 4 (integración, pulido y deploy)

> Registra el estado real del Sprint 4 (doc 07) a la fecha. No es un cierre de
> sprint: solo la tarea 4.13 está resuelta (implementada, verificada y
> commiteada, pendiente de PR); 4.1 está en curso; 4.11 y 4.12 siguen abiertas; 3.3b y B9
> (deuda del Sprint 3b) siguen diferidas a la espera de que el dueño del
> proyecto registre una app de Twitch. Fecha: 2026-09-24.

## Alcance completado

| # | Tarea | Estado |
|---|---|---|
| 4.13 | Punto de entrada de logout en la UI | ✅ implementada y verificada (rama `feat/logout-y-settings`, sale de `main` tras el merge del PR #5) |

> La tarea está commiteada pero **todavía no mergeada**: la CI
> (`.github/workflows/ci.yml`) es la única verificación que corre fuera de
> esta máquina, así que hasta que el PR contra `main` pase en verde el cierre
> es local.

## Qué se construyó

- **`useSignOut`** (`src/features/auth/hooks/useSignOut.ts`, NUEVO): envuelve
  `useLogout` y navega a `paths.home` con `replace: true`. Devuelve
  `{ signOut, isPending }`.
- **`SettingsPage`** (`src/pages/SettingsPage.tsx`): era un `PlaceholderPage`
  de 5 líneas; ahora implementa las dos secciones que pide
  [06-diseno-ui.md](./06-diseno-ui.md): **Apariencia** (light/dark/system
  sobre `useThemeStore`) y **Cuenta** (avatar, nombre, email, botón de salir).
- **`Header`** (`src/components/layout/Header.tsx`): el avatar deja de ser un
  `<Link>` pelado al perfil y pasa a un `DropdownMenu` (Radix, ya en el
  proyecto) con Perfil / Ajustes / Cerrar sesión. También pasa a usar el
  helper `profilePath(user.id)` en vez de
  `paths.profile.replace(':userId', ...)`.
- **`src/i18n/en.ts`**: nuevas claves `auth.account.{menu,logout,loggingOut}`
  y el bloque `settings.{title,themeTitle,themeBody,accountTitle,signedInAs,logoutBody}`.
- Tests nuevos: `src/components/layout/Header.test.tsx` (4 casos) y
  `src/pages/SettingsPage.test.tsx` (2 casos).

## Decisiones tomadas sobre la marcha (no estaban en los ADRs)

Ninguna cruza la vara de ADR nuevo: son decisiones de UI, ya justificadas en
el código y acá, sin trade-off arquitectónico detrás.

1. **El selector de tema es un `radiogroup` ARIA real**, no tres botones con
   `aria-pressed`: inputs `sr-only` dentro de `<label>`, con anillo de foco
   vía `has-[:focus-visible]:`. Elegir uno entre tres opciones excluyentes es
   semánticamente un radio, y así el lector de pantalla anuncia la posición
   ("2 de 3") y las flechas navegan sin código propio.
2. **`useSignOut` navega de inmediato, sin esperar la resolución del POST**:
   `useLogout` limpia la sesión en `onSettled`, no en `onSuccess`, y esperar
   arriesgaría que `<RequireAuth>` desmonte el componente antes de que corra
   el callback nivel-`mutate` — el mismo peligro que ya se documentó con el
   undo del wizard en el Sprint 3b (hallazgo #2 de la revisión pre-merge,
   [16-sprint3b-avance.md](./16-sprint3b-avance.md)).
3. **El trigger del menú del header lleva `aria-label`**
   (`t.auth.account.menu(name)`): un avatar no tiene texto propio para que un
   lector de pantalla anuncie qué es.

## Gotchas de testing

1. **Falso verde por match de substring**: un assert propio,
   `expect(location).toHaveTextContent('/')`, matcheaba también `/catalog`,
   porque `toHaveTextContent` compara por substring. Corregido a comparación
   exacta sobre `textContent`. Es la **segunda vez** que aparece esta clase de
   error — la primera fue `/my-lists` vs. `/my-lists/2` en la revisión de
   código sobre el árbol de listas
   ([13-sprint3a-avance.md](./13-sprint3a-avance.md)). Dos veces alcanza para
   tratarlo como patrón: evitar `toHaveTextContent` para aserciones de ruta
   cuando una ruta puede ser prefijo de otra.
2. **Radix escucha `pointerdown`, no `click`**: en un script de verificación
   visual por CDP, `el.click()` no abría el `DropdownMenu` del header; hubo
   que despachar eventos de mouse reales (`Input.dispatchMouseEvent`). En
   Vitest no se nota porque `userEvent` simula la secuencia completa de
   punteros, a diferencia de `fireEvent`.

## Verificación

Corrido en esta sesión desde `ll-checklist-frontend/` (rama `feat/logout-y-settings`):

```bash
npm run typecheck   # limpio
npm run lint        # 0 errores
npm run test        # 268 tests, 50 archivos (antes 262 en 48)
```

**Verificación visual** con el binario propio de Playwright vía CDP (Vite
aparte en :5175 contra MSW, no la herramienta MCP de Playwright): `/settings`
en dark 1280x900 y en light 390x844, menú del header abierto en las dos
anchuras, sin scroll horizontal (`scrollWidth - clientWidth === 0`). El
`radiogroup` de tema reporta `light,dark,system*` con `system` marcado por
default.

**No verificado**: nada contra el Odoo local (la tarea no lo requiere) y los
escenarios de accesibilidad con lector de pantalla real siguen sin probarse
(deuda arrastrada desde el Sprint 3a).

## Qué falta (siguiente paso)

- Commitear el trabajo de 4.13 (lo hace el agente de Git, no esta sesión).
- **4.1** (integración backend real) en curso.
- **4.11** (`Space` no selecciona en el árbol) y **4.12**
  (`useUpdateChecklist` sin `scope`) siguen abiertas, ambas ⚪ recortables —
  detalle en [07-plan-de-trabajo.md](./07-plan-de-trabajo.md).
- **3.3b** (OAuth Twitch end-to-end) y **B9** (`GET /auth/oauth/twitch`), deuda
  del Sprint 3b, siguen diferidas: dependen de que el dueño del proyecto
  registre una app de Twitch, trabajo fuera de código.
- Resto del Sprint 4 (4.2 a 4.10) sin empezar.

## Actualización (2026-09-25) — Tarea 4.1: recorrido contra el backend real

> Primer avance registrado de la tarea 4.1. El dueño del proyecto recorrió la
> app en el navegador (rama `feat/logout-y-settings`, dev server propio)
> contra el Odoo local real, sin MSW. La tarea **sigue en curso**, no se
> cierra con esta entrada.

### Qué se recorrió y qué funcionó

Reporte del dueño del proyecto, en sustancia:

1. Uso normal de la app contra el backend real: "hasta ahora todo está
   funcionando normal".
2. Al agregar una misma serie a distintas listas, las copias quedan
   enlazadas entre sí contra el backend real — las copias sincronizadas
   (`isSynced`) funcionan de punta a punta desde la UI.
3. Las sesiones se mantienen cuando corresponde y se cortan cuando
   corresponde, incluido el logout nuevo de la tarea 4.13.

Relevancia técnica del punto 2: la `ir.rule` de `ll.checklist.link.copy`
pasó de OR a AND en ADR-020 (`ll-odoo`, commit `d3be430`) porque el OR
dejaba crear una fila de copia cruzada hacia el link de otro usuario,
dejando a la víctima sin poder escribir su propio progreso. El AND cerró
ese agujero; este recorrido es evidencia de que **no rompió el caso
legítimo** — copias entre listas del mismo dueño — y de que ese caso ahora
también se ejercitó desde la UI real, no solo por HTTP directo. La
verificación original de B7 ("`PATCH` sobre un link sincronizado mueve
todas sus copias") ya cubría esto, pero por HTTP directo contra el Odoo
local, no
a través del flujo de la app (ver
[`../docs-backend/14-resumen-implementacion-api.md`](../docs-backend/14-resumen-implementacion-api.md)).

### Pregunta abierta (sin resolver)

No se sabe si la sincronización entre listas fue **elegida explícitamente**
por el dueño del proyecto en el wizard de vinculación, o si **ocurrió
automáticamente**. Importa porque el doc 04 define la sincronización como
explícita (`syncWithLinkId` en el request), no automática — si resultó
automática, sería un hallazgo de comportamiento real, no solo una
confirmación de lo esperado. Queda anotada como pregunta a confirmar en el
próximo recorrido, sin resolverla en ninguno de los dos sentidos.

### Qué NO se verificó (uso normal, no adversarial)

- El stepper de episodios clickeado rápido (la carrera del debounce de
  400 ms contra un round-trip real más lento) — el único defecto conocido
  que no se puede reproducir contra MSW, porque ahí la latencia simulada
  del `PATCH` de links es de 150 ms y siempre llega antes del próximo envío.
- Vincular algo ya vinculado, para ver el `409 ALREADY_LINKED` con el
  nombre real de la lista devuelto por el backend.
- Abrir la URL de una lista privada sin sesión (incógnito): debe dar `404`
  y no `403` — decisión de contrato ya verificada por B8 vía HTTP directo
  (doc 14), falta confirmarla desde el navegador.

Del logout: se registra tal como lo reportó el dueño del proyecto (la
sesión se corta al cerrar sesión, contra el backend real). **No** se
confirmó específicamente la invalidación de la cookie del lado del servidor
con un F5 posterior al logout — quedó sugerido como paso a seguir, no
confirmado en esos términos; se deja pendiente, no verificado.

### Qué falta

- 4.1 sigue en curso: este recorrido es evidencia de que los flujos ya
  construidos (auth, catálogo, listas, links sincronizados) funcionan de
  punta a punta contra el Odoo real en uso normal, pero no cierra la tarea.
- Día dedicado a buscar errores (propuesto por el dueño del proyecto, sin
  fecha fijada): agenda mínima los tres escenarios adversariales de arriba,
  más la confirmación de la invalidación de cookie post-logout y la
  pregunta abierta de la sincronización.

## Actualización (2026-09-30) — Tareas 4.11 y 4.12: los dos hallazgos abiertos de la revisión post-3b

Las dos deudas de severidad baja que la revisión del árbol de listas dejó
abiertas (#19 y #20 de [13-sprint3a-avance.md](./13-sprint3a-avance.md)) quedan
cerradas. Eran las únicas que seguían vivas de esa revisión.

### 4.11 — `Space` selecciona en el árbol

`useTreeNavigation.ts` manejaba `Enter` pero no `Space`, y el patrón ARIA APG
Tree View pide las dos. La razón por la que hacía falta escribirlo y no salía
gratis: el `treeitem` es un `<li>`, no un `<button>`, así que no existe el click
nativo que `Space` dispararía. Se resolvió agregando `case ' '` al lado de
`case 'Enter'` — ambos caen en el mismo cuerpo.

Dos detalles que valen más que el cambio en sí:

- **El `preventDefault` no es decorativo acá.** Sin él `Space` scrollea la
  página, que es exactamente lo que vuelve inusable la navegación por teclado en
  un árbol largo. Tiene test propio, que comprueba que el keydown queda con
  `defaultPrevented`.
- **No hay competencia por la tecla.** Los dos botones que viven dentro del
  `<li>` (el chevron de expandir y el disparador del menú contextual) tienen
  `tabIndex={-1}`, así que nunca reciben el foco por teclado; y cuando el menú
  Radix está abierto, el foco se va a un portal fuera del `<li>`, así que su
  keydown no burbujea hasta acá. Se verificó leyendo
  `ChecklistTreeItem.tsx` antes de escribir el arreglo, no se asumió.

El comentario explicativo terminó **arriba** del par de `case` y no entre
ellos: entre los dos, ESLint lo cuenta como un case no vacío y dispara
`no-fallthrough`.

### 4.12 — `useUpdateChecklist` con `scope` por nodo

Mismo patrón que `useUpdateEntryProgress` desde el Sprint 3b:
un `scope` con id `checklist-<id>`, que serializa las mutaciones del mismo nodo.

**Cambio de firma, y por qué era inevitable.** `scope` es una opción
**estática** de `useMutation`: TanStack la lee al crear el observer, antes de que
exista ninguna variable de mutación. Como el `id` llegaba en las variables
(`mutate({ id, patch })`), no había forma de derivar el scope de él. El hook
pasó a recibirlo como argumento —`useUpdateChecklist(node.id)`— y las variables
quedaron en solo el patch. Funciona porque `ChecklistNodeMenu` se monta una vez
por nodo, así que cada instancia queda con su propio scope, que es justo el
grano necesario: nodos distintos siguen mutando en paralelo.

**El repro fácil no es el renombre, es el toggle de publicar.** Renombrar pasa
por un diálogo, así que encadenar dos es incómodo; publicar/despublicar usa
`mutate` directo sin diálogo, así que dos clicks seguidos ya ponen dos `PATCH`
en vuelo. Vale anotarlo para quien busque el bug a mano.

**Observación adicional, no arreglada** (no está en el alcance de 4.12 y no es
el hallazgo #20): `handleTogglePublish` calcula `!node.isPublished` leyendo la
prop `node`. Con dos clicks rápidos, ambos pueden leer el mismo valor y mandar
el mismo destino, en vez de alternar. A diferencia del stepper de episodios
—que manda el valor absoluto y por eso es idempotente en cualquier orden— acá
el valor absoluto se **deriva** de un estado que puede estar viejo. El `scope`
lo mitiga (la segunda mutación arranca después de que la primera liquidó y de
su invalidación), pero no lo elimina. Si algún día se ve un toggle que "no
responde" al segundo click, es por acá.

### Verificación

- Los dos arreglos tienen test, y de los tres tests nuevos se comprobó que
  **fallan sin el arreglo** antes de darlos por buenos: los de `Space` dejan de
  pasar al quitar el `case ' '`, y el de `scope` falla con
  `expected 2 to be 1` en el contador de concurrencia. Es la precaución que el
  proyecto ya pagó por no tomar (ocho falsos verdes entre los Sprints 3a y 3b,
  ADR-022).
- El test de 4.12 mide **concurrencia máxima de requests**, no el estado final
  del cache: el estado final depende del refetch de `onSettled` contra el mock,
  que no es determinista en este escenario. La propiedad que el arreglo
  garantiza —que las dos no se solapen— sí lo es.
- `npm run typecheck`, `npm run lint` limpios y **271/271 tests** en 50
  archivos (268 previos + 3 nuevos).

### Arreglo de paso: la suite ya no depende del `.env` de la máquina

Al verificar estas dos tareas aparecieron **tres tests en rojo que no tenían
nada que ver con ellas** (`LoginPage`, `EntryNotesDialog`, `ListEntryRow`). La
causa era un `.env.local` con `VITE_API_MODE=real`, dejado el 2026-09-24 para
probar contra el Odoo local: Vitest carga los `.env`, así que
`features.ratings`/`watchDates` (ADR-004, activos solo en modo mock) se apagaban
y esos tests dejaban de encontrar el puntaje y el botón de Twitch. La CI nunca
lo sufrió porque allá ese archivo no existe — o sea que era una trampa
exclusiva de la máquina de desarrollo, del tipo que hace dudar de un cambio
propio que está bien.

Se cerró fijando `env: { VITE_API_MODE: 'mock' }` en el bloque `test` de
`vite.config.ts`. Es coherente con lo que la suite ya asumía en todo lo demás:
corre contra los handlers de MSW (`server.listen` en `setup.ts`), nunca contra
un backend real; faltaba decirlo explícitamente en vez de heredarlo del entorno.

Verificado empíricamente, no asumido: con el `.env.local` todavía en `real`,
`npm run test` sin ningún prefijo da **271/271**. Y un matiz que quedó anotado
en el propio comentario porque es el que haría perder tiempo: la config pisa
también la variable pasada a mano, así que `VITE_API_MODE=real npx vitest run`
no cambia nada. Es deliberado, pero hay que saberlo.

Encaja bajo la tarea 4.6 (Tests) del plan; no es una tarea nueva.

## Actualización (2026-09-30) — Tarea 4.4: página de error de ruta y banner de offline

Avance de 4.4, **no su cierre** (ver "Qué falta de 4.4" al final).

### Qué había y qué no

Antes de escribir nada se revisó el estado real, porque la tarea nombra cuatro
piezas y dos ya existían:

| Pieza que pide 4.4 | Estado previo |
|---|---|
| Página 404 | **Ya existía** (`NotFoundPage`, enganchada a `path: '*'`) |
| Estado de error con retry dentro de una página | **Ya existía** (`ErrorState`, lo usan las queries) |
| ErrorBoundary por página | **No existía**: ni un `errorElement` en el router |
| Banner de offline | **No existía** nada |

Detalle revelador: el comentario de `ErrorState.tsx` decía "se usa junto a
ErrorBoundary por página" — una promesa a algo que nunca se construyó. Hoy sí
existe.

### La decisión de diseño: `errorElement` en cada ruta, no solo en la raíz

React Router hace burbujear un error de render hasta el `errorElement` más
cercano. Puesto **solo en la raíz**, cualquier error reemplazaría el layout
entero y el usuario quedaría **encerrado** en la pantalla de error, sin header
ni bottom tabs, o sea sin forma de irse a otra parte de la app. Puesto en cada
página, el error queda contenido en el `<Outlet>` y la navegación sobrevive.
La raíz lleva uno igual, como último recurso para cuando lo que falle sea el
layout mismo (`useApplyTheme`, `useMe`), donde no hay página hija a la que
burbujear.

Se aplica con un `map` recursivo (`withErrorElement`) y no repitiendo la
propiedad trece veces, porque lo segundo se olvida: una ruta nueva sin
`errorElement` volvería a la pantalla en blanco y nada lo delataría. **Ese
olvido tiene su propio test**, que recorre el router de producción y falla
nombrando la ruta sin boundary — comprobado inyectando una a mano.

Detalle de tipos que costó un intento: `RouteObject` es una unión discriminada
donde la variante índice exige `children?: undefined`, así que `{...route}` más
un `children` opcional no encaja en ninguna variante. Hay que preguntar por
`route.children` primero para que TypeScript estreche el tipo.

El stack trace se muestra **solo en desarrollo**: en producción filtra rutas de
archivos y estructura interna sin darle nada útil a quien lo lee.

### El offline es un banner y no una página, a propósito

Quedarse sin red no invalida lo que ya está en pantalla: el cache de TanStack
Query sigue sirviendo el catálogo y las listas ya cargadas. Reemplazar todo por
una pantalla de "estás offline" le quitaría al usuario contenido que sí puede
seguir leyendo. Lo que hay que advertir es lo que deja de funcionar: escribir.
Es también lo que pide el plan.

`role="status"` y no `role="alert"`: `alert` interrumpe al lector de pantalla
cortando lo que esté leyendo, y un cambio de conectividad no lo justifica.

El hook (`useOnlineStatus`) va con **`useSyncExternalStore`** y no con
`useState` + `useEffect`, porque es literalmente una suscripción a un valor que
vive fuera de React. La diferencia no es de estilo: con el par
`useState`/`useEffect` hay una ventana entre el primer render y el efecto en la
que se muestra un valor ya viejo, y el caso "el usuario abre la app ya sin
conexión" se erraría porque no hay ningún evento por llegar. Ese caso tiene test.

**Cuánto se le puede creer a `navigator.onLine`:** poco, y está documentado en
el hook. `true` solo significa que hay *alguna* interfaz de red activa, no que
internet sea alcanzable — un router caído o un portal cautivo reportan `true`.
El `false` sí es confiable. Por eso esto sirve para **avisar** y nada en la app
decide lógica con él; detectar si el backend responde es trabajo de
`lib/http.ts`, que ya traduce el fallo de red a un `ApiError`.

### Verificación

`typecheck` y `lint` limpios, **281/281 tests** en 52 archivos (271 previos + 10
nuevos).

Revisión visual con el Chromium de Playwright por CDP, en light y dark a 360px
y 1440px. Dos cosas que solo se vieron ahí:

1. **El banner y los estados de error de las páginas se complementan.** Con la
   red cortada, la home muestra su propio "Something went wrong" en los
   carruseles (las queries fallaron) y el banner de arriba **explica por qué**.
   Antes ese error aparecía sin contexto.
2. **El header decía "AniTrack".** El renombre del 2026-09-30 había cubierto la
   prosa y los identificadores, pero no el nombre visible en la app: el
   wordmark, las iniciales del logo y el `<title>` de `index.html`. Se corrigió
   (ver ADR-023). Las iniciales, además, estaban **hardcodeadas** en
   `Header.tsx` contra ADR-007, que es justo por qué el renombre no las alcanzó
   — no estaban donde viven los strings. Pasaron a `t.app.mark`.

La secuencia del banner se verificó en el orden real del usuario y no forzando
el estado: la app carga online (`navigator.onLine: true`, sin banner), después
se corta la red por CDP (`onLine: false`) y el banner aparece. El primer
intento fue mal justamente por atajar —disparar el evento `offline` a mano no
engaña al componente, porque relee `navigator.onLine` en cada render—, lo cual
es una confirmación de que el hook hace lo correcto.

### Qué falta de 4.4

- El criterio de aceptación es "errores inyectados por MSW demostrables". El
  mecanismo existe (`?mockError=INTERNAL`, header `x-mock-error`) y los estados
  de error de las queries también, pero **no se recorrió página por página**
  que cada una muestre su estado de error y su retry con un error inyectado.
  Eso es lo que queda para cerrar la tarea.
- El camino "en producción NO se filtra el stack trace" no está cubierto por
  test: haría falta remockear `lib/env`. Está verificado por lectura, no por
  test.
