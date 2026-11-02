import 'package:diverso_core/diverso_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viajero/ui/features/catalog/view_models/comparator_view_model.dart';

Plan _plan(String id) => Plan(
  id: id,
  agencyId: 'ag-1',
  titulo: 'Plan $id',
  destino: 'Guatapé',
  categoria: ExperienceCategory.aventura,
  precioCop: 150000,
  estado: PlanStatus.publicado,
  dates: const [],
);

class _Catalogo implements CatalogRepository {
  final consultas = <String>[];
  bool falla = false;

  @override
  Future<Plan> planDetalle(String planId) async {
    consultas.add(planId);
    if (falla) throw Exception('sin red');
    return _plan(planId);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

ComparatorViewModel _vm(_Catalogo catalogo, List<String> ids, {List<Plan>? iniciales}) {
  final vm = ComparatorViewModel(catalogo: catalogo, ids: ids, planesIniciales: iniciales);
  addTearDown(vm.dispose);
  return vm;
}

void main() {
  test('carga los planes por id, en el orden de los ids', () async {
    final catalogo = _Catalogo();
    final vm = _vm(catalogo, ['b', 'a']);
    expect(vm.cargando, isTrue);

    await vm.cargar();

    expect(vm.cargando, isFalse);
    expect(vm.planes!.map((p) => p.id), ['b', 'a']);
    expect(vm.error, isNull);
  });

  test('sin ids no hay nada que cargar', () async {
    final catalogo = _Catalogo();
    final vm = _vm(catalogo, const []);
    expect(vm.cargando, isFalse);
    expect(vm.planes, isEmpty);
    await vm.cargar();
    expect(catalogo.consultas, isEmpty);
  });

  test('los planes que ya se tenían (mismos ids) evitan la consulta', () async {
    final catalogo = _Catalogo();
    final vm = _vm(catalogo, ['a', 'b'], iniciales: [_plan('a'), _plan('b')]);
    expect(vm.cargando, isFalse);
    await vm.cargar();
    expect(catalogo.consultas, isEmpty);
    expect(vm.planes!.map((p) => p.id), ['a', 'b']);
  });

  test('si los planes que se tenían no son los de la URL, se pide lo que dice la URL', () async {
    final catalogo = _Catalogo();
    final vm = _vm(catalogo, ['a', 'c'], iniciales: [_plan('a'), _plan('b')]);
    expect(vm.cargando, isTrue);
    await vm.cargar();
    expect(catalogo.consultas, ['a', 'c']);
    expect(vm.planes!.map((p) => p.id), ['a', 'c']);
  });

  test('si falla queda con el mensaje y «cargar» de nuevo se recupera', () async {
    final catalogo = _Catalogo()..falla = true;
    final vm = _vm(catalogo, ['a', 'b']);

    await vm.cargar();
    expect(vm.planes, isNull);
    expect(vm.cargando, isFalse);
    expect(vm.error, 'No pudimos cargar los planes. Revisa tu conexión e intenta de nuevo.');

    catalogo.falla = false;
    await vm.cargar();
    expect(vm.error, isNull);
    expect(vm.planes!.length, 2);
  });
}
