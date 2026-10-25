"""Humo de punta a punta del pago de la app del viajero contra el Wompi SIMULADO (sin llaves reales).

Recorre lo mismo que hace la app (WompiPaymentGateway + BookingService): create_booking →
pagos-iniciar → «pago» en el Wompi falso → pagos-verificar → vista previa y cancelación con
reembolso. Un pago aprobado y uno rechazado, con el viajero demo (viajero@demo.com / demo1234).

Reutiliza la infraestructura de supabase/functions/_tests/test_pagos.py (mock de Wompi y
`supabase functions serve` con WOMPI_ENV=mock). Necesita `supabase start` ya iniciado y la
migración 0003. NO hace `db reset`. Todo lo que crea (reservas, intentos, pagos y reembolsos del
viajero demo) se borra al final; imprime los conteos antes y después.

Uso (desde la raíz del repo):
    python -I apps/viajero/scripts/smoke_pago_mock.py            # humo y salir
    python -I apps/viajero/scripts/smoke_pago_mock.py --servir   # solo deja mock + funciones servidos
                                                                  # (para `flutter test` de integración); Ctrl+C
"""
import importlib.util
import sys

sys.dont_write_bytecode = True  # no dejar __pycache__ en supabase/functions/_tests
import time
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location("test_pagos", RAIZ / "supabase/functions/_tests/test_pagos.py")
tp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tp)

import subprocess  # noqa: E402

EMAIL, PASSWORD = "viajero@demo.com", "demo1234"
REDIRECT = "http://localhost:8080/pago/resultado"


