/**
 * Documentos legales de Diverso (mismo texto que el panel web,
 * `apps/panel/src/features/legal/model/legal.ts`; los tests del panel comparan ambos).
 *
 * BORRADOR: base técnica para el piloto. Antes del lanzamiento debe revisarlo un abogado y
 * completarse con los datos del responsable. Cambiar el contenido de fondo exige subir
 * [VERSION_LEGAL] aquí, en el panel y en la función SQL `version_documentos_legales()`: si no
 * coinciden, `registrar_consentimiento` falla con `VERSION_DESACTUALIZADA` y el registro no guarda
 * consentimientos (sin error).
 */

export const VERSION_LEGAL = 'v2-2026-10';

export interface SeccionLegal {
  readonly titulo: string;
  readonly parrafos: readonly string[];
}

export interface DatosDocumentoLegal {
  /** `privacidad`, `terminos-viajeros`, `terminos-agencias` (ojo: el consentimiento en BD es `tratamiento_datos`). */
  readonly id: string;
  readonly titulo: string;
  readonly resumen: string;
  readonly secciones: readonly SeccionLegal[];
}

const seccion = (titulo: string, parrafos: string[]): SeccionLegal => ({ titulo, parrafos });

export const politicaDatos: DatosDocumentoLegal = {
  id: 'privacidad',
  titulo: 'Política de tratamiento de datos personales',
  resumen:
    'Cómo Diverso recolecta, usa y protege tus datos conforme a la Ley 1581 de 2012 y sus decretos reglamentarios.',
  secciones: [
    seccion('1. Responsable', [
      'Diverso App, plataforma de intermediación turística en etapa de piloto académico, es responsable del tratamiento de los datos que recolecta. Canal de atención: [correo de atención de datos personales por definir].',
    ]),
    seccion('2. Datos que tratamos', [
      'Viajeros: nombre, correo electrónico, teléfono, reservas, pagos (sin datos de tarjeta, que procesa directamente la pasarela certificada) y reseñas.',
      'Agencias: razón social, número de Registro Nacional de Turismo (RNT), matrícula mercantil, datos de contacto y ventas realizadas en la plataforma.',
      'No solicitamos datos sensibles ni datos de menores de edad.',
    ]),
    seccion('3. Finalidades', [
      'Gestionar la cuenta, las reservas, los pagos, las cancelaciones y los reembolsos.',
      'Compartir con la agencia que presta el servicio los datos estrictamente necesarios para atender la reserva (nombre, número de personas, fecha y contacto).',
      'Verificar la formalidad de las agencias (RNT y matrícula mercantil) y prevenir fraudes.',
      'Atender peticiones, quejas y reclamos, y cumplir obligaciones legales, contables y tributarias.',
    ]),
    seccion('4. Derechos del titular', [
      'Conocer, actualizar y rectificar tus datos; solicitar prueba de la autorización otorgada; ser informado sobre el uso que se les ha dado; presentar quejas ante la Superintendencia de Industria y Comercio; revocar la autorización o solicitar la supresión cuando no exista un deber legal o contractual de conservarlos; y acceder gratuitamente a tus datos.',
    ]),
    seccion('5. Consultas y reclamos', [
      'Escribe a [correo de atención de datos personales por definir]. Las consultas se responden en un máximo de diez (10) días hábiles y los reclamos en un máximo de quince (15) días hábiles, en los términos de los artículos 14 y 15 de la Ley 1581 de 2012.',
    ]),
    seccion('6. Seguridad y conservación', [
      'Los datos se almacenan con control de acceso por rol y cifrado en tránsito (HTTPS/TLS). Se conservan mientras la cuenta esté activa y durante el tiempo que exijan las obligaciones legales.',
    ]),
    seccion('7. Autorización y vigencia', [
      'Al marcar la casilla de autorización otorgas tu consentimiento previo, expreso e informado. Diverso conserva la prueba (fecha y versión del documento). Versión v2-2026-10.',
    ]),
  ],
};

