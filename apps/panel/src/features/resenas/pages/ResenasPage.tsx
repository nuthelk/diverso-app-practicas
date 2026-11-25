import Pagina from '@/shared/ui/Pagina';
import PageHeader from '@/shared/ui/PageHeader';
import EsqueletoPagina from '@/shared/ui/EsqueletoPagina';
import Tarjeta from '@/shared/ui/Tarjeta';
import Empty from '@/shared/ui/Empty';
import AlertaError from '@/shared/ui/AlertaError';
import ResenaItem from '@/features/resumen/components/ResenaItem';
import { resenasParaMostrar } from '@/features/resumen/model/resenas';
import { useResenas } from '../hooks/useResenas';

/** Todas las reseñas de los planes de la agencia, la más nueva primero, de a 20 con «Cargar más». */
export default function ResenasPage() {
  const { cargando, error, resenas, hayMas, cargandoMas, errorMas, lista, recargar, cargarMas } = useResenas();

  if (cargando) return <EsqueletoPagina ancho={820} filas={4} clase="h-24" />;

  const mostradas = resenasParaMostrar(resenas);

  return (
    <Pagina ancho={820}>
      <PageHeader
        titulo="Reseñas"
        atras={{ href: '#/dashboard', texto: 'Resumen' }}
        contexto="Lo que escriben tus viajeros sobre tus planes, de la más nueva a la más antigua."
      />

      {error ? (
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
          <AlertaError>{error}</AlertaError>
          <button type="button" className="btn btn-secundario btn-chico" onClick={recargar}>
            Reintentar
          </button>
        </div>
      ) : resenas.length === 0 ? (
        <div className="mt-6 tarjeta">
          <Empty icono="info" titulo="Aún no tienes reseñas" mensaje="Aparecerán aquí cuando tus viajeros las escriban." />
        </div>
      ) : (
        <>
          <div className="mt-6">
            <Tarjeta etiqueta="Todas las reseñas">
              <ul className="grid gap-3" aria-busy={cargandoMas} ref={lista}>
                {mostradas.map((r) => (
                  <ResenaItem key={r.id} resena={r} />
                ))}
              </ul>
            </Tarjeta>
          </div>

          {errorMas ? (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <AlertaError>{errorMas}</AlertaError>
              <button type="button" className="btn btn-secundario btn-chico" onClick={cargarMas}>
                Reintentar
              </button>
            </div>
          ) : (
            hayMas && (
              <div className="mt-4 flex justify-center">
                <button type="button" className="btn btn-secundario" onClick={cargarMas} disabled={cargandoMas}>
                  {cargandoMas ? 'Cargando…' : 'Cargar más'}
                </button>
              </div>
            )
          )}
        </>
      )}
    </Pagina>
  );
}
