import { useState } from 'react';
import EsqueletoPagina from '@/shared/ui/EsqueletoPagina';
import Pagina from '@/shared/ui/Pagina';
import PageHeader from '@/shared/ui/PageHeader';
import Tarjeta from '@/shared/ui/Tarjeta';
import FranjaMetricas from '@/shared/ui/FranjaMetricas';
import Metrica from '@/shared/ui/Metrica';
import Chips from '@/shared/ui/Chips';
import TablaDatos, { type Columna } from '@/shared/ui/TablaDatos';
import StatusPill from '@/shared/ui/StatusPill';
import Empty from '@/shared/ui/Empty';
import { cop, fechaCorta, plural } from '@/shared/lib/format';
import type { VentaRow } from '../model/ventas';
import { ventasPagadas, totalesVentas, filtrarVentas, type FiltroVentas } from '../model/ventas';
import { useVentas } from '../hooks/useVentas';

const FILTROS: { valor: FiltroVentas; etiqueta: string; ninguna: string }[] = [
  { valor: 'todas', etiqueta: 'Todas', ninguna: 'Sin ventas aquí' },
  { valor: 'confirmadas', etiqueta: 'Pagadas', ninguna: 'Ninguna venta pagada' },
  { valor: 'pendientes', etiqueta: 'Pendientes de pago', ninguna: 'Ninguna venta pendiente de pago' },
];

const COLUMNAS: Columna[] = [
  { clave: 'codigo', titulo: 'Código', principal: true },
  { clave: 'plan_titulo', titulo: 'Plan' },
  { clave: 'fecha', titulo: 'Fecha' },
  { clave: 'pax', titulo: 'Viajeros', num: true },
  { clave: 'monto_total', titulo: 'Monto', num: true },
  { clave: 'comision', titulo: 'Comisión', num: true },
  { clave: 'saldo_agencia', titulo: 'Saldo', num: true },
  { clave: 'booking_estado', titulo: 'Estado' },
];

function celda(v: VentaRow, c: Columna) {
  switch (c.clave) {
    case 'codigo':
      return <span className="font-semibold whitespace-nowrap">{v.codigo}</span>;
    case 'plan_titulo':
      return <span className="block max-w-sm truncate text-tinta-2">{v.plan_titulo}</span>;
    case 'fecha':
      return <span className="whitespace-nowrap">{fechaCorta(v.fecha)}</span>;
    case 'pax':
      return v.pax;
    case 'monto_total':
      return cop(v.monto_total);
    case 'comision':
      return <span className="text-prueba-ink">- {cop(v.comision)}</span>;
    case 'saldo_agencia':
      return <span className="font-bold">{cop(v.saldo_agencia)}</span>;
    default:
      return <StatusPill estado={v.booking_estado} />;
  }
}

export default function VentasPage() {
  const { cargando, error, datos } = useVentas();
  const { ventas, comisionPct } = datos;
  const [filtro, setFiltro] = useState<FiltroVentas>('todas');

  if (cargando) return <EsqueletoPagina filas={5} clase="h-14" />;
  if (error) return <Empty icono="sinConexion" titulo="Sin conexión" mensaje={error} />;

  const filtradas = filtrarVentas(ventas, filtro);
  const pagadas = ventasPagadas(ventas);
  const totales = totalesVentas(pagadas);
  const opciones = FILTROS.map((f) => ({ valor: f.valor, etiqueta: f.etiqueta, cantidad: filtrarVentas(ventas, f.valor).length }));
  const ninguna = FILTROS.find((f) => f.valor === filtro)!.ninguna;

  return (
    <Pagina>
      <PageHeader
        titulo="Ventas"
        contexto={
          <>
            Cada venta con la comisión de Diverso y el saldo que le toca a tu agencia. Compara esos saldos con tus{' '}
            <a className="enlace" href="#/liquidaciones">
              Liquidaciones
            </a>
            .
          </>
        }
      />

      <div className="mt-6">
        <FranjaMetricas columnas={3}>
          <Metrica
            etiqueta="Ventas pagadas"
            valor={cop(totales.total)}
            sub={`${pagadas.length} ${plural(pagadas.length, 'reserva', 'reservas')}`}
          />
          <Metrica etiqueta={`Comisión (${comisionPct}%)`} valor={`- ${cop(totales.comision)}`} tono="alerta" />
          <Metrica etiqueta="Saldo a recibir" valor={cop(totales.saldo)} principal />
        </FranjaMetricas>
      </div>

      <Tarjeta etiqueta="Detalle de ventas" sinRelleno clase="mt-6 overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 px-5 pt-4 pb-3">
          <div>
            <h2 className="text-seccion">Detalle por reserva</h2>
            <p className="text-detalle text-tinta-2">Las cifras de arriba cuentan solo las ventas pagadas.</p>
          </div>
          <Chips etiqueta="Filtrar ventas" opciones={opciones} valor={filtro} onchange={(v) => setFiltro(v as FiltroVentas)} />
        </div>

        <TablaDatos
          caption="Ventas, una fila por reserva"
          columnas={COLUMNAS}
          filas={filtradas}
          clave={(v) => v.booking_id}
          celda={celda}
          vacio={
            ventas.length === 0 ? (
              <Empty icono="recibo" titulo={ninguna} mensaje="Cuando los viajeros reserven tus planes, verás aquí cada venta." />
            ) : (
              <Empty icono="recibo" titulo={ninguna} mensaje="Ninguna reserva cumple este filtro.">
                <button type="button" className="btn btn-secundario" onClick={() => setFiltro('todas')}>
                  Ver todas
                </button>
              </Empty>
            )
          }
        />
      </Tarjeta>
    </Pagina>
  );
}
