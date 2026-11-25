import EsqueletoPagina from '@/shared/ui/EsqueletoPagina';
import Pagina from '@/shared/ui/Pagina';
import PageHeader from '@/shared/ui/PageHeader';
import Tarjeta from '@/shared/ui/Tarjeta';
import FranjaMetricas from '@/shared/ui/FranjaMetricas';
import Metrica from '@/shared/ui/Metrica';
import StatusPill from '@/shared/ui/StatusPill';
import Empty from '@/shared/ui/Empty';
import { cop } from '@/shared/lib/format';
import ItemsLiquidacion from '../components/ItemsLiquidacion';
import { ayudaTipoItem, etiquetaTipoItem, etiquetaTipoLiquidacion, notaEstado, periodoTexto } from '../model/liquidaciones';
import { useLiquidacionDetalle } from '../hooks/useLiquidacionDetalle';

/** Detalle de una liquidación (el `id` llega de la ruta). Contenedor: los datos llegan de `useLiquidacionDetalle`. */
export default function LiquidacionDetallePage({ id }: { id: string }) {
  const { cargando, error, liq } = useLiquidacionDetalle(id);

  if (cargando) return <EsqueletoPagina filas={4} clase="h-14" />;
  if (error) return <Empty icono="sinConexion" titulo="Sin conexión" mensaje={error} />;
  if (!liq) {
    return (
      <Empty icono="recibo" titulo="No encontramos esta liquidación" mensaje="Puede que no sea de tu agencia o que ya no exista.">
        <a className="btn btn-secundario" href="#/liquidaciones">
          Volver a Liquidaciones
        </a>
      </Empty>
    );
  }

  /** Los conceptos especiales que aparecen en esta liquidación, cada uno con su frase de ayuda. */
  const ayudas = [...new Set(liq.liquidacion_items.map((it) => it.tipo))].flatMap((tipo) => {
    const ayuda = ayudaTipoItem(tipo);
    return ayuda ? [{ tipo, ayuda }] : [];
  });
  const nota = notaEstado(liq);

  return (
    <Pagina>
      <PageHeader
        titulo={`Liquidación ${etiquetaTipoLiquidacion(liq.tipo).toLowerCase()} · ${periodoTexto(liq.periodo_inicio, liq.periodo_fin)}`}
        atras={{ href: '#/liquidaciones', texto: 'Liquidaciones' }}
        junto={<StatusPill estado={liq.estado} />}
        // `contexto` se pasa siempre: el fragmento conserva la línea aunque no haya referencia.
        contexto={
          <>
            {liq.referencia_prueba ? (
              <>
                Referencia: <strong className="text-tinta">{liq.referencia_prueba}</strong>
              </>
            ) : null}
          </>
        }
      />

      {nota && (
        <p className="mt-4 rounded-hoja-chica bg-niebla-2 px-4 py-3 text-cuerpo text-tinta-2" role="status">
          {nota}{' '}
          {liq.compensada_en && (
            <a className="enlace" href={'#/liquidaciones/' + liq.compensada_en}>
              Ver la liquidación que la absorbió
            </a>
          )}
        </p>
      )}

      <div className="mt-6">
        <FranjaMetricas columnas={5}>
          <Metrica etiqueta="Bruto" valor={cop(liq.monto_bruto)} />
          <Metrica etiqueta="Comisión" valor={cop(liq.comision)} tono="alerta" />
          <Metrica etiqueta="Neto" valor={cop(liq.monto_neto)} sub="Bruto menos comisión" />
          <Metrica etiqueta="Anticipos ya entregados" valor={cop(liq.anticipos_descontados)} />
          <Metrica etiqueta="A pagar" valor={cop(liq.monto_a_pagar)} sub="Neto menos anticipos" principal />
        </FranjaMetricas>
      </div>

      <Tarjeta titulo="Detalle por reserva" sinRelleno clase="mt-6">
        {liq.liquidacion_items.length === 0 ? (
          <Empty icono="recibo" titulo="Sin reservas" mensaje="Esta liquidación no tiene reservas asociadas." />
        ) : (
          <ItemsLiquidacion items={liq.liquidacion_items} />
        )}
      </Tarjeta>

      {ayudas.length > 0 && (
        <ul className="mt-4 max-w-[78ch] space-y-1 text-detalle text-tinta-2">
          {ayudas.map(({ tipo, ayuda }) => (
            <li key={tipo}>
              <strong className="font-bold text-tinta">{etiquetaTipoItem(tipo)}:</strong> {ayuda}
            </li>
          ))}
        </ul>
      )}
    </Pagina>
  );
}
