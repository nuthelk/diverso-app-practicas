import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/enums.dart';
import '../models/plan.dart';
import '../models/profile.dart';
import '../utils/formatters.dart';
import 'booking_service.dart';

/// Borrador editable de plan para el formulario del panel de agencias.
class PlanDraft {
  PlanDraft({
    this.id,
    required this.titulo,
    required this.destino,
    required this.categoria,
    required this.precioCop,
    required this.resumen,
    required this.descripcion,
    required this.duracionTexto,
    required this.puntoEncuentro,
    required this.incluye,
    required this.incluyeTransporte,
    required this.incluyeComida,
    required this.incluyeHospedaje,
    required this.itinerario,
    required this.politicaCancelacion,
    required this.fotos,
  });

  final String? id;
  final String titulo;
  final String destino;
  final ExperienceCategory categoria;
  final double precioCop;
  final String resumen;
  final String descripcion;
  final String duracionTexto;
  final String puntoEncuentro;
  final List<String> incluye;
  final bool incluyeTransporte;
  final bool incluyeComida;
  final bool incluyeHospedaje;
  final List<ItinerarioPaso> itinerario;
  final String politicaCancelacion;
  final List<String> fotos;

  factory PlanDraft.vacio() => PlanDraft(
        titulo: '',
        destino: '',
        categoria: ExperienceCategory.aventura,
        precioCop: 0,
        resumen: '',
        descripcion: '',
        duracionTexto: '1 día',
        puntoEncuentro: '',
        incluye: [],
        incluyeTransporte: true,
        incluyeComida: false,
        incluyeHospedaje: false,
        itinerario: [],
        politicaCancelacion: '',
        fotos: [],
      );

  factory PlanDraft.dePlan(Plan p) => PlanDraft(
        id: p.id,
        titulo: p.titulo,
        destino: p.destino,
        categoria: p.categoria,
        precioCop: p.precioCop,
        resumen: p.resumen,
        descripcion: p.descripcion,
        duracionTexto: p.duracionTexto,
        puntoEncuentro: p.puntoEncuentro,
        incluye: List.of(p.incluye),
        incluyeTransporte: p.incluyeTransporte,
        incluyeComida: p.incluyeComida,
        incluyeHospedaje: p.incluyeHospedaje,
        itinerario: List.of(p.itinerario),
        politicaCancelacion: p.politicaCancelacion,
        fotos: List.of(p.fotos),
      );

  Map<String, dynamic> toMap() => {
        'titulo': titulo,
        'destino': destino,
        'categoria': categoria.name,
        'precio_cop': precioCop,
        'resumen': resumen,
        'descripcion': descripcion,
        'duracion_texto': duracionTexto,
        'duracion_horas': _duracionHoras(duracionTexto),
        'punto_encuentro': puntoEncuentro,
        'incluye': incluye,
        'incluye_transporte': incluyeTransporte,
        'incluye_comida': incluyeComida,
        'incluye_hospedaje': incluyeHospedaje,
        'itinerario': itinerario.map((i) => i.toMap()).toList(),
        'politica_cancelacion': politicaCancelacion,
        'fotos': fotos,
      };

  static double _duracionHoras(String texto) {
    final t = texto.toLowerCase();
    if (t.contains('2 días') || t.contains('dos días')) return 40;
    if (t.contains('día') || t.contains('dia')) return 12;
    if (t.contains('hora')) {
      final m = RegExp(r'(\d+)').firstMatch(t);
      if (m != null) return double.parse(m.group(1)!);
      return 4;
    }
    return 12;
  }
}

/// Fila de la vista de conciliación agency_sales.
class VentaRow {
  VentaRow({
    required this.codigo,
    required this.planTitulo,
    required this.destino,
    required this.fecha,
    required this.pax,
    required this.montoTotal,
    required this.comision,
    required this.saldoAgencia,
    required this.bookingEstado,
    required this.pagoEstado,
    required this.provider,
    required this.referencia,
  });

  final String codigo;
  final String planTitulo;
  final String destino;
  final DateTime fecha;
  final int pax;
  final double montoTotal;
  final double comision;
  final double saldoAgencia;
  final String bookingEstado;
  final String? pagoEstado;
  final String? provider;
  final String? referencia;

