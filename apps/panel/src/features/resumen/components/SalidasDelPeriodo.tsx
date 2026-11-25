import { Fragment, useRef, useState } from 'react';
import Chips from '@/shared/ui/Chips';
import Icono from '@/shared/ui/Icono';
import { ICONOS } from '@/shared/ui/iconos';
import { cop, plural } from '@/shared/lib/format';
import { useTrasDibujar } from '@/shared/lib/useTrasDibujar';
import { diaCorto, diaLargo } from '../model/fechas';
import { esPeriodoInicial, tituloPeriodo, viajesDe, type Periodo } from '../model/periodo';
import {
  conteoPorFiltro,
  filtrarSalidas,
  filtroInicial,
  SALIDAS_POR_VEZ,
  textoMostrando,
  totalesDeSalidas,
  type FiltroSalidas,
  type Salida,
} from '../model/salidas';
import type { ReservasDeSalida } from '../hooks/useQuienesVan';
import QuienesVan from './QuienesVan';

/**
 * «Salidas del período»: tabla con la ocupación, los pendientes de pago y lo vendido de cada salida, el filtro «Qué
 * salidas ver» y, bajo cada fila, «Ver quiénes van». Quien la usa la vuelve a montar al cambiar de período (`key`):
 * el filtro, las filas visibles y la fila abierta arrancan de nuevo.
 *
 * Es presentacional: no pide «Quiénes van» por su cuenta, recibe `quienes` y pide con
 * `oncargarquienes` (el estado y las peticiones viven en `useQuienesVan`, que usa la página).
 */
