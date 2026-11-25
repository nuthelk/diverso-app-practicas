/**
 * Documentos legales de Diverso (mismo texto que la app móvil).
 *
 * BORRADOR: redactado como base técnica para el MVP. Antes del lanzamiento
 * debe revisarlo un abogado y completarse con los datos del responsable
 * (razón social, NIT, domicilio y canal de atención).
 *
 * Cambiar el contenido de fondo exige subir VERSION_LEGAL aquí, en la app
 * móvil y en la función SQL version_documentos_legales(): los usuarios
 * deberán aceptar de nuevo.
 */
export const VERSION_LEGAL = 'v2-2026-10';

export type TipoConsentimiento = 'tratamiento_datos' | 'terminos_viajero' | 'terminos_agencia';

export interface Seccion {
  titulo: string;
  parrafos: string[];
}

export interface DocumentoLegal {
  id: 'privacidad' | 'terminos-agencias' | 'terminos-viajeros';
  titulo: string;
  resumen: string;
  secciones: Seccion[];
}

const CONTACTO = '[correo de atención de datos personales por definir]';

export const POLITICA_DATOS: DocumentoLegal = {
  id: 'privacidad',
  titulo: 'Política de tratamiento de datos personales',
  resumen:
    'Cómo Diverso recolecta, usa y protege tus datos conforme a la Ley 1581 de 2012 y sus decretos reglamentarios.',
  secciones: [
    {
      titulo: '1. Responsable',
      parrafos: [
        `Diverso App, plataforma de intermediación turística en etapa de piloto académico, es responsable del tratamiento de los datos que recolecta. Canal de atención: ${CONTACTO}.`,
      ],
    },
    {
      titulo: '2. Datos que tratamos',
      parrafos: [
        'Viajeros: nombre, correo electrónico, teléfono, reservas, pagos (sin datos de tarjeta, que procesa directamente la pasarela certificada) y reseñas.',
        'Agencias: razón social, número de Registro Nacional de Turismo (RNT), matrícula mercantil, datos de contacto y ventas realizadas en la plataforma.',
        'No solicitamos datos sensibles ni datos de menores de edad.',
      ],
    },
    {
      titulo: '3. Finalidades',
      parrafos: [
        'Gestionar la cuenta, las reservas, los pagos, las cancelaciones y los reembolsos.',
        'Compartir con la agencia que presta el servicio los datos estrictamente necesarios para atender la reserva (nombre, número de personas, fecha y contacto).',
        'Verificar la formalidad de las agencias (RNT y matrícula mercantil) y prevenir fraudes.',
        'Atender peticiones, quejas y reclamos, y cumplir obligaciones legales, contables y tributarias.',
      ],
    },
    {
      titulo: '4. Derechos del titular',
      parrafos: [
        'Conocer, actualizar y rectificar tus datos; solicitar prueba de la autorización otorgada; ser informado sobre el uso que se les ha dado; presentar quejas ante la Superintendencia de Industria y Comercio; revocar la autorización o solicitar la supresión cuando no exista un deber legal o contractual de conservarlos; y acceder gratuitamente a tus datos.',
      ],
    },
    {
      titulo: '5. Consultas y reclamos',
      parrafos: [
        `Escribe a ${CONTACTO}. Las consultas se responden en un máximo de diez (10) días hábiles y los reclamos en un máximo de quince (15) días hábiles, en los términos de los artículos 14 y 15 de la Ley 1581 de 2012.`,
      ],
    },
    {
      titulo: '6. Seguridad y conservación',
      parrafos: [
        'Los datos se almacenan con control de acceso por rol y cifrado en tránsito (HTTPS/TLS). Se conservan mientras la cuenta esté activa y durante el tiempo que exijan las obligaciones legales.',
      ],
    },
    {
      titulo: '7. Autorización y vigencia',
      parrafos: [
        `Al marcar la casilla de autorización otorgas tu consentimiento previo, expreso e informado. Diverso conserva la prueba (fecha y versión del documento). Versión ${VERSION_LEGAL}.`,
      ],
    },
  ],
};

