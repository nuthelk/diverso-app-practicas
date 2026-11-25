import Pagina, { ANCHO_DATOS } from './Pagina';
import Skeleton from './Skeleton';

/** Marcadores de carga de una pantalla: `filas` bloques con la altura de `clase`. */
export default function EsqueletoPagina({
  filas = 4,
  clase = 'h-14',
  ancho = ANCHO_DATOS,
}: {
  filas?: number;
  clase?: string;
  ancho?: number;
}) {
  return (
    <Pagina ancho={ancho}>
      <div className="space-y-3" role="status" aria-label="Cargando">
        <Skeleton clase="h-14 w-80 max-w-full rounded-hoja-chica" />
        {Array.from({ length: filas }, (_, i) => (
          <Skeleton key={i} clase={`rounded-hoja ${clase}`} />
        ))}
      </div>
    </Pagina>
  );
}
