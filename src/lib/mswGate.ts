/**
 * Compuerta entre el montaje de React y el arranque de MSW.
 *
 * Hasta 4.5, `main.tsx` hacía `await startMockWorker()` **antes** de montar
 * React, y eso tenía dos costos. El de performance: el chunk de MSW (96 KB
 * transferidos) más el registro del service worker quedaban en el camino
 * crítico entre el HTML y el primer pixel, con el LCP acumulando 1,8 s de
 * "Load Delay" porque las imágenes no se podían ni descubrir hasta que React
 * montara. Y el de robustez: si MSW fallaba, el `.then()` no corría nunca y la
 * app quedaba en pantalla blanca, sin un error en ninguna parte.
 *
 * Ahora React monta de entrada y lo único que espera a MSW es la capa HTTP,
 * desde el interceptor de `lib/http.ts`. Los componentes renderizan sus
 * skeletons mientras tanto, que ya existen porque el Definition of Done los
 * exige.
 *
 * La compuerta **falla abierta** a propósito: arranca abierta y solo se cierra
 * si alguien la cierra explícitamente. Así, un contexto que no arranca MSW —los
 * tests, que usan el server de Node y no el worker del navegador— no espera
 * nada y no hay que acordarse de abrirla desde ningún `setup`. Si fuera al
 * revés, olvidarse de abrirla colgaría todas las requests, que es exactamente
 * el modo de falla que esto viene a eliminar.
 */
let pending: Promise<void> | null = null
let release: (() => void) | null = null

/**
 * Cierra la compuerta y devuelve la función que la abre. Llamar a la función
 * devuelta es obligatorio en todos los caminos, incluido el de error: con MSW
 * caído conviene que las requests salgan y fallen —la app tiene estados de
 * error— antes que quedarse esperando para siempre.
 */
export function holdUntilMocksReady(): () => void {
  pending = new Promise<void>((resolve) => {
    release = resolve
  })
  return () => {
    release?.()
    release = null
    pending = null
  }
}

/** Espera a MSW solo si la compuerta está cerrada. Abierta, no cuesta nada. */
export function mocksReady(): Promise<void> {
  return pending ?? Promise.resolve()
}