export const TERMINOS_AGENCIAS: DocumentoLegal = {
  id: 'terminos-agencias',
  titulo: 'Términos y condiciones para agencias',
  resumen: 'Reglas para publicar y vender planes en Diverso.',
  secciones: [
    {
      titulo: '1. Requisitos para vender',
      parrafos: [
        'La agencia debe contar con Registro Nacional de Turismo vigente y matrícula mercantil activa. Diverso verifica ambos antes de habilitar la publicación de planes.',
        'El RNT debe renovarse cada año. Si vence, los planes dejan de mostrarse y no reciben reservas hasta que el equipo Diverso registre la nueva vigencia.',
        'Si la agencia modifica su número de RNT o su matrícula, la cuenta vuelve a verificación y sus planes se ocultan hasta completarla.',
      ],
    },
    {
      titulo: '2. Publicación de planes',
      parrafos: [
        'Cada plan debe mostrar el precio final por persona, lo que incluye, el itinerario, el punto de encuentro y la política de cancelación. No se permiten cargos adicionales fuera de la ficha.',
        'La agencia es responsable de la veracidad de la información publicada y de mantener actualizados los cupos.',
      ],
    },
    {
      titulo: '3. Comisión y pagos',
      parrafos: [
        'Diverso cobra una comisión por venta efectiva (12 % por defecto), que se descuenta del valor pagado por el viajero. El uso básico de la plataforma no tiene costo fijo.',
        'Durante el modo de prueba, los cobros a los viajeros se procesan con Wompi en su entorno de pruebas (sandbox) y no se cobra dinero real. La liquidación semanal y los anticipos a las agencias se registran como «Dispersión de prueba»: ese registro no mueve dinero real. Cuando Diverso opere con pagos reales se avisará a las agencias y se actualizará este documento.',
      ],
    },
    {
      titulo: '4. Prestación del servicio',
      parrafos: [
        'La agencia presta el servicio turístico como responsable directa frente al viajero y debe cumplir el Estatuto del Consumidor (Ley 1480 de 2011) y la normativa turística vigente.',
      ],
    },
    {
      titulo: '5. Datos de los viajeros',
      parrafos: [
        'La agencia solo puede usar los datos de los viajeros para prestar el servicio reservado, conforme a la Ley 1581 de 2012. Está prohibido usarlos para otros fines sin autorización del titular.',
      ],
    },
    {
      titulo: '6. Suspensión',
      parrafos: [
        'Diverso puede suspender la publicación de planes ante información falsa, RNT vencido o quejas reiteradas debidamente soportadas.',
      ],
    },
  ],
};

export const TERMINOS_VIAJEROS: DocumentoLegal = {
  id: 'terminos-viajeros',
  titulo: 'Términos y condiciones para viajeros',
  resumen: 'Reglas para reservar planes en Diverso.',
  secciones: [
    {
      titulo: '1. Qué es Diverso',
      parrafos: [
        'Diverso es una plataforma de intermediación que conecta a viajeros con agencias turísticas de Antioquia verificadas por su Registro Nacional de Turismo y su matrícula mercantil. El servicio turístico lo presta la agencia.',
      ],
    },
    {
      titulo: '2. Precio y reserva',
      parrafos: [
        'El precio mostrado en la ficha es el precio final por persona. La reserva queda confirmada cuando se aprueba el pago; las reservas sin pagar se liberan a los 30 minutos.',
      ],
    },
    {
      titulo: '3. Cancelaciones',
      parrafos: [
        'Cada plan muestra su política de cancelación antes del pago. Las cancelaciones y reembolsos se rigen por esa política y por el Estatuto del Consumidor (Ley 1480 de 2011).',
      ],
    },
    {
      titulo: '4. Reseñas',
      parrafos: [
        'Solo puede reseñar quien compró y viajó en el plan. Las reseñas deben ser respetuosas y basadas en la experiencia real.',
      ],
    },
    {
      titulo: '5. Pagos en modo de prueba',
      parrafos: [
        'Durante el modo de prueba, los pagos se hacen con Wompi en su entorno de pruebas (tarjeta, PSE, Nequi, Daviplata o Bancolombia con datos de prueba) y no se cobra dinero real; los reembolsos por cancelación también son de prueba. Cuando Diverso opere con pagos reales se avisará y se actualizará este documento.',
      ],
    },
  ],
};

export const DOCUMENTOS: Record<DocumentoLegal['id'], DocumentoLegal> = {
  privacidad: POLITICA_DATOS,
  'terminos-agencias': TERMINOS_AGENCIAS,
  'terminos-viajeros': TERMINOS_VIAJEROS,
};
