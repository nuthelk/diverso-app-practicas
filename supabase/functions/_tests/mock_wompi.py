"""Simulador local de la API de Wompi (solo biblioteca estándar) para probar las Edge Functions
sin llaves reales.

Implementa lo que llaman las funciones:
  GET  /v1/transactions/{id}            (Bearer prv_test_…)
  GET  /v1/transactions?reference=…
  POST /v1/refunds                      (contrato «Refunds V2 (Sandbox)» de docs.wompi.co)
  GET  /v1/refunds/{id}
  GET  /p/                              (página de checkout de relleno)
y ayudas de prueba bajo /_mock/:
  POST /_mock/transactions              crea una transacción para una referencia con el desenlace
                                        que dan los datos de prueba del sandbox:
                                          CARD 4242424242424242 → APPROVED, 4111111111111111 → DECLINED
                                          NEQUI 3991111111 → APPROVED, 3992222222 → DECLINED
                                          PSE banco "1" → APPROVED, "2" → DECLINED
                                          DAVIPLATA OTP 574829 → APPROVED, 932015 → DECLINED
                                          BANCOLOMBIA_TRANSFER: el estado final lo elige quien prueba (outcome)
                                        cualquier otro dato → ERROR. `status` fuerza el estado (p. ej. PENDING).
  POST /_mock/transactions/{id}/status  cambia el estado de una transacción
  POST /_mock/config                    {"refund_force": null|"pending"|"declined"|"error"}
  POST /_mock/refunds/{id}/status       resuelve un reembolso pendiente
  GET  /_mock/refunds                   reembolsos recibidos (para verificar montos y referencias)
  POST /_mock/reset                     borra todo

Uso:  python -I mock_wompi.py --port 8765   (escucha en 0.0.0.0 para que el contenedor de Edge Functions
      lo alcance como host.docker.internal)
"""
import argparse
import json
import secrets
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

LOCK = threading.Lock()
TRANSACCIONES = {}
REEMBOLSOS = {}
CONFIG = {"refund_force": None}

DATOS_PRUEBA = {
    "CARD": {"4242424242424242": "APPROVED", "4111111111111111": "DECLINED"},
    "NEQUI": {"3991111111": "APPROVED", "3992222222": "DECLINED"},
    "PSE": {"1": "APPROVED", "2": "DECLINED"},
    "DAVIPLATA": {"574829": "APPROVED", "932015": "DECLINED"},
}
MENSAJES = {
    "APPROVED": "Transacción aprobada",
    "DECLINED": "Transacción rechazada",
    "ERROR": "Error en la transacción",
    "PENDING": "Transacción pendiente",
    "VOIDED": "Transacción anulada",
}
ESCENARIOS = {"approved": "APPROVED", "declined": "DECLINED", "error": "ERROR", "cancelled": "CANCELLED"}


def ahora():
    return time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())


def resultado_de_datos(metodo, dato, outcome):
    if metodo == "BANCOLOMBIA_TRANSFER" or metodo == "BANCOLOMBIA_QR":
        return outcome or "PENDING"
    return DATOS_PRUEBA.get(metodo, {}).get(str(dato), "ERROR")


