import { useState } from 'react';
import EsqueletoPagina from '@/shared/ui/EsqueletoPagina';
import Pagina from '@/shared/ui/Pagina';
import PageHeader from '@/shared/ui/PageHeader';
import Icono from '@/shared/ui/Icono';
import { ICONOS } from '@/shared/ui/iconos';
import StatusPill from '@/shared/ui/StatusPill';
import Empty from '@/shared/ui/Empty';
import { cop, decimal1, fechaCorta, plural } from '@/shared/lib/format';
import { etiquetaCategoria, fechasFuturas, resumenPlanes, type Plan } from '../model/plan';
import { usePlanes } from '../hooks/usePlanes';
import FechasModal from '../components/FechasModal';

/** Cuántas próximas salidas se listan en cada plan; el resto se resume en «N más». */
const SALIDAS_VISIBLES = 3;

export default function PlanesPage() {
  const { cargando, error, datos: planes, recargar, reintentar, alternarPublicacion } = usePlanes();
  const [fechasDe, setFechasDe] = useState<Plan | null>(null);

  return (
    <>
      {cargando ? (
        <EsqueletoPagina filas={3} clase="h-44" />
      ) : (
        <Pagina>
          <PageHeader
            titulo="Planes"
            contexto={!error && planes.length > 0 ? resumenPlanes(planes) : 'Los planes que vendes en Diverso.'}
            accion={
              // Siempre se pasa, aunque quede vacío: el hueco del encabezado no cambia.
              <>
                {!error && planes.length > 0 && (
                  <a href="#/planes/nuevo" className="btn btn-primario">
                    <Icono trazo={ICONOS.mas} clase="size-4" />
                    Nuevo plan
                  </a>
                )}
              </>
            }
          />

          {error ? (
            <div className="tarjeta mt-6">
              <Empty icono="sinConexion" titulo="No pudimos cargar tus planes" mensaje={error}>
                <button type="button" className="btn btn-secundario" onClick={reintentar}>
                  Reintentar
                </button>
              </Empty>
            </div>
          ) : planes.length === 0 ? (
            <div className="tarjeta mt-6">
              <Empty
                icono="mapa"
                titulo="Aún no tienes planes"
                mensaje="Crea tu primer plan turístico; empieza como borrador y lo publicas cuando esté listo."
              >
                <a href="#/planes/nuevo" className="btn btn-primario">
                  <Icono trazo={ICONOS.mas} clase="size-4" />
                  Nuevo plan
                </a>
              </Empty>
            </div>
          ) : (
            <ul className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(min(100%,460px),1fr))] gap-5">
              {planes.map((p) => {
                const publicado = p.estado === 'publicado';
                const futuras = fechasFuturas(p);
                const mas = futuras.length - SALIDAS_VISIBLES;
                return (
                  <li key={p.id} className="tarjeta flex flex-col overflow-hidden">
                    <div className="flex items-start gap-4 px-5 pt-4">
                      {p.fotos[0] && (
                        <img src={p.fotos[0]} alt="" className="size-16 shrink-0 rounded-hoja-chica object-cover" loading="lazy" />
                      )}
                      <div className="min-w-0 flex-1">
                        <h2 className="line-clamp-2 text-seccion">{p.titulo}</h2>
                        <p className="mt-1 text-detalle text-tinta-2">
                          {p.destino} · {etiquetaCategoria(p.categoria)} · {p.duracion_texto}
                        </p>
                        <p className="mt-0.5 text-detalle text-tinta-2">
                          <span className="cifra text-cuerpo text-tinta">{cop(p.precio_cop)}</span> ·{' '}
                          {p.reviews_count > 0 ? (
                            <>
                              <span className="cifra">{decimal1(p.rating_promedio)}</span> de 5 · {p.reviews_count}{' '}
                              {plural(p.reviews_count, 'reseña', 'reseñas')}
                            </>
                          ) : (
                            'Sin reseñas todavía'
                          )}
                        </p>
                      </div>
                      <StatusPill estado={p.estado} />
                    </div>

                    <div className="mx-5 mt-4 mb-4 border-t border-linea pt-3">
                      <h3 className="etiqueta-seccion">Próximas salidas</h3>
                      {futuras.length === 0 ? (
                        <p className="mt-2 flex items-start gap-2 rounded-campo bg-prueba-bg px-3 py-2 font-semibold text-prueba-ink">
                          <Icono trazo={ICONOS.alerta} clase="mt-[3px] size-4" />
                          Sin fechas con cupos — agrega fechas para vender
                        </p>
                      ) : (
                        <>
                          <ul className="mt-2 grid gap-1.5">
                            {futuras.slice(0, SALIDAS_VISIBLES).map((d) => {
                              const ocupacion =
                                d.cupo_total > 0 ? Math.round(((d.cupo_total - d.cupo_disponible) / d.cupo_total) * 100) : 0;
                              return (
                                <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                  <span className="cifra w-28 shrink-0">{fechaCorta(d.fecha)}</span>
                                  <span
                                    className="h-2 w-24 shrink-0 overflow-hidden rounded-pildora border border-contorno bg-niebla-2"
                                    aria-hidden="true"
                                  >
                                    <span className="block h-full bg-helecho" style={{ width: `${ocupacion}%` }}></span>
                                  </span>
                                  <span className="text-detalle text-tinta-2">
                                    <span className="cifra">{d.cupo_disponible}</span> {plural(d.cupo_disponible, 'libre', 'libres')} de{' '}
                                    {d.cupo_total}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                          {futuras.length > SALIDAS_VISIBLES && (
                            <p className="mt-1.5 text-detalle text-tinta-2">
                              y {mas} {plural(mas, 'salida más', 'salidas más')} en «Fechas y cupos»
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    <div className="mt-auto flex flex-wrap items-center gap-1 border-t border-linea px-4 py-3">
                      <a href={'#/planes/editar/' + p.id} className="btn btn-texto whitespace-nowrap">
                        Editar
                      </a>
                      {publicado ? (
                        <>
                          <button type="button" className="btn btn-texto whitespace-nowrap" onClick={() => alternarPublicacion(p)}>
                            Despublicar
                          </button>
                          <button type="button" className="btn btn-primario ml-auto whitespace-nowrap" onClick={() => setFechasDe(p)}>
                            Fechas y cupos
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" className="btn btn-texto whitespace-nowrap" onClick={() => setFechasDe(p)}>
                            Fechas y cupos
                          </button>
                          <button type="button" className="btn btn-primario ml-auto whitespace-nowrap" onClick={() => alternarPublicacion(p)}>
                            Publicar
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Pagina>
      )}

      {fechasDe && (
        <FechasModal
          plan={fechasDe}
          oncerrar={() => {
            setFechasDe(null);
            recargar();
          }}
        />
      )}
    </>
  );
}
