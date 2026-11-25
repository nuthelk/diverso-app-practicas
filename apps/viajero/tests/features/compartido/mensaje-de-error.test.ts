import { DiversoError } from '@/core';
import { mensajeDeError } from '@/features/compartido/mensaje-de-error';

import { errorPostgrest } from '../../support/errores';

/** `mensaje_de_error.dart`: texto para el viajero de CUALQUIER error que llegue a un view model. */
test('un DiversoError usa su mensaje propio', () => {
  expect(mensajeDeError(new DiversoError('SIN_CUPO'))).toBe(
    'Se acabaron los cupos para esa fecha. Prueba otra fecha u otro plan.',
  );
});

test('un error de PostgREST se traduce por su código', () => {
  expect(mensajeDeError(errorPostgrest('RESERVA_NO_EXISTE'))).toBe('No encontramos esa reserva.');
  expect(mensajeDeError(errorPostgrest('otra cosa'))).toBe('Error de conexión. Revisa tu internet e intenta de nuevo.');
});

test('cualquier otra cosa es un error inesperado', () => {
  expect(mensajeDeError(new Error('boom'))).toBe('Algo salió mal (ERROR_INESPERADO). Intenta de nuevo.');
  expect(mensajeDeError('texto')).toBe('Algo salió mal (ERROR_INESPERADO). Intenta de nuevo.');
});
