/// Documentos legales de Diverso (mismo texto que el panel web, generado
/// desde apps/panel_svelte/src/lib/legal.ts para que no diverjan).
///
/// BORRADOR: base técnica para el piloto. Antes del lanzamiento debe
/// revisarlo un abogado y completarse con los datos del responsable.
/// Cambiar el contenido de fondo exige subir [kVersionLegal] aquí, en el
/// panel y en la función SQL version_documentos_legales().
library;

const String kVersionLegal = 'v2-2026-10';

class SeccionLegal {
  const SeccionLegal(this.titulo, this.parrafos);
  final String titulo;
  final List<String> parrafos;
}

class DocumentoLegal {
  const DocumentoLegal({
    required this.id,
    required this.titulo,
    required this.resumen,
    required this.secciones,
  });

  final String id;
  final String titulo;
  final String resumen;
  final List<SeccionLegal> secciones;

  static DocumentoLegal? porId(String id) {
    for (final d in todos) {
      if (d.id == id) return d;
    }
    return null;
  }

  static const List<DocumentoLegal> todos = [politicaDatos, terminosViajeros, terminosAgencias];
}

const DocumentoLegal politicaDatos = DocumentoLegal(
  id: 'privacidad',
  titulo: 'Política de tratamiento de datos personales',
  resumen: 'Cómo Diverso recolecta, usa y protege tus datos conforme a la Ley 1581 de 2012 y sus decretos reglamentarios.',
  secciones: [
    SeccionLegal('1. Responsable', [
      'Diverso App, plataforma de intermediación turística en etapa de piloto académico, es responsable del tratamiento de los datos que recolecta. Canal de atención: [correo de atención de datos personales por definir].',
    ]),
    SeccionLegal('2. Datos que tratamos', [
      'Viajeros: nombre, correo electrónico, teléfono, reservas, pagos (sin datos de tarjeta, que procesa directamente la pasarela certificada) y reseñas.',
      'Agencias: razón social, número de Registro Nacional de Turismo (RNT), matrícula mercantil, datos de contacto y ventas realizadas en la plataforma.',
      'No solicitamos datos sensibles ni datos de menores de edad.',
    ]),
    SeccionLegal('3. Finalidades', [
      'Gestionar la cuenta, las reservas, los pagos, las cancelaciones y los reembolsos.',
      'Compartir con la agencia que presta el servicio los datos estrictamente necesarios para atender la reserva (nombre, número de personas, fecha y contacto).',
      'Verificar la formalidad de las agencias (RNT y matrícula mercantil) y prevenir fraudes.',
      'Atender peticiones, quejas y reclamos, y cumplir obligaciones legales, contables y tributarias.',
    ]),
    SeccionLegal('4. Derechos del titular', [
      'Conocer, actualizar y rectificar tus datos; solicitar prueba de la autorización otorgada; ser informado sobre el uso que se les ha dado; presentar quejas ante la Superintendencia de Industria y Comercio; revocar la autorización o solicitar la supresión cuando no exista un deber legal o contractual de conservarlos; y acceder gratuitamente a tus datos.',
    ]),
    SeccionLegal('5. Consultas y reclamos', [
      'Escribe a [correo de atención de datos personales por definir]. Las consultas se responden en un máximo de diez (10) días hábiles y los reclamos en un máximo de quince (15) días hábiles, en los términos de los artículos 14 y 15 de la Ley 1581 de 2012.',
    ]),
    SeccionLegal('6. Seguridad y conservación', [
      'Los datos se almacenan con control de acceso por rol y cifrado en tránsito (HTTPS/TLS). Se conservan mientras la cuenta esté activa y durante el tiempo que exijan las obligaciones legales.',
    ]),
    SeccionLegal('7. Autorización y vigencia', [
      'Al marcar la casilla de autorización otorgas tu consentimiento previo, expreso e informado. Diverso conserva la prueba (fecha y versión del documento). Versión v2-2026-10.',
    ]),
  ],
);

