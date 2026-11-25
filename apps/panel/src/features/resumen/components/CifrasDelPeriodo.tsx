import FranjaMetricas from '@/shared/ui/FranjaMetricas';
import Metrica from '@/shared/ui/Metrica';
import type { Kpi } from '../model/resumen';

/**
 * Las cifras del período en una franja: cuatro cambian con el filtro de fecha y la quinta, el próximo pago, no depende
 * de él. `Metrica` no admite un enlace en su aclaración: la quinta lleva su propia celda, con el mismo formato.
 */
export default function CifrasDelPeriodo({
  kpis,
  pago,
}: {
  kpis: Kpi[];
  pago: { etiqueta: string; valor: string; sub: string };
}) {
  return (
    <section aria-labelledby="h-cifras" data-cifras="">
      <h2 id="h-cifras" className="sr-only">
        Cifras del período seleccionado
      </h2>
      <FranjaMetricas>
        {kpis.map((k) => (
          <Metrica key={k.clave} etiqueta={k.etiqueta} valor={k.valor} sub={k.sub} tono={k.tono} principal={k.principal} />
        ))}
        <div className="tarjeta px-4 py-4 sm:px-5">
          <dt className="text-detalle font-bold text-tinta-2">{pago.etiqueta}</dt>
          <dd className="mt-1">
            <span className="cifra block text-seccion font-bold [overflow-wrap:anywhere] sm:text-pagina">{pago.valor}</span>
            <span className="mt-0.5 block text-detalle text-tinta-2">
              {pago.sub} ·{' '}
              <a className="enlace" href="#/liquidaciones">
                Ver liquidaciones
              </a>
            </span>
          </dd>
        </div>
      </FranjaMetricas>
    </section>
  );
}
