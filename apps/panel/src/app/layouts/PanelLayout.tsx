import { Outlet } from 'react-router';
import Shell from '@/features/agencias/components/Shell';

/** Las secciones de la agencia: todas van dentro del marco con navegación (`Shell`). Es una ruta sin `path`. */
export default function PanelLayout() {
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}