const DocumentoLegal terminosViajeros = DocumentoLegal(
  id: 'terminos-viajeros',
  titulo: 'Términos y condiciones para viajeros',
  resumen: 'Reglas para reservar planes en Diverso.',
  secciones: [
    SeccionLegal('1. Qué es Diverso', [
      'Diverso es una plataforma de intermediación que conecta a viajeros con agencias turísticas de Antioquia verificadas por su Registro Nacional de Turismo y su matrícula mercantil. El servicio turístico lo presta la agencia.',
    ]),
    SeccionLegal('2. Precio y reserva', [
      'El precio mostrado en la ficha es el precio final por persona. La reserva queda confirmada cuando se aprueba el pago; las reservas sin pagar se liberan a los 30 minutos.',
    ]),
    SeccionLegal('3. Cancelaciones', [
      'Cada plan muestra su política de cancelación antes del pago. Las cancelaciones y reembolsos se rigen por esa política y por el Estatuto del Consumidor (Ley 1480 de 2011).',
    ]),
    SeccionLegal('4. Reseñas', [
      'Solo puede reseñar quien compró y viajó en el plan. Las reseñas deben ser respetuosas y basadas en la experiencia real.',
    ]),
    SeccionLegal('5. Pagos en modo de prueba', [
      'Durante el modo de prueba, los pagos se hacen con Wompi en su entorno de pruebas (tarjeta, PSE, Nequi, Daviplata o Bancolombia con datos de prueba) y no se cobra dinero real; los reembolsos por cancelación también son de prueba. Cuando Diverso opere con pagos reales se avisará y se actualizará este documento.',
    ]),
  ],
);

const DocumentoLegal terminosAgencias = DocumentoLegal(
  id: 'terminos-agencias',
  titulo: 'Términos y condiciones para agencias',
  resumen: 'Reglas para publicar y vender planes en Diverso.',
  secciones: [
    SeccionLegal('1. Requisitos para vender', [
      'La agencia debe contar con Registro Nacional de Turismo vigente y matrícula mercantil activa. Diverso verifica ambos antes de habilitar la publicación de planes.',
      'El RNT debe renovarse cada año. Si vence, los planes dejan de mostrarse y no reciben reservas hasta que el equipo Diverso registre la nueva vigencia.',
      'Si la agencia modifica su número de RNT o su matrícula, la cuenta vuelve a verificación y sus planes se ocultan hasta completarla.',
    ]),
    SeccionLegal('2. Publicación de planes', [
      'Cada plan debe mostrar el precio final por persona, lo que incluye, el itinerario, el punto de encuentro y la política de cancelación. No se permiten cargos adicionales fuera de la ficha.',
      'La agencia es responsable de la veracidad de la información publicada y de mantener actualizados los cupos.',
    ]),
    SeccionLegal('3. Comisión y pagos', [
      'Diverso cobra una comisión por venta efectiva (12 % por defecto), que se descuenta del valor pagado por el viajero. El uso básico de la plataforma no tiene costo fijo.',
      'Durante el modo de prueba, los cobros a los viajeros se procesan con Wompi en su entorno de pruebas (sandbox) y no se cobra dinero real. La liquidación semanal y los anticipos a las agencias se registran como «Dispersión de prueba»: ese registro no mueve dinero real. Cuando Diverso opere con pagos reales se avisará a las agencias y se actualizará este documento.',
    ]),
    SeccionLegal('4. Prestación del servicio', [
      'La agencia presta el servicio turístico como responsable directa frente al viajero y debe cumplir el Estatuto del Consumidor (Ley 1480 de 2011) y la normativa turística vigente.',
    ]),
    SeccionLegal('5. Datos de los viajeros', [
      'La agencia solo puede usar los datos de los viajeros para prestar el servicio reservado, conforme a la Ley 1581 de 2012. Está prohibido usarlos para otros fines sin autorización del titular.',
    ]),
    SeccionLegal('6. Suspensión', [
      'Diverso puede suspender la publicación de planes ante información falsa, RNT vencido o quejas reiteradas debidamente soportadas.',
    ]),
  ],
);
