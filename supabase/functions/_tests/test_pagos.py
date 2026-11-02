"""Pruebas HTTP de punta a punta de los pagos con Wompi (SANDBOX simulado) y los reembolsos.

No necesitan llaves reales: levantan un Wompi falso (mock_wompi.py) y sirven las Edge Functions con
`supabase functions serve --env-file <temporal>` (WOMPI_ENV=mock). Usan el stack local ya iniciado
(`supabase start`) y la migración 0003 aplicada. NUNCA hacen `db reset`: crean viajeros, planes y
reservas desechables y al terminar los borran.

Uso (desde la raíz del repo):
    python -I supabase/functions/_tests/test_pagos.py
Variables opcionales: PAGOS_TEST_MOCK_PORT (por defecto, un puerto libre).
"""
import hashlib
import json
import os
import secrets
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[2]
MOCK_PY = AQUI / "mock_wompi.py"
PASSWORD = "Prueba-1234"

EVENTS_SECRET = "test_events_mock"
INTEGRITY_SECRET = "test_integrity_mock"
PRIVATE_KEY = "prv_test_mock"
REDIRECT_OK = "http://localhost:8080/pago/resultado"


# ---------------------------------------------------------------------------
# Infraestructura
# ---------------------------------------------------------------------------
def puerto_libre():
    with socket.socket() as s:
        s.bind(("", 0))
        return s.getsockname()[1]


def estado_supabase():
    exe = shutil.which("supabase")
    if not exe:
        raise RuntimeError("No encuentro el CLI de supabase en el PATH")
    r = subprocess.run([exe, "status", "-o", "json"], capture_output=True, text=True, cwd=RAIZ)
    inicio, fin = r.stdout.find("{"), r.stdout.rfind("}")
    if inicio >= 0 and fin > inicio:
        estado = json.loads(r.stdout[inicio:fin + 1])
        if "API_URL" in estado:
            return estado
    raise RuntimeError("`supabase status` no devolvió JSON; ¿está iniciado el stack local?\n" + r.stderr)


ST = estado_supabase()
API = ST["API_URL"]
ANON = ST["ANON_KEY"]
SERVICE = ST["SERVICE_ROLE_KEY"]