class Manejador(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *args):  # silencioso; las pruebas imprimen lo suyo
        pass

    # -- utilidades --------------------------------------------------------
    def responder(self, codigo, cuerpo=None, tipo="application/json"):
        datos = b"" if cuerpo is None else (cuerpo if isinstance(cuerpo, bytes) else json.dumps(cuerpo).encode())
        self.send_response(codigo)
        self.send_header("Content-Type", tipo)
        self.send_header("Content-Length", str(len(datos)))
        self.end_headers()
        self.wfile.write(datos)

    def cuerpo_json(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n == 0:
            return {}
        return json.loads(self.rfile.read(n))

    def autorizado(self):
        auth = self.headers.get("Authorization", "")
        if auth.startswith("Bearer prv_test_") and len(auth) > len("Bearer prv_test_"):
            return True
        self.responder(401, {"error": {"type": "UNAUTHORIZED", "message": "llave privada inválida"}})
        return False

    # -- GET -----------------------------------------------------------------
    def do_GET(self):
        u = urlparse(self.path)
        partes = [p for p in u.path.split("/") if p]
        with LOCK:
            if partes == ["p"]:
                return self.responder(200, b"<html><body>Wompi mock checkout</body></html>", "text/html")
            if partes == ["_mock", "refunds"]:
                return self.responder(200, {"data": list(REEMBOLSOS.values())})
            if partes == ["_mock", "health"]:
                return self.responder(200, {"ok": True})
            if partes[:2] == ["v1", "transactions"]:
                if not self.autorizado():
                    return
                if len(partes) == 3:
                    tx = TRANSACCIONES.get(partes[2])
                    if tx is None:
                        return self.responder(404, {"error": {"type": "NOT_FOUND_ERROR", "reason": "Transacción no encontrada"}})
                    return self.responder(200, {"data": tx})
                ref = parse_qs(u.query).get("reference", [None])[0]
                lista = [t for t in TRANSACCIONES.values() if ref is None or t["reference"] == ref]
                return self.responder(200, {"data": lista})
            if partes[:2] == ["v1", "refunds"] and len(partes) == 3:
                if not self.autorizado():
                    return
                r = REEMBOLSOS.get(partes[2])
                if r is None:
                    return self.responder(404, {"error": {"type": "REFUND_NOT_FOUND", "message": "no existe"}})
                return self.responder(200, {"refund_id": r["v2_refund_id"], "region": "CO", "transaction_id": r["transaction_id"],
                                            "status": r["status"], "amount_in_cents": r["amount_in_cents"]})
        self.responder(404, {"error": {"type": "NOT_FOUND"}})

    # -- POST ----------------------------------------------------------------
    def do_POST(self):
        u = urlparse(self.path)
        partes = [p for p in u.path.split("/") if p]
        try:
            cuerpo = self.cuerpo_json()
        except ValueError:
            return self.responder(400, {"error": {"type": "INPUT_VALIDATION_ERROR"}})
        with LOCK:
            if partes == ["_mock", "transactions"]:
                return self.crear_transaccion(cuerpo)
            if partes[:2] == ["_mock", "transactions"] and len(partes) == 4 and partes[3] == "status":
                tx = TRANSACCIONES.get(partes[2])
                if tx is None:
                    return self.responder(404, {"error": "no existe"})
                tx["status"] = cuerpo["status"]
                tx["status_message"] = MENSAJES.get(cuerpo["status"], "")
                tx["finalized_at"] = ahora() if cuerpo["status"] != "PENDING" else None
                return self.responder(200, {"data": tx})
            if partes == ["_mock", "config"]:
                CONFIG.update(cuerpo)
                return self.responder(200, CONFIG)
            if partes[:2] == ["_mock", "refunds"] and len(partes) == 4 and partes[3] == "status":
                r = REEMBOLSOS.get(partes[2])
                if r is None:
                    return self.responder(404, {"error": "no existe"})
                r["status"] = cuerpo["status"]
                return self.responder(200, r)
            if partes == ["_mock", "reset"]:
                TRANSACCIONES.clear()
                REEMBOLSOS.clear()
                CONFIG.update({"refund_force": None})
                return self.responder(200, {"ok": True})
            if partes == ["v1", "refunds"]:
                if not self.autorizado():
                    return
                return self.crear_reembolso(cuerpo)
        self.responder(404, {"error": {"type": "NOT_FOUND"}})

    def crear_transaccion(self, c):
        metodo = c.get("method", "CARD")
        estado = c.get("status") or resultado_de_datos(metodo, c.get("dato"), c.get("outcome"))
        tx_id = f"{secrets.randbelow(9000) + 1000}-{int(time.time())}-{secrets.randbelow(90000) + 10000}"
        tx = {
            "id": tx_id,
            "reference": c["reference"],
            "status": estado,
            "status_message": MENSAJES.get(estado, ""),
            "amount_in_cents": c["amount_in_cents"],
            "currency": c.get("currency", "COP"),
            "payment_method_type": metodo,
            "customer_email": "mock@example.com",  # dato personal de relleno: las funciones no deben guardarlo
            "created_at": ahora(),
            "finalized_at": ahora() if estado != "PENDING" else None,
        }
        TRANSACCIONES[tx_id] = tx
        self.responder(201, {"data": tx})

    def crear_reembolso(self, c):
        extras = [k for k in c if k == "reference" or k.startswith("reference_")]
        if len(extras) > 5:
            return self.responder(422, {"error": {"type": "INPUT_VALIDATION_ERROR"}})
        tx = TRANSACCIONES.get(c.get("transaction_id"))
        if tx is None or tx["status"] != "APPROVED":
            return self.responder(422, {"error": {"type": "INPUT_VALIDATION_ERROR", "messages": ["la transacción no está aprobada"]}})
        cents = c.get("amount_in_cents")
        pedido_antes = sum(r["amount_in_cents"] for r in REEMBOLSOS.values()
                           if r["transaction_id"] == tx["id"] and r["status"] in ("APPROVED", "PENDING"))
        if not isinstance(cents, int) or cents <= 0 or cents + pedido_antes > tx["amount_in_cents"]:
            return self.responder(422, {"error": {"type": "AMOUNT_EXCEEDED"}})
        numero = len(REEMBOLSOS) + 1
        force = CONFIG.get("refund_force")
        if force == "pending":
            estado = "PENDING"
        else:
            estado = ESCENARIOS.get(force or c.get("test_scenario") or "approved", "APPROVED")
        r = {
            "id": numero,
            "status": estado,
            "status_message": "" if estado in ("APPROVED", "PENDING") else "simulado",
            "v2_refund_id": f"v2_refund_{secrets.token_hex(4)}",
            "amount_in_cents": cents,
            "transaction_id": tx["id"],
            "reference": c.get("reference"),
            "reason": c.get("reason"),
            "test_scenario": c.get("test_scenario"),
            "created_at": ahora(),
        }
        REEMBOLSOS[r["v2_refund_id"]] = r
        if estado == "PENDING":
            return self.responder(202, {"refund_id": r["v2_refund_id"], "status": "PENDING", "flow_version": "v2"})
        self.responder(201, {"data": r})


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--port", type=int, default=8765)
    a = p.parse_args()
    srv = ThreadingHTTPServer(("0.0.0.0", a.port), Manejador)
    print(f"mock Wompi escuchando en :{a.port}", flush=True)
    srv.serve_forever()


if __name__ == "__main__":
    main()
