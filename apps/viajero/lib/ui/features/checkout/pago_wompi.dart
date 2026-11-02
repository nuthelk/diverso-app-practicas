import 'dart:async';

import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';

/// URL a la que Wompi devuelve al viajero, según la plataforma:
/// - Web: `<origen de la app>/pago/resultado` (misma ventana; el origen debe estar en la lista
///   de permitidos del backend, p. ej. http://localhost:8080).
/// - Android/iOS: `https://diverso.app/pago/resultado`, interceptada por el WebView.
String urlRetornoPago() => kIsWeb
    ? '${Uri.base.origin}${DiversoConfig.pagoResultadoPath}'
    : DiversoConfig.pagoRetornoMovil;

/// ¿Es [url] la redirección final de Wompi (`https://diverso.app/pago/resultado[?id=…]`)?
bool esRedireccionDePago(String url) {
  final u = Uri.tryParse(url);
  final retorno = Uri.parse(DiversoConfig.pagoRetornoMovil);
  return u != null &&
      u.scheme == retorno.scheme &&
      u.host == retorno.host &&
      u.path == retorno.path;
}

/// `id` de la transacción que Wompi añade a la redirección, o null si no viene.
String? idDeRedireccion(String url) {
  final id = Uri.tryParse(url)?.queryParameters['id'];
  return id == null || id.isEmpty ? null : id;
}

/// Pide el checkout de la reserva a `pagos-iniciar` y lo abre.
///
/// - Web: navega en la MISMA ventana a Wompi; la página se descarga y el resultado llega a
///   `/pago/resultado` (el Future no termina).
/// - Android/iOS: WebView dentro de la app; al interceptar la redirección se va a
///   `/pago/resultado?id=…`. Devuelve false si el viajero cerró el pago sin terminar.
/// Lanza [DiversoException] si el servidor rechaza el inicio del pago.
Future<bool> iniciarPago(
  BuildContext context, {
  required PaymentGateway pasarela,
  required String bookingId,
}) async {
  final checkout = await pasarela.iniciar(bookingId: bookingId, redirectUrl: urlRetornoPago());
  if (kIsWeb) {
    final abierto = await launchUrl(Uri.parse(checkout.checkoutUrl), webOnlyWindowName: '_self');
    if (!abierto) throw DiversoException('ERROR_NAVEGADOR', 'No se pudo abrir Wompi');
    return Completer<bool>().future;
  }
  if (!context.mounted) return false;
  final id = await Navigator.of(context).push<String>(
    MaterialPageRoute(builder: (_) => PagoWompiPage(checkoutUrl: checkout.checkoutUrl)),
  );
  if (id == null || !context.mounted) return false;
  context.go('${DiversoConfig.pagoResultadoPath}?id=${Uri.encodeQueryComponent(id)}');
  return true;
}

/// Checkout de Wompi en un WebView; cierra con el id de la transacción al interceptar la
/// redirección final (esa URL nunca se carga).
class PagoWompiPage extends StatefulWidget {
  const PagoWompiPage({super.key, required this.checkoutUrl});

  final String checkoutUrl;

  @override
  State<PagoWompiPage> createState() => _PagoWompiPageState();
}

class _PagoWompiPageState extends State<PagoWompiPage> {
  late final WebViewController _web;
  int _progreso = 0;
  bool _terminado = false;

  @override
  void initState() {
    super.initState();
    _web = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (p) => setState(() => _progreso = p),
          onNavigationRequest: (request) {
            if (esRedireccionDePago(request.url)) {
              if (!_terminado) {
                _terminado = true;
                Navigator.of(context).pop(idDeRedireccion(request.url));
              }
              return NavigationDecision.prevent;
            }
            final u = Uri.tryParse(request.url);
            final web =
                u != null && (u.scheme == 'http' || u.scheme == 'https' || u.scheme == 'about');
            return web ? NavigationDecision.navigate : NavigationDecision.prevent;
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.checkoutUrl));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pago de prueba con Wompi'),
        leading: IconButton(
          icon: const Icon(Icons.close_rounded),
          tooltip: 'Cerrar',
          onPressed: () => Navigator.of(context).pop(),
        ),
        bottom: _progreso < 100
            ? PreferredSize(
                preferredSize: const Size.fromHeight(2),
                child: LinearProgressIndicator(value: _progreso / 100, minHeight: 2),
              )
            : null,
      ),
      body: WebViewWidget(controller: _web),
    );
  }
}
