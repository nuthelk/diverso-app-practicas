import { DiversoError, diversoConfig } from '@/core';
import { PagoAbierto } from '@/features/checkout/pago-abierto';
import {
  abrirEnLaMismaVentana,
  decidirNavegacion,
  esRedireccionDePago,
  idDeRedireccion,
  urlRetornoPago,
} from '@/features/checkout/pago-wompi';

import { capture } from '../../support/errors';

/**
 * Apertura del pago de Wompi sin navegador ni WebView. Port 1:1 de `pago_wompi_test.dart` y
 * `pago_abierto_test.dart` (+ la decisión del WebView y la URL de retorno en web).
 */

describe('redirección de retorno de Wompi (WebView en Android/iOS)', () => {
  test('reconoce https://diverso.app/pago/resultado y lee el id de la transacción', () => {
    const url = 'https://diverso.app/pago/resultado?id=12345-1700000000-98765';
    expect(esRedireccionDePago(url)).toBe(true);
    expect(idDeRedireccion(url)).toBe('12345-1700000000-98765');
  });

  test('sin id → es redirección pero no hay transacción', () => {
    expect(esRedireccionDePago('https://diverso.app/pago/resultado')).toBe(true);
    expect(idDeRedireccion('https://diverso.app/pago/resultado')).toBeNull();
    expect(idDeRedireccion('https://diverso.app/pago/resultado?id=')).toBeNull();
  });

  test('otras URLs (Wompi, bancos, otro dominio parecido) no se interceptan', () => {
    for (const url of [
      'https://checkout.wompi.co/p/?public-key=pub_test_x',
      'https://diverso.app/otra/ruta?id=1',
      'https://diverso.app.evil.example/pago/resultado?id=1',
      'https://evil.example/?next=https://diverso.app/pago/resultado',
      'http://diverso.app/pago/resultado?id=1',
      'no es una url',
    ]) {
      expect([url, esRedireccionDePago(url)]).toEqual([url, false]);
    }
  });

  test('la URL de retorno que se pide a pagos-iniciar en móvil es la interceptada', () => {
    expect(diversoConfig.pagoRetornoMovil).toBe('https://diverso.app/pago/resultado');
    // En pruebas (no web) se usa la de móvil.
    expect(urlRetornoPago()).toBe(diversoConfig.pagoRetornoMovil);
  });

  test('en web la URL de retorno es el origen de la app + /pago/resultado (misma pestaña)', () => {
    expect(urlRetornoPago({ web: true, origen: () => 'http://localhost:8081' })).toBe(
      'http://localhost:8081/pago/resultado',
    );
  });

  test('el WebView intercepta el retorno SIN cargarlo, deja pasar la web y bloquea otros esquemas', () => {
    expect(decidirNavegacion('https://diverso.app/pago/resultado?id=tx-9')).toEqual({ tipo: 'retorno', id: 'tx-9' });
    expect(decidirNavegacion('https://diverso.app/pago/resultado')).toEqual({ tipo: 'retorno', id: null });
    expect(decidirNavegacion('https://checkout.wompi.co/p/?x=1')).toEqual({ tipo: 'permitir' });
    expect(decidirNavegacion('http://banco.example/pse')).toEqual({ tipo: 'permitir' });
    expect(decidirNavegacion('about:blank')).toEqual({ tipo: 'permitir' });
    expect(decidirNavegacion('intent://pagar#Intent;scheme=nequi;end')).toEqual({ tipo: 'bloquear' });
    expect(decidirNavegacion('nequi://pagar')).toEqual({ tipo: 'bloquear' });
  });
});

describe('abrirEnLaMismaVentana (web)', () => {
  const url = 'https://checkout.wompi.co/p/?public-key=pub_test_x&reference=DIV-1';

  test('lanza Wompi y TERMINA con redirigido, sin quedarse esperando', async () => {
    const lanzadas: string[] = [];
    const resultado = await abrirEnLaMismaVentana(url, (u) => {
      lanzadas.push(u);
      return true;
    });
    expect(resultado).toBe(PagoAbierto.redirigido);
    expect(lanzadas).toEqual([url]);
  });

  test('si el navegador no abre Wompi: ERROR_NAVEGADOR, no un pago a medias', async () => {
    const e = await capture<DiversoError>(() => abrirEnLaMismaVentana(url, () => false));
    expect(e).toBeInstanceOf(DiversoError);
    expect(e.code).toBe('ERROR_NAVEGADOR');
    expect(e.userMessage).not.toBe('');
  });
});

test('el resultado distingue pago terminado, cerrado y redirigido', () => {
  expect(Object.values(PagoAbierto)).toEqual([PagoAbierto.completado, PagoAbierto.cerrado, PagoAbierto.redirigido]);
});
