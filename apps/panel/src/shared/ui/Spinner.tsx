/** Indicador de carga decorativo: quien lo usa pone `role="status"` y el texto accesible. */
export default function Spinner({ clase = '' }: { clase?: string }) {
  return (
    <div
      className={`size-7 animate-spin rounded-full border-2 border-helecho border-t-transparent ${clase}`}
      aria-hidden="true"
    ></div>
  );
}
