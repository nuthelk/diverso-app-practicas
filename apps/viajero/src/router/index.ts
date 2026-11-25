/**
 * Rutas y reglas de acceso (`lib/router/` de Flutter): constantes y helpers de rutas, el guard
 * puro de sesión/consentimiento y el «volver» seguro. Las pantallas importan de aquí: ninguna
 * escribe una ruta a mano.
 */
export {
  AppRoutes,
  codificarComponenteQuery,
  decodificarComponenteQuery,
  idsAComparar,
  MAX_COMPARAR,
  parametro,
  parametroOpcional,
} from './rutas';
export { destinoSeguro, pantallaVisible, sesionRedirect, ubicacionDeRuta } from './sesion-redirect';
export { volverSeguro, type RouterParaVolver } from './volver-seguro';
