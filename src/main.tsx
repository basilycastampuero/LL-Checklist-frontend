import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from '@/App'
import { isMockMode } from '@/lib/env'
import { holdUntilMocksReady } from '@/lib/mswGate'

// MSW arranca **en paralelo** al montaje de React, no antes (ADR-001 sigue
// valiendo: en modo mock toda la API la sirve el worker).
//
// Lo que espera a MSW es solo la capa HTTP, a través de la compuerta que lee el
// interceptor de `lib/http.ts`. El razonamiento completo está en
// `lib/mswGate.ts`; en una línea: tener a MSW en el camino crítico le costaba
// 1,8 s de Load Delay al LCP y convertía cualquier fallo suyo en una pantalla
// blanca silenciosa.
//
// El `.finally` es la parte que no se puede omitir: si el import o el arranque
// del worker fallan, la compuerta se abre igual y las requests salen a la red y
// fallan con los estados de error que la app ya tiene. Un error visible es
// mejor que una espera infinita.
if (isMockMode) {
  const openGate = holdUntilMocksReady()
  void import('@/mocks/browser')
    .then(({ startMockWorker }) => startMockWorker())
    .catch((error: unknown) => {
      console.error(
        '[mocks] MSW no arrancó; la app va a mostrar sus estados de error:',
        error,
      )
    })
    .finally(openGate)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
