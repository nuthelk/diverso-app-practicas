import 'package:flutter/material.dart';
import 'package:diverso_core/diverso_core.dart';
import 'package:provider/provider.dart';

/// Acceso al panel: hero de marca a la izquierda (desktop) y formulario a
/// la derecha; en pantallas angostas colapsa a una sola columna.
class LoginView extends StatefulWidget {
  const LoginView({super.key});

  @override
  State<LoginView> createState() => _LoginViewState();
}

class _LoginViewState extends State<LoginView> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  late final AuthRepository _auth;
  bool _cargando = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _auth = context.read<AuthRepository>();
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  void _rellenar(String email) {
    _emailCtrl.text = email;
    _passCtrl.text = 'demo1234';
    setState(() => _error = null);
  }

  Future<void> _entrar() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _cargando = true;
      _error = null;
    });
    try {
      await _auth.signIn(email: _emailCtrl.text.trim(), password: _passCtrl.text);
      // El redirect del router lleva a /starter, que decide el destino.
    } catch (e) {
      setState(() => _error = 'Credenciales inválidas o error de conexión.');
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ancho = MediaQuery.sizeOf(context).width;
    const breakpoint = 940.0;

    if (ancho < breakpoint) {
      return Scaffold(
        body: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(28),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: _TarjetaFormulario(
                formKey: _formKey,
                emailCtrl: _emailCtrl,
                passCtrl: _passCtrl,
                cargando: _cargando,
                error: _error,
                onEntrar: _entrar,
                onDemo: _rellenar,
              ),
            ),
          ),
        ),
      );
    }

    return Scaffold(
      body: Row(
        children: [
          const Expanded(flex: 5, child: _HeroMarca()),
          Expanded(
            flex: 6,
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(40),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 400),
                  child: _TarjetaFormulario(
                    formKey: _formKey,
                    emailCtrl: _emailCtrl,
                    passCtrl: _passCtrl,
                    cargando: _cargando,
                    error: _error,
                    onEntrar: _entrar,
                    onDemo: _rellenar,
                    compacta: true,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Formulario de acceso (compartido entre ambos layout).
class _TarjetaFormulario extends StatelessWidget {
  const _TarjetaFormulario({
    required this.formKey,
    required this.emailCtrl,
    required this.passCtrl,
    required this.cargando,
    required this.error,
    required this.onEntrar,
    required this.onDemo,
    this.compacta = false,
  });

  final GlobalKey<FormState> formKey;
  final TextEditingController emailCtrl;
  final TextEditingController passCtrl;
  final bool cargando;
  final String? error;
  final VoidCallback onEntrar;
  final void Function(String email) onDemo;
  final bool compacta;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final oscuro = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: cs.surfaceContainerLow,
        borderRadius: BorderRadius.circular(28),
        border: oscuro
            ? Border.all(color: cs.outlineVariant.withValues(alpha: .4))
            : null,
        boxShadow: compacta
            ? null
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: .08),
                  blurRadius: 40,
                  offset: const Offset(0, 18),
                ),
              ],
      ),
      child: Form(
        key: formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              width: 56,
              height: 56,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: cs.primaryContainer,
                borderRadius: BorderRadius.circular(18),
              ),
              child: DiversoLogo(size: 30, color: cs.onPrimaryContainer),
            ),
            const SizedBox(height: 18),
            const Text(
              'Diverso · Agencias',
              style: TextStyle(fontSize: 23, fontWeight: FontWeight.w800, letterSpacing: -.6),
            ),
            const SizedBox(height: 4),
            Text(
              'Publica planes, gestiona cupos y concilia tus pagos.',
              style: TextStyle(fontSize: 13.5, color: cs.onSurfaceVariant),
            ),
            const SizedBox(height: 24),
            TextFormField(
              controller: emailCtrl,
              decoration: const InputDecoration(
                labelText: 'Correo de la agencia',
                prefixIcon: Icon(Icons.mail_outline_rounded),
              ),
              validator: (v) => (v == null || !v.contains('@')) ? 'Correo inválido' : null,
              onFieldSubmitted: (_) => onEntrar(),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: passCtrl,
              decoration: const InputDecoration(
                labelText: 'Contraseña',
                prefixIcon: Icon(Icons.lock_outline_rounded),
              ),
              obscureText: true,
              validator: (v) => (v == null || v.isEmpty) ? 'Escribe tu contraseña' : null,
              onFieldSubmitted: (_) => onEntrar(),
            ),
            if (error != null) ...[
              const SizedBox(height: 12),
              Text(error!, textAlign: TextAlign.center,
                  style: TextStyle(color: cs.error, fontSize: 13.5)),
            ],
            const SizedBox(height: 20),
            FilledButton(
              onPressed: cargando ? null : onEntrar,
              child: cargando
                  ? const SizedBox(
                      height: 19, width: 19, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Entrar'),
            ),
            const SizedBox(height: 22),
            _ChipsDemo(onSeleccionar: onDemo),
          ],
        ),
      ),
    );
  }
}

