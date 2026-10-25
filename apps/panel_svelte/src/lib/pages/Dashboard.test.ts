import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { agencia, fecha, HOY, plan, texto, venta } from '../../test/fixtures';

vi.mock('../api', () => ({
  misVentas: vi.fn(),
  mensajeError: (e: unknown) => (e instanceof Error ? e.message : String(e)),
}));

import { misVentas } from '../api';
import Dashboard from './Dashboard.svelte';

const misVentasMock = vi.mocked(misVentas);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(HOY);
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe('Dashboard', () => {
  it('muestra las métricas, la ocupación y las últimas ventas', async () => {
    misVentasMock.mockResolvedValue({
      agencia: agencia(),
      planes: [
        plan('Guatapé', [
          fecha({ fecha: '2025-01-01', cupo_total: 10, cupo_disponible: 0 }), // pasada
          fecha({ fecha: '2026-10-30', cupo_total: 10, cupo_disponible: 2 }),
          fecha({ fecha: '2026-11-10', cupo_total: 10, cupo_disponible: 10 }),
        ]),
        plan('Jardín', [
          fecha({ fecha: '2026-11-01', cupo_total: 20, cupo_disponible: 10 }),
          fecha({ fecha: '2027-03-01', cupo_total: 10, cupo_disponible: 5 }), // fuera de las 8 semanas
        ]),
      ],
      ventas: [
        venta({ booking_id: 'a', monto_total: 200000, comision: 24000, saldo_agencia: 176000 }),
        venta({
          booking_id: 'b',
          booking_estado: 'completada',
          monto_total: 100000,
          comision: 12000,
          saldo_agencia: 88000,
        }),
        venta({
          booking_id: 'c',
          booking_estado: 'pendiente_pago',
          pago_estado: null,
          monto_total: 50000,
          comision: 6000,
          saldo_agencia: 44000,
        }),
      ],
    });

    const { container } = render(Dashboard);
    await screen.findByText('Hola, Aventuras Antioquia');
    const t = texto(container);

    expect(t).toContain(
      'Verificada ✓ · RNT vigente hasta el 31 de marzo de 2027 · Comisión Diverso 12%',
    );

    // Solo cuentan las reservas pagadas (confirmada + completada).
    expect(t).toContain('$ 300.000 Ventas pagadas');
    expect(t).toContain('- $ 36.000 Comisión Diverso');
    expect(t).toContain('$ 264.000 Tu saldo a recibir');
    expect(t).toContain('2 Reservas pagadas');

    // 8 + 0 + 10 cupos vendidos de 40 en las próximas 8 semanas.
    expect(t).toContain('18 de 40 cupos vendidos en las próximas 8 semanas (45%)');

    // Salidas de la más llena a la más vacía; empate por fecha; sin fechas pasadas.
    expect(t).toMatch(/Guatapé 80% lleno.*Jardín 50% lleno.*Jardín 50% lleno.*Guatapé 0% lleno/);
    expect(t).toContain('8 vendidos · 2 libres');

    // Últimas ventas (las tres, con su estado).
    expect(t).toContain('DV-a · Guatapé');
    expect(t).toContain('DV-b · Guatapé');
    expect(t).toContain('DV-c · Guatapé');
  });

  it.each([
    [{ estado_verificacion: 'rechazado' as const }, 'Verificación rechazada'],
    [{ estado_verificacion: 'pendiente' as const }, 'En verificación'],
    [{ rnt_vigente_hasta: '2026-01-01' }, 'Verificada · RNT vencido'],
    [{ rnt_vigente_hasta: null }, 'Verificada · RNT vencido'],
  ])('etiqueta del estado de la agencia %j', async (parcial, esperado) => {
    misVentasMock.mockResolvedValue({ agencia: agencia(parcial), planes: [], ventas: [] });
    const { container } = render(Dashboard);
    await screen.findByText('Hola, Aventuras Antioquia');
    expect(texto(container)).toContain(`${esperado} · Comisión Diverso 12%`);
  });

  it('sin fechas ni ventas muestra los mensajes vacíos', async () => {
    misVentasMock.mockResolvedValue({ agencia: agencia(), planes: [], ventas: [] });
    const { container } = render(Dashboard);
    await screen.findByText('Hola, Aventuras Antioquia');
    const t = texto(container);
    expect(t).toContain('0 de 0 cupos vendidos en las próximas 8 semanas (0%)');
    expect(t).toContain('No tienes fechas futuras con cupos.');
    expect(t).toContain('Aún no tienes ventas registradas.');
  });

  it('sin agencia invita a registrarla', async () => {
    misVentasMock.mockResolvedValue({ agencia: null, planes: [], ventas: [] });
    render(Dashboard);
    expect(await screen.findByText('Aún no tienes agencia')).toBeTruthy();
  });

  it('si falla la carga muestra el error', async () => {
    misVentasMock.mockRejectedValue(new Error('sin red'));
    render(Dashboard);
    expect(await screen.findByText('Sin conexión')).toBeTruthy();
    expect(screen.getByText('sin red')).toBeTruthy();
  });
});