  factory VentaRow.fromMap(Map<String, dynamic> map) => VentaRow(
        codigo: map['codigo'] as String,
        planTitulo: map['plan_titulo'] as String? ?? '',
        destino: map['destino'] as String? ?? '',
        fecha: DateTime.parse(map['fecha'] as String),
        pax: (map['pax'] as num?)?.toInt() ?? 0,
        montoTotal: (map['monto_total'] as num?)?.toDouble() ?? 0,
        comision: (map['comision'] as num?)?.toDouble() ?? 0,
        saldoAgencia: (map['saldo_agencia'] as num?)?.toDouble() ?? 0,
        bookingEstado: map['booking_estado'] as String? ?? '',
        pagoEstado: map['pago_estado'] as String?,
        provider: map['provider'] as String?,
        referencia: map['referencia'] as String?,
      );
}

class AgencyService {
  SupabaseClient get _client => Supabase.instance.client;

  String? get _uid => _client.auth.currentUser?.id;

  /// Agencia cuyo dueño es el usuario actual (null si no ha registrado).
  Future<AgencyRef?> miAgencia() async {
    if (_uid == null) return null;
    final res = await _client
        .from('agencies')
        .select()
        .eq('owner_user_id', _uid!)
        .maybeSingle();
    return res == null ? null : AgencyRef.fromMap(res.cast<String, dynamic>());
  }

  Future<void> registrarAgencia({
    required String nombre,
    required String numeroRnt,
    required String matriculaCamaraComercio,
    required String ciudad,
    required String telefono,
    required String email,
    required String whatsapp,
    required String descripcion,
  }) async {
    try {
      await _client.from('agencies').insert({
        'owner_user_id': _uid,
        'nombre': nombre,
        'numero_rnt': numeroRnt,
        'matricula_camara_comercio': matriculaCamaraComercio,
        'ciudad': ciudad,
        'telefono': telefono,
        'email': email,
        'whatsapp': whatsapp,
        'descripcion': descripcion,
        // estado_verificacion queda 'pendiente' forzado por la política RLS
      });
    } catch (e) {
      throw DiversoException.fromPostgrest(e);
    }
  }

  /// Planes de la agencia del usuario (incluye borradores).
  Future<List<Plan>> misPlanes(String agencyId) async {
    final res = await _client
        .from('plans')
        .select('*, agencies(*), plan_dates(*)')
        .eq('agency_id', agencyId)
        .order('created_at', ascending: false)
        .order('plan_dates.fecha', ascending: true, referencedTable: 'plan_dates');
    return res.map((e) => Plan.fromMap((e as Map).cast<String, dynamic>())).toList();
  }

  Future<String> crearPlan(String agencyId, PlanDraft draft) async {
    try {
      final res = await _client
          .from('plans')
          .insert({...draft.toMap(), 'agency_id': agencyId})
          .select('id')
          .single();
      return res['id'] as String;
    } catch (e) {
      throw DiversoException.fromPostgrest(e);
    }
  }

  Future<void> actualizarPlan(PlanDraft draft) async {
    assert(draft.id != null, 'actualizarPlan requiere id');
    try {
      await _client.from('plans').update(draft.toMap()).eq('id', draft.id!);
    } catch (e) {
      throw DiversoException.fromPostgrest(e);
    }
  }

  Future<void> publicarPlan(String planId, {required bool publicado}) async {
    try {
      await _client
          .from('plans')
          .update({'estado': publicado ? 'publicado' : 'borrador'})
          .eq('id', planId);
    } catch (e) {
      throw DiversoException.fromPostgrest(e);
    }
  }

  Future<void> agregarFecha({
    required String planId,
    required DateTime fecha,
    required int cupoTotal,
  }) async {
    try {
      await _client.from('plan_dates').insert({
        'plan_id': planId,
        'fecha': fechaToIso(fecha),
        'cupo_total': cupoTotal,
        'cupo_disponible': cupoTotal,
      });
    } catch (e) {
      throw DiversoException.fromPostgrest(e);
    }
  }

  Future<void> eliminarFecha(String planDateId) async {
    await _client.from('plan_dates').delete().eq('id', planDateId);
  }

  /// Ventas de la agencia (vista agency_sales, filtrada por RLS).
  Future<List<VentaRow>> ventas(String agencyId, {int limit = 200}) async {
    final res = await _client
        .from('agency_sales')
        .select('*')
        .eq('agency_id', agencyId)
        .order('created_at', ascending: false)
        .limit(limit);
    return res.map((e) => VentaRow.fromMap((e as Map).cast<String, dynamic>())).toList();
  }
}

/// Referencia ligera a la agencia para el panel (usa Agency del modelo).
typedef AgencyRef = Agency;