/// Panel izquierdo del login desktop: marca, propuesta de valor y pruebas.
class _HeroMarca extends StatelessWidget {
  const _HeroMarca();

  @override
  Widget build(BuildContext context) {
    const azul = Color(0xFF2D4A73);
    const azulProfundo = Color(0xFF15233C);

    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [azul, azulProfundo],
        ),
      ),
      child: Stack(
        children: [
          // Resplandor ambiental
          Positioned(
            right: -120,
            top: -120,
            child: Container(
              width: 380,
              height: 380,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [Colors.white.withValues(alpha: .10), Colors.white.withValues(alpha: 0)],
                ),
              ),
            ),
          ),
          Positioned(
            left: -90,
            bottom: -140,
            child: Container(
              width: 320,
              height: 320,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [Colors.white.withValues(alpha: .06), Colors.white.withValues(alpha: 0)],
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 56, vertical: 48),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const DiversoLogo(size: 40, color: Colors.white),
                    const SizedBox(width: 12),
                    Text(
                      'Diverso',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: .95),
                        fontSize: 19,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -.4,
                      ),
                    ),
                  ],
                ),
                const Spacer(),
                const Text(
                  'Vende Antioquia\nal viajero correcto',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 38,
                    fontWeight: FontWeight.w800,
                    height: 1.12,
                    letterSpacing: -1.2,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'El marketplace donde las agencias verificadas publican '
                  'experiencias y los viajeros del Valle de Aburrá reservan con confianza.',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: .72),
                    fontSize: 15,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 34),
                _prueba(Icons.verified_user_outlined, 'Sello «Verificada RNT» que genera confianza'),
                const SizedBox(height: 14),
                _prueba(Icons.event_available_outlined, 'Cupos por fecha en tiempo real, sin sobreventa'),
                const SizedBox(height: 14),
                _prueba(Icons.account_balance_outlined, 'Conciliación clara: comisión 12% y saldo a dispersar'),
                const Spacer(),
                Text(
                  '© Diverso · Turismo de Antioquia',
                  style: TextStyle(color: Colors.white.withValues(alpha: .35), fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _prueba(IconData icono, String texto) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: .10),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icono, color: Colors.white.withValues(alpha: .92), size: 17),
        ),
        const SizedBox(width: 13),
        Expanded(
          child: Text(
            texto,
            style: TextStyle(
              color: Colors.white.withValues(alpha: .88),
              fontSize: 13.5,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }
}

class _ChipsDemo extends StatelessWidget {
  const _ChipsDemo({required this.onSeleccionar});

  final void Function(String email) onSeleccionar;

  static const _cuentas = [
    ('Agencia verificada', 'graffiti@demo.com'),
    ('En verificación', 'patrimonio@demo.com'),
    ('Admin', 'admin@demo.com'),
  ];

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'CUENTAS DEMO · CONTRASEÑA demo1234',
          style: TextStyle(
            fontSize: 10.5,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.2,
            color: cs.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _cuentas
              .map((c) => ActionChip(
                    label: Text(c.$1),
                    onPressed: () => onSeleccionar(c.$2),
                  ))
              .toList(),
        ),
      ],
    );
  }
}
