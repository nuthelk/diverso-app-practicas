import { DiversoError } from '@/core';
import { errorMessageFor } from '@/features/shared/error-message';

import { postgrestError } from '../../support/errors';

/** `mensaje_de_error.dart`: texto para el viajero de CUALQUIER error que llegue a un view model. */
test('un DiversoError usa su mensaje propio', () => {
  expect(errorMessageFor(new DiversoError('SIN_CUPO'))).toBe(
    'Se acabaron los cupos para esa fecha. Prueba otra fecha u otro plan.',
  );
});

test('un error de PostgREST se traduce por su código', () => {
  expect(errorMessageFor(postgrestError('RESERVA_NO_EXISTE'))).toBe('No encontramos esa reserva.');
  expect(errorMessageFor(postgrestError('otra cosa'))).toBe('Error de conexión. Revisa tu internet e intenta de nuevo.');
});

test('cualquier otra cosa es un error inesperado', () => {
  expect(errorMessageFor(new Error('boom'))).toBe('Algo salió mal (ERROR_INESPERADO). Intenta de nuevo.');
  expect(errorMessageFor('texto')).toBe('Algo salió mal (ERROR_INESPERADO). Intenta de nuevo.');
});
