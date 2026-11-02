import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_radii.dart';
import '../../../core/theme/theme_mode_view_model.dart';

/// Selector de apariencia (Sistema / Claro / Oscuro): lee y cambia el [ThemeModeViewModel].
class SelectorApariencia extends StatelessWidget {
  const SelectorApariencia({super.key});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: cs.surfaceContainerLow,
        borderRadius: BorderRadius.circular(AppRadios.card),
      ),
      child: Consumer<ThemeModeViewModel>(
        builder: (context, modo, _) => SegmentedButton<int>(
          segments: const [
            ButtonSegment(
              value: 0,
              icon: Icon(Icons.brightness_auto_rounded, size: 18),
              label: Text('Sistema'),
            ),
            ButtonSegment(
              value: 1,
              icon: Icon(Icons.light_mode_rounded, size: 18),
              label: Text('Claro'),
            ),
            ButtonSegment(
              value: 2,
              icon: Icon(Icons.dark_mode_rounded, size: 18),
              label: Text('Oscuro'),
            ),
          ],
          selected: {
            switch (modo.mode) {
              ThemeMode.system => 0,
              ThemeMode.light => 1,
              _ => 2,
            },
          },
          onSelectionChanged: (sel) => modo.setMode(switch (sel.first) {
            0 => ThemeMode.system,
            1 => ThemeMode.light,
            _ => ThemeMode.dark,
          }),
        ),
      ),
    );
  }
}
