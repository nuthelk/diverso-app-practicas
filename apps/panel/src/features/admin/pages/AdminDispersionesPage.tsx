import Skeleton from '@/shared/ui/Skeleton';
import Pagina from '@/shared/ui/Pagina';
import PageHeader from '@/shared/ui/PageHeader';
import Empty from '@/shared/ui/Empty';
import AdminCabecera from '../components/AdminCabecera';
import AnticiposAgencias from '../components/AnticiposAgencias';
import ConfirmarDispersion from '../components/ConfirmarDispersion';
import FiltrosLiquidaciones from '../components/FiltrosLiquidaciones';
import GeneradorLiquidaciones from '../components/GeneradorLiquidaciones';
import TarjetaLiquidacion from '../components/TarjetaLiquidacion';
import { useAdminDispersiones } from '../hooks/useAdminDispersiones';

/** Dispersiones de prueba (rol administrador). Contenedor: el estado vive en `useAdminDispersiones`. */
export default function AdminDispersionesPage() {
  const d = useAdminDispersiones();
  const porConfirmar = d.porConfirmar;

  return (
    <>
      <AdminCabecera activa="dispersiones" />

      <main id="principal" tabIndex={-1} className="outline-none">
        <Pagina>
          <PageHeader
            titulo="Dispersiones de prueba"
            contexto={
              <>
                Las liquidaciones de la semana se generan solas los lunes por la mañana y los anticipos, cada hora. Aquí puedes
                generarlos a mano, registrar la dispersión de prueba y bloquear el anticipo de una agencia.
              </>
            }
          />

          <GeneradorLiquidaciones
            semana={d.semana}
            setSemana={d.setSemana}
            generando={d.generando}
            ongenerarsemana={d.generarSemana}
            onanticipos={d.anticiposAhora}
          />

          <FiltrosLiquidaciones filtro={d.filtro} conteos={d.conteos} onelegir={d.setFiltro} />

          {d.cargando ? (
            <div className="mt-4 space-y-3" role="status" aria-label="Cargando">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} clase="h-28 rounded-hoja-chica" />
              ))}
            </div>
          ) : d.error ? (
            <Empty
              icono="sinConexion"
              titulo="No pudimos cargar las liquidaciones"
              mensaje={d.error}
              accion={
                <button className="btn btn-secundario" onClick={d.recargar}>
                  Reintentar
                </button>
              }
            />
          ) : d.visibles.length === 0 ? (
            <Empty icono="recibo" titulo="Nada por aquí" mensaje="No hay liquidaciones en esta categoría. Genera la semana o los anticipos." />
          ) : (
            <ul className="mt-4 grid items-start gap-5 ancho:grid-cols-2">
              {d.visibles.map((l) => (
                <TarjetaLiquidacion
                  key={l.id}
                  liquidacion={l}
                  cuenta={d.cuentaDe(l.agency_id)}
                  abierta={d.abierta === l.id}
                  items={d.items}
                  onejecutar={() => d.confirmar(l)}
                  onitems={() => d.alternarItems(l)}
                />
              ))}
            </ul>
          )}

          {!d.cargando && !d.error && <AnticiposAgencias agencias={d.verificadas} cuentaDe={d.cuentaDe} onalternar={d.alternarBloqueo} />}
        </Pagina>
      </main>

      {porConfirmar && (
        <ConfirmarDispersion
          liquidacion={porConfirmar}
          cuenta={d.cuentaDe(porConfirmar.agency_id)}
          ejecutando={d.ejecutando}
          error={d.errorAccion}
          oncancelar={d.cancelarConfirmacion}
          onconfirmar={() => d.ejecutar(porConfirmar)}
        />
      )}
    </>
  );
}
