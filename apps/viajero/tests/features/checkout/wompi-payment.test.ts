import { DiversoError, diversoConfig } from '@/core';
import { PaymentOutcome } from '@/features/checkout/payment-outcome';
import {
  openInSameWindow,
  decideNavigation,
  isPaymentRedirect,
  redirectTransactionId,
  paymentReturnUrl,
} from '@/features/checkout/wompi-payment';

import { capture } from '../../support/errors';

/**
 * Apertura del pago de Wompi sin navegador ni WebView. Port 1:1 de `pago_wompi_test.dart` y
 * `pago_abierto_test.dart` (+ la decisión del WebView y la URL de retorno en web).
 */

describe('redirección de retorno de Wompi (WebView en Android/iOS)', () => {
  test('reconoce https://diverso.app/pago/resultado y lee el id de la transacción', () => {
    const url = 'https://diverso.app/pago/resultado?id=12345-1700000000-98765';
    expect(isPaymentRedirect(url)).toBe(true);
    expect(redirectTransactionId(url)).toBe('12345-1700000000-98765');
  });

  test('sin id → es redirección pero no hay transacción', () => {
    expect(isPaymentRedirect('https://diverso.app/pago/resultado')).toBe(true);
    expect(redirectTransactionId('https://diverso.app/pago/resultado')).toBeNull();
    expect(redirectTransactionId('https://diverso.app/pago/resultado?id=')).toBeNull();
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
      expect([url, isPaymentRedirect(url)]).toEqual([url, false]);
    }
  });

  test('la URL de retorno que se pide a pagos-iniciar en móvil es la interceptada', () => {
    expect(diversoConfig.mobilePaymentReturnUrl).toBe('https://diverso.app/pago/resultado');
    // En pruebas (no web) se usa la de móvil.
    expect(paymentReturnUrl()).toBe(diversoConfig.mobilePaymentReturnUrl);
  });

  test('en web la URL de retorno es el origen de la app + /pago/resultado (misma pestaña)', () => {
    expect(paymentReturnUrl({ web: true, origin: () => 'http://localhost:8081' })).toBe(
      'http://localhost:8081/pago/resultado',
    );
  });

  test('el WebView intercepta el retorno SIN cargarlo, deja pasar la web y bloquea otros esquemas', () => {
    expect(decideNavigation('https://diverso.app/pago/resultado?id=tx-9')).toEqual({ kind: 'retorno', id: 'tx-9' });
    expect(decideNavigation('https://diverso.app/pago/resultado')).toEqual({ kind: 'retorno', id: null });
    expect(decideNavigation('https://checkout.wompi.co/p/?x=1')).toEqual({ kind: 'permitir' });
    expect(decideNavigation('http://banco.example/pse')).toEqual({ kind: 'permitir' });
    expect(decideNavigation('about:blank')).toEqual({ kind: 'permitir' });
    expect(decideNavigation('intent://pagar#Intent;scheme=nequi;end')).toEqual({ kind: 'bloquear' });
    expect(decideNavigation('nequi://pagar')).toEqual({ kind: 'bloquear' });
  });
});

describe('openInSameWindow (web)', () => {
  const url = 'https://checkout.wompi.co/p/?public-key=pub_test_x&reference=DIV-1';

  test('lanza Wompi y TERMINA con redirigido, sin quedarse esperando', async () => {
    const launched: string[] = [];
    const result = await openInSameWindow(url, (u) => {
      launched.push(u);
      return true;
    });
    expect(result).toBe(PaymentOutcome.redirected);
    expect(launched).toEqual([url]);
  });

  test('si el navegador no abre Wompi: ERROR_NAVEGADOR, no un pago a medias', async () => {
    const e = await capture<DiversoError>(() => openInSameWindow(url, () => false));
    expect(e).toBeInstanceOf(DiversoError);
    expect(e.code).toBe('ERROR_NAVEGADOR');
    expect(e.userMessage).not.toBe('');
  });
});

test('el resultado distingue pago terminado, cerrado y redirigido', () => {
  expect(Object.values(PaymentOutcome)).toEqual([PaymentOutcome.completed, PaymentOutcome.closed, PaymentOutcome.redirected]);
});
