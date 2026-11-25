import EsqueletoPagina from '@/shared/ui/EsqueletoPagina';
import Pagina from '@/shared/ui/Pagina';
import PageHeader from '@/shared/ui/PageHeader';
import Tarjeta from '@/shared/ui/Tarjeta';
import FranjaMetricas from '@/shared/ui/FranjaMetricas';
import Metrica from '@/shared/ui/Metrica';
import TablaDatos, { type Columna } from '@/shared/ui/TablaDatos';
import StatusPill from '@/shared/ui/StatusPill';
import Empty from '@/shared/ui/Empty';
import { cop, plural } from '@/shared/lib/format';
import {
  etiquetaTipoLiquidacion,
  periodoTexto,
  puedeEjecutarse,
  resumenLiquidaciones,
  textoCuenta,
  type Liquidacion,
} from '../model/liquidaciones';
import { useLiquidaciones } from '../hooks/useLiquidaciones';

/** Servicios prestados desde los que la agencia recibe anticipo (Anexo 8 §3.2). */
const MIN_SERVICIOS_ANTICIPO = 10;

const COLUMNAS: Columna[] = [
  { clave: 'periodo', titulo: 'Periodo', principal: true },
  { clave: 'tipo', titulo: 'Tipo' },
  { clave: 'bruto', titulo: 'Bruto', num: true },
  { clave: 'comision', titulo: 'Comisión', num: true },
  { clave: 'neto', titulo: 'Neto', num: true },
  { clave: 'anticipos', titulo: 'Anticipos ya entregados', num: true },
  { clave: 'a_pagar', titulo: 'A pagar', num: true },
  { clave: 'estado', titulo: 'Estado' },
];

function celda(l: Liquidacion, c: Columna) {
  switch (c.clave) {
    case 'periodo':
      return (
        <a className="enlace font-semibold whitespace-nowrap" href={'#/liquidaciones/' + l.id}>
          {periodoTexto(l.periodo_inicio, l.periodo_fin)}
        </a>
      );
    case 'tipo':
      return etiquetaTipoLiquidacion(l.tipo);
    case 'bruto':
      return cop(l.monto_bruto);
    case 'comision':
      return <span className="text-prueba-ink">- {cop(l.comision)}</span>;
    case 'neto':
      return cop(l.monto_neto);
    case 'anticipos':
      return cop(l.anticipos_descontados);
    case 'a_pagar':
      return <span className="font-bold">{cop(l.monto_a_pagar)}</span>;
    default:
      // Los `{' '}` separan la píldora de cada nota en el texto (no se ven: las notas son bloques).
      return (
        <div>
          <StatusPill estado={l.estado} />{' '}
          {l.estado === 'pendiente' && !puedeEjecutarse(l) && (
            <div className="mt-0.5 text-detalle text-tinta-2">Se descontará de la próxima semanal</div>
          )}{' '}
          {l.referencia_prueba && <div className="mt-0.5 text-detalle text-tinta-2 break-all">{l.referencia_prueba}</div>}
        </div>
      );
  }
}

/** Liquidaciones de la agencia. Contenedor: los datos llegan de `useLiquidaciones`. */
export default function LiquidacionesPage() {
  const { cargando, error, datos } = useLiquidaciones();
  const { agencia, liquidaciones, cuenta, servicios } = datos;

  if (cargando) return <EsqueletoPagina filas={5} clase="h-14" />;
  if (error) return <Empty icono="sinConexion" titulo="Sin conexión" mensaje={error} />;
  if (!agencia) {
    return <Empty icono="edificio" titulo="Aún no tienes agencia" mensaje="Registra tu agencia para ver tus liquidaciones." />;
  }

  const resumen = resumenLiquidaciones(liquidaciones);
  const nPendientes = liquidaciones.filter((l) => l.estado === 'pendiente').length;
  const nPagadas = liquidaciones.filter((l) => l.estado === 'pagada_prueba').length;
  const anticipo = agencia.anticipo_bloqueado
    ? 'Tus anticipos están bloqueados por el equipo Diverso. Escríbenos si necesitas revisarlo.'
    : servicios === null
      ? ''
      : servicios >= MIN_SERVICIOS_ANTICIPO
        ? `Recibes un anticipo del 30 % del neto 48 horas antes de cada salida (${servicios} servicios prestados).`
        : `El anticipo del 30 % se habilita con ${MIN_SERVICIOS_ANTICIPO} servicios prestados; llevas ${servicios}.`;

  return (
    <Pagina>
      <PageHeader
        titulo="Liquidaciones"
        contexto={
          <>
            Cada lunes se liquida lo que prestaste la semana anterior: lo vendido, menos la comisión de Diverso (
            {agencia.comision_pct}%) y los anticipos que ya recibiste. Compáralo con tus{' '}
            <a className="enlace" href="#/ventas">
              Ventas
            </a>
            .
          </>
        }
      />

      <div className="mt-6">
        <FranjaMetricas columnas={2}>
          <Metrica
            etiqueta="Pendiente de dispersar"
            valor={cop(resumen.pendiente)}
            sub={`${nPendientes} ${plural(nPendientes, 'liquidación', 'liquidaciones')}`}
            tono="alerta"
          />
          <Metrica
            etiqueta="Dispersado (prueba)"
            valor={cop(resumen.pagadoPrueba)}
            sub={`${nPagadas} ${plural(nPagadas, 'liquidación', 'liquidaciones')}`}
            tono="ok"
          />
        </FranjaMetricas>
      </div>

      <div className="mt-5 space-y-1.5 text-cuerpo text-tinta-2">
        <p>
          {cuenta ? (
            <>
              Cuenta para dispersiones: <strong className="text-tinta">{textoCuenta(cuenta)}</strong> ·{' '}
              <a className="enlace" href="#/cuenta-dispersiones">
                Cambiar
              </a>
            </>
          ) : (
            <>
              <span className="font-bold text-prueba-ink">Aún no registras tu cuenta para dispersiones</span> — sin ella no se
              puede ejecutar ninguna liquidación.{' '}
              <a className="enlace" href="#/cuenta-dispersiones">
                Registrarla
              </a>
            </>
          )}
        </p>
        {anticipo && <p>{anticipo}</p>}
      </div>

      <Tarjeta etiqueta="Liquidaciones de la agencia" sinRelleno clase="mt-6 overflow-hidden">
        {liquidaciones.length === 0 ? (
          <Empty
            icono="recibo"
            titulo="Aún no hay liquidaciones"
            mensaje="La primera aparece el lunes siguiente a la semana en que prestes un servicio pagado."
          />
        ) : (
          <TablaDatos
            caption="Liquidaciones de la agencia, de la más reciente a la más antigua"
            columnas={COLUMNAS}
            filas={liquidaciones}
            clave={(l) => l.id}
            celda={celda}
          />
        )}
      </Tarjeta>
    </Pagina>
  );
}
