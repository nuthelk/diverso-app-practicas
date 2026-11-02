/// Enums de dominio espejo de los tipos PostgreSQL del esquema.
///
/// Cada valor lleva el texto exacto que guarda la BD ([DbEnum.db]): el nombre de Dart (camelCase)
/// y el de la BD (snake_case) no tienen por qué coincidir, p. ej. `pendientePago` ↔ `pendiente_pago`.
library;

/// Enum con un valor explícito en la BD (o en la respuesta de una Edge Function).
abstract interface class DbEnum {
  String get db;
}

/// El valor de [values] cuyo texto en la BD es [valor], o null si no existe.
T? enumFromDb<T extends DbEnum>(Iterable<T> values, String? valor) {
  if (valor == null) return null;
  for (final v in values) {
    if (v.db == valor) return v;
  }
  return null;
}

enum UserRole implements DbEnum {
  viajero('viajero'),
  agencia('agencia'),
  admin('admin');

  const UserRole(this.db);

  @override
  final String db;
}

enum VerificationStatus implements DbEnum {
  pendiente('pendiente'),
  verificado('verificado'),
  rechazado('rechazado');

  const VerificationStatus(this.db);

  @override
  final String db;
}

enum PlanStatus implements DbEnum {
  borrador('borrador'),
  publicado('publicado'),
  archivado('archivado');

  const PlanStatus(this.db);

  @override
  final String db;
}

enum BookingStatus implements DbEnum {
  pendientePago('pendiente_pago'),
  confirmada('confirmada'),
  cancelada('cancelada'),
  completada('completada');

  const BookingStatus(this.db);

  @override
  final String db;
}

enum PaymentMethodOption implements DbEnum {
  pse('pse'),
  nequi('nequi'),
  daviplata('daviplata'),
  tarjeta('tarjeta'),
  bancolombia('bancolombia'),
  otro('otro');

  const PaymentMethodOption(this.db);

  @override
  final String db;
}

enum PaymentStatus implements DbEnum {
  pendiente('pendiente'),
  aprobado('aprobado'),
  rechazado('rechazado'),
  reembolsado('reembolsado');

  const PaymentStatus(this.db);

  @override
  final String db;
}

enum ExperienceCategory implements DbEnum {
  aventura('aventura'),
  naturaleza('naturaleza'),
  cultura('cultura'),
  gastronomia('gastronomia'),
  relax('relax'),
  urbano('urbano');

  const ExperienceCategory(this.db);

  @override
  final String db;
}

extension ExperienceCategoryX on ExperienceCategory {
  String get label {
    switch (this) {
      case ExperienceCategory.aventura:
        return 'Aventura';
      case ExperienceCategory.naturaleza:
        return 'Naturaleza';
      case ExperienceCategory.cultura:
        return 'Cultura';
      case ExperienceCategory.gastronomia:
        return 'Gastronomía';
      case ExperienceCategory.relax:
        return 'Relax';
      case ExperienceCategory.urbano:
        return 'Urbano';
    }
  }

  String get emoji {
    switch (this) {
      case ExperienceCategory.aventura:
        return '🧭';
      case ExperienceCategory.naturaleza:
        return '🌿';
      case ExperienceCategory.cultura:
        return '🏘️';
      case ExperienceCategory.gastronomia:
        return '🍽️';
      case ExperienceCategory.relax:
        return '💤';
      case ExperienceCategory.urbano:
        return '🏙️';
    }
  }
}

extension BookingStatusX on BookingStatus {
  String get label {
    switch (this) {
      case BookingStatus.pendientePago:
        return 'Pendiente de pago';
      case BookingStatus.confirmada:
        return 'Confirmada';
      case BookingStatus.cancelada:
        return 'Cancelada';
      case BookingStatus.completada:
        return 'Completada';
    }
  }
}

extension PaymentMethodX on PaymentMethodOption {
  String get label {
    switch (this) {
      case PaymentMethodOption.pse:
        return 'PSE';
      case PaymentMethodOption.nequi:
        return 'Nequi';
      case PaymentMethodOption.daviplata:
        return 'Daviplata';
      case PaymentMethodOption.tarjeta:
        return 'Tarjeta';
      case PaymentMethodOption.bancolombia:
        return 'Bancolombia';
      case PaymentMethodOption.otro:
        return 'Otro medio';
    }
  }
}
