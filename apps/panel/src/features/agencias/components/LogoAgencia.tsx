import Tarjeta from '@/shared/ui/Tarjeta';
import AlertaError from '@/shared/ui/AlertaError';
import AvatarAgencia from './AvatarAgencia';
import { useLogoAgencia } from '../hooks/useLogoAgencia';
import type { Agency } from '../model/agencia';

/** El control del logo en el perfil: la vista previa, «Subir / Reemplazar / Quitar logo» y el error si algo falla. */
export default function LogoAgencia({
  agencia,
  onactualizado,
}: {
  agencia: Agency;
  /** Recibe la URL pública nueva, o null cuando se quitó el logo. */
  onactualizado: (logoUrl: string | null) => void;
}) {
  const { ocupado, error, entrada, elegido, quitar, elegir } = useLogoAgencia(agencia, onactualizado);
  const logo = agencia.logo_url || null;

  return (
    <Tarjeta titulo="Logo">
      <div className="flex flex-wrap items-center gap-5">
        <AvatarAgencia agencia={agencia} tam={72} />

        <div className="min-w-[220px] flex-1">
          <p className="text-detalle text-tinta-2">
            Los viajeros lo ven junto al nombre de tu agencia en la app. PNG, JPG o WebP de hasta 2 MB. Mientras no subas
            uno, mostramos tus iniciales.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={`btn ${logo ? 'btn-secundario' : 'btn-primario'}`}
              disabled={ocupado !== ''}
              onClick={elegir}
            >
              {ocupado === 'subiendo' ? 'Subiendo…' : logo ? 'Reemplazar logo' : 'Subir logo'}
            </button>
            {logo && (
              <button type="button" className="btn btn-peligro" disabled={ocupado !== ''} onClick={quitar}>
                {ocupado === 'quitando' ? 'Quitando…' : 'Quitar logo'}
              </button>
            )}
          </div>
          {error && <AlertaError clase="mt-2 text-detalle">{error}</AlertaError>}
        </div>
      </div>

      <input
        ref={entrada}
        type="file"
        className="hidden"
        accept="image/png,image/jpeg,image/webp"
        aria-label="Archivo del logo"
        onChange={elegido}
      />
    </Tarjeta>
  );
}
