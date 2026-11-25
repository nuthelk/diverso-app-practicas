/** Ícono de línea decorativo: el texto que lo acompaña (o el `aria-label` del botón) lo nombra. */
export default function Icono({ trazo, clase = 'size-[18px]' }: { trazo: string; clase?: string }) {
  return (
    <svg
      className={`${clase} shrink-0`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={trazo} />
    </svg>
  );
}
