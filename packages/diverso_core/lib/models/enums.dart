/// Enums de dominio espejo de los tipos PostgreSQL del esquema.
library;

enum UserRole { viajero, agencia, admin }

enum VerificationStatus { pendiente, verificado, rechazado }

enum PlanStatus { borrador, publicado, archivado }

enum BookingStatus { pendientePago, confirmada, cancelada, completada }

enum PaymentMethodOption { pse, nequi, daviplata, tarjeta, bancolombia, otro }

enum PaymentStatus { pendiente, aprobado, rechazado, reembolsado }

enum ExperienceCategory { aventura, naturaleza, cultura, gastronomia, relax, urbano }

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

T? enumFromString<T extends Enum>(Iterable<T> values, String? value) {
  if (value == null) return null;
  for (final v in values) {
    if (v.name == value) return v;
  }
  return null;
}
