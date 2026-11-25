import PageHeader from '@/shared/ui/PageHeader';

/** Cabecera de la pantalla: volver, título y botón de guardar (envía el formulario `form-plan`). */
export default function EncabezadoPlan({ planId, guardando }: { planId?: string; guardando: boolean }) {
  return (
    <PageHeader
      titulo={planId ? 'Editar plan' : 'Nuevo plan'}
      atras={{ href: '#/planes', texto: 'Volver a planes' }}
      contexto={
        <>
          {!planId && 'Se guarda como borrador; lo publicas desde la lista de planes. '}Los campos con * son obligatorios.
        </>
      }
      accion={
        <button form="form-plan" type="submit" disabled={guardando} className="btn btn-primario">
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      }
    />
  );
}