def levantar():
    puerto = tp.puerto_libre()
    proc = subprocess.Popen([sys.executable, "-I", str(tp.MOCK_PY), "--port", str(puerto)],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    mock = tp.Mock(puerto)
    for _ in range(50):
        try:
            tp.http("GET", mock.base + "/_mock/health")
            break
        except Exception:
            time.sleep(0.1)
    try:
        servidor = tp.Servidor(tp.entorno_mock(puerto))
    except BaseException:
        tp.terminar(proc)
        raise
    return mock, proc, servidor


def iniciar_sesion():
    estado, r = tp.http("POST", f"{tp.API}/auth/v1/token?grant_type=password",
                        {"email": EMAIL, "password": PASSWORD},
                        {"apikey": tp.ANON, "Content-Type": "application/json"})
    assert estado == 200, (estado, r)
    return r["access_token"], r["user"]["id"]


def conteos(uid):
    out = {}
    reservas = tp.sql_get("bookings", f"viajero_id=eq.{uid}&select=id")
    ids = ",".join(b["id"] for b in reservas) or "00000000-0000-0000-0000-000000000000"
    out["bookings"] = len(reservas)
    for tabla in ("payments", "payment_attempts", "refunds"):
        out[tabla] = len(tp.sql_get(tabla, f"booking_id=in.({ids})&select=id"))
    return out


def comprobar(condicion, mensaje):
    print(("  OK  " if condicion else "  FALLA ") + mensaje)
    if not condicion:
        raise SystemExit(1)


def flujo(mock, jwt, plan_date_id, nombre, metodo, dato, esperado_pago, esperado_reserva):
    print(f"\n== {nombre} ==")
    estado, r = tp.rpc("create_booking", {"p_plan_date_id": plan_date_id, "p_pax": 1}, jwt=jwt)
    comprobar(estado == 200, f"create_booking → {estado} {r.get('codigo') if isinstance(r, dict) else r}")
    reserva = r
    estado, ini = tp.funcion("pagos-iniciar", {"booking_id": reserva["booking_id"], "redirect_url": REDIRECT}, jwt)
    comprobar(estado == 200 and ini["amount_in_cents"] == int(round(reserva["monto_total"] * 100)),
              f"pagos-iniciar → {estado} ref={ini.get('referencia')} cents={ini.get('amount_in_cents')}")
    comprobar("signature%3Aintegrity=" in ini["checkout_url"] or "signature:integrity=" in ini["checkout_url"],
              "checkout_url lleva la firma de integridad")
    tx = mock.transaccion(ini["referencia"], ini["amount_in_cents"], metodo, dato)
    estado, ver = tp.funcion("pagos-verificar", {"transaction_id": tx["id"]}, jwt)
    comprobar(estado == 200 and ver["estado_pago"] == esperado_pago and ver["booking"]["estado"] == esperado_reserva,
              f"pagos-verificar {{transaction_id}} → {estado} estado_pago={ver.get('estado_pago')} "
              f"booking={ver.get('booking', {}).get('estado')}")
    estado, ver2 = tp.funcion("pagos-verificar", {"booking_id": reserva["booking_id"]}, jwt)
    comprobar(estado == 200 and ver2["estado_pago"] in (esperado_pago, "pendiente"),
              f"pagos-verificar {{booking_id}} («Ya pagué») → {estado} estado_pago={ver2.get('estado_pago')}")
    estado, vista = tp.rpc("vista_previa_cancelacion", {"p_booking_id": reserva["booking_id"]}, jwt=jwt)
    comprobar(estado == 200, f"vista_previa_cancelacion → aplica={vista.get('aplica')} "
                             f"{vista.get('porcentaje')} % monto={vista.get('monto')}")
    estado, canc = tp.funcion("reservas-cancelar", {"booking_id": reserva["booking_id"]}, jwt)
    comprobar(estado == 200 and canc["estado"] == "cancelada", f"reservas-cancelar → {estado} {canc.get('reembolso')}")
    if esperado_pago == "aprobado":
        comprobar(canc["reembolso"]["aplica"] and canc["reembolso"]["estado"] == "aprobado",
                  "reembolso de prueba aprobado por el Wompi simulado")
    else:
        comprobar(not canc["reembolso"]["aplica"] and canc["reembolso"]["estado"] == "no_aplica",
                  "reserva sin pago: sin reembolso")
    return reserva["booking_id"]


def humo():
    mock, proc_mock, servidor = levantar()
    creadas = []
    jwt = uid = None
    try:
        jwt, uid = iniciar_sesion()
        antes = conteos(uid)
        print("Conteos ANTES  :", antes)
        hoy = time.strftime("%Y-%m-%d")
        fechas = tp.sql_get("plan_dates", f"fecha=gte.{hoy}&cupo_disponible=gte.3&select=id,plans!inner(estado)"
                                          "&plans.estado=eq.publicado&limit=1")
        comprobar(bool(fechas), "hay una fecha futura con cupos")
        pd = fechas[0]["id"]
        creadas.append(flujo(mock, jwt, pd, "Pago APROBADO (tarjeta 4242…)", "CARD", "4242424242424242",
                             "aprobado", "confirmada"))
        creadas.append(flujo(mock, jwt, pd, "Pago RECHAZADO (tarjeta 4111…)", "CARD", "4111111111111111",
                             "rechazado", "pendiente_pago"))
        print("\nOK: humo completo")
    finally:
        if uid:
            # Limpieza: las reservas ya están canceladas (cupos liberados); se borran con sus
            # intentos, pagos y reembolsos (ON DELETE CASCADE) usando el rol de servicio.
            if creadas:
                tp.rest("DELETE", "bookings?id=in.(" + ",".join(creadas) + ")")
            print("Conteos DESPUÉS:", conteos(uid))
        servidor.cerrar()
        tp.terminar(proc_mock)


def servir():
    mock, proc_mock, servidor = levantar()
    print(f"Mock de Wompi en {mock.base}; Edge Functions servidas con WOMPI_ENV=mock. Ctrl+C para cerrar.", flush=True)
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        servidor.cerrar()
        tp.terminar(proc_mock)


if __name__ == "__main__":
    servir() if "--servir" in sys.argv else humo()
