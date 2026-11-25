import Tarjeta from '@/shared/ui/Tarjeta';
import type { ResenaMostrada } from '../model/resenas';
import ResenaItem from './ResenaItem';

/** «Reseñas recientes»: las últimas tres, con el enlace a la página con todas. */
export default function ResenasRecientes({ resenas }: { resenas: ResenaMostrada[] | null }) {
  return (
    <div data-resenas="">
      <Tarjeta
        titulo="Reseñas recientes"
        descripcion="No dependen del período"
        accion={
          <a href="#/resenas" className="enlace -my-3 inline-flex min-h-11 items-center text-detalle" aria-label="Ver todas las reseñas">
            Ver todas
          </a>
        }
      >
        {resenas === null ? (
          <p className="text-tinta-2" data-sin-carga="">
            No pudimos cargar las reseñas ahora.
          </p>
        ) : resenas.length === 0 ? (
          <p className="text-tinta-2" data-sin-resenas="">
            Aún no tienes reseñas. Aparecerán aquí cuando tus viajeros las escriban.
          </p>
        ) : (
          <ul className="grid gap-3">
            {resenas.map((r, i) => (
              <ResenaItem key={i} resena={r} />
            ))}
          </ul>
        )}
      </Tarjeta>
    </div>
  );
}
