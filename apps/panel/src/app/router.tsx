import { createHashRouter, data, useParams, type LoaderFunctionArgs, type RouteObject } from 'react-router';
import RaizLayout, { PantallaCargando } from './layouts/RaizLayout';
import PanelLayout from './layouts/PanelLayout';
import ErrorPage from './ErrorPage';
import InicioPage from './InicioPage';
import { match as esDocumentoLegal } from './params/doc';
import LoginPage from '@/features/auth/pages/LoginPage';
import StarterPage from '@/features/auth/pages/StarterPage';
import AceptarDocumentosPage from '@/features/legal/pages/AceptarDocumentosPage';
import LegalPage from '@/features/legal/pages/LegalPage';
import AdminAgenciasPage from '@/features/admin/pages/AdminAgenciasPage';
import AdminDispersionesPage from '@/features/admin/pages/AdminDispersionesPage';
import OnboardingPage from '@/features/agencias/pages/OnboardingPage';
import PerfilAgenciaPage from '@/features/agencias/pages/PerfilAgenciaPage';
import ResenasPage from '@/features/resenas/pages/ResenasPage';
import ResumenPage from '@/features/resumen/pages/ResumenPage';
import PlanesPage from '@/features/planes/pages/PlanesPage';
import PlanFormPage from '@/features/planes/pages/PlanFormPage';
import VentasPage from '@/features/ventas/pages/VentasPage';
import LiquidacionesPage from '@/features/liquidaciones/pages/LiquidacionesPage';
import LiquidacionDetallePage from '@/features/liquidaciones/pages/LiquidacionDetallePage';
import CuentaDispersionPage from '@/features/liquidaciones/pages/CuentaDispersionPage';

/** Respuesta 404 del router: la dibuja `ErrorPage` como «No encontramos esta página». */
const noEncontrada = () => data(null, { status: 404, statusText: 'Not Found' });

/**
 * Envoltorios de ruta: leen los parámetros de la URL con `useParams` y se los pasan a la página como props
 * (`<PlanFormPage planId={id} />`). Así las páginas no dependen del router y se prueban solo con props.
 * La `key` rehace la página al cambiar de id (otro plan, otra liquidación) para que no arrastre el estado del anterior.
 */
export function LegalRuta() {
  const { doc } = useParams();
  return <LegalPage doc={doc ?? ''} />;
}

export function EditarPlanRuta() {
  const { id } = useParams();
  return <PlanFormPage key={id ?? ''} planId={id} />;
}

export function DetalleLiquidacionRuta() {
  const { id } = useParams();
  return <LiquidacionDetallePage key={id} id={id!} />;
}

/**
 * Árbol de rutas del panel (todas sus URLs; `routes/arbol.test` las fija). Todo cuelga del layout raíz; las
 * secciones de la agencia van además dentro de `PanelLayout` (el Shell). El hijo sin ruta con `errorElement` hace que
 * un error o un 404 se dibujen DENTRO del layout raíz (con tema, guard, toast).
 */
export const rutas: RouteObject[] = [
  {
    element: <RaizLayout />,
    hydrateFallbackElement: <PantallaCargando />,
    errorElement: <ErrorPage />,
    children: [
      {
        errorElement: <ErrorPage />,
        children: [
          { index: true, element: <InicioPage /> },
          { path: 'login', element: <LoginPage /> },
          { path: 'starter', element: <StarterPage /> },
          { path: 'consentimiento', element: <AceptarDocumentosPage /> },
          {
            // El documento es opcional y, si viene, tiene que existir (si no, 404).
            path: 'legal/:doc?',
            loader: ({ params }: LoaderFunctionArgs) => {
              if (params.doc !== undefined && !esDocumentoLegal(params.doc)) throw noEncontrada();
              return null;
            },
            element: <LegalRuta />,
          },
          { path: 'admin', element: <AdminAgenciasPage /> },
          { path: 'admin/dispersiones', element: <AdminDispersionesPage /> },
          {
            element: <PanelLayout />,
            children: [
              { path: 'onboarding', element: <OnboardingPage /> },
              { path: 'perfil', element: <PerfilAgenciaPage /> },
              { path: 'resenas', element: <ResenasPage /> },
              { path: 'dashboard', element: <ResumenPage /> },
              { path: 'planes', element: <PlanesPage /> },
              { path: 'planes/nuevo', element: <PlanFormPage /> },
              { path: 'planes/editar/:id?', element: <EditarPlanRuta /> },
              { path: 'ventas', element: <VentasPage /> },
              { path: 'liquidaciones', element: <LiquidacionesPage /> },
              { path: 'liquidaciones/:id', element: <DetalleLiquidacionRuta /> },
              { path: 'cuenta-dispersiones', element: <CuentaDispersionPage /> },
            ],
          },
          // Cualquier otra dirección: 404 dentro del layout raíz.
          {
            path: '*',
            loader: () => {
              throw noEncontrada();
            },
          },
        ],
      },
    ],
  },
];

/** El router del panel: por hash (`#/planes`), porque el hosting estático no devuelve index.html para otras rutas. */
export function crearRouter() {
  return createHashRouter(rutas);
}
