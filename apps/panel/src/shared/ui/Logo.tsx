/** Colibrí de Diverso: la máscara de la app Flutter teñida con `currentColor`. */
export default function Logo({ size = 22, clase = '' }: { size?: number; clase?: string }) {
  return (
    <span
      className={`inline-block shrink-0 ${clase}`}
      style={{
        width: size,
        height: size,
        backgroundColor: 'currentColor',
        WebkitMask: 'url(/logo_diverso.png) center / contain no-repeat',
        mask: 'url(/logo_diverso.png) center / contain no-repeat',
      }}
      aria-hidden="true"
    ></span>
  );
}
