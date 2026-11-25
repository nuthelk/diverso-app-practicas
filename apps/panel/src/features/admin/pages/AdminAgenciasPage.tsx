import Skeleton from '@/shared/ui/Skeleton';
import Pagina from '@/shared/ui/Pagina';
import PageHeader from '@/shared/ui/PageHeader';
import Empty from '@/shared/ui/Empty';
import AdminCabecera from '../components/AdminCabecera';
import FiltrosAgencias from '../components/FiltrosAgencias';
import TarjetaAgencia from '../components/TarjetaAgencia';
import { useAdminAgencias } from '../hooks/useAdminAgencias';

/** Verificación de agencias (rol administrador). Contenedor: el estado vive en `useAdminAgencias`. */
export default function AdminAgenciasPage() {
  const v = useAdminAgencias();

  return (
    <>
      <AdminCabecera activa="agencias" />

      <main id="principal" tabIndex={-1} className="outline-none">
        <Pagina>
          <PageHeader
            titulo="Verificación de agencias"
            contexto={
              <>
                Contrasta el RNT en el registro oficial y la matrícula en la Cámara de Comercio antes de aprobar. Una agencia
                solo vende mientras su RNT esté vigente; si cambia su RNT o su matrícula vuelve automáticamente a esta cola.
              </>
            }
          />

          <FiltrosAgencias
            filtro={v.filtro}
            conteos={v.conteos}
            busqueda={v.busqueda}
            setBusqueda={v.setBusqueda}
            onelegir={v.elegirFiltro}
          />

          {v.cargando ? (
            <div className="mt-6 space-y-3" role="status" aria-label="Cargando">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} clase="h-36 rounded-hoja-chica" />
              ))}
            </div>
          ) : v.error ? (
            <Empty
              icono="sinConexion"
              titulo="No pudimos cargar las agencias"
              mensaje={v.error}
              accion={
                <button className="btn btn-secundario" onClick={v.recargar}>
                  Reintentar
                </button>
              }
            />
          ) : v.visibles.length === 0 ? (
            <Empty
              icono="check"
              titulo="Nada pendiente aquí"
              mensaje={v.filtro === 'pendientes' ? 'No hay agencias esperando verificación.' : 'No hay agencias en esta categoría.'}
            />
          ) : (
            <ul className="mt-6 grid items-start gap-5 ancho:grid-cols-2">
              {v.visibles.map((a) => (
                <TarjetaAgencia
                  key={a.id}
                  agencia={a}
                  accion={v.accion?.agencia.id === a.id ? v.accion.tipo : null}
                  historialAbierto={v.historialAbierto === a.id}
                  historial={v.historial}
                  fechaVigencia={v.fechaVigencia}
                  setFechaVigencia={v.setFechaVigencia}
                  motivo={v.motivo}
                  setMotivo={v.setMotivo}
                  confirmado={v.confirmado}
                  setConfirmado={v.setConfirmado}
                  procesando={v.procesando}
                  errorAccion={v.errorAccion}
                  onabrir={(tipo) => v.abrir(tipo, a)}
                  oncancelar={v.cancelar}
                  onejecutar={v.ejecutar}
                  onhistorial={() => v.alternarHistorial(a)}
                />
              ))}
            </ul>
          )}
        </Pagina>
      </main>
    </>
  );
}