export default function SalidasDelPeriodo({
  salidas,
  periodo,
  onquitarfiltro,
  quienes,
  oncargarquienes,
}: {
  /** Todas las de ese período, sin filtrar. */
  salidas: Salida[];
  periodo: Periodo;
  onquitarfiltro: () => void;
  /** «Quiénes van» de cada salida ya pedida, por id de la salida. */
  quienes: Record<string, ReservasDeSalida>;
  /** Pide (o vuelve a pedir) «Quiénes van» de una salida. */
  oncargarquienes: (id: string) => void;
}) {
  const [filtro, setFiltro] = useState<FiltroSalidas>(() => filtroInicial(salidas));
  const [limite, setLimite] = useState(SALIDAS_POR_VEZ);
  const [abierta, setAbierta] = useState<string | null>(null);
  const raiz = useRef<HTMLElement>(null);
  const trasDibujar = useTrasDibujar();

  const conteos = conteoPorFiltro(salidas);
  const lista = filtrarSalidas(salidas, filtro);
  const visibles = lista.slice(0, limite);
  const totales = totalesDeSalidas(lista);

  // Con `display: block` en pantallas angostas las filas pierden su semántica de tabla: el rol la conserva (como TablaDatos).

  function alternar(id: string) {
    if (abierta === id) {
      setAbierta(null);
      return;
    }
    setAbierta(id);
    oncargarquienes(id);
  }

  function elegirFiltro(nuevo: string, enfocar = false) {
    setFiltro(nuevo as FiltroSalidas);
    setLimite(SALIDAS_POR_VEZ);
    setAbierta(null);
    if (!enfocar) return;
    trasDibujar(() => raiz.current?.querySelector<HTMLElement>('[aria-label="Qué salidas ver"] [aria-pressed="true"]')?.focus());
  }

  function mostrarMas() {
    const primera = limite;
    setLimite(limite + SALIDAS_POR_VEZ);
    trasDibujar(() => raiz.current?.querySelectorAll<HTMLElement>('[data-plan-btn]')[primera]?.focus());
  }

  return (
    <section className="tarjeta overflow-hidden" aria-labelledby="h-salidas" ref={raiz}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 px-5 pt-4 pb-3">
        <div>
          <h2 id="h-salidas" className="text-seccion">
            Salidas del período
          </h2>
          {salidas.length > 0 && <p className="mt-0.5 text-detalle text-tinta-2">Ordenadas por fecha · {tituloPeriodo(periodo)}</p>}
        </div>
        <Chips
          etiqueta="Qué salidas ver"
          valor={filtro}
          onchange={(v) => elegirFiltro(v)}
          opciones={[
            { valor: 'proximas', etiqueta: 'Próximas', cantidad: conteos.proximas },
            { valor: 'ya', etiqueta: 'Ya salieron', cantidad: conteos.ya },
            { valor: 'todas', etiqueta: 'Todas', cantidad: conteos.todas },
          ]}
        />
      </div>

      {lista.length === 0 ? (
        <div className="border-t border-linea px-5 py-7 text-center text-tinta-2" data-vacio="">
          {salidas.length > 0 ? (
            <>
              <p className="font-bold text-tinta">No hay salidas {filtro === 'proximas' ? 'próximas' : 'que ya hayan salido'} en este período.</p>
              <p className="mt-1 mb-3">Cambia el filtro para ver las demás.</p>
              <button type="button" className="btn btn-secundario btn-chico" onClick={() => elegirFiltro('todas', true)}>
                Ver todas ({salidas.length})
              </button>
            </>
          ) : (
            <>
              <p className="font-bold text-tinta">No hay salidas {viajesDe(periodo)}.</p>
              <p className="mt-1 mb-3">Prueba con otro período o quita el filtro.</p>
              {esPeriodoInicial(periodo) ? (
                <a className="btn btn-secundario btn-chico" href="#/planes">
                  Agregar fechas
                </a>
              ) : (
                <button type="button" className="btn btn-secundario btn-chico" onClick={onquitarfiltro}>
                  Quitar filtro
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <>
          <div className="tabla-datos overflow-x-auto">
            <table className="tabla" role="table">
              <caption className="sr-only">Salidas del período seleccionado, ordenadas por fecha</caption>
              <thead>
                <tr>
                  <th scope="col">Fecha y hora</th>
                  <th scope="col">Plan</th>
                  <th scope="col">Ocupación</th>
                  <th scope="col" className="num">
                    Viajeros
                  </th>
                  <th scope="col" className="num">
                    Pendientes
                  </th>
                  <th scope="col" className="num">
                    Vendido
                  </th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {visibles.map((s) => (
                  <Fragment key={s.id}>
                    <tr role="row" data-salida-id={s.id}>
                      <td role="cell" data-th="Fecha y hora" data-principal="">
                        <span className="whitespace-nowrap">
                          <b>{diaCorto(s.fecha)}</b> {s.hoy && <span className="pildora pildora-hoy">Hoy</span>}{' '}
                          {s.yaSalio && <span className="pildora pildora-neutra">Salió</span>}{' '}
                          <span className="cifra ml-1.5 text-detalle font-normal text-tinta-2">{s.hora}</span>
                        </span>
                      </td>
                      <td role="cell" data-th="Plan" data-principal="">
                        <button
                          type="button"
                          data-plan-btn=""
                          className="-ml-2.5 inline-flex min-h-10 items-center gap-1.5 rounded-campo px-2.5 text-left font-semibold hover:bg-niebla-2"
                          aria-expanded={abierta === s.id}
                          aria-controls={`detalle-${s.id}`}
                          aria-label={`${s.titulo}, ${diaLargo(s.fecha)}. Ver quiénes van`}
                          onClick={() => alternar(s.id)}
                        >
                          {s.titulo}{' '}
                          <Icono trazo={ICONOS.chevron} clase={`size-4 transition-transform ${abierta === s.id ? 'rotate-180' : ''}`} />
                        </button>
                      </td>
                      <td role="cell" data-th="Ocupación">
                        <span className="flex items-center gap-2.5 whitespace-nowrap">
                          <span
                            className="block h-2 w-24 shrink-0 overflow-hidden rounded-pildora border border-contorno bg-niebla-2 max-[820px]:w-full max-[820px]:max-w-48"
                            aria-hidden="true"
                          >
                            <i className="block h-full bg-helecho" style={{ width: `${s.porcentaje}%` }}></i>
                          </span>{' '}
                          <span className="cifra min-w-14 text-detalle">
                            {s.reservados}/{s.total} <span className="sr-only">cupos ocupados</span>
                          </span>{' '}
                          {s.total > 0 && s.libres === 0 && <span className="pildora pildora-ok">Lleno</span>}
                        </span>
                      </td>
                      <td role="cell" className="num" data-th="Viajeros">
                        {s.reservados}
                      </td>
                      <td role="cell" className="num" data-th="Pendientes">
                        {s.pendientes > 0 ? <span className="pildora pildora-alerta">{s.pendientes}</span> : <span className="text-tinta-3">0</span>}
                      </td>
                      <td role="cell" className="num font-bold" data-th="Vendido">
                        {cop(s.vendido)}
                      </td>
                    </tr>
                    {abierta === s.id && (
                      <tr role="row" id={`detalle-${s.id}`} data-detalle="">
                        <td role="cell" colSpan={6} data-principal="" className="bg-niebla p-0">
                          <div className="px-5 pt-3.5 pb-4 max-[820px]:px-0">
                            <QuienesVan
                              salida={s}
                              estado={quienes[s.id]?.estado ?? 'cargando'}
                              reservas={quienes[s.id]?.reservas ?? []}
                              onreintentar={() => oncargarquienes(s.id)}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
              <tfoot role="rowgroup">
                <tr role="row" className="max-[820px]:flex-wrap max-[820px]:gap-y-1">
                  <th scope="row" colSpan={3} role="rowheader">
                    Total · {totales.salidas} {plural(totales.salidas, 'salida', 'salidas')}
                  </th>
                  <td role="cell" className="num">
                    <span className="hidden font-normal text-tinta-2 max-[820px]:inline">Viajeros</span> {totales.viajeros}
                  </td>
                  <td role="cell" className="num">
                    <span className="hidden font-normal text-tinta-2 max-[820px]:inline">Pendientes</span> {totales.pendientes}
                  </td>
                  <td role="cell" className="num">
                    <span className="hidden font-normal text-tinta-2 max-[820px]:inline">Vendido</span> {cop(totales.vendido)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-linea px-5 py-3 text-detalle text-tinta-2">
            <span data-mostrando="">{textoMostrando(visibles.length, lista.length)}</span>
            {lista.length > limite && (
              <button type="button" className="btn btn-secundario btn-chico" onClick={mostrarMas}>
                Mostrar más ({lista.length - limite})
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
