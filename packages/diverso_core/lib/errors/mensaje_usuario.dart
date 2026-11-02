import '../models/reembolso.dart';
import 'diverso_exception.dart';

/// Texto en español que se le muestra al viajero para cada código de [DiversoException].
extension DiversoExceptionMensaje on DiversoException {
  String get mensajeUsuario {
    switch (codigo) {
      case 'SIN_CUPO':
        return 'Se acabaron los cupos para esa fecha. Prueba otra fecha u otro plan.';
      case 'ESTADO_INVALIDO':
        return 'La reserva ya no admite esta operación.';
      case 'NO_ES_DUENO':
        return 'Esta reserva no te pertenece.';
      case 'AGENCIA_NO_VERIFICADA':
        return 'La agencia debe estar verificada para publicar planes.';
      case 'AGENCIA_NO_HABILITADA':
      case 'RNT_VENCIDO':
        return 'Esta agencia no está habilitada para vender en este momento '
            '(verificación o RNT pendiente). Elige otro plan.';
      case 'FECHA_PASADA':
        return 'Esa fecha ya pasó. Elige una salida próxima.';
      case 'FECHA_YA_SALIO':
        return 'Esta salida ya partió. Elige otra fecha.';
      case 'PLAN_NO_PUBLICADO':
        return 'Este plan ya no está disponible.';
      case 'RESERVA_PENDIENTE_EXISTENTE':
        return 'Ya tienes una reserva pendiente de pago para esta fecha. Complétala o cancélala para empezar de nuevo.';
      case 'RESERVA_YA_SALIO':
        return 'Este viaje ya salió, así que la reserva ya no se puede pagar ni cancelar.';
      case 'RESERVA_NO_EXISTE':
        return 'No encontramos esa reserva.';
      case 'NO_AUTENTICADO':
        return 'Tu sesión expiró. Inicia sesión de nuevo.';
      case 'RESERVA_VENCIDA':
        if (aprobadoTarde) {
          final estado = EstadoReembolsoX.desdeServidor(detalle?['reembolso'] as String?);
          final texto = estado == EstadoReembolso.noAplica ? 'en proceso' : estado.name;
          return 'Tu pago llegó cuando la reserva ya había vencido, así que no se confirmó. '
              'Te lo devolvemos automáticamente (reembolso de prueba $texto).';
        }
        return 'Tu reserva venció (los cupos se retienen 30 minutos). Vuelve a reservar.';
      case 'REDIRECT_NO_PERMITIDO':
        return 'Esta dirección de la app no está autorizada para pagos de prueba.';
      case 'MONTO_NO_COINCIDE':
        return 'El monto de la transacción no coincide con el de tu reserva, así que no la confirmamos. '
            'Contacta a soporte con tu referencia.';
      case 'TRANSACCION_NO_EXISTE':
      case 'REFERENCIA_DESCONOCIDA':
        return 'No encontramos ese pago. Si ya pagaste, toca «Ya pagué, verificar» en Mis reservas.';
      case 'WOMPI_NO_DISPONIBLE':
        return 'Wompi no está disponible en este momento. Intenta de nuevo en unos minutos.';
      case 'WOMPI_NO_AUTORIZADO':
        return 'La pasarela de prueba rechazó las credenciales configuradas. Avisa al equipo de Diverso.';
      case 'SOLO_MODO_PRUEBA':
        return 'La pasarela de prueba no está configurada.';
      case 'SIN_CONEXION':
        return 'Sin conexión con el servidor. Revisa tu internet e intenta de nuevo.';
      case 'ERROR_SERVIDOR':
      case 'ERROR_INTERNO':
      case 'CONFIG_SUPABASE':
      case 'SERVICIO_NO_DISPONIBLE':
        return 'El servidor tuvo un problema. Intenta de nuevo en un momento.';
      case 'ERROR_BD':
        return 'Error de conexión. Revisa tu internet e intenta de nuevo.';
      default:
        return 'Algo salió mal ($codigo). Intenta de nuevo.';
    }
  }
}
