import { lazy } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { RootLayout } from '@/components/layout/RootLayout'
import { RequireAuth } from '@/components/layout/RequireAuth'
import { paths } from '@/router/paths'
import { env } from '@/lib/env'

// Lazy loading por ruta (doc 06/07): cada página es su propio chunk.
const HomePage = lazy(() => import('@/pages/HomePage'))
const CatalogPage = lazy(() => import('@/pages/CatalogPage'))
const FranchiseDetailPage = lazy(() => import('@/pages/FranchiseDetailPage'))
const ContentDetailPage = lazy(() => import('@/pages/ContentDetailPage'))
const SearchPage = lazy(() => import('@/pages/SearchPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const AuthCallbackPage = lazy(() => import('@/pages/AuthCallbackPage'))
const MyListsPage = lazy(() => import('@/pages/MyListsPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const PublicListPage = lazy(() => import('@/pages/PublicListPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))
const ErrorPage = lazy(() => import('@/pages/ErrorPage'))
const DevUiPage = lazy(() => import('@/pages/DevUiPage'))

/**
 * Cuelga un `errorElement` de cada ruta, recursivamente (tarea 4.4).
 *
 * React Router hace burbujear un error de render hasta el `errorElement` más
 * cercano. Puesto solo en la raíz, cualquier error reemplazaría el layout
 * entero y dejaría al usuario sin header ni bottom tabs, o sea encerrado en la
 * pantalla de error. Puesto en cada página, el error queda contenido en el
 * `<Outlet>` y la navegación sigue viva.
 *
 * Se hace con un `map` y no repitiendo la propiedad trece veces porque lo
 * segundo se olvida: una ruta nueva sin `errorElement` volvería a la pantalla
 * en blanco, y nada lo delataría hasta que algo falle en producción.
 */
function withErrorElement(routes: RouteObject[]): RouteObject[] {
  // Las dos ramas están separadas a propósito y no unificadas con un spread
  // condicional: `RouteObject` es una unión discriminada donde la variante
  // índice exige `children?: undefined`, así que un solo objeto con `...route`
  // más un `children` opcional no encaja en ninguna de las dos variantes.
  // Preguntar por `route.children` primero es lo que le deja a TypeScript
  // estrechar el tipo.
  return routes.map((route) =>
    route.children
      ? {
          ...route,
          errorElement: <ErrorPage />,
          children: withErrorElement(route.children),
        }
      : { ...route, errorElement: <ErrorPage /> },
  )
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    // Último recurso: si lo que revienta es el layout mismo (`useApplyTheme`,
    // `useMe`), no hay página hija a la que burbujear.
    errorElement: <ErrorPage />,
    children: withErrorElement([
      { path: paths.home, element: <HomePage /> },
      { path: paths.catalog, element: <CatalogPage /> },
      { path: paths.franchise, element: <FranchiseDetailPage /> },
      { path: paths.content, element: <ContentDetailPage /> },
      { path: paths.search, element: <SearchPage /> },
      { path: paths.login, element: <LoginPage /> },
      { path: paths.register, element: <RegisterPage /> },
      { path: paths.authCallback, element: <AuthCallbackPage /> },
      { path: paths.profile, element: <ProfilePage /> },
      { path: paths.publicList, element: <PublicListPage /> },
      // Rutas privadas detrás del guard de sesión.
      {
        element: <RequireAuth />,
        children: [
          { path: paths.myLists, element: <MyListsPage /> },
          { path: paths.myList, element: <MyListsPage /> },
          { path: paths.settings, element: <SettingsPage /> },
        ],
      },
      // Galería del design system, solo en desarrollo.
      ...(env.isDev ? [{ path: paths.devUi, element: <DevUiPage /> }] : []),
      { path: '*', element: <NotFoundPage /> },
    ]),
  },
])
