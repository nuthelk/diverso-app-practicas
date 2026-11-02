/** Traduce los errores de Supabase (códigos de funciones, triggers y checks SQL) a texto para la agencia. */

/** Mensaje del error `notas` de la política y de NOTAS_CON_POLITICA cuando unas notas dicen una regla de reembolso. */
export const MENSAJE_NOTAS_CON_POLITICA =
  'Las notas no pueden contener reglas de reembolso; usa los campos de horas y porcentaje.';

/** Mensajes legibles para los códigos que lanzan las funciones y triggers SQL. */
const ERRORES: Record<string, string> = {
  AGENCIA_NO_VERIFICADA: 'Tu agencia aún no está verificada; el plan queda como borrador.',
  RNT_VENCIDO: 'El RNT de tu agencia está vencido. Renuévalo para volver a publicar.',
  VIGENCIA_RNT_REQUERIDA: 'Indica hasta cuándo está vigente el RNT para verificar la agencia.',
  VIGENCIA_RNT_VENCIDA: 'La vigencia del RNT debe ser una fecha futura.',
  MOTIVO_RECHAZO_REQUERIDO: 'Escribe el motivo del rechazo; la agencia lo verá en su panel.',
  VERSION_DESACTUALIZADA: 'Los documentos legales cambiaron. Recarga la página y acéptalos de nuevo.',
  agencies_rnt_formato: 'El número de RNT debe tener entre 4 y 8 dígitos, sin letras.',
  agencies_matricula_formato: 'La matrícula mercantil debe ser numérica (se admiten guiones).',
  agencies_numero_rnt_key: 'Ya existe una agencia registrada con ese número de RNT.',
  LOGO_URL_INVALIDO: 'No pudimos guardar el logo: la imagen no es válida. Súbela de nuevo.',
  'exceeded the maximum allowed size': 'La imagen supera el máximo de 2 MB.',
  'mime type': 'Solo se admiten imágenes PNG, JPG o WebP.',
  NO_AUTORIZADO: 'No tienes permiso para esta acción.',
  SEMANA_NO_TERMINADA: 'Esa semana aún no termina: solo se liquidan semanas completas (lunes a domingo).',
  LIQUIDACION_NO_EXISTE: 'La liquidación ya no existe. Recarga la lista.',
  LIQUIDACION_NO_PENDIENTE: 'Esa liquidación ya fue ejecutada o anulada.',
  CUENTA_NO_REGISTRADA: 'La agencia aún no registró su cuenta para dispersiones.',
  MONTO_NO_POSITIVO: 'El monto a pagar es cero o negativo: no hay nada que dispersar.',
  FECHA_CON_RESERVAS:
    'Esa fecha tiene reservas activas (pendientes de pago o confirmadas): no se puede mover ni eliminar.',
  agency_payout_accounts_numero_cuenta_check: 'El número de cuenta debe tener de 6 a 20 dígitos.',
  agency_payout_accounts_numero_documento_check: 'El documento debe tener de 4 a 20 caracteres, sin puntos ni espacios.',
  agency_payout_accounts_titular_check: 'Escribe el nombre del titular (mínimo 3 caracteres).',
  agency_payout_accounts_banco_check: 'Indica el banco (entre 2 y 80 caracteres).',
  NOTAS_CON_POLITICA: MENSAJE_NOTAS_CON_POLITICA,
  plans_politica_parcial_coherente:
    'La ventana parcial debe ser menor que la de cancelación gratuita y llevar su porcentaje.',
  'Failed to fetch': 'No hay conexión con el servidor. Verifica que el backend esté encendido.',
};

export function mensajeError(e: unknown): string {
  const m = (e as { message?: string })?.message ?? String(e);
  for (const [clave, texto] of Object.entries(ERRORES)) {
    if (m.includes(clave)) return texto;
  }
  return m;
}
