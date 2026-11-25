import { fechaTexto } from '@/shared/lib/format';
import type { ResenaMostrada } from '../model/resenas';

const ESTRELLAS = [1, 2, 3, 4, 5];

/** Una reseña: estrellas, lo que escribió el viajero (si escribió), quién, qué plan y hace cuánto. La usan el Resumen y la página de reseñas. */
export default function ResenaItem({ resena: r }: { resena: ResenaMostrada }) {
  return (
    <li className="border-t border-linea pt-3 first:border-t-0 first:pt-0">
      <figure data-resena="">
        <span className="inline-flex gap-0.5 text-pico" role="img" aria-label={`${r.estrellas} de 5 estrellas`}>
          {ESTRELLAS.map((n) => (
            <svg key={n} className={`size-4 ${n > r.estrellas ? 'opacity-30' : ''}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" />
            </svg>
          ))}
        </span>
        {r.texto ? <blockquote className="mt-1 leading-snug">{r.texto}</blockquote> : null}
        <figcaption className="mt-1 text-detalle text-tinta-2">
          <b className="text-tinta">{r.nombre}</b> · {r.plan} ·{' '}
          <time dateTime={r.fecha} title={fechaTexto(r.fecha)}>
            {r.cuando}
          </time>
        </figcaption>
      </figure>
    </li>
  );
}
