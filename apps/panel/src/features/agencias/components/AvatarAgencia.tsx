import { useState } from 'react';
import { colorDeAgencia, inicialesAgencia } from '../model/logo';
import type { Agency } from '../model/agencia';

export default function AvatarAgencia({
  agencia,
  tam = 40,
  decorativo = false,
}: {
  agencia: Pick<Agency, 'id' | 'nombre' | 'logo_url'>;
  tam?: number;
  /** Junto al nombre de la agencia el avatar no aporta nada a un lector de pantalla. */
  decorativo?: boolean;
}) {
  const [urlRota, setUrlRota] = useState<string | null>(null);

  const logo = agencia.logo_url || null;
  const mostrarImagen = logo !== null && logo !== urlRota;

  return mostrarImagen ? (
    <img
      src={logo}
      alt={decorativo ? '' : `Logo de ${agencia.nombre}`}
      style={{ width: tam, height: tam }}
      className="shrink-0 rounded-brote border border-linea bg-superficie object-cover"
      onError={() => setUrlRota(logo)}
    />
  ) : (
    <div
      role={decorativo ? undefined : 'img'}
      aria-label={decorativo ? undefined : `Iniciales de ${agencia.nombre}`}
      aria-hidden={decorativo ? 'true' : undefined}
      className="flex shrink-0 items-center justify-center rounded-brote font-bold tracking-wide text-white"
      style={{ width: tam, height: tam, fontSize: tam * 0.36, backgroundColor: colorDeAgencia(agencia.id) }}
    >
      {inicialesAgencia(agencia.nombre)}
    </div>
  );
}
