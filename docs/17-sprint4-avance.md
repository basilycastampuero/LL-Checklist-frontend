# 17 — Bitácora: Avance Sprint 4 (integración, pulido y deploy)

> Registra el estado real del Sprint 4 (doc 07). No es un cierre de sprint.
> Cuerpo y primeras secciones escritos el 2026-09-24 (4.13, mergeada en el PR
> #6); las actualizaciones fechadas al final traen lo posterior: 4.1 en curso,
> 4.11, 4.12, 4.4, 4.3 y 4.6 cerradas (2026-09-30); F1 y F2 de la
> auditoría cerrados (2026-10-01); 4.7a (deploy de la demo mock) cerrada y
> mergeada (2026-10-02); 4.5 (performance) en curso con criterio cumplido
> pendiente de re-medición (2026-10-06). 3.3b y B9 (deuda del
> Sprint 3b) siguen diferidas a la espera de que el dueño del proyecto
> registre una app de Twitch.

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

Primera mitad de 4.4 (error de ruta y offline). La tarea **se cerró después,
el mismo día**, con el barrido de la sección siguiente: ahí está el criterio de
aceptación.

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

### Lo que esta primera mitad dejó pendiente

El camino "en producción NO se filtra el stack trace" no está cubierto por
test: haría falta remockear `lib/env`. Está verificado por lectura, no por
test. (El otro pendiente que figuraba acá, recorrer las páginas con un error
inyectado, se resolvió en la sección siguiente.)

## Actualización (2026-09-30) — Tarea 4.4 cerrada: inyección de fallos arreglada y barrido de ocho rutas

Rama `sprint4/errores-y-barrido-a11y`, sin commitear al escribir esto.

### La inyección por query nunca funcionó

`CLAUDE.md` y los comentarios de `src/mocks/handlers.ts` documentaban probar
los estados de error "sin tocar código" con `?mockError=INTERNAL` en la query o
con el header `x-mock-error`. **La parte de la query nunca anduvo**:
`injectedError()` busca el parámetro en la URL de la *request de API*, y nada
lo ponía ahí; el `?mockError=` de la barra de direcciones no viajaba a ninguna
parte. Se comprobó en el navegador antes de afirmarlo: con el parámetro
puesto, `/catalog` cargaba normal. Solo el header (y la URL de la request
armada a mano) funcionaba.

Importa porque era **el criterio de aceptación de 4.4** ("errores inyectados
por MSW demostrables"): sin esto la tarea no se podía cerrar.

Arreglo: un interceptor de request en `src/lib/http.ts`, **solo en modo
mock**, que lee `mockError` de `window.location.search` y lo manda como
header `x-mock-error`. Se lee en cada request, no una vez al crear el cliente,
para que alcance con navegar sin recargar.

### El barrido, ruta por ruta

Ocho rutas en el navegador (Chromium de Playwright por CDP, 1440px, modo mock,
sesión iniciada vía la API de mocks), cada una sin inyección y con
`?mockError=INTERNAL`:

| Ruta | Resultado |
|---|---|
| Home, Catálogo, Detalle de franquicia, Detalle de contenido, Búsqueda, Perfil público | `ErrorState` con retry con la inyección; sin ella, sin error |
| Mis listas, Ajustes (privadas) | **No mostraban error: redirigían a `/login`.** Defecto real, ver abajo |

Tras el arreglo de abajo, las ocho demuestran su estado de error: **8/8**.

### Defecto real: un 500 en `/auth/me` expulsaba al login

`useMe` hacía `if (query.isError) clearSession()` ante **cualquier** error.
Un 500 dejaba al usuario como `unauthenticated` y `<RequireAuth>` lo mandaba a
`/login?next=...`, con la cookie intacta, frente a un formulario que no
arregla nada porque el servidor sigue fallando. Un 500 no es un fallo de
autenticación. Decisión y alternativas en **ADR-024**.

Arreglo en tres piezas:

- `src/store/sessionStore.ts`: `SessionStatus` gana `'unresolved'` y la acción
  `setUnresolved()`, que cambia el status **sin tocar `user`**.
- `useMe`: solo `UNAUTHORIZED` llama `clearSession()`. Otro error sin usuario
  previo da `setUnresolved()`. Otro error **con** usuario ya resuelto no toca
  nada: un refetch fallido no le cierra la sesión a quien la tenía.
- `src/components/layout/RequireAuth.tsx`: camino nuevo para `unresolved` con
  `ErrorState` y retry (`refetchQueries` de `authKeys.me()`) en lugar de
  redirigir. `useIsFetching` muestra skeleton mientras el reintento está en
  vuelo, porque el store sigue en `unresolved` hasta que resuelva.

Tres cosas para no perder:

- **El texto se corrigió tras verlo en una captura.** La primera versión decía
  "seguís con la sesión iniciada" mientras el header ofrecía "Log in", y era
  una afirmación sin respaldo: con un 500 no se sabe si la sesión vive. Quedó
  diciendo solo lo que se sabe. Es el segundo hallazgo de esta clase que
  aparece en una revisión visual y no en el código (el primero fue el
  wordmark "AniTrack", arriba): argumento a favor de que la captura figure en
  el Definition of Done.
- **Acoplamiento implícito**, documentado en el código: `refetchQueries` solo
  actúa sobre queries que ya existen. El retry funciona porque `useMe` vive en
  `RootLayout`, padre del guard; si se montara `RequireAuth` sin `useMe`, el
  botón no haría nada y no se quejaría.
- **Efecto en el flujo real**: como `useMe` reintenta una vez los errores que
  no son 401 (backoff ~1s), el usuario ve el skeleton alrededor de un segundo
  más antes del error de sesión.

### Tests

Los escribió el agente de tests: 3 en `src/lib/http.test.ts`, 3 en
`src/features/auth/hooks/useMe.test.tsx` y 4 en
`src/components/layout/RequireAuth.test.tsx` (archivo nuevo). **291/291 en 53
archivos** (antes 281/281 en 52). De cada test nuevo se comprobó que **falla
sin su arreglo**, revirtiendo temporalmente el código y viendo el rojo (misma
precaución que ADR-022).

**Lo que los tests no cubren:**

- El camino "en modo real el interceptor NO se registra": requeriría `vi.mock`
  de `@/lib/env`, frágil por el orden de imports. Es la misma limitación que
  el stack trace en producción (arriba).
- No hay test directo de `setUnresolved()` en el store; queda cubierto
  indirectamente por los de `useMe`.

### Verificación

`npm run typecheck` y `npm run lint` limpios; `npm run test` 291/291 en 53
archivos. El barrido y las capturas se hicieron con el Chromium propio de
Playwright por CDP (no la herramienta MCP), en light y dark, a 360px y 1440px.

### Pregunta abierta (sin resolver): ¿carrera de arranque de MSW?

Durante el barrido hubo **dos corridas** en que el catálogo cargó normal pese
a la inyección. Al instrumentar con trazas de red dio 5 de 5 correcto
(`/api/v1/franchises` devolvió 500 dos veces —la original y el reintento del
QueryClient— y la URL conservó el parámetro en todas las requests). La
hipótesis es una carrera de arranque del service worker de MSW en el dev
server, **pero no se reprodujo una vez instrumentada**. Ni resuelta ni
descartada: si vuelve a aparecer un "no falla cuando debería", empezar por
acá.

### Estado de 4.4

**Cerrada.** Las cuatro piezas del plan existen (ErrorBoundary por página, retry,
404, banner offline) y el criterio de aceptación se demostró ruta por ruta
(8/8) tras el arreglo de la inyección. Reservas honestas: lo anterior es
verificación **local y en modo mock**; la rama no está commiteada ni pasó por
CI, y queda la pregunta abierta de arriba.

## Actualización (2026-09-30) — Tareas 4.3 y 4.6: barrido responsive + a11y y cobertura

Rama `sprint4/errores-y-barrido-a11y`, sin commitear ni pasar por CI al
escribir esto. Todo lo medido es local, en modo mock.

### 4.3 — Barrido responsive + a11y

El criterio de aceptación del plan es "Checklist en PR"; el checklist y su
resultado son esta sección.

**Método.** Chromium propio de Playwright por CDP (no la herramienta MCP),
sobre el dev server en modo mock y con sesión iniciada. Se recorrieron
**6 rutas x 4 anchos x 2 temas**:

- Rutas: `/`, `/catalog`, `/franchise/1`, `/search?q=a`, `/my-lists`,
  `/settings`.
- Anchos: 360, 768, 1024 y 1440. Temas: light y dark.
- Aparte, un recorrido de 14 tabulaciones en la home a 1440 verificando que
  cada parada tenga anillo de foco visible.

**Checklist y resultado, tras los arreglos** (reverificado en el navegador en
los dos temas, las 24 combinaciones de ruta x ancho):

| Chequeo | Resultado |
|---|---|
| Overflow horizontal | 0 |
| Contraste WCAG AA de todo texto visible | 0 fallos |
| Botones y enlaces sin nombre accesible | 0 |
| Imágenes sin `alt` | 0 |
| Inputs sin etiqueta | 0 |
| `h1` por página | exactamente 1 |
| Saltos de nivel de encabezado | ninguno |
| Foco visible en el recorrido por teclado (14 paradas, home a 1440) | 14/14 |

**Hallazgos reales (3), los tres arreglados:**

1. **`<button>` anidado en un `<a>` en el header**
   (`src/components/layout/Header.tsx`), en el control de búsqueda que solo se
   renderiza bajo `md`, es decir **solo visible a 360px**. El `aria-label`
   vivía en el `<a>` y el icono es `aria-hidden`, así que el `<button>`
   interno no tenía nombre propio (un lector anunciaba un botón sin nombre), y
   además contenido interactivo dentro de un enlace no es HTML conforme. Se
   resolvió con `<Button asChild>` envolviendo el `<Link>`, el patrón que el
   resto del código ya usa.
2. **`/catalog` no tenía ningún encabezado**, ni un `h1`: quien navega por
   encabezados no sabía en qué página estaba y las tarjetas (`h3`) quedaban
   sin nada encima.
3. **`/search` saltaba de `h1` a `h3`**: faltaba un `h2` entre el título y las
   tarjetas.

Para 2 y 3 se agregaron encabezados **`sr-only`**: un `h1` de página en el
catálogo y un `h2` de región para el grid de resultados en catálogo y
búsqueda, con los strings en `t.catalog.pageHeading` y
`t.catalog.resultsHeading`. Van invisibles a propósito: el layout del doc 06
no lleva título visible en esas páginas y un arreglo de accesibilidad no
debería cambiar el diseño. **El nivel de las tarjetas no se tocó**: en la home
es correcto (h1 del hero → h2 del carrusel → h3 de la tarjeta); lo que faltaba
eran los niveles intermedios en esas dos páginas.

**Gotcha metodológico: el auditor de contraste que casi arruina el
resultado.** El primer auditor dio decenas de fallos con ratio exactamente
1.00 (texto del mismo color que su fondo), imposible para texto visible. La
causa: Tailwind v4 define los colores en `oklch()`, `getComputedStyle` los
devuelve como `oklch(0.145 0 0)` y el parser los leía como si fueran RGB. El
truco habitual del canvas para normalizar a `rgb()` **tampoco sirve**, porque
Chrome conserva `oklch`. Se reescribió con la conversión oklch → sRGB lineal
(matriz de Björn Ottosson), que además es lo que WCAG necesita para la
luminancia relativa, y se validó contra dos valores conocidos: blanco sobre
negro da 21 y `#767676` sobre blanco da 4.54. Solo con esa validación los
resultados sirven; **el primer resultado se descartó entero**. Quien repita la
auditoría debe validar el auditor con esos dos valores antes de confiar en él.

**Lo que este barrido no cubre.** Es una auditoría automatizada de reglas
medibles, no una prueba de uso con tecnología asistiva: **sigue sin haber
verificación con un lector de pantalla real** (NVDA/VoiceOver). La deuda
arrastrada desde el Sprint 3a (docs 13 y 16) sigue abierta, con su nota
actualizada.

### 4.6 — Tests y cobertura

Primera medición de cobertura del proyecto; se cerraron los huecos que valían
la pena, elegidos por riesgo y no por porcentaje.

| Métrica | Antes | Después |
|---|---|---|
| Statements | 84.82% | **88.14%** |
| Branches | 76.3% | **79.3%** |
| Functions | 82.26% | **85.34%** |
| Lines | 87.99% | **91.24%** |
| Tests | 291 en 53 archivos | **335 en 60 archivos** |

Los 44 tests nuevos están en 7 archivos (6 nuevos y uno extendido):

- `HomePage.tsx` (0%, siendo la pantalla de aterrizaje): 9 tests con los
  cuatro estados del Definition of Done (loading, data, empty, error con
  retry), el orden de "Recently added", el umbral de 3 franquicias por género
  y el tope de 3 filas.
- `FranchiseCarousel.tsx` (0%): 4 tests.
- `BottomTabs.tsx` (0%, es toda la navegación en mobile): 7 tests.
- `lib/queryClient.ts` (0%): 7 tests. Lo valioso es la **política
  documentada** (`staleTime` 60s, sin reintentos ante 4xx), y se cuentan
  ejecuciones reales: un 403 y un 404 se intentan una vez; un 500, un corte de
  red y un `Error` genérico, dos.
- `useApplyTheme.ts` (0%): 7 tests, incluida la desuscripción del listener.
- `entryTree.ts`, líneas 129-139 (`patchEntryFields`): 5 tests, incluidos
  structural sharing y no mutación del input.
- `RootLayout.tsx` y `NotFoundPage.tsx` (0%): 5 tests. `RootLayout` además
  monta el `OfflineBanner` de 4.4.

**Sin cubrir a propósito** (decisión, no olvido): `App.tsx` y `main.tsx`
(bootstrap), `DevUiPage.tsx` (galería solo de desarrollo), `PlaceholderPage.tsx`
(trivial), `mocks/browser.ts` (setup de MSW para el navegador) y
`src/components/ui/**` (shadcn generado: testearlo sería testear Radix). Tampoco
las ramas defensivas de `noUncheckedIndexedAccess` en `entryTree.ts` ni dos
fallbacks `?? 0` / `?? []` en `HomePage.tsx` que el schema Zod no deja llegar
al componente.

**Verificación por mutación.** De los tests nuevos se comprobó que fallan al
romper temporalmente lo que prueban: 20 mutaciones con `sed`, restaurando el
archivo cada vez. **Una sobrevivió**: bajar el umbral de género de 3 a 2 en
`HomePage` no hacía fallar nada, porque el tope de 3 filas cortaba antes de
llegar al género con 2 franquicias. Se agregó un test específico y entonces sí
falló. Es un ejemplo concreto de para qué sirve la prueba por mutación: el
hueco no se veía en el porcentaje de cobertura.

**Hallazgo menor, no arreglado:** en `BottomTabs.tsx` el prop
`end={tab.to === paths.home}` es redundante, porque React Router ya trata
`to="/"` como match exacto. Quitarlo no rompe ningún test. No es un bug: es
código que no hace nada.

### Verificación

`npm run typecheck` y `npm run lint` limpios; `npm run test` **335/335 en 60
archivos**; `npm run test:cov` con los porcentajes de arriba; barrido de a11y
por CDP en light y dark, 6 rutas x 4 anchos. Nada de esto está commiteado ni
pasó por CI: el criterio "CI verde" de 4.6 se cumple recién cuando el PR pase.

### Qué falta

- Commitear y abrir el PR de la rama `sprint4/errores-y-barrido-a11y` (lo hace
  el agente de Git).
- Verificación con lector de pantalla real, deuda abierta.
- Resto del Sprint 4 (4.2, 4.5, 4.7 a 4.10) sin empezar; 4.1 en curso.

## Actualización (2026-10-01) — F1 y F2 de la auditoría del frontend

**Origen: la auditoría, no el plan.** No es una tarea numerada de
[07-plan-de-trabajo.md](./07-plan-de-trabajo.md): son los dos hallazgos de
mayor severidad de la auditoría de antipatrones
([18-auditoria-frontend-2026-10.md](./18-auditoria-frontend-2026-10.md)), que
se arreglaron dentro del Sprint 4. Los otros 24 se cerraron después, el
mismo día (entrada siguiente).
Detalle completo (escenario, archivo:línea y falso verde originales) en las
fichas F1 y F2 del doc 18; acá va el resumen.

### F1 — el flush del desmontaje salteaba el `scope`

`useUpdateEntryProgress.ts`: el cleanup mandaba el commit pendiente por
`listsService.updateLink` directo, sin pasar por el `scope` del hook, y con
un commit en vuelo salían **dos PATCH absolutos del mismo link en
paralelo**; si el servidor liquidaba el viejo último, el usuario quedaba con
el número anterior al que había visto, y el refetch lo confirmaba.

Arreglo: el ref `Burst` guarda `inFlightPromise?: Promise<boolean>`; los
sitios que disparan un commit usan `mutateAsync(x).then(() => true, () =>
false)` y el cleanup espera esa promesa antes de mandar el de arrastre.
**Matiz de diseño:** si el commit en vuelo falla, el de arrastre **no** se
manda, por la política del hook de abortar la cadena (su `onError` revierte
y avisa; mandar lo pendiente después separaría la pantalla de lo que el
usuario vio revertirse). De ahí el booleano. El hook ya no usa `mutate`.

### F2 — el aviso de fallo del toggle de publicar era silencioso

El toast vivía en las opciones de la llamada a `mutate()`; TanStack v5 las
gatea con `hasListeners()`, así que si el componente se desmontaba
(colapsar la carpeta padre, cambiar de bottom tab) no corrían: el árbol se
revertía pero el usuario creía haber publicado una lista que seguía privada.
Misma forma que el toast de "deshacer" del wizard (lección escrita en
`useDeleteLink.ts` y `useSignOut.ts`).

Arreglo: `useUpdateChecklist(checklistId, options?)` acepta
`errorToast?: string` y su `onError` lo dispara solo si se pasó.
**Matiz:** mover el toast al hook sin más habría duplicado el aviso del
renombre, que ya muestra su error inline en el diálogo; por eso
`ChecklistNodeMenu` usa dos instancias, `togglePublish` (con `errorToast`) y
`renameChecklist` (sin él), que comparten `scope`.

### Tests

Tres nuevos: dos en `useUpdateEntryProgress.test.tsx` (*"desmontar con uno
en vuelo y uno pendiente no los manda en paralelo"*, que afirma concurrencia
máxima 1 y orden `[13, 14]`; y *"si el commit en vuelo falla, el desmontaje
NO manda el de arrastre"*) y uno en `ChecklistNodeMenu.test.tsx` (*"publicar
y desmontar antes de que falle el PATCH igual avisa"*; `renderTree` ahora
devuelve el resultado de RTL para poder desmontar).

Trampa metodológica: el primer intento del test de F1 devolvía
`HttpResponse.json({ ok: true })` y fallaba con un solo PATCH; no era el
arreglo sino que ese objeto no pasa la validación Zod del service, el commit
contaba como fallido y el flush abortaba la cadena (correctamente). Se
resolvió con `await request.clone().json()` para contar sin consumir el body
y `return undefined` para que responda el handler real.

### Verificación

`npm run typecheck` y `npm run lint` limpios; `npm run test` **338/338 en 60
archivos** (eran 335). Los tres tests nuevos **fallan sin su arreglo**,
revirtiendo el código temporalmente: el de concurrencia con `expected 2 to be
1`, el de la cadena abortada con `expected [ 13, 14 ] to deeply equal
[ 13 ]`, y el de F2 al volver el toast a las opciones de `mutate()`.
**No se verificó en el navegador ni contra el Odoo real.** F1 sigue sin ser
observable en uso normal contra MSW: los tests inyectan `delay(700)` para
superar el debounce de 400 ms. Nada está commiteado ni pasó por CI.

## Actualización (2026-10-01) — Cierre de los 24 hallazgos restantes de la auditoría

**Origen: la auditoría, no el plan.** Ninguno es tarea numerada de
[07-plan-de-trabajo.md](./07-plan-de-trabajo.md). Con esto la auditoría
([18-auditoria-frontend-2026-10.md](./18-auditoria-frontend-2026-10.md)) queda
en **26 hallazgos, 26 cerrados, 0 abiertos**. Los 24 son #21 a #36 y F3 a F10;
cada ficha del doc 18 conserva su escenario original y suma un bloque
"Cierre". Acá va el resumen por tema.

### El borde con el Odoo real (#21, #22, #23, #29, #30)

- **#21 y #30** (`catalog/services/schemas.ts`): `colorIndex` pasó de
  `z.number().min(1).max(11)` a `z.number().int()` y `releaseDate` a
  `.nullable()`; `formatReleaseDate` acepta `null` y `yearsOf`
  (`mocks/seed/derive.ts`) quedó guardado para no envenenar el rango de años
  con un `NaN`. Regla: **Zod valida forma, no convenciones estéticas**
  (**ADR-025**).
- **#22** (`apiErrorMessage.ts`): solo `VALIDATION` y `ALREADY_LINKED`
  propagan el `message` del backend; el resto cae al fallback de la
  operación. El `'Network error'` de `lib/http.ts` quedó marcado como
  marcador técnico, no texto de UI.
- **#23 y #29** (`PublicListPage.tsx`): solo `NOT_FOUND` significa "privada o
  inexistente"; el resto va a `ErrorState` con retry. Guarda de id nulo
  contra el skeleton eterno.

### Catálogo y búsqueda (#26, #27, #35)

`?page=` fuera de rango tiene rama propia con botón "Go to first page";
`clearFilters` acepta `keep` y la búsqueda pasa `['q']` para no borrar el
término; `YearRangeInput` normaliza al valor aplicado y avisa con
`role="alert"` el rango invertido.

### Accesibilidad y marcado (#24, #25, #28, #31, #32, #33, #34, #36)

- **#24** (`EpisodeStepper`): región viva con el número visible intacto y el
  texto `valor / total` en `sr-only`; botones con `aria-disabled` en vez de
  `disabled` en el piso y el tope, porque `disabled` mandaba el foco al
  `<body>`.
- **#33** (`OfflineBanner`): el `role="status"` se renderiza siempre y solo
  alterna el contenido.
- **#28**: el kebab de nodo es `opacity-100 md:opacity-0`, visible siempre
  bajo `md`.
- **#31, #32, #36**: `aria-valuenow` clampeado; `t.common.pagination`;
  marcador "ya está en tu lista" en `sr-only` y `role="img"` en los iconos.
- **#25**: `role="alert"` cuando falta el nombre a mostrar en el wizard.
- **#34**: el efecto de `EntryNotesDialog` depende de `entry.linkId` y no del
  objeto, con un `eslint-disable` puntual.

### Antipatrones recurrentes (F3 a F10)

- **F3 y F4** (juntos, por pedido del dueño del proyecto):
  `useUpdateEntryMeta` declara ``scope: { id: `entry-${linkId}` }``, el
  **mismo id** que `useUpdateEntryProgress`. Compartirlo es el punto: F3 se
  arreglaría con un id propio, F4 no, porque los dos hooks escriben la misma
  `queryKey` y restauran el array entero; con ids distintos el rollback de uno
  borra el resultado del otro.
- **F5, F6 y F7** (mock): el `DELETE /me/links/:id` baja `isSynced` si queda
  una sola aparición del `versionId` y renumera el `order`; se eliminó el
  `aggregatedProgress` escrito a mano del 5001 y `GET
  /me/checklists/:id/entries` llama `refreshAggregates` (ADR-022 en la
  lectura).
- **F8**: `AddToListButton` muestra skeleton en `idle` y error con retry en
  `unresolved` (ADR-024).
- **F9 y F10**: aserciones de ruta exactas en `SearchBar.test.tsx`; el
  docstring de `useUpdateEntryProgress` dice que el flush invalida
  `listKeys.all`.

### Código muerto

Se borró `src/pages/PlaceholderPage.tsx` (huérfano desde 4.13) y las claves
`t.app.tagline` y `t.lists.entry.saving`.

### Tests

Un test nuevo para F4 en `useUpdateEntryProgress.test.tsx` (escenario cruzado
entre los dos hooks, midiendo concurrencia máxima) y uno que afirma que un
`VALIDATION` propaga su mensaje. Dos hallazgos del proceso, detalle en la
sección 9 del doc 18:

- **Tres tests afirmaban el bug de #22** (esperaban el `message` crudo de un
  `INTERNAL`), y otros fijaban comportamientos erróneos en #24, #27, #33 y
  #36. No eran falsos verdes sino tests que documentaban el defecto; se
  actualizaron al contrato nuevo.
- **El test de F4 era un falso verde mío**: pasaba sin el `scope` porque con
  un PATCH de 250 ms el de notas terminaba antes de que el debounce de 400 ms
  disparara el de progreso. Con 700 ms falla sin el arreglo (`expected 2 to
  be 1`). Apareció solo por comprobar que fallara sin el arreglo.

Los arreglos de marcado y accesibilidad (#28, #31, #32, #33 en parte, #36)
quedaron cubiertos por tests existentes actualizados, no por tests nuevos.
**#21, #22 y #30 no pueden tener test contra MSW hoy**, porque el mock no
emite un `colorIndex` fuera de rango, un error sin envelope ni un
`releaseDate` nulo: hace falta que el mock pueda emitir esas formas.

### Verificación

`npm run typecheck` y `npm run lint` limpios; `npm run test` **340/340 en 60
archivos** (338 al cerrar F1 y F2). **No se verificó en el navegador ni
contra el Odoo real**: #28 y #33 siguen con su experimento sin correr y la
prueba con lector de pantalla real sigue siendo deuda. Nada está commiteado
ni pasó por CI.

## Actualización (2026-10-02) — Tarea 4.7a: deploy de la demo en modo mock

Trabajo iniciado el 2026-10-01, mergeado el 2026-10-02. **4.7 queda parcial**:
4.7a (publicar la demo sin backend) hecha; 4.7b (rewrites al Odoo real)
bloqueada. Rama `sprint4/deploy-vercel`, commit `92842ad`
(`chore(deploy): config de Vercel con rewrite de SPA y modo mock (4.7a)`),
**PR #9** mergeado el 2026-10-02 (merge commit `5013255`), CI `verify` en verde.
URL: `https://ll-checklist-frontend.vercel.app`.

### Qué se hizo

Preset **Vite** en Vercel, Root Directory en la raíz del repo (la raíz del repo
*es* el proyecto frontend). Dos archivos:

- **`vercel.json`** (nuevo, raíz del repo):
  - `build.env.VITE_API_MODE = "mock"`. El default de producción es `real`
    (ADR-004, `src/lib/env.ts`): sin esto la demo le pegaría a un Odoo
    inexistente, y el fallo no sería ruidoso sino una demo que levanta "bien"
    y muestra estados de error en todas las pantallas. Va en el archivo para
    quedar versionado. **Además** se seteó la misma variable como Environment
    Variable en el panel de Vercel, a propósito redundante: `build.env` es una
    clave vieja de Vercel y no hay certeza de que la respete en proyectos
    nuevos. Mismo criterio que la doble guarda del `?mockError=` en
    `lib/http.ts`: cuando el fallo es silencioso, no se depende de un solo
    guardarraíl.
  - `rewrites: [{ source: "/(.*)", destination: "/index.html" }]`, el fallback
    de SPA. Vercel sirve primero los archivos reales y aplica el rewrite solo a
    lo que no matchea, así que el catch-all no se come `/assets/*` ni el
    service worker.
  - `headers` para `/mockServiceWorker.js`: `Cache-Control: no-cache, no-store,
    must-revalidate` y `Service-Worker-Allowed: /`. Un service worker cacheado
    deja sirviendo la versión vieja sin explicación.
  - `buildCommand: "npm run build"` en vez del `vite build` del preset: es
    `tsc -b && vite build`, así que un error de tipos rompe el deploy en vez
    de publicarse.
- **`package.json`**: `engines.node = "22.x"`, el mismo Node que la CI. Sin
  esto el deploy corre el default del host y la protección de tener la CI un
  escalón por debajo de la máquina de desarrollo deja de cubrir el deploy.
  Consecuencia conocida y aceptada: en la máquina local (Node 24)
  `npm install` imprime `npm warn EBADENGINE`. Es warning, no error.

### Verificación

**Local, antes del deploy:** `npm run typecheck` limpio, `npm run lint` limpio,
**342/342 tests en 60 archivos**. Build en modo mock servido con `vite preview`
y abierto con el Chromium propio de Playwright: MSW arrancó e **interceptó 5
requests**, `rootChars=40178`, `h1=Catalog`, **10 tarjetas renderizadas**,
service worker registrado y controlando la página.

Por qué hace falta el rewrite, demostrado y no asumido: con `dist/` servido por
un servidor estático tonto (`python3 -m http.server`), `/` da **200** y
`/catalog` da **404**.

**Producción, con curl:**

- `/`, `/catalog`, `/search`, `/my-lists`, `/login`, `/settings`: todas **200**
  sirviendo `index.html` (1047 bytes, `<title>LL Checklist</title>`,
  `id="root"`).
- `/ruta-inventada`: **200** con `index.html`; entra al router y muestra la
  **404 propia de la app** (la de 4.4), no la de Vercel.
- `/assets/index-bF4rlSAt.js`: 200 `application/javascript` (los archivos
  reales no se reescriben). `/mock-images/avatar-1.svg`: 200 `image/svg+xml`.
- `/mockServiceWorker.js`: 200 con los dos headers pedidos, aplicados tal cual.
- Modo del build confirmado leyendo el chunk `assets/env-DwAsEuae.js` del
  deploy: `apiMode:'mock'`. Ese chunk es **byte-idéntico** al del build local
  ya verificado, igual que `index-bF4rlSAt.js` y el chunk de MSW
  `browser-ntP6V3Ge.js`.

**Render en producción, confirmado (2026-10-02).** No quedó apoyado en el
argumento de los bytes idénticos: se leyó el DOM del deploy por CDP, con tiempo
real. `rootChars=40178` (el mismo número que el build local), `<title>LL
Checklist</title>`, `h1="Catalog"` y `h2="Results"` —los encabezados `sr-only`
que agregó 4.3—, **10 tarjetas** y 11 imágenes con títulos reales del catálogo
mockeado (Attack on Titan, Cyberpunk: Edgerunners, Demon Slayer, Fullmetal
Alchemist, Hollow Knight), `navigator.serviceWorker.controller` presente y
ningún `role="alert"` en pantalla.

### Dos tropiezos

**1. El primer deploy daba el 404 de Vercel en toda ruta profunda porque
`vercel.json` nunca llegó al repo.** Se había dejado sin trackear a propósito
(para no trabar un `checkout` durante el merge del PR #8) y Vercel construyó un
árbol sin ese archivo. El síntoma era idéntico a "el rewrite no funciona".

**2. Una pantalla en blanco diagnosticada que no existía.** Al verificar el
build local con Chromium headless usando `--virtual-time-budget`, el `root`
quedaba vacío y se concluyó que el build en modo mock estaba roto. Eran dos
errores encadenados:

- **`--virtual-time-budget` bloquea el registro de service workers.**
  Comprobado con un `navigator.serviceWorker.register()` directo: ni resuelve
  ni rechaza. En modo mock `main.tsx` hace `await enableMocking()` antes del
  `createRoot`, así que la página queda en blanco para siempre; y como ese
  `.then()` no tiene `.catch()`, el fallo es totalmente silencioso.
- **El "control" que parecía confirmarlo era inválido**: el dev server sí
  renderizaba, pero porque el `.env.local` de la máquina tiene
  `VITE_API_MODE=real`, así que ahí MSW nunca arrancó. Se comparaban dos cosas
  distintas.

Cómo verificar de verdad, ya probado. Sin virtual time no se puede usar
`--dump-dom`, así que hay dos caminos: para una página **propia**, inyectarle
una sonda que mande los datos afuera con un beacon (`new Image().src` a un
servidor local); para una página **ajena o ya desplegada**, que no se puede
instrumentar, **CDP con tiempo real** — lanzar Chromium con
`--remote-debugging-port`, leer el target de `http://127.0.0.1:9222/json` y
hablarle con el `WebSocket` nativo de Node (`Page.navigate`, esperar de verdad,
`Runtime.evaluate`), sin instalar ninguna dependencia. Fue así como se confirmó
el render de producción.

**Lo que NO funciona, comprobado:** precargar el service worker con un
`--user-data-dir` reutilizado y después correr `--dump-dom` con virtual time.
Se intentó y el proceso se cuelga igual, incluso con el SW ya activo — el
virtual time bloquea algo más que el registro.

Esta trampa **se parece a la del parser `oklch`** (4.3): una herramienta de
medición que produce un resultado falso y convincente. En los dos casos el
resultado se descartó entero.

### Lo que queda (4.7b) y notas hacia adelante

- **4.7b bloqueada:** los rewrites de `/api` y `/web/image` al Odoo real
  (ADR-005). Según [08-preguntas-backend.md](../docs-backend/08-preguntas-backend.md)
  §3, el Odoo de Chano va a vivir **self-hosted en Railway** y **no va a haber
  staging remoto** (prefiere que se instale Odoo localmente). Sin URL pública
  de Railway no hay a dónde proxear.
- **Para cuando se haga 4.7b:** Vercel aplica los `rewrites` en orden. El
  catch-all actual se come todo, así que las reglas de `/api` y `/web/image`
  tienen que ir **antes** o nunca se alcanzan.
- **Para 4.5 (performance):** en modo mock el chunk de MSW son **443,67 kB
  (164,21 kB gzip)** y se **esperan antes de montar React**
  (`await enableMocking()` en `main.tsx`). Va a pesar en el criterio de 4.5
  (Lighthouse >= 90 perf en `/catalog`).
- **Detalle cosmético sin consecuencia:** `/mock-images/` (directorio pelado)
  devuelve `index.html` por el catch-all. Nada pide un directorio.
- **Decisión abierta (del dueño, no hallazgo):** el proyecto en Vercel quedó
  bajo el scope `woo-ka`, la cuenta **secundaria** de GitHub, mientras el repo
  está en la **principal** (`basilycastampuero/LL-Checklist-frontend`). Si la
  URL va al README como pieza de portafolio (4.8), probablemente conviene que
  esté del lado de la cuenta con la que muestra su trabajo. Moverla implica
  recrear el proyecto en Vercel y cambiar la URL: es más barato decidirlo antes
  de 4.8.

## Actualización (2026-10-06) — Tarea 4.5 (performance): el criterio ya se cumplía, la hipótesis era falsa

Rama `sprint4/4.5-y-cierre-4.7a`, commit `1bbe44c`, **sin pushear ni mergear**.
**4.5 NO está cerrada.** El criterio de aceptación (Lighthouse >= 90 perf/a11y
en `/catalog`) se cumple en producción **con el código anterior a este
cambio**; falta volver a medir producción después de desplegarlo. Si esa
medición cae por debajo de 90, el cambio se revierte.

### El hallazgo que da vuelta la tarea

Lighthouse real (v12, throttling por defecto: Slow 4G simulado) contra la demo
pública `https://ll-checklist-frontend.vercel.app/catalog`, **antes de tocar
una línea de código**:

- **performance 92**, **accessibility 100**. El criterio pide >= 90 en las
  dos: **ya pasaba**.
- FCP 2,3 s (score 74), LCP 2,7 s (85), Total Blocking Time 30 ms (100), CLS
  0,001 (100), Speed Index 4,0 s (80).
- Ninguna de las cosas que el plan lista para 4.5 (`React.lazy` de modales
  pesados, memo en grids, bundle analyze) hizo falta para cumplir el criterio.
- Desglose del LCP en producción: TTFB 763 ms, **Load Delay 1808 ms**, Load
  Time 125 ms, Render Delay 16 ms.

Oportunidad que sí queda abierta: **`unused-javascript`, 600 ms y 98 KB de
ahorro potencial**:

| Chunk | Tamaño | Sin usar |
|---|---|---|
| `index-*.js` | 112 KB | 50 KB (45%) |
| `PageWrapper-*.js` | 49 KB | 23 KB (48%) |
| `browser-*.js` (MSW) | 96 KB | 24 KB (25%) |

**El chunk de MSW es el mejor aprovechado de los tres**, lo que contradice la
hipótesis con la que arrancó la tarea.

### La hipótesis que se cayó (resultado negativo)

La tarea arrancó con una idea **equivocada**: que MSW estaba en el camino
crítico porque `main.tsx` hacía `await enableMocking()` antes del
`createRoot`, y que eso explicaba los 1808 ms de Load Delay del LCP (la nota
"Para 4.5" de la sección de 4.7a de este documento partía de esa suposición).

**Medición previa**, CDP en localhost **sin throttling**, build en modo mock
contra build en modo real servidos igual: FCP 200 ms vs 100 ms, JS transferido
358 KB vs 255 KB, chunk de MSW 159 KB transferidos. Es decir, MSW costaba 100
ms de FCP y 103 KB en el mejor de los casos; ya ahí el número era más chico de
lo supuesto.

Se hizo el cambio igual (ver abajo) y se midió A/B con Lighthouse **local,
mismas condiciones, build viejo contra build nuevo**:

| | viejo | nuevo |
|---|---|---|
| performance | 81 | 80 |
| FCP | 2,9 s | 3,1 s (+268 ms) |
| LCP | 4,2 s | 4,1 s (−36 ms) |
| Speed Index | 2,9 s | 3,1 s (+268 ms) |
| Total Blocking Time | 30 ms | 40 ms |
| LCP Load Delay | 3500 ms | 3426 ms (−74 ms) |

**Conclusión: no hubo mejora de performance atribuible al cambio.** El Load
Delay queda en ~3,4 s en los dos builds, así que el `await` no era su causa.
Y una sola corrida de Lighthouse es demasiado ruidosa para afirmar ni mejora
ni empeoramiento: 1 punto de diferencia y ±270 ms de FCP están dentro de la
varianza. Para zanjar si el cambio ayuda o perjudica harían falta **varias
corridas por build**, no una.

Dos cosas más que la medición dejó claras:

- **Lighthouse local no es comparable con producción**: 81 local contra 92 en
  producción sobre el mismo código, por el TTFB y el throttling simulado. Para
  juzgar el criterio hay que medir producción.
- La causa del Load Delay de ~1,8 s (producción) / ~3,4 s (local) **sigue sin
  identificarse**. Queda como pregunta abierta, no como hallazgo.

### El cambio que se mantuvo: por robustez, NO por performance

- **`src/lib/mswGate.ts`** (nuevo): una compuerta que **falla abierta**.
  Arranca abierta y solo se cierra si alguien la cierra. Un contexto que no
  arranca MSW —los tests, que usan el server de Node y no el worker del
  navegador— no espera nada y no hay que acordarse de abrirla desde ningún
  `setup`. Al revés, olvidarse de abrirla colgaría todas las requests.
- **`src/main.tsx`**: React monta de entrada; MSW arranca en paralelo. El
  `.finally` que abre la compuerta corre también en el camino de error, a
  propósito.
- **`src/lib/http.ts`**: el interceptor de request (el mismo que traduce
  `?mockError=`) espera `mocksReady()` antes de cada request. Es la única
  espera a MSW que queda en la app.

**Lo que esto sí arregla, y es real:** antes, si MSW no arrancaba, el
`enableMocking().then(...)` sin `.catch()` no corría nunca y la app quedaba en
**pantalla blanca sin un error en ninguna parte**. Ese modo de falla no es
teórico: mordió durante 4.7a y costó un diagnóstico entero (ver "Dos
tropiezos" más arriba). Ahora las requests salen, fallan, y la app muestra los
estados de error que ya tiene. En una demo pública, una pantalla blanca muda es
el peor resultado posible.

### El bug de accesibilidad que Lighthouse encontró y 4.3 no

`src/features/catalog/components/MultiSelectFilter.tsx` tenía
`aria-label={label}` en un botón cuyo texto visible era
`{label}: {triggerText}`. Mostraba **"Genres: All genres"** (o "Genres: 2
selected") y su nombre accesible era solo **"Genres"**.

- **`aria-label` no complementa el texto visible, lo reemplaza.** El botón ya
  tenía un nombre accesible correcto en su propio texto y el atributo lo
  pisaba, tirando justo la parte útil: el estado del filtro. Un lector de
  pantalla no se enteraba de cuántos filtros había activos; alguien que navega
  por voz decía lo que veía y el comando no matcheaba.
- **El arreglo es borrar el atributo, no cambiarlo.** Afecta dos controles:
  Genres y Platforms.
- **Verificado de forma independiente de Lighthouse**, leyendo el nombre
  accesible computado por Chrome vía CDP (`Accessibility.getPartialAXTree`):
  ahora los dos triggers dan "Genres: All genres" y "Platforms: All
  platforms", con origen `contents`, coincidiendo con el texto visible.
- **Contraste que vale como lección:** el trigger del menú del avatar
  **conserva** su `aria-label` ("Account menu for Alex Rivera") y está bien,
  porque no tiene texto visible. La regla no es "`aria-label` es malo", es
  "solo sirve cuando no hay texto visible que usar".
- **Por qué 4.3 no lo detectó:** ese barrido verificó que los controles
  **tuvieran** nombre accesible, no que **coincidiera** con el texto visible.
  Son dos reglas distintas. **Límite conocido del barrido de 4.3.**
- Lighthouse le da **peso 0** a esta auditoría en la categoría, por eso
  accessibility marcaba 100 **con la auditoría fallando**. Un 100 de
  accessibility no significa que no haya nada que arreglar.

### Verificación

`npm run typecheck` limpio, `npm run lint` limpio, **345/345 tests en 61
archivos** (antes 342 en 60). Tres tests nuevos en `src/lib/mswGate.test.ts`;
del que importa se comprobó que **falla sin su arreglo** (`expected [ Array(1)
] to deeply equal []`). Ese test incluye un `finally` que reabre la compuerta:
si una aserción fallara con la compuerta cerrada colgaría el resto de la
suite.

**No verificado:** el efecto del cambio sobre performance en producción (no
está desplegado), y nada pasó por CI (rama sin pushear).

### Trampa de herramienta: Lighthouse en WSL ensucia el repo

Correr Lighthouse en WSL escribe directorios temporales **dentro del repo**:
aparecieron tres `C:\Users\USUARIO\AppData\Local\lighthouse.XXXXX/` en la raíz
del proyecto, porque toma el `TMP` de Windows. Hubo que borrarlos a mano. Se
evita con `TMPDIR=/tmp`. Es la tercera trampa de medición de este sprint,
junto a la del parser `oklch` (4.3) y la de `--virtual-time-budget` (4.7a).

### Lo que queda pendiente de 4.5

- **Volver a medir Lighthouse en producción después de desplegar este
  cambio.** Es el criterio real; si cae por debajo de 90, se revierte.
- La oportunidad de `unused-javascript` (600 ms / 98 KB), concentrada en el
  bundle de entrada y `PageWrapper`, no en MSW.
- Si se quiere zanjar el efecto del cambio en performance, varias corridas de
  Lighthouse por build.
