import Skeleton from '@/shared/ui/Skeleton';
import Pagina from '@/shared/ui/Pagina';
import PageHeader from '@/shared/ui/PageHeader';
import Icono from '@/shared/ui/Icono';
import AlertaError from '@/shared/ui/AlertaError';
import { ICONOS } from '@/shared/ui/iconos';
import Empty from '@/shared/ui/Empty';
import { fechaBogota } from '@/features/planes/model/plan';
import { actividadPorDia } from '../model/calendario';
import { diaLargo } from '../model/fechas';
import { periodoInicial, textoChip } from '../model/periodo';
import { avisosResumen, cifrasDelPeriodo, kpiProximoPago, kpisDelPeriodo, proximoPago } from '../model/resumen';
import { salidasDeAgencia, salidasDelPeriodo } from '../model/salidas';
import { tusPlanes } from '../model/tus-planes';
import { resenasParaMostrar } from '../model/resenas';
import { useResumen } from '../hooks/useResumen';
import { useQuienesVan } from '../hooks/useQuienesVan';
import PorResolver from '../components/PorResolver';
import PeriodoSelector from '../components/PeriodoSelector';
import CifrasDelPeriodo from '../components/CifrasDelPeriodo';
import SalidasDelPeriodo from '../components/SalidasDelPeriodo';
import TusPlanes from '../components/TusPlanes';
import ResenasRecientes from '../components/ResenasRecientes';

/** El tablero operativo de la agencia (contenedor): los datos salen de `useResumen` y `useQuienesVan`. */
export default function ResumenPage() {
  const {
    hoy,
    cargando,
    error,
    agencia,
    planes,
    ventasLista,
    liquidaciones,
    hayCuenta,
    resenas,
    periodo,
    periodoMostrado,
    vezMostrado,
    cargandoPeriodo,
    errorPeriodo,
    elegirPeriodo,
    reintentarPeriodo,
  } = useResumen();
  const { quienes, cargarQuienes } = useQuienesVan();

  if (cargando)
    return (
      <Pagina>
        <div className="space-y-4" role="status" aria-label="Cargando">
          <Skeleton clase="h-14 w-80 max-w-full rounded-hoja-chica" />
          <Skeleton clase="h-24 rounded-hoja-chica" />
          <Skeleton clase="h-24 rounded-hoja-chica" />
          <Skeleton clase="h-[360px] rounded-hoja-chica" />
        </div>
      </Pagina>
    );
  if (error) return <Empty icono="sinConexion" titulo="Sin conexión" mensaje={error} />;
  if (!agencia) return <Empty icono="edificio" titulo="Aún no tienes agencia" mensaje="Registra tu agencia para empezar." />;

  const hoyISO = fechaBogota(hoy);
  const todas = salidasDeAgencia(planes, hoy);
  /** Los viajeros por día del calendario salen de los cupos tomados de todas las salidas ya cargadas, de cualquier mes. */
  const actividad = actividadPorDia(todas);
  const delPeriodo = salidasDelPeriodo(todas, ventasLista, periodoMostrado);
  const kpis = kpisDelPeriodo(cifrasDelPeriodo(delPeriodo, ventasLista, periodoMostrado), agencia.comision_pct ?? 0);
  const avisos = avisosResumen({ agencia, planes, hayCuenta, hoy });
  const pago = kpiProximoPago(liquidaciones ? proximoPago(liquidaciones, hoy) : null, liquidaciones !== null);
  /** Lo que depende del período se atenúa mientras llegan sus cifras. */
  const atenuado = cargandoPeriodo ? 'opacity-60 transition-opacity' : 'transition-opacity';

  return (
    <Pagina>
      <PageHeader
        titulo="Resumen"
        contexto={
          <time dateTime={hoyISO}>
            {diaLargo(hoyISO)} de {hoyISO.slice(0, 4)}
          </time>
        }
        accion={
          <>
            <PeriodoSelector periodo={periodo} actividad={actividad} hoy={hoy} cargando={cargandoPeriodo} onelegir={elegirPeriodo} />
            <a className="btn btn-primario" href="#/planes/nuevo">
              <Icono trazo={ICONOS.mas} clase="size-4" />
              Nuevo plan
            </a>
          </>
        }
      />

      <p className="sr-only" role="status">
        {cargandoPeriodo ? `Actualizando las cifras de ${textoChip(periodo, hoy)}…` : ''}
      </p>

      <PorResolver avisos={avisos} />

      {errorPeriodo && (
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2" data-error-periodo="">
          <AlertaError>
            No pudimos cargar las cifras de {textoChip(periodo, hoy)}: {errorPeriodo} Seguimos mostrando {textoChip(periodoMostrado, hoy)}.
          </AlertaError>
          <button type="button" className="btn btn-secundario btn-chico" onClick={reintentarPeriodo}>
            Reintentar
          </button>
        </div>
      )}

      <div className={`mt-5 ${atenuado}`} aria-busy={cargandoPeriodo}>
        <CifrasDelPeriodo kpis={kpis} pago={pago} />
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className={atenuado} aria-busy={cargandoPeriodo}>
          {/* `key`: cada período vuelve a montar la tabla (filtro y fila abierta de nuevo). */}
          <SalidasDelPeriodo
            key={vezMostrado}
            salidas={delPeriodo}
            periodo={periodoMostrado}
            onquitarfiltro={() => elegirPeriodo(periodoInicial(hoy))}
            quienes={quienes}
            oncargarquienes={cargarQuienes}
          />
        </div>
        <div className="grid content-start gap-6">
          <div className={atenuado} aria-busy={cargandoPeriodo}>
            <TusPlanes planes={tusPlanes(delPeriodo)} />
          </div>
          <ResenasRecientes resenas={resenas === null ? null : resenasParaMostrar(resenas, hoy)} />
        </div>
      </div>
    </Pagina>
  );
}
