import 'enums.dart';

class Profile {
  Profile({required this.id, required this.rol, required this.nombre, this.telefono});

  final String id;
  final UserRole rol;
  final String nombre;
  final String? telefono;

  factory Profile.fromMap(Map<String, dynamic> map) => Profile(
    id: map['id'] as String,
    rol: enumFromString(UserRole.values, map['rol'] as String?) ?? UserRole.viajero,
    nombre: (map['nombre'] as String?) ?? '',
    telefono: map['telefono'] as String?,
  );
}

class Agency {
  Agency({
    required this.id,
    required this.nombre,
    required this.numeroRnt,
    required this.matriculaCamaraComercio,
    required this.estadoVerificacion,
    this.ownerUserId,
    this.descripcion = '',
    this.ciudad = 'Medellín',
    this.telefono,
    this.email,
    this.whatsapp,
    this.logoUrl,
    this.comisionPct = 12,
    this.rntVigenteHasta,
  });

  final String id;
  final String? ownerUserId;
  final String nombre;
  final String descripcion;
  final String numeroRnt;
  final String matriculaCamaraComercio;
  final String ciudad;
  final String? telefono;
  final String? email;
  final String? whatsapp;
  final String? logoUrl;
  final VerificationStatus estadoVerificacion;
  final double comisionPct;

  /// Fecha hasta la que el RNT está vigente (renovación anual).
  final DateTime? rntVigenteHasta;

  /// Verificada y con RNT vigente: solo así puede vender en la plataforma.
  bool get verificada {
    if (estadoVerificacion != VerificationStatus.verificado) return false;
    final v = rntVigenteHasta;
    if (v == null) return false;
    final hoy = DateTime.now();
    return !v.isBefore(DateTime(hoy.year, hoy.month, hoy.day));
  }

  factory Agency.fromMap(Map<String, dynamic> map) => Agency(
    id: map['id'] as String,
    ownerUserId: map['owner_user_id'] as String?,
    nombre: map['nombre'] as String,
    descripcion: (map['descripcion'] as String?) ?? '',
    numeroRnt: map['numero_rnt'] as String,
    matriculaCamaraComercio: (map['matricula_camara_comercio'] as String?) ?? '',
    ciudad: (map['ciudad'] as String?) ?? 'Medellín',
    telefono: map['telefono'] as String?,
    email: map['email'] as String?,
    whatsapp: map['whatsapp'] as String?,
    logoUrl: map['logo_url'] as String?,
    estadoVerificacion:
        enumFromString(VerificationStatus.values, map['estado_verificacion'] as String?) ??
        VerificationStatus.pendiente,
    comisionPct: (map['comision_pct'] as num?)?.toDouble() ?? 12,
    rntVigenteHasta: map['rnt_vigente_hasta'] == null
        ? null
        : DateTime.tryParse(map['rnt_vigente_hasta'].toString()),
  );
}
