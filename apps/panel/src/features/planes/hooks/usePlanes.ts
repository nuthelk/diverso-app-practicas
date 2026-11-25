import { useCallback, useEffect, useRef, useState } from 'react';
import { misVentas } from '@/features/ventas/api/ventas.api';
import { mensajeError } from '@/shared/api/errores';
import { confirmar } from '@/shared/lib/confirmar';
import { avisar } from '@/shared/lib/toast';
import { publicarPlan } from '../api/planes.api';
import { fechasFuturas, type Plan } from '../model/plan';

/**
 * La lista de planes de la agencia y la acción de publicarlos o despublicarlos (con confirmación).
 * Solo la primera carga y `reintentar` muestran los marcadores (`cargando`); `recargar` tras un cambio no parpadea.
 */
export function usePlanes(): {
  cargando: boolean;
  error: string;
  datos: Plan[];
  recargar: () => Promise<void>;
  reintentar: () => void;
  alternarPublicacion: (p: Plan) => Promise<void>;
} {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [planes, setPlanes] = useState<Plan[]>([]);
  // Número de la carga más reciente: la respuesta de una carga anterior (o llegada tras desmontar) se ignora.
  const ultima = useRef(0);

  const recargar = useCallback(async () => {
    const esta = ++ultima.current;
    setError('');
    try {
      const r = await misVentas();
      if (esta === ultima.current) setPlanes(r.planes);
    } catch (e) {
      if (esta === ultima.current) setError(mensajeError(e));
    } finally {
      if (esta === ultima.current) setCargando(false);
    }
  }, []);

  useEffect(() => {
    recargar();
    return () => {
      ultima.current++;
    };
  }, [recargar]);

  function reintentar() {
    setCargando(true);
    recargar();
  }

  async function alternarPublicacion(p: Plan) {
    const publicado = p.estado === 'publicado';
    const sinFechas = fechasFuturas(p).length === 0;
    const seguir = await confirmar(
      publicado
        ? {
            titulo: `¿Despublicar «${p.titulo}»?`,
            mensaje: 'Los viajeros dejarán de verlo en la app y no podrán hacer reservas nuevas. Podrás publicarlo de nuevo cuando quieras.',
            confirmar: 'Despublicar',
          }
        : {
            titulo: `¿Publicar «${p.titulo}»?`,
            mensaje:
              'Los viajeros lo verán en la app y podrán reservar.' +
              (sinFechas ? ' Todavía no tiene fechas con cupos, así que nadie podrá reservar hasta que agregues alguna.' : ''),
            confirmar: 'Publicar',
          },
    );
    if (!seguir) return;
    try {
      await publicarPlan(p.id, !publicado);
      avisar(publicado ? 'Plan pasado a borrador.' : 'Plan publicado: ya lo ven los viajeros.');
      await recargar();
    } catch (e) {
      avisar(mensajeError(e));
    }
  }

  return { cargando, error, datos: planes, recargar, reintentar, alternarPublicacion };
}
