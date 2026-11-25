import { useId } from 'react';
import EsqueletoPagina from '@/shared/ui/EsqueletoPagina';
import Empty from '@/shared/ui/Empty';
import Icono from '@/shared/ui/Icono';
import { ICONOS } from '@/shared/ui/iconos';
import Pagina from '@/shared/ui/Pagina';
import { usePlanForm } from '../hooks/usePlanForm';
import EncabezadoPlan from '../components/plan-form/EncabezadoPlan';
import SeccionEsencial from '../components/plan-form/SeccionEsencial';
import SeccionDescripcion from '../components/plan-form/SeccionDescripcion';
import SeccionIncluye from '../components/plan-form/SeccionIncluye';
import SeccionItinerario from '../components/plan-form/SeccionItinerario';
import SeccionEncuentro from '../components/plan-form/SeccionEncuentro';

/** Crear (sin `planId`) o editar un plan. La ruta la rehace con otra `key` al cambiar de plan. */
export default function PlanFormPage({ planId }: { planId?: string }) {
  const uid = useId();
  const {
    d,
    setD,
    duracionCantidad,
    setDuracionCantidad,
    duracionUnidad,
    setDuracionUnidad,
    cargando,
    guardando,
    errorCarga,
    errorServidor,
    intentado,
    erroresPolitica,
    textoVistaPrevia,
    errorDePrecio,
    pendientes,
    resumenRef,
    formRef,
    irAlCampo,
    guardar,
  } = usePlanForm(planId);

  if (cargando) return <EsqueletoPagina ancho={820} filas={4} clase="h-40" />;

  if (errorCarga) {
    return (
      <Pagina ancho={820}>
        <div className="tarjeta">
          <Empty icono="alerta" titulo="No pudimos abrir el plan" mensaje={errorCarga}>
            <a href="#/planes" className="btn btn-secundario">
              Volver a planes
            </a>
          </Empty>
        </div>
      </Pagina>
    );
  }

  return (
    <Pagina ancho={820}>
      <EncabezadoPlan planId={planId} guardando={guardando} />

      {(pendientes.length > 0 || errorServidor) && (
        <div
          ref={resumenRef}
          role="group"
          aria-labelledby={`${uid}-resumen`}
          tabIndex={-1}
          className="mt-5 rounded-hoja-chica border border-heliconia bg-heliconia-bg p-4 text-tinta"
        >
          <h2 id={`${uid}-resumen`} className="flex items-center gap-2 text-destacado text-heliconia">
            <Icono trazo={ICONOS.alerta} clase="size-5" />
            {errorServidor && pendientes.length === 0 ? 'No pudimos guardar el plan' : 'Revisa estos puntos para poder guardar'}
          </h2>
          {errorServidor && (
            <>
              <p className="mt-2">{errorServidor}</p>
              <p className="mt-1 text-detalle text-tinta-2">Lo que escribiste sigue aquí; puedes intentarlo de nuevo.</p>
            </>
          )}
          {pendientes.length > 0 && (
            <ul className="mt-2 grid gap-1">
              {pendientes.map((p) => (
                <li key={p.campo}>
                  <button
                    type="button"
                    className="py-1 text-left font-semibold underline underline-offset-4"
                    onClick={() => irAlCampo(p.campo)}
                  >
                    {p.mensaje}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <form id="form-plan" ref={formRef} className="mt-5 space-y-4" onSubmit={guardar}>
        <SeccionEsencial
          d={d}
          setD={setD}
          duracionCantidad={duracionCantidad}
          setDuracionCantidad={setDuracionCantidad}
          duracionUnidad={duracionUnidad}
          setDuracionUnidad={setDuracionUnidad}
          errorPrecio={errorDePrecio}
        />
        <SeccionDescripcion d={d} setD={setD} />
        <SeccionIncluye d={d} setD={setD} />
        <SeccionItinerario d={d} setD={setD} />
        <SeccionEncuentro d={d} setD={setD} errores={erroresPolitica} intentado={intentado} textoVistaPrevia={textoVistaPrevia} />
      </form>
    </Pagina>
  );
}
