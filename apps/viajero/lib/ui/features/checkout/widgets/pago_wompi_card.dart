import 'package:flutter/material.dart';

import '../../../core/theme/app_radii.dart';

/// Datos de prueba del sandbox de Wompi (docs.wompi.co): con ellos se simula cada desenlace.
const datosPruebaWompi = <String>[
  'Tarjeta: 4242 4242 4242 4242 → aprobada · 4111 1111 1111 1111 → rechazada '
      '(fecha futura y CVC de 3 dígitos cualquiera)',
  'Nequi: 3991111111 → aprobado · 3992222222 → rechazado',
  'PSE: banco 1 → aprobado · banco 2 → rechazado',
  'Daviplata: código (OTP) 574829 → aprobado · 932015 → rechazado',
  'Bancolombia: el estado final se elige en la pantalla de prueba de Wompi',
];

/// Pago con Wompi: el medio se elige en la página de Wompi; aquí solo se informa cuáles
/// acepta y que es un entorno de prueba.
class PagoWompiCard extends StatelessWidget {
  const PagoWompiCard({super.key});

  static const _medios = [
    (Icons.credit_card_rounded, 'Tarjeta'),
    (Icons.account_balance_rounded, 'PSE'),
    (Icons.smartphone_rounded, 'Nequi'),
    (Icons.phone_iphone_rounded, 'Daviplata'),
    (Icons.account_balance_wallet_rounded, 'Bancolombia'),
  ];

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: cs.primaryContainer,
            borderRadius: BorderRadius.circular(AppRadios.card),
            border: Border.fromBorderSide(BorderSide(color: cs.primary, width: 1.5)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.lock_rounded, size: 20, color: cs.primary),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Pagar con Wompi',
                      style: TextStyle(
                        fontSize: 15.5,
                        fontWeight: FontWeight.w700,
                        color: cs.onPrimaryContainer,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Eliges el medio en la página segura de Wompi; nosotros nunca vemos los datos de tu tarjeta '
                'o cuenta. Medios aceptados:',
                style: TextStyle(fontSize: 12.5, height: 1.35, color: cs.onPrimaryContainer),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  for (final (icono, nombre) in _medios)
                    Chip(
                      avatar: Icon(icono, size: 16, color: cs.primary),
                      label: Text(nombre, style: const TextStyle(fontSize: 12)),
                      visualDensity: VisualDensity.compact,
                      side: BorderSide.none,
                    ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        Material(
          color: cs.tertiaryContainer.withValues(alpha: .55),
          borderRadius: BorderRadius.circular(AppRadios.card),
          clipBehavior: Clip.antiAlias,
          child: Theme(
            data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
            child: ExpansionTile(
              leading: Icon(Icons.science_outlined, color: cs.onTertiaryContainer),
              title: Text(
                'Modo de prueba — no se cobra dinero real',
                style: TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w700,
                  color: cs.onTertiaryContainer,
                ),
              ),
              subtitle: Text(
                'Toca para ver los datos de prueba',
                style: TextStyle(fontSize: 11.5, color: cs.onTertiaryContainer),
              ),
              childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
              expandedCrossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final dato in datosPruebaWompi)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Text(
                      '• $dato',
                      style: TextStyle(fontSize: 12, height: 1.35, color: cs.onTertiaryContainer),
                    ),
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        Padding(
          padding: const EdgeInsets.only(left: 4),
          child: Row(
            children: [
              Icon(Icons.shield_outlined, size: 14, color: cs.tertiary),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'Retenemos tus cupos 30 minutos mientras pagas. Reembolso según la política de cancelación.',
                  style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
