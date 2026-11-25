import type { ReactNode } from 'react';

export const ANCHO_DATOS = 1920;

/**
 * Contenedor de una pantalla del panel: mismo aire a los lados y arriba. Las pantallas de datos llenan todo el ancho
 * (tope `ANCHO_DATOS` para pantallas gigantes); los formularios y textos de lectura pasan un `ancho` menor para
 * que las líneas sigan siendo cómodas de leer.
 */
export default function Pagina({ ancho = ANCHO_DATOS, children }: { ancho?: number; children: ReactNode }) {
  return (
    <div className="aparecer px-4 pt-6 pb-12 sm:px-6 lg:px-10 lg:pt-8">
      <div className="mx-auto" style={{ maxWidth: ancho }}>
        {children}
      </div>
    </div>
  );
}
