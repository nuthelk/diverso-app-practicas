import AlertaError from '@/shared/ui/AlertaError';
import Campo from '@/shared/ui/Campo';
import Dialogo from '@/shared/ui/Dialogo';
import Icono from '@/shared/ui/Icono';
import { ICONOS } from '@/shared/ui/iconos';
import { fechaCorta, fechaTexto, hoyISO } from '@/shared/lib/format';
import { yaSalio, type Plan } from '../model/plan';
import { useFechasPlan } from '../hooks/useFechasPlan';
import { numeroDe } from './numero';

/** Diálogo «Fechas y cupos» de un plan: agrega una fecha con su cupo y lista las fechas (las más recientes primero). */
export default function FechasModal({ plan, oncerrar }: { plan: Plan; oncerrar: () => void }) {
  const { fecha, setFecha, cupo, setCupo, guardando, error, agregar, quitar } = useFechasPlan(plan, oncerrar);

  const fechas = [...plan.plan_dates].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <Dialogo
      abierto
      titulo="Fechas y cupos"
      descripcion={plan.titulo}
      oncerrar={oncerrar}
      pie={
        <button type="button" className="btn btn-secundario" onClick={oncerrar}>
          Listo
        </button>
      }
    >
      <form className="flex flex-wrap items-end gap-3" onSubmit={agregar}>
        <Campo
          etiqueta="Fecha"
          clase="min-w-40 flex-1"
          control={(atributos) => (
            <input
              {...atributos}
              type="date"
              required
              min={hoyISO()}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="campo cifra"
            />
          )}
        />
        <Campo
          etiqueta="Cupo"
          clase="w-24"
          control={(atributos) => (
            <input
              {...atributos}
              type="number"
              required
              min="1"
              max="40"
              value={cupo ?? ''}
              onChange={(e) => setCupo(numeroDe(e.target.value))}
              className="campo cifra"
            />
          )}
        />
        <button type="submit" disabled={guardando} className="btn btn-primario">
          Agregar
        </button>
      </form>
      {error && <AlertaError clase="mt-3">{error}</AlertaError>}

      <ul className="mt-4">
        {fechas.length > 0 ? (
          fechas.map((f) => (
            <li key={f.id} className="flex items-center gap-3 border-t border-linea py-2 first:border-t-0">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2">
                  <span className="cifra text-destacado">{fechaCorta(f.fecha)}</span>
                  {yaSalio(plan, f) && <span className="pildora pildora-neutra">Ya salió</span>}
                </p>
                <p className="text-detalle text-tinta-2">
                  <span className="cifra">
                    {f.cupo_disponible} de {f.cupo_total}
                  </span>{' '}
                  cupos libres
                </p>
              </div>
              <button
                type="button"
                className="grid size-11 shrink-0 place-items-center rounded-pildora text-tinta-2 transition-colors hover:bg-heliconia-bg hover:text-heliconia"
                title="Eliminar fecha"
                aria-label={`Eliminar la fecha del ${fechaTexto(f.fecha)}`}
                onClick={() => quitar(f)}
              >
                <Icono trazo={ICONOS.papelera} clase="size-4" />
              </button>
            </li>
          ))
        ) : (
          <li className="py-6 text-center text-tinta-2">Sin fechas todavía — agrega la primera.</li>
        )}
      </ul>
    </Dialogo>
  );
}