def http(metodo, url, cuerpo=None, headers=None, crudo=None, timeout=90):
    datos = crudo if crudo is not None else (None if cuerpo is None else json.dumps(cuerpo).encode())
    req = urllib.request.Request(url, data=datos, method=metodo, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            texto = r.read().decode()
            return r.status, (json.loads(texto) if texto else None)
    except urllib.error.HTTPError as e:
        texto = e.read().decode()
        try:
            return e.code, json.loads(texto)
        except ValueError:
            return e.code, {"_texto": texto}


def funcion(nombre, cuerpo=None, jwt=None, metodo="POST", crudo=None, extra=None):
    h = {"Content-Type": "application/json", "apikey": ANON}
    if jwt:
        h["Authorization"] = f"Bearer {jwt}"
    h.update(extra or {})
    return http(metodo, f"{API}/functions/v1/{nombre}", cuerpo, h, crudo)


def rest(metodo, ruta, cuerpo=None, jwt=None, anon=False):
    """PostgREST. Por defecto con service_role (fixtures y comprobaciones); con jwt, como ese usuario."""
    llave = ANON if (jwt or anon) else SERVICE
    h = {"apikey": llave, "Authorization": f"Bearer {jwt or llave}", "Content-Type": "application/json",
         "Prefer": "return=representation"}
    return http(metodo, f"{API}/rest/v1/{ruta}", cuerpo, h)


def rpc(nombre, args, jwt=None, anon=False):
    return rest("POST", f"rpc/{nombre}", args, jwt, anon)


def sql_get(tabla, consulta):
    estado, filas = rest("GET", f"{tabla}?{consulta}")
    assert estado == 200, (tabla, estado, filas)
    return filas


class Mock:
    def __init__(self, puerto):
        self.puerto = puerto
        self.base = f"http://127.0.0.1:{puerto}"

    def llamar(self, ruta, cuerpo=None, metodo="POST"):
        return http(metodo, self.base + ruta, cuerpo, {"Content-Type": "application/json",
                                                       "Authorization": f"Bearer {PRIVATE_KEY}"})

    def transaccion(self, referencia, cents, metodo="CARD", dato="4242424242424242", **extra):
        _, r = self.llamar("/_mock/transactions", {"reference": referencia, "amount_in_cents": cents,
                                                   "method": metodo, "dato": dato, **extra})
        return r["data"]

    def cambiar_estado(self, tx_id, estado):
        return self.llamar(f"/_mock/transactions/{tx_id}/status", {"status": estado})

    def reembolsos(self):
        return self.llamar("/_mock/refunds", metodo="GET")[1]["data"]


def terminar(proc):
    """Cierra el proceso y sus hijos (el CLI de Supabase en Windows es un .cmd → node → go)."""
    if proc.poll() is not None:
        return
    if os.name == "nt":
        subprocess.run(["taskkill", "/T", "/F", "/PID", str(proc.pid)], capture_output=True)
    else:
        proc.send_signal(signal.SIGINT)
    try:
        proc.wait(timeout=30)
    except subprocess.TimeoutExpired:
        proc.kill()


class Servidor:
    """`supabase functions serve` con un archivo de entorno temporal (nunca dentro del repo).

    El CLI reemplaza el contenedor del runtime y solo DESPUÉS imprime «Serving functions»: hay que
    esperar esa línea, o las primeras llamadas llegan al contenedor anterior (con otro entorno).
    """

    def __init__(self, entorno):
        self.dir = tempfile.mkdtemp(prefix="diverso-pagos-")
        self.env_file = os.path.join(self.dir, "funciones.env")
        self.log_path = os.path.join(self.dir, "serve.log")
        with open(self.env_file, "w", encoding="utf-8") as f:
            f.write("".join(f"{k}={v}\n" for k, v in entorno.items()))
        self.log = open(self.log_path, "w", encoding="utf-8")
        self.proc = subprocess.Popen([shutil.which("supabase"), "functions", "serve", "--env-file", self.env_file],
                                     cwd=RAIZ, stdout=self.log, stderr=subprocess.STDOUT)
        limite = time.time() + 240
        while time.time() < limite and "Serving functions" not in self.leer_log():
            if self.proc.poll() is not None:
                break
            time.sleep(1)
        while time.time() < limite:
            try:
                estado, cuerpo = funcion("pagos-webhook", {})
                if isinstance(cuerpo, dict) and "error" in cuerpo and estado in (401, 503):
                    return
            except Exception:
                pass
            if self.proc.poll() is not None:
                break
            time.sleep(2)
        self.cerrar()
        raise RuntimeError("Las Edge Functions no arrancaron a tiempo; ver " + self.dir)

    def leer_log(self):
        self.log.flush()
        with open(self.log_path, encoding="utf-8", errors="replace") as f:
            return f.read()

    def cerrar(self):
        if os.environ.get("PAGOS_TEST_LOG"):
            print("--- registro de `functions serve` ---\n" + self.leer_log()[-3000:])
        terminar(self.proc)
        self.log.close()
        shutil.rmtree(self.dir, ignore_errors=True)


def entorno_mock(puerto):
    return {
        "WOMPI_ENV": "mock",
        "WOMPI_API_URL": f"http://host.docker.internal:{puerto}/v1",
        "WOMPI_CHECKOUT_URL": f"http://localhost:{puerto}/p/",
        "WOMPI_PUBLIC_KEY": "pub_test_mock",
        "WOMPI_PRIVATE_KEY": PRIVATE_KEY,
        "WOMPI_EVENTS_SECRET": EVENTS_SECRET,
        "WOMPI_INTEGRITY_SECRET": INTEGRITY_SECRET,
    }


# ---------------------------------------------------------------------------
# Datos desechables
# ---------------------------------------------------------------------------
class Datos:
    def __init__(self):
        self.usuarios = []
        self.planes = []
        self.sufijo = secrets.token_hex(3)

    def usuario(self, nombre):
        email = f"pago-test-{nombre}-{self.sufijo}@example.com"
        estado, r = http("POST", f"{API}/auth/v1/signup", {"email": email, "password": PASSWORD,
                                                           "data": {"nombre": f"Prueba {nombre}"}},
                         {"apikey": ANON, "Content-Type": "application/json"})
        assert estado == 200, r
        u = {"id": r["user"]["id"], "email": email, "jwt": r["access_token"]}
        self.usuarios.append(u)
        return u

    def reserva(self, usuario, horas_antes=100, pax=2, ventana=(48, 24, 50)):
        """Plan + fecha con salida dentro de `horas_antes` (hora Bogotá) y reserva real vía create_booking."""
        agencia = sql_get("agencies", "numero_rnt=eq.85421&select=id")[0]["id"]
        salida = (datetime.now(timezone.utc) + timedelta(hours=horas_antes) - timedelta(hours=5))
        libre, parcial, pct = ventana
        estado, plan = rest("POST", "plans", {
            "agency_id": agencia, "titulo": "TEST pagos", "destino": "Guatapé", "categoria": "aventura",
            "precio_cop": 100000, "estado": "publicado", "horas_cancelacion_gratuita": libre,
            "horas_reembolso_parcial": parcial, "porcentaje_reembolso_parcial": pct,
            "hora_salida": salida.strftime("%H:%M:00"),
        })
        assert estado == 201, plan
        self.planes.append(plan[0]["id"])
        estado, fecha = rest("POST", "plan_dates", {"plan_id": plan[0]["id"], "fecha": salida.date().isoformat(),
                                                    "cupo_total": 10, "cupo_disponible": 10})
        assert estado == 201, fecha
        estado, r = rpc("create_booking", {"p_plan_date_id": fecha[0]["id"], "p_pax": pax}, jwt=usuario["jwt"])
        assert estado == 200, r
        return {"id": r["booking_id"], "codigo": r["codigo"], "monto": r["monto_total"], "pax": pax,
                "plan_date_id": fecha[0]["id"], "cents": int(round(r["monto_total"] * 100))}

    def limpiar(self):
        for u in self.usuarios:
            rest("DELETE", f"bookings?viajero_id=eq.{u['id']}")
        for p in self.planes:
            rest("DELETE", f"plans?id=eq.{p}")
        for u in self.usuarios:
            http("DELETE", f"{API}/auth/v1/admin/users/{u['id']}", None,
                 {"apikey": SERVICE, "Authorization": f"Bearer {SERVICE}"})


def firmar_evento(evento, props, secreto=EVENTS_SECRET, ts=None):
    """Replica independiente (Python) del checksum de Wompi: valores de `props` + timestamp + secreto."""
    ts = ts or int(time.time())
    cadena = ""
    for ruta in props:
        v = evento["data"]
        for k in ruta.split("."):
            v = v[k]
        cadena += str(v)
    cadena += str(ts) + secreto
    evento["timestamp"] = ts
    evento["signature"] = {"properties": list(props), "checksum": hashlib.sha256(cadena.encode()).hexdigest().upper()}
    return evento


PROPS_TX = ["transaction.id", "transaction.status", "transaction.amount_in_cents"]


def evento_tx(tx, **kw):
    ev = {"event": "transaction.updated", "environment": "test", "sent_at": "2026-10-25T00:00:00.000Z",
          "data": {"transaction": {k: tx[k] for k in ("id", "reference", "status", "amount_in_cents", "currency",
                                                      "payment_method_type")}}}
    return firmar_evento(ev, kw.pop("props", PROPS_TX), **kw)


# ---------------------------------------------------------------------------
# Pruebas con el Wompi simulado
# ---------------------------------------------------------------------------
class TestPagos(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.puerto = int(os.environ.get("PAGOS_TEST_MOCK_PORT") or puerto_libre())
        cls.mock = Mock(cls.puerto)
        cls.arrancar_mock()
        cls.datos = Datos()
        cls.servidor = None
        try:
            cls.servidor = Servidor(entorno_mock(cls.puerto))
            cls.ana = cls.datos.usuario("ana")
            cls.beto = cls.datos.usuario("beto")
        except BaseException:
            cls.tearDownClass()
            raise

    @classmethod
    def arrancar_mock(cls):
        cls.mock_proc = subprocess.Popen([sys.executable, "-I", "-B", str(MOCK_PY), "--port", str(cls.puerto)],
                                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(50):
            try:
                http("GET", cls.mock.base + "/_mock/health")
                return
            except Exception:
                time.sleep(0.1)

    @classmethod
    def tearDownClass(cls):
        try:
            cls.datos.limpiar()
        finally:
            if cls.servidor:
                cls.servidor.cerrar()
            terminar(cls.mock_proc)

    def setUp(self):
        self.mock.llamar("/_mock/reset")

    # -- ayudas ------------------------------------------------------------
    def iniciar(self, reserva, usuario=None, redirect=REDIRECT_OK):
        return funcion("pagos-iniciar", {"booking_id": reserva["id"], "redirect_url": redirect},
                       (usuario or self.ana)["jwt"])

    def intento(self, reserva, usuario=None):
        estado, r = self.iniciar(reserva, usuario)
        self.assertEqual(estado, 200, r)
        return r

    def verificar(self, cuerpo, usuario=None):
        return funcion("pagos-verificar", cuerpo, (usuario or self.ana)["jwt"])

    def pagar(self, reserva, metodo="CARD", dato="4242424242424242", usuario=None, **extra):
        i = self.intento(reserva, usuario)
        tx = self.mock.transaccion(i["referencia"], i["amount_in_cents"], metodo, dato, **extra)
        estado, r = self.verificar({"transaction_id": tx["id"]}, usuario)
        return i, tx, estado, r

    def reserva(self, **kw):
        return self.datos.reserva(kw.pop("usuario", self.ana), **kw)

    def booking(self, reserva):
        return sql_get("bookings", f"id=eq.{reserva['id']}&select=*")[0]

    def pagos(self, reserva):
        return sql_get("payments", f"booking_id=eq.{reserva['id']}&select=*")

    def intentos(self, reserva):
        return sql_get("payment_attempts", f"booking_id=eq.{reserva['id']}&order=created_at&select=*")

    def reembolsos(self, reserva):
        return sql_get("refunds", f"booking_id=eq.{reserva['id']}&select=*")

    def cupo(self, reserva):
        return sql_get("plan_dates", f"id=eq.{reserva['plan_date_id']}&select=cupo_disponible")[0]["cupo_disponible"]

    def webhook(self, evento, cabecera=None):
        extra = {"X-Event-Checksum": cabecera} if cabecera else None
        return funcion("pagos-webhook", evento, extra=extra)

    # -- pagos-iniciar -------------------------------------------------------
    def test_iniciar_devuelve_checkout_firmado(self):
        r = self.reserva()
        estado, cuerpo = self.iniciar(r)
        self.assertEqual(estado, 200, cuerpo)
        self.assertEqual(cuerpo["referencia"], r["codigo"] + "-1")
        self.assertEqual(cuerpo["amount_in_cents"], 20000000)
        creada = datetime.fromisoformat(self.booking(r)["created_at"].replace("Z", "+00:00"))
        expira = datetime.fromisoformat(cuerpo["expira_at"].replace("Z", "+00:00"))
        self.assertLess(abs((expira - creada - timedelta(minutes=30)).total_seconds()), 1)
        u = urllib.parse.urlparse(cuerpo["checkout_url"])
        q = urllib.parse.parse_qs(u.query)
        self.assertEqual(f"{u.scheme}://{u.netloc}{u.path}", f"http://localhost:{self.puerto}/p/")
        self.assertEqual(q["public-key"], ["pub_test_mock"])
        self.assertEqual(q["currency"], ["COP"])
        self.assertEqual(q["amount-in-cents"], ["20000000"])
        self.assertEqual(q["reference"], [cuerpo["referencia"]])
        self.assertEqual(q["redirect-url"], [REDIRECT_OK])
        self.assertEqual(q["expiration-time"], [cuerpo["expira_at"]])
        esperada = hashlib.sha256((cuerpo["referencia"] + "20000000COP" + cuerpo["expira_at"] + INTEGRITY_SECRET)
                                  .encode()).hexdigest()
        self.assertEqual(q["signature:integrity"], [esperada], "firma de integridad recalculada de forma independiente")
        self.assertEqual(q["customer-data:email"], [self.ana["email"]])
        self.assertNotIn("prv_test_mock", cuerpo["checkout_url"])
        self.assertNotIn(EVENTS_SECRET, cuerpo["checkout_url"])
        filas = self.intentos(r)
        self.assertEqual([(f["referencia"], f["estado"], f["amount_in_cents"]) for f in filas],
                         [(cuerpo["referencia"], "pendiente", 20000000)])
        # Un segundo intento tiene referencia nueva.
        self.assertEqual(self.intento(r)["referencia"], r["codigo"] + "-2")

    def test_iniciar_reserva_ajena_es_403(self):
        r = self.reserva()
        estado, cuerpo = self.iniciar(r, self.beto)
        self.assertEqual((estado, cuerpo["error"]), (403, "NO_ES_DUENO"))
        self.assertEqual(self.intentos(r), [], "no se crea ningún intento")

    def test_iniciar_reserva_inexistente_es_404(self):
        estado, cuerpo = funcion("pagos-iniciar", {"booking_id": "00000000-0000-4000-8000-000000000000",
                                                   "redirect_url": REDIRECT_OK}, self.ana["jwt"])
        self.assertEqual((estado, cuerpo["error"]), (404, "RESERVA_NO_EXISTE"))

    def test_iniciar_reserva_que_no_esta_pendiente_es_409(self):
        r = self.reserva()
        self.pagar(r)
        estado, cuerpo = self.iniciar(r)
        self.assertEqual((estado, cuerpo["error"]), (409, "ESTADO_INVALIDO"))

    def test_iniciar_con_retencion_vencida_es_409(self):
        r = self.reserva()
        vencida = (datetime.now(timezone.utc) - timedelta(minutes=31)).isoformat()
        rest("PATCH", f"bookings?id=eq.{r['id']}", {"created_at": vencida})
        estado, cuerpo = self.iniciar(r)
        self.assertEqual((estado, cuerpo["error"]), (409, "RESERVA_VENCIDA"))
        self.assertEqual(self.intentos(r), [])

    def test_iniciar_con_la_salida_ya_pasada_es_409(self):
        r = self.reserva()
        # La reserva sigue pendiente y dentro de sus 30 minutos, pero el viaje ya salió (salida_at congelada).
        salio = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
        rest("PATCH", f"bookings?id=eq.{r['id']}", {"salida_at": salio})
        estado, cuerpo = self.iniciar(r)
        self.assertEqual((estado, cuerpo["error"]), (409, "RESERVA_YA_SALIO"))
        self.assertTrue(cuerpo["mensaje"])
        self.assertEqual(self.intentos(r), [])
        self.assertEqual(self.booking(r)["estado"], "pendiente_pago")

    def test_iniciar_vence_el_checkout_en_la_salida_si_esta_es_antes_de_los_30_minutos(self):
        r = self.reserva()
        salida = datetime.now(timezone.utc) + timedelta(minutes=10)
        rest("PATCH", f"bookings?id=eq.{r['id']}", {"salida_at": salida.isoformat()})
        i = self.intento(r)
        expira = datetime.fromisoformat(i["expira_at"].replace("Z", "+00:00"))
        self.assertLessEqual(expira, salida)

    def test_iniciar_valida_la_solicitud(self):
        r = self.reserva()
        estado, cuerpo = self.iniciar(r, redirect="https://evil.example.com/pago/resultado")
        self.assertEqual((estado, cuerpo["error"]), (400, "REDIRECT_NO_PERMITIDO"))
        estado, cuerpo = self.iniciar(r, redirect="http://localhost:8080.evil.com/")
        self.assertEqual((estado, cuerpo["error"]), (400, "REDIRECT_NO_PERMITIDO"))
        estado, cuerpo = funcion("pagos-iniciar", {"booking_id": "no-es-uuid", "redirect_url": REDIRECT_OK}, self.ana["jwt"])
        self.assertEqual((estado, cuerpo["error"]), (400, "SOLICITUD_INVALIDA"))
        estado, cuerpo = funcion("pagos-iniciar", crudo=b"{no json", jwt=self.ana["jwt"])
        self.assertEqual((estado, cuerpo["error"]), (400, "SOLICITUD_INVALIDA"))
        estado, cuerpo = funcion("pagos-iniciar", {"booking_id": r["id"], "redirect_url": REDIRECT_OK}, jwt=None)
        self.assertEqual(estado, 401)
        estado, cuerpo = funcion("pagos-iniciar", {"booking_id": r["id"], "redirect_url": REDIRECT_OK}, jwt="x.y.z")
        self.assertEqual(estado, 401)
        estado, cuerpo = funcion("pagos-iniciar", jwt=self.ana["jwt"], metodo="GET")
        self.assertEqual((estado, cuerpo["error"]), (405, "METODO_NO_PERMITIDO"))
        self.assertEqual(self.intentos(r), [])

    def test_iniciar_redirect_exige_frontera_de_ruta(self):
        r = self.reserva()
        for malo in ("https://diverso.app/pago/resultadoEVIL", "https://diverso.app/pago/resultado-evil?x=1",
                     "https://diverso.app/pago/resultado/extra", "https://diverso.app/pago/resultado/../otra"):
            estado, cuerpo = self.iniciar(r, redirect=malo)
            self.assertEqual((estado, cuerpo["error"]), (400, "REDIRECT_NO_PERMITIDO"), malo)
        self.assertEqual(self.intentos(r), [], "un redirect rechazado no crea intentos")
        for bueno in ("https://diverso.app/pago/resultado", "https://diverso.app/pago/resultado?id=1-2-3",
                      "http://localhost:3000/pago/resultado"):
            estado, cuerpo = self.iniciar(r, redirect=bueno)
            self.assertEqual(estado, 200, (bueno, cuerpo))
            q = urllib.parse.parse_qs(urllib.parse.urlparse(cuerpo["checkout_url"]).query)
            self.assertEqual(q["redirect-url"], [bueno])

    def test_preflight_cors(self):
        req = urllib.request.Request(f"{API}/functions/v1/pagos-iniciar", method="OPTIONS",
                                     headers={"Origin": "http://localhost:8080", "Access-Control-Request-Method": "POST",
                                              "Access-Control-Request-Headers": "authorization,content-type"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            self.assertIn(resp.status, (200, 204))
            self.assertIn("authorization", resp.headers["Access-Control-Allow-Headers"].lower())

    # -- pagos-verificar -----------------------------------------------------
    def test_verificar_aprobado_confirma_la_reserva(self):
        r = self.reserva()
        i, tx, estado, cuerpo = self.pagar(r)
        self.assertEqual(estado, 200, cuerpo)
        self.assertEqual(cuerpo["estado_pago"], "aprobado")
        self.assertEqual(cuerpo["metodo"], "tarjeta")
        self.assertEqual(cuerpo["referencia"], i["referencia"])
        self.assertEqual(cuerpo["booking"], {"id": r["id"], "codigo": r["codigo"], "estado": "confirmada"})
        self.assertEqual(self.booking(r)["estado"], "confirmada")
        pagos = self.pagos(r)
        self.assertEqual(len(pagos), 1)
        p = pagos[0]
        self.assertEqual((p["provider"], p["simulated"], p["estado"], p["metodo"], p["moneda"]),
                         ("wompi", False, "aprobado", "tarjeta", "COP"))
        self.assertEqual((p["referencia"], p["provider_transaction_id"], p["metodo_wompi"], float(p["monto"])),
                         (i["referencia"], tx["id"], "CARD", float(r["monto"])))
        intento = self.intentos(r)[0]
        self.assertEqual((intento["estado"], intento["wompi_transaction_id"]), ("aprobado", tx["id"]))
        self.assertNotIn("mock@example.com", json.dumps(intento["raw"]), "no se guardan datos del pagador")
        # Repetir la verificación no duplica nada.
        estado, cuerpo = self.verificar({"transaction_id": tx["id"]})
        self.assertEqual((estado, cuerpo["estado_pago"]), (200, "aprobado"))
        self.assertEqual(len(self.pagos(r)), 1)

    def test_verificar_metodos_de_prueba_del_sandbox(self):
        casos = [("NEQUI", "3991111111", "nequi"), ("PSE", "1", "pse"), ("DAVIPLATA", "574829", "daviplata"),
                 ("BANCOLOMBIA_TRANSFER", "", "bancolombia"), ("CARD", "4242424242424242", "tarjeta")]
        for metodo, dato, esperado in casos:
            with self.subTest(metodo=metodo):
                r = self.reserva()
                extra = {"outcome": "APPROVED"} if metodo.startswith("BANCOLOMBIA") else {}
                _, _, estado, cuerpo = self.pagar(r, metodo, dato, **extra)
                self.assertEqual((estado, cuerpo["estado_pago"], cuerpo["metodo"]), (200, "aprobado", esperado))
                self.assertEqual(self.pagos(r)[0]["metodo"], esperado)

    def test_verificar_por_reserva_usa_la_referencia(self):
        r = self.reserva()
        i = self.intento(r)
        estado, cuerpo = self.verificar({"booking_id": r["id"]})
        self.assertEqual((estado, cuerpo["estado_pago"]), (200, "pendiente"), "Wompi aún no conoce la transacción")
        self.assertEqual(self.booking(r)["estado"], "pendiente_pago")
        self.mock.transaccion(i["referencia"], i["amount_in_cents"], "NEQUI", "3991111111")
        estado, cuerpo = self.verificar({"booking_id": r["id"]})
        self.assertEqual((estado, cuerpo["estado_pago"], cuerpo["metodo"]), (200, "aprobado", "nequi"))
        self.assertEqual(self.booking(r)["estado"], "confirmada")
        estado, cuerpo = self.verificar({"booking_id": r["id"]})
        self.assertEqual((estado, cuerpo["estado_pago"], cuerpo["booking"]["estado"]), (200, "aprobado", "confirmada"))
        self.assertEqual(len(self.pagos(r)), 1)

    def test_verificar_rechazado_y_error_dejan_la_reserva_pendiente(self):
        r = self.reserva()
        _, _, estado, cuerpo = self.pagar(r, "CARD", "4111111111111111")
        self.assertEqual((estado, cuerpo["estado_pago"]), (200, "rechazado"))
        self.assertEqual(cuerpo["booking"]["estado"], "pendiente_pago")
        self.assertEqual(self.booking(r)["estado"], "pendiente_pago")
        self.assertEqual(self.pagos(r), [])
        self.assertEqual(self.intentos(r)[0]["estado"], "rechazado")
        _, _, estado, cuerpo = self.pagar(r, "CARD", "4000000000000002")  # dato desconocido → ERROR
        self.assertEqual((estado, cuerpo["estado_pago"]), (200, "error"))
        self.assertEqual(self.booking(r)["estado"], "pendiente_pago")
        # Intentar de nuevo mientras dure la retención sí confirma.
        _, _, estado, cuerpo = self.pagar(r, "NEQUI", "3991111111")
        self.assertEqual((estado, cuerpo["estado_pago"]), (200, "aprobado"))
        self.assertEqual([x["estado"] for x in self.intentos(r)], ["rechazado", "rechazado", "aprobado"])
        self.assertEqual(len(self.pagos(r)), 1)

    def test_verificar_pendiente_y_luego_aprobado(self):
        r = self.reserva()
        i, tx, estado, cuerpo = self.pagar(r, "BANCOLOMBIA_TRANSFER", "")
        self.assertEqual((estado, cuerpo["estado_pago"]), (200, "pendiente"))
        self.assertEqual(self.booking(r)["estado"], "pendiente_pago")
        self.mock.cambiar_estado(tx["id"], "APPROVED")
        estado, cuerpo = self.verificar({"transaction_id": tx["id"]})
        self.assertEqual((estado, cuerpo["estado_pago"], cuerpo["metodo"]), (200, "aprobado", "bancolombia"))

    def test_verificar_monto_distinto_no_confirma(self):
        r = self.reserva()
        i = self.intento(r)
        tx = self.mock.transaccion(i["referencia"], i["amount_in_cents"] - 100)
        estado, cuerpo = self.verificar({"transaction_id": tx["id"]})
        self.assertEqual((estado, cuerpo["error"]), (409, "MONTO_NO_COINCIDE"))
        self.assertEqual(self.booking(r)["estado"], "pendiente_pago")
        self.assertEqual(self.pagos(r), [])
        self.assertEqual(self.intentos(r)[0]["estado"], "monto_no_coincide")
        # Otra moneda tampoco.
        r2 = self.reserva()
        i2 = self.intento(r2)
        tx2 = self.mock.transaccion(i2["referencia"], i2["amount_in_cents"], currency="USD")
        estado, cuerpo = self.verificar({"transaction_id": tx2["id"]})
        self.assertEqual((estado, cuerpo["error"]), (409, "MONTO_NO_COINCIDE"))
        self.assertEqual(self.booking(r2)["estado"], "pendiente_pago")

    def test_verificar_rechaza_consultas_ajenas_o_mal_formadas(self):
        r = self.reserva()
        i = self.intento(r)
        tx = self.mock.transaccion(i["referencia"], i["amount_in_cents"])
        estado, cuerpo = self.verificar({"transaction_id": tx["id"]}, self.beto)
        self.assertEqual((estado, cuerpo["error"]), (403, "NO_ES_DUENO"))
        self.assertEqual(self.booking(r)["estado"], "pendiente_pago", "una consulta ajena no aplica el resultado")
        estado, cuerpo = self.verificar({"booking_id": r["id"]}, self.beto)
        self.assertEqual((estado, cuerpo["error"]), (403, "NO_ES_DUENO"))
        estado, cuerpo = self.verificar({"transaction_id": "9999-0-0"})
        self.assertEqual((estado, cuerpo["error"]), (404, "TRANSACCION_NO_EXISTE"))
        ajena = self.mock.transaccion("REF-QUE-NO-ES-NUESTRA", 5000)
        estado, cuerpo = self.verificar({"transaction_id": ajena["id"]})
        self.assertEqual((estado, cuerpo["error"]), (404, "REFERENCIA_DESCONOCIDA"))
        estado, cuerpo = self.verificar({"booking_id": "00000000-0000-4000-8000-000000000000"})
        self.assertEqual((estado, cuerpo["error"]), (404, "RESERVA_NO_EXISTE"))
        for malo in ({}, {"transaction_id": tx["id"], "booking_id": r["id"]}, {"transaction_id": "../x?y=1"},
                     {"transaction_id": 5}, {"booking_id": "no-uuid"}):
            estado, cuerpo = self.verificar(malo)
            self.assertEqual((estado, cuerpo["error"]), (400, "SOLICITUD_INVALIDA"), malo)
        self.assertEqual(funcion("pagos-verificar", {"transaction_id": tx["id"]})[0], 401)

    # -- pagos-webhook ---------------------------------------------------------
    def test_webhook_aprobado_confirma_y_el_reenvio_es_idempotente(self):
        r = self.reserva()
        i = self.intento(r)
        tx = self.mock.transaccion(i["referencia"], i["amount_in_cents"], "PSE", "1")
        ev = evento_tx(tx)
        estado, cuerpo = self.webhook(ev, cabecera=ev["signature"]["checksum"])
        self.assertEqual((estado, cuerpo), (200, {"ok": True, "resultado": "confirmada"}))
        self.assertEqual(self.booking(r)["estado"], "confirmada")
        p = self.pagos(r)
        self.assertEqual((len(p), p[0]["provider"], p[0]["simulated"], p[0]["metodo"]), (1, "wompi", False, "pse"))
        for _ in range(3):
            estado, cuerpo = self.webhook(ev)
            self.assertEqual((estado, cuerpo["resultado"]), (200, "ya_confirmada"))
        self.assertEqual(len(self.pagos(r)), 1)
        self.assertEqual(self.cupo(r), 8, "los cupos no se tocan al reenviar")

    def test_webhook_concurrente_confirma_una_sola_vez(self):
        r = self.reserva()
        i = self.intento(r)
        tx = self.mock.transaccion(i["referencia"], i["amount_in_cents"])
        ev = evento_tx(tx)
        resultados = []
        hilos = [threading.Thread(target=lambda: resultados.append(self.webhook(ev))) for _ in range(5)]
        for h in hilos:
            h.start()
        for h in hilos:
            h.join()
        self.assertEqual([e for e, _ in resultados], [200] * 5, resultados)
        self.assertEqual(sorted(c["resultado"] for _, c in resultados).count("confirmada"), 1)
        self.assertEqual(len(self.pagos(r)), 1)
        self.assertEqual(self.booking(r)["estado"], "confirmada")

    def test_webhook_con_checksum_invalido_es_401_sin_efectos(self):
        r = self.reserva()
        i = self.intento(r)
        tx = self.mock.transaccion(i["referencia"], i["amount_in_cents"])
        malos = []
        ev = evento_tx(tx)
        ev["signature"]["checksum"] = "0" * 64
        malos.append(("checksum falso", ev, None))
        malos.append(("secreto equivocado", evento_tx(tx, secreto="test_events_otro"), None))
        manipulado = evento_tx(tx)
        manipulado["data"]["transaction"]["amount_in_cents"] = 1
        malos.append(("monto alterado tras firmar", manipulado, None))
        manipulado = evento_tx(self.mock.transaccion(i["referencia"], i["amount_in_cents"], "CARD", "4111111111111111"))
        manipulado["data"]["transaction"]["status"] = "APPROVED"
        malos.append(("estado alterado tras firmar", manipulado, None))
        malos.append(("cabecera distinta", evento_tx(tx), "F" * 64))
        malos.append(("firma que no cubre el monto", evento_tx(tx, props=["transaction.id", "transaction.status"]), None))
        sin_firma = evento_tx(tx)
        del sin_firma["signature"]
        malos.append(("sin firma", sin_firma, None))
        for nombre, evento, cabecera in malos:
            with self.subTest(nombre):
                estado, cuerpo = self.webhook(evento, cabecera=cabecera)
                self.assertEqual((estado, cuerpo["error"]), (401, "FIRMA_INVALIDA"))
        self.assertEqual(self.booking(r)["estado"], "pendiente_pago")
        self.assertEqual(self.pagos(r), [])
        self.assertEqual(self.intentos(r)[0]["estado"], "pendiente")
        self.assertEqual(self.intentos(r)[0]["wompi_transaction_id"], None)

    def test_webhook_ignora_lo_que_no_le_toca_con_200(self):
        otro = firmar_evento({"event": "nequi_token.updated", "data": {"transaction": {"id": "x", "status": "APPROVED",
                                                                                       "amount_in_cents": 1}}}, PROPS_TX)
        self.assertEqual(self.webhook(otro), (200, {"ok": True, "ignorado": "nequi_token.updated"}))
        fantasma = self.mock.transaccion("NO-ES-DE-DIVERSO-1", 1000)
        estado, cuerpo = self.webhook(evento_tx(fantasma))
        self.assertEqual((estado, cuerpo["resultado"]), (200, "referencia_desconocida"))
        self.assertEqual(funcion("pagos-webhook", crudo=b"no es json")[0], 400)
        self.assertEqual(funcion("pagos-webhook", metodo="GET")[0], 405)

    def test_webhook_rechazado_deja_la_reserva_pendiente(self):
        r = self.reserva()
        i = self.intento(r)
        tx = self.mock.transaccion(i["referencia"], i["amount_in_cents"], "NEQUI", "3992222222")
        estado, cuerpo = self.webhook(evento_tx(tx))
        self.assertEqual((estado, cuerpo["resultado"]), (200, "rechazado"))
        self.assertEqual(self.booking(r)["estado"], "pendiente_pago")
        self.assertEqual(self.intentos(r)[0]["estado"], "rechazado")
        self.assertEqual(self.pagos(r), [])

    def test_webhook_con_monto_distinto_no_confirma(self):
        r = self.reserva()
        i = self.intento(r)
        tx = self.mock.transaccion(i["referencia"], 1000)
        estado, cuerpo = self.webhook(evento_tx(tx))
        self.assertEqual((estado, cuerpo["resultado"]), (200, "monto_no_coincide"))
        self.assertEqual(self.booking(r)["estado"], "pendiente_pago")
        self.assertEqual(self.pagos(r), [])

    def test_webhook_con_referencia_sin_firmar_de_otro_intento_no_confirma(self):
        # El checksum cubre id, estado y monto, NO la referencia: un evento firmado con la transacción de A
        # pero con la referencia de B no puede confirmar la reserva de B (ni la de A: se ignora entero).
        a, b = self.reserva(), self.reserva(usuario=self.beto)
        ia, ib = self.intento(a), self.intento(b, self.beto)
        tx_a = self.mock.transaccion(ia["referencia"], ia["amount_in_cents"])
        falso = dict(tx_a, reference=ib["referencia"])
        estado, cuerpo = self.webhook(evento_tx(falso))
        self.assertEqual((estado, cuerpo.get("ok")), (200, True), cuerpo)
        self.assertEqual(cuerpo.get("ignorado"), "TRANSACCION_NO_COINCIDE")
        for reserva in (a, b):
            self.assertEqual(self.booking(reserva)["estado"], "pendiente_pago")
            self.assertEqual(self.pagos(reserva), [])
            self.assertEqual([x["estado"] for x in self.intentos(reserva)], ["pendiente"])
            self.assertIsNone(self.intentos(reserva)[0]["wompi_transaction_id"])
        # Lo mismo con la moneda adulterada (no está firmada): se compara contra lo que dice Wompi.
        falso = dict(tx_a, currency="USD")
        self.assertEqual(self.webhook(evento_tx(falso))[1].get("ignorado"), "TRANSACCION_NO_COINCIDE")
        self.assertEqual(self.booking(a)["estado"], "pendiente_pago")
        # El evento legítimo de A sí confirma A y no toca B.
        estado, cuerpo = self.webhook(evento_tx(tx_a))
        self.assertEqual((estado, cuerpo["resultado"]), (200, "confirmada"))
        self.assertEqual(self.booking(a)["estado"], "confirmada")
        self.assertEqual(self.booking(b)["estado"], "pendiente_pago")

    def test_webhook_aplica_lo_que_wompi_dice_no_lo_que_trae_el_evento(self):
        # Evento firmado que anuncia APPROVED, pero Wompi dice que la transacción sigue PENDING.
        r = self.reserva()
        i = self.intento(r)
        tx = self.mock.transaccion(i["referencia"], i["amount_in_cents"], "BANCOLOMBIA_TRANSFER", "", status="PENDING")
        ev = evento_tx(dict(tx, status="APPROVED"))
        estado, cuerpo = self.webhook(ev)
        self.assertEqual((estado, cuerpo["resultado"]), (200, "pendiente"), cuerpo)
        self.assertEqual(self.booking(r)["estado"], "pendiente_pago")
        self.assertEqual(self.pagos(r), [])

    def test_webhook_de_transaccion_que_wompi_no_conoce_se_ignora_con_200(self):
        r = self.reserva()
        i = self.intento(r)
        inventada = {"id": "9999-1-1", "reference": i["referencia"], "status": "APPROVED",
                     "amount_in_cents": i["amount_in_cents"], "currency": "COP", "payment_method_type": "CARD"}
        estado, cuerpo = self.webhook(evento_tx(inventada))
        self.assertEqual((estado, cuerpo), (200, {"ok": True, "ignorado": "TRANSACCION_DESCONOCIDA"}))
        self.assertEqual(self.booking(r)["estado"], "pendiente_pago")
        self.assertEqual(self.pagos(r), [])
        self.assertEqual(self.intentos(r)[0]["estado"], "pendiente")

    def test_cobro_aprobado_con_monto_distinto_se_reembolsa_lo_cobrado(self):
        for via in ("verificar", "webhook"):
            with self.subTest(via=via):
                r = self.reserva()
                i = self.intento(r)
                cobrado = i["amount_in_cents"] - 100
                tx = self.mock.transaccion(i["referencia"], cobrado)
                if via == "verificar":
                    estado, cuerpo = self.verificar({"transaction_id": tx["id"]})
                    self.assertEqual((estado, cuerpo["error"], cuerpo["reembolso"]), (409, "MONTO_NO_COINCIDE", "aprobado"))
                else:
                    estado, cuerpo = self.webhook(evento_tx(tx))
                    self.assertEqual((estado, cuerpo["resultado"]), (200, "monto_no_coincide"))
                self.assertEqual(self.booking(r)["estado"], "pendiente_pago", "no se confirma")
                self.assertEqual(self.pagos(r), [], "no cuenta como venta")
                self.assertEqual(self.intentos(r)[0]["estado"], "monto_no_coincide")
                rf = self.reembolsos(r)
                self.assertEqual(len(rf), 1)
                self.assertEqual((rf[0]["origen"], rf[0]["porcentaje"], round(float(rf[0]["monto"]) * 100), rf[0]["estado"]),
                                 ("monto_no_coincide", 100, cobrado, "aprobado"))
                self.assertEqual(rf[0]["wompi_transaction_id"], tx["id"])
                enviados = [e for e in self.mock.reembolsos() if e["transaction_id"] == tx["id"]]
                self.assertEqual([(e["amount_in_cents"], e["reference"]) for e in enviados],
                                 [(cobrado, rf[0]["referencia"])], "Wompi recibe el monto realmente cobrado")
                # Reintentos (webhook repetido, consulta del viajero): no se pide otro reembolso.
                self.assertEqual(self.webhook(evento_tx(tx))[1]["resultado"], "monto_no_coincide")
                self.assertEqual(self.verificar({"transaction_id": tx["id"]})[0], 409)
                self.assertEqual(len(self.reembolsos(r)), 1)
                self.assertEqual(len([e for e in self.mock.reembolsos() if e["transaction_id"] == tx["id"]]), 1)

    def test_webhook_de_un_evento_viejo_aplica_el_estado_actual_de_wompi(self):
        # Un evento antiguo (firma válida) que dice APPROVED, pero Wompi dice hoy que la transacción fue
        # rechazada: se aplica lo que dice Wompi, no lo que trae el evento.
        r = self.reserva()
        i = self.intento(r)
        tx = self.mock.transaccion(i["referencia"], i["amount_in_cents"], "CARD", "4111111111111111")
        self.assertEqual(tx["status"], "DECLINED")
        viejo = evento_tx(dict(tx, status="APPROVED"), ts=int(time.time()) - 86400)
        estado, cuerpo = self.webhook(viejo)
        self.assertEqual((estado, cuerpo.get("resultado")), (200, "rechazado"), cuerpo)
        self.assertEqual(self.booking(r)["estado"], "pendiente_pago")
        self.assertEqual(self.pagos(r), [])
        self.assertEqual([x["estado"] for x in self.intentos(r)], ["rechazado"])
        self.assertEqual(self.reembolsos(r), [])

    def test_cobro_en_otra_moneda_se_reembolsa_completo(self):
        # El monto coincide pero la moneda no (USD): no se confirma y se devuelve el 100 % de lo cobrado.
        for via in ("verificar", "webhook"):
            with self.subTest(via=via):
                r = self.reserva()
                i = self.intento(r)
                tx = self.mock.transaccion(i["referencia"], i["amount_in_cents"], currency="USD")
                if via == "verificar":
                    estado, cuerpo = self.verificar({"transaction_id": tx["id"]})
                    self.assertEqual((estado, cuerpo.get("error")), (409, "MONTO_NO_COINCIDE"), cuerpo)
                else:
                    estado, cuerpo = self.webhook(evento_tx(tx))
                    self.assertEqual((estado, cuerpo.get("resultado")), (200, "monto_no_coincide"), cuerpo)
                self.assertEqual(self.booking(r)["estado"], "pendiente_pago")
                self.assertEqual(self.pagos(r), [])
                self.assertEqual(self.intentos(r)[0]["estado"], "monto_no_coincide")
                rf = self.reembolsos(r)
                self.assertEqual([(x["origen"], x["porcentaje"], round(float(x["monto"]) * 100)) for x in rf],
                                 [("monto_no_coincide", 100, i["amount_in_cents"])])
                self.assertEqual(len([e for e in self.mock.reembolsos() if e["transaction_id"] == tx["id"]]), 1,
                                 "Wompi recibe el reembolso de lo cobrado una sola vez")

    # -- pago aprobado después del vencimiento ---------------------------------
    def vencer(self, reserva):
        vencida = (datetime.now(timezone.utc) - timedelta(minutes=40)).isoformat()
        rest("PATCH", f"bookings?id=eq.{reserva['id']}", {"created_at": vencida})
        estado, n = rpc("expire_stale_bookings", {})
        self.assertEqual(estado, 200)
        self.assertGreaterEqual(n, 1)

    def test_aprobacion_tardia_no_confirma_y_se_reembolsa_completa(self):
        r = self.reserva()
        i = self.intento(r)
        tx = self.mock.transaccion(i["referencia"], i["amount_in_cents"])
        self.vencer(r)
        self.assertEqual(self.booking(r)["estado"], "cancelada")
        self.assertEqual(self.intentos(r)[0]["estado"], "expirado")
        self.assertEqual(self.cupo(r), 10)
        ev = evento_tx(tx)
        estado, cuerpo = self.webhook(ev)
        self.assertEqual((estado, cuerpo["resultado"]), (200, "aprobado_tarde"))
        self.assertEqual(self.booking(r)["estado"], "cancelada", "la reserva vencida no se resucita")
        self.assertEqual(self.pagos(r), [], "no cuenta como venta")
        self.assertEqual(self.intentos(r)[0]["estado"], "aprobado_tarde")
        rf = self.reembolsos(r)
        self.assertEqual(len(rf), 1)
        self.assertEqual((rf[0]["origen"], rf[0]["porcentaje"], float(rf[0]["monto"]), rf[0]["estado"]),
                         ("pago_tardio", 100, float(r["monto"]), "aprobado"))
        self.assertTrue(rf[0]["wompi_refund_id"])
        enviados = self.mock.reembolsos()
        self.assertEqual([(e["transaction_id"], e["amount_in_cents"], e["reference"]) for e in enviados],
                         [(tx["id"], r["cents"], rf[0]["referencia"])])
        # Reenvío del mismo evento y consulta del viajero: no se devuelve dos veces.
        self.assertEqual(self.webhook(ev)[1]["resultado"], "ya_aprobado_tarde")
        estado, cuerpo = self.verificar({"transaction_id": tx["id"]})
        self.assertEqual((estado, cuerpo["error"], cuerpo["estado_pago"], cuerpo["reembolso"]),
                         (409, "RESERVA_VENCIDA", "aprobado_tarde", "aprobado"))
        self.assertEqual(len(self.reembolsos(r)), 1)
        self.assertEqual(len(self.mock.reembolsos()), 1)
        self.assertEqual(self.cupo(r), 10)

    # -- reservas-cancelar -------------------------------------------------------
    def cancelar(self, reserva, usuario=None):
        return funcion("reservas-cancelar", {"booking_id": reserva["id"]}, (usuario or self.ana)["jwt"])

    def test_cancelar_con_100_por_ciento_reembolsa_todo(self):
        r = self.reserva(horas_antes=100)
        i, tx, _, _ = self.pagar(r)
        self.assertEqual(self.cupo(r), 8)
        estado, cuerpo = self.cancelar(r)
        self.assertEqual(estado, 200, cuerpo)
        self.assertEqual(cuerpo["estado"], "cancelada")
        rb = cuerpo["reembolso"]
        self.assertEqual((rb["aplica"], rb["porcentaje"], rb["monto"], rb["estado"]), (True, 100, 200000, "aprobado"))
        self.assertIn("100", rb["motivo"])
        self.assertEqual(self.booking(r)["estado"], "cancelada")
        self.assertEqual(self.cupo(r), 10, "se liberan los cupos")
        self.assertEqual(self.pagos(r)[0]["estado"], "reembolsado")
        rf = self.reembolsos(r)
        self.assertEqual((len(rf), rf[0]["estado"], rf[0]["origen"], rf[0]["wompi_transaction_id"]),
                         (1, "aprobado", "cancelacion", tx["id"]))
        enviados = self.mock.reembolsos()
        self.assertEqual([(e["transaction_id"], e["amount_in_cents"]) for e in enviados], [(tx["id"], 20000000)])
        # Cancelar de nuevo devuelve la misma decisión y no pide otro reembolso.
        estado, otra = self.cancelar(r)
        self.assertEqual((estado, otra["reembolso"]["estado"], otra["reembolso"]["porcentaje"]), (200, "aprobado", 100))
        self.assertEqual(len(self.mock.reembolsos()), 1)
        self.assertEqual(self.cupo(r), 10)

    def test_cancelar_con_50_por_ciento_reembolsa_la_mitad(self):
        r = self.reserva(horas_antes=30)
        _, tx, _, _ = self.pagar(r)
        estado, cuerpo = self.cancelar(r)
        rb = cuerpo["reembolso"]
        self.assertEqual((estado, rb["aplica"], rb["porcentaje"], rb["monto"], rb["estado"]),
                         (200, True, 50, 100000, "aprobado"))
        self.assertEqual([(e["transaction_id"], e["amount_in_cents"]) for e in self.mock.reembolsos()],
                         [(tx["id"], 10000000)])

    def test_cancelar_sin_reembolso_a_menos_de_la_ventana(self):
        r = self.reserva(horas_antes=10)
        self.pagar(r)
        estado, cuerpo = self.cancelar(r)
        rb = cuerpo["reembolso"]
        self.assertEqual((estado, cuerpo["estado"], rb["aplica"], rb["porcentaje"], rb["monto"], rb["estado"]),
                         (200, "cancelada", False, 0, 0, "no_aplica"))
        self.assertIn("sin reembolso", rb["motivo"])
        self.assertEqual(self.mock.reembolsos(), [], "no se llama a la pasarela")
        self.assertEqual(self.reembolsos(r), [])
        self.assertEqual(self.booking(r)["estado"], "cancelada")
        self.assertEqual(self.cupo(r), 10)
        self.assertEqual(self.pagos(r)[0]["estado"], "aprobado")

    def test_cancelar_reserva_sin_pagar_cierra_los_intentos(self):
        r = self.reserva()
        self.intento(r)
        estado, cuerpo = self.cancelar(r)
        self.assertEqual((estado, cuerpo["reembolso"]["estado"], cuerpo["reembolso"]["aplica"]), (200, "no_aplica", False))
        self.assertEqual(self.booking(r)["estado"], "cancelada")
        self.assertEqual(self.cupo(r), 10)
        self.assertEqual([x["estado"] for x in self.intentos(r)], ["expirado"])
        self.assertEqual(self.mock.reembolsos(), [])

    def test_cancelar_errores(self):
        r = self.reserva()
        estado, cuerpo = self.cancelar(r, self.beto)
        self.assertEqual((estado, cuerpo["error"]), (403, "NO_ES_DUENO"))
        self.assertEqual(self.booking(r)["estado"], "pendiente_pago")
        estado, cuerpo = funcion("reservas-cancelar", {"booking_id": "00000000-0000-4000-8000-000000000000"}, self.ana["jwt"])
        self.assertEqual((estado, cuerpo["error"]), (404, "RESERVA_NO_EXISTE"))
        estado, cuerpo = funcion("reservas-cancelar", {"booking_id": "x"}, self.ana["jwt"])
        self.assertEqual((estado, cuerpo["error"]), (400, "SOLICITUD_INVALIDA"))
        self.assertEqual(funcion("reservas-cancelar", {"booking_id": r["id"]})[0], 401)
        rest("PATCH", f"bookings?id=eq.{r['id']}", {"estado": "completada"})
        estado, cuerpo = self.cancelar(r)
        self.assertEqual((estado, cuerpo["error"]), (409, "ESTADO_INVALIDO"))

    def test_reembolso_asincrono_se_resuelve_por_webhook_o_al_reintentar(self):
        self.mock.llamar("/_mock/config", {"refund_force": "pending"})
        r = self.reserva(horas_antes=100)
        _, tx, _, _ = self.pagar(r)
        estado, cuerpo = self.cancelar(r)
        self.assertEqual((estado, cuerpo["reembolso"]["estado"]), (200, "pendiente"))
        rf = self.reembolsos(r)[0]
        self.assertEqual(rf["estado"], "pendiente")
        self.assertTrue(rf["wompi_refund_id"])
        self.assertEqual(self.pagos(r)[0]["estado"], "aprobado", "el pago sigue aprobado hasta que Wompi confirme")
        # Wompi confirma por webhook (refund.updated, firmado con refund.refund_id + refund.status).
        mock_refund = self.mock.reembolsos()[0]
        self.mock.llamar(f"/_mock/refunds/{mock_refund['v2_refund_id']}/status", {"status": "APPROVED"})
        ev = firmar_evento({"event": "refund.updated", "environment": "test", "data": {"refund": {
            "refund_id": rf["wompi_refund_id"], "transaction_id": tx["id"], "status": "APPROVED",
            "amount_in_cents": r["cents"], "currency": "COP", "reference": rf["referencia"]}}},
            ["refund.refund_id", "refund.status"])
        estado, cuerpo = self.webhook(ev)
        self.assertEqual((estado, cuerpo["resultado"]), (200, "reembolso_registrado"))
        self.assertEqual(self.reembolsos(r)[0]["estado"], "aprobado")
        self.assertEqual(self.pagos(r)[0]["estado"], "reembolsado")
        # Un evento de reembolso con firma que no cubre el estado se rechaza.
        mal = firmar_evento({"event": "refund.updated", "data": {"refund": {"refund_id": "x", "status": "APPROVED"}}},
                            ["refund.refund_id"])
        self.assertEqual(self.webhook(mal)[0], 401)
        # Segundo caso: el viajero vuelve a llamar y la función consulta el estado en Wompi.
        r2 = self.reserva(horas_antes=100)
        self.pagar(r2)
        self.assertEqual(self.cancelar(r2)[1]["reembolso"]["estado"], "pendiente")
        mock_refund2 = [x for x in self.mock.reembolsos() if x["v2_refund_id"] != mock_refund["v2_refund_id"]][0]
        self.mock.llamar(f"/_mock/refunds/{mock_refund2['v2_refund_id']}/status", {"status": "APPROVED"})
        estado, cuerpo = self.cancelar(r2)
        self.assertEqual((estado, cuerpo["reembolso"]["estado"]), (200, "aprobado"))
        self.assertEqual(self.pagos(r2)[0]["estado"], "reembolsado")
        self.assertEqual(len(self.mock.reembolsos()), 2, "no se pidió un reembolso nuevo")

    def test_reembolso_rechazado_por_wompi_no_marca_el_pago_como_reembolsado(self):
        self.mock.llamar("/_mock/config", {"refund_force": "declined"})
        r = self.reserva(horas_antes=100)
        self.pagar(r)
        estado, cuerpo = self.cancelar(r)
        self.assertEqual((estado, cuerpo["reembolso"]["estado"]), (200, "rechazado"))
        self.assertEqual(self.reembolsos(r)[0]["estado"], "rechazado")
        self.assertEqual(self.pagos(r)[0]["estado"], "aprobado")

    def test_cancelar_pago_simulado_heredado_no_llama_a_la_pasarela(self):
        r = self.reserva(horas_antes=100)
        rest("PATCH", f"bookings?id=eq.{r['id']}", {"estado": "confirmada"})
        rest("POST", "payments", {"booking_id": r["id"], "metodo": "nequi", "estado": "aprobado", "monto": r["monto"],
                                  "referencia": f"SIM-{r['codigo']}", "provider": "simulado", "simulated": True})
        estado, cuerpo = self.cancelar(r)
        self.assertEqual((estado, cuerpo["reembolso"]["estado"], cuerpo["reembolso"]["porcentaje"]), (200, "aprobado", 100))
        self.assertEqual(self.mock.reembolsos(), [])
        self.assertEqual(self.pagos(r)[0]["estado"], "reembolsado")

    def test_una_sola_reserva_pendiente_por_viajero_y_fecha(self):
        r = self.reserva()
        estado, cuerpo = rpc("create_booking", {"p_plan_date_id": r["plan_date_id"], "p_pax": 1}, jwt=self.ana["jwt"])
        self.assertEqual(estado, 400, cuerpo)
        self.assertIn("RESERVA_PENDIENTE_EXISTENTE", cuerpo["message"])
        self.assertEqual(cuerpo["details"], r["id"], "el detalle trae el id de la reserva pendiente existente")
        self.assertEqual(self.cupo(r), 8, "el rechazo no retiene cupos")
        # Otro viajero reserva la misma fecha sin problema; y tras cancelar la pendiente, Ana puede volver a reservar.
        estado, otra = rpc("create_booking", {"p_plan_date_id": r["plan_date_id"], "p_pax": 1}, jwt=self.beto["jwt"])
        self.assertEqual(estado, 200, otra)
        self.assertEqual(self.cancelar(r)[0], 200)
        estado, nueva = rpc("create_booking", {"p_plan_date_id": r["plan_date_id"], "p_pax": 1}, jwt=self.ana["jwt"])
        self.assertEqual(estado, 200, nueva)
        # Peticiones simultáneas del mismo viajero para otra fecha: solo una reserva queda pendiente.
        r2 = self.reserva(usuario=self.beto)
        resultados = []
        hilos = [threading.Thread(target=lambda: resultados.append(
            rpc("create_booking", {"p_plan_date_id": r2["plan_date_id"], "p_pax": 1}, jwt=self.ana["jwt"])[0]))
            for _ in range(4)]
        for h in hilos:
            h.start()
        for h in hilos:
            h.join()
        self.assertEqual(sorted(resultados), [200, 400, 400, 400], resultados)

    # -- el viajero ya no puede saltarse la pasarela ---------------------------------
    def test_el_viajero_no_puede_confirmar_ni_cancelar_por_postgrest(self):
        r = self.reserva()
        ana = self.ana["jwt"]
        # Las RPC viejas ya no existen.
        for nombre, args in (("confirm_payment", {"p_booking_id": r["id"], "p_metodo": "nequi"}),
                             ("cancel_booking", {"p_booking_id": r["id"]})):
            estado, cuerpo = rpc(nombre, args, jwt=ana)
            self.assertEqual(estado, 404, (nombre, cuerpo))
        # Las nuevas son solo de service_role.
        intentos = (
            ("aplicar_resultado_pago", {"p_referencia": "x", "p_transaction_id": "t", "p_status": "APPROVED",
                                        "p_amount_in_cents": 1, "p_metodo": "CARD", "p_raw": {}}),
            ("cancelar_reserva", {"p_booking_id": r["id"], "p_viajero_id": self.ana["id"]}),
            ("crear_intento_pago", {"p_booking_id": r["id"], "p_viajero_id": self.ana["id"]}),
            ("registrar_resultado_reembolso", {"p_refund_id": r["id"], "p_estado": "aprobado", "p_wompi_refund_id": None,
                                               "p_raw": {}}),
            ("reembolso_por_politica", {"p_booking_id": r["id"]}),
        )
        for nombre, args in intentos:
            for quien, kw in (("viajero", {"jwt": ana}), ("anon", {"anon": True})):
                estado, cuerpo = rpc(nombre, args, **kw)
                self.assertIn(estado, (401, 403), (nombre, quien, estado, cuerpo))
        # Ni escribiendo directo en las tablas.
        estado, _ = rest("PATCH", f"bookings?id=eq.{r['id']}", {"estado": "confirmada"}, jwt=ana)
        self.assertIn(estado, (200, 204, 401, 403))
        self.assertEqual(self.booking(r)["estado"], "pendiente_pago", "PATCH directo no confirma")
        estado, _ = rest("POST", "payments", {"booking_id": r["id"], "metodo": "nequi", "estado": "aprobado",
                                              "monto": 1, "referencia": "HACK-1"}, jwt=ana)
        self.assertIn(estado, (401, 403))
        self.assertEqual(self.pagos(r), [])
        estado, _ = rest("POST", "refunds", {"booking_id": r["id"], "referencia": "HACK", "monto": 1, "porcentaje": 100,
                                             "origen": "cancelacion", "motivo": "x"}, jwt=ana)
        self.assertIn(estado, (401, 403))
        self.assertIn(rest("GET", "payment_attempts?select=id", jwt=ana)[0], (401, 403))
        # La vista previa de la política sí es suya (solo lectura).
        estado, vista = rpc("vista_previa_cancelacion", {"p_booking_id": r["id"]}, jwt=ana)
        self.assertEqual((estado, vista["aplica"]), (200, False))
        estado, _ = rpc("vista_previa_cancelacion", {"p_booking_id": r["id"]}, jwt=self.beto["jwt"])
        self.assertEqual(estado, 400, "NO_ES_DUENO llega como error de PostgREST")

    def test_el_viajero_lee_sus_reembolsos_sin_el_raw(self):
        r = self.reserva(horas_antes=100)
        self.pagar(r)
        self.cancelar(r)
        columnas = "id,booking_id,monto,porcentaje,estado,origen,motivo,wompi_refund_id"
        estado, filas = rest("GET", f"refunds?booking_id=eq.{r['id']}&select={columnas}", jwt=self.ana["jwt"])
        self.assertEqual((estado, len(filas), filas[0]["porcentaje"]), (200, 1, 100))
        estado, _ = rest("GET", f"refunds?booking_id=eq.{r['id']}&select=raw", jwt=self.ana["jwt"])
        self.assertIn(estado, (401, 403))
        estado, filas = rest("GET", f"refunds?booking_id=eq.{r['id']}&select={columnas}", jwt=self.beto["jwt"])
        self.assertEqual((estado, filas), (200, []), "otro viajero no ve reembolsos ajenos")

    def test_zz_wompi_caido_responde_502_sin_efectos(self):
        # Se apaga el Wompi simulado: el webhook y la verificación responden 502 y no tocan nada. Va el último
        # (nombre «zz») y el mock se vuelve a levantar al terminar, pase lo que pase, para no afectar a otras pruebas.
        r = self.reserva()
        i = self.intento(r)
        tx = self.mock.transaccion(i["referencia"], i["amount_in_cents"])
        terminar(self.mock_proc)
        try:
            time.sleep(1)
            estado, cuerpo = self.webhook(evento_tx(tx))
            self.assertEqual((estado, cuerpo.get("error")), (502, "WOMPI_NO_DISPONIBLE"), cuerpo)
            estado, cuerpo = self.verificar({"transaction_id": tx["id"]})
            self.assertEqual((estado, cuerpo.get("error")), (502, "WOMPI_NO_DISPONIBLE"), cuerpo)
        finally:
            type(self).arrancar_mock()
        self.assertEqual(self.booking(r)["estado"], "pendiente_pago")
        self.assertEqual(self.pagos(r), [])
        self.assertEqual(self.reembolsos(r), [])
        self.assertEqual([x["estado"] for x in self.intentos(r)], ["pendiente"])
        self.assertIsNone(self.intentos(r)[0]["wompi_transaction_id"])


# ---------------------------------------------------------------------------
# Guardia solo-prueba con llaves y URL «de producción»
# ---------------------------------------------------------------------------
class TestGuardiaSoloPrueba(unittest.TestCase):
    PROD = {
        "WOMPI_ENV": "sandbox",
        "WOMPI_API_URL": "https://production.wompi.co/v1",
        "WOMPI_CHECKOUT_URL": "https://checkout.wompi.co/p/",
        "WOMPI_PUBLIC_KEY": "pub_prod_FALSA_NO_REAL",
        "WOMPI_PRIVATE_KEY": "prv_prod_FALSA_NO_REAL",
        "WOMPI_EVENTS_SECRET": "prod_events_FALSA_NO_REAL",
        "WOMPI_INTEGRITY_SECRET": "prod_integrity_FALSA_NO_REAL",
    }

    @classmethod
    def setUpClass(cls):
        cls.datos = Datos()
        cls.servidor = None
        try:
            cls.servidor = Servidor(cls.PROD)
            cls.ana = cls.datos.usuario("guardia")
        except BaseException:
            cls.tearDownClass()
            raise

    @classmethod
    def tearDownClass(cls):
        try:
            cls.datos.limpiar()
        finally:
            if cls.servidor:
                cls.servidor.cerrar()

    def test_todas_las_funciones_responden_503_solo_modo_prueba(self):
        r = self.datos.reserva(self.ana)
        jwt = self.ana["jwt"]
        llamadas = [
            ("pagos-iniciar", {"booking_id": r["id"], "redirect_url": REDIRECT_OK}),
            ("pagos-verificar", {"booking_id": r["id"]}),
            ("pagos-webhook", {"event": "transaction.updated"}),
            ("reservas-cancelar", {"booking_id": r["id"]}),
        ]
        for nombre, cuerpo in llamadas:
            with self.subTest(funcion=nombre):
                estado, resp = funcion(nombre, cuerpo, jwt)
                self.assertEqual((estado, resp["error"]), (503, "SOLO_MODO_PRUEBA"))
                texto = json.dumps(resp)
                self.assertNotIn("FALSA_NO_REAL", texto, "la respuesta no revela el valor de las llaves")
        # Sin ningún efecto: ni intentos ni cambios en la reserva.
        self.assertEqual(sql_get("payment_attempts", f"booking_id=eq.{r['id']}&select=id"), [])
        self.assertEqual(sql_get("bookings", f"id=eq.{r['id']}&select=estado")[0]["estado"], "pendiente_pago")


def main():
    cargador = unittest.TestLoader()
    if sys.argv[1:]:  # p. ej.: TestPagos.test_cancelar_con_50_por_ciento_reembolsa_la_mitad
        suite = cargador.loadTestsFromNames(sys.argv[1:], sys.modules[__name__])
    else:
        suite = unittest.TestSuite([cargador.loadTestsFromTestCase(TestPagos),
                                    cargador.loadTestsFromTestCase(TestGuardiaSoloPrueba)])
    resultado = unittest.TextTestRunner(verbosity=2).run(suite)
    sys.exit(0 if resultado.wasSuccessful() else 1)


if __name__ == "__main__":
    main()