export const terminosViajeros: DatosDocumentoLegal = {
  id: 'terminos-viajeros',
  titulo: 'Términos y condiciones para viajeros',
  resumen: 'Reglas para reservar planes en Diverso.',
  secciones: [
    seccion('1. Qué es Diverso', [
      'Diverso es una plataforma de intermediación que conecta a viajeros con agencias turísticas de Antioquia verificadas por su Registro Nacional de Turismo y su matrícula mercantil. El servicio turístico lo presta la agencia.',
    ]),
    seccion('2. Precio y reserva', [
      'El precio mostrado en la ficha es el precio final por persona. La reserva queda confirmada cuando se aprueba el pago; las reservas sin pagar se liberan a los 30 minutos.',
    ]),
    seccion('3. Cancelaciones', [
      'Cada plan muestra su política de cancelación antes del pago. Las cancelaciones y reembolsos se rigen por esa política y por el Estatuto del Consumidor (Ley 1480 de 2011).',
    ]),
    seccion('4. Reseñas', [
      'Solo puede reseñar quien compró y viajó en el plan. Las reseñas deben ser respetuosas y basadas en la experiencia real.',
    ]),
    seccion('5. Pagos en modo de prueba', [
      'Durante el modo de prueba, los pagos se hacen con Wompi en su entorno de pruebas (tarjeta, PSE, Nequi, Daviplata o Bancolombia con datos de prueba) y no se cobra dinero real; los reembolsos por cancelación también son de prueba. Cuando Diverso opere con pagos reales se avisará y se actualizará este documento.',
    ]),
  ],
};

export const terminosAgencias: DatosDocumentoLegal = {
  id: 'terminos-agencias',
  titulo: 'Términos y condiciones para agencias',
  resumen: 'Reglas para publicar y vender planes en Diverso.',
  secciones: [
    seccion('1. Requisitos para vender', [
      'La agencia debe contar con Registro Nacional de Turismo vigente y matrícula mercantil activa. Diverso verifica ambos antes de habilitar la publicación de planes.',
      'El RNT debe renovarse cada año. Si vence, los planes dejan de mostrarse y no reciben reservas hasta que el equipo Diverso registre la nueva vigencia.',
      'Si la agencia modifica su número de RNT o su matrícula, la cuenta vuelve a verificación y sus planes se ocultan hasta completarla.',
    ]),
    seccion('2. Publicación de planes', [
      'Cada plan debe mostrar el precio final por persona, lo que incluye, el itinerario, el punto de encuentro y la política de cancelación. No se permiten cargos adicionales fuera de la ficha.',
      'La agencia es responsable de la veracidad de la información publicada y de mantener actualizados los cupos.',
    ]),
    seccion('3. Comisión y pagos', [
      'Diverso cobra una comisión por venta efectiva (12 % por defecto), que se descuenta del valor pagado por el viajero. El uso básico de la plataforma no tiene costo fijo.',
      'Durante el modo de prueba, los cobros a los viajeros se procesan con Wompi en su entorno de pruebas (sandbox) y no se cobra dinero real. La liquidación semanal y los anticipos a las agencias se registran como «Dispersión de prueba»: ese registro no mueve dinero real. Cuando Diverso opere con pagos reales se avisará a las agencias y se actualizará este documento.',
    ]),
    seccion('4. Prestación del servicio', [
      'La agencia presta el servicio turístico como responsable directa frente al viajero y debe cumplir el Estatuto del Consumidor (Ley 1480 de 2011) y la normativa turística vigente.',
    ]),
    seccion('5. Datos de los viajeros', [
      'La agencia solo puede usar los datos de los viajeros para prestar el servicio reservado, conforme a la Ley 1581 de 2012. Está prohibido usarlos para otros fines sin autorización del titular.',
    ]),
    seccion('6. Suspensión', [
      'Diverso puede suspender la publicación de planes ante información falsa, RNT vencido o quejas reiteradas debidamente soportadas.',
    ]),
  ],
};

export const DocumentoLegal = {
  todos: [politicaDatos, terminosViajeros, terminosAgencias] as readonly DatosDocumentoLegal[],

  /** El documento con ese id, o null. */
  porId(id: string): DatosDocumentoLegal | null {
    return DocumentoLegal.todos.find((d) => d.id === id) ?? null;
  },
};
