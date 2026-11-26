/**
 * Rutas y reglas de acceso (`lib/router/` de Flutter): constantes y helpers de rutas, el guard
 * puro de sesión/consentimiento y el «volver» seguro. Las pantallas importan de aquí: ninguna
 * escribe una ruta a mano.
 */
export {
  AppRoutes,
  encodeQueryComponent,
  decodeQueryComponent,
  idsToCompare,
  MAX_COMPARE,
  param,
  optionalParam,
} from './routes';
export { safeDestination, isScreenVisible, sessionRedirect, routeLocation } from './session-redirect';
export { safeGoBack, type GoBackRouter } from './safe-go-back';
