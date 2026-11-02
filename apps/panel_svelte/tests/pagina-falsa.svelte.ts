/** `$app/state` falso para tests: `page` reactivo y `irA()` para simular la navegación por hash. */
const ORIGEN = 'http://localhost/';

export const page = $state({ url: new URL(ORIGEN) });

export function irA(ruta: string): void {
  page.url = new URL('#' + ruta, ORIGEN);
}
