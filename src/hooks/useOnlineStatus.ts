import { useSyncExternalStore } from 'react'

function subscribe(onStoreChange: () => void) {
  window.addEventListener('online', onStoreChange)
  window.addEventListener('offline', onStoreChange)
  return () => {
    window.removeEventListener('online', onStoreChange)
    window.removeEventListener('offline', onStoreChange)
  }
}

function getSnapshot() {
  return navigator.onLine
}

/**
 * `true` mientras el navegador se considere conectado (tarea 4.4).
 *
 * Va con `useSyncExternalStore` y no con `useState` + `useEffect` porque eso es
 * exactamente lo que este hook es: una suscripción a un valor que vive **fuera**
 * de React. La diferencia práctica no es de estilo — con el par
 * `useState`/`useEffect` hay una ventana entre el primer render y el efecto en
 * la que el componente muestra un valor que ya puede ser viejo (si la conexión
 * se cortó justo ahí, el evento se pierde porque el listener todavía no
 * existía). `useSyncExternalStore` lee el snapshot en cada render y React se
 * encarga de que nadie vea un valor desactualizado.
 *
 * **Cuánto se le puede creer a `navigator.onLine`.** Poco, y conviene saberlo
 * antes de construir algo encima: `true` solo significa que el sistema tiene
 * *alguna* interfaz de red activa, no que internet esté alcanzable. Un router
 * caído, un portal cautivo de hotel o un DNS roto reportan `true`. El `false`,
 * en cambio, sí es confiable: no hay interfaz. Por eso esto sirve para **avisar**
 * (un banner) y no para decidir lógica — nada en la app debería dejar de
 * intentar una request porque este hook diga `false`. Detectar de verdad si el
 * backend responde es trabajo de la capa HTTP, que ya traduce el fallo de red a
 * un `ApiError` (`lib/http.ts`).
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot)
}
