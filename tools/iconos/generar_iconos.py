"""Genera todos los íconos de Diverso a partir de la máscara maestra del colibrí.

Fuente única: packages/diverso_core/assets/logo_diverso.png (1024x1024, negro + alfa;
la misma que dibuja `DiversoLogo`). No se redibuja ni se vuelve a trazar.

Resultado: ave blanca sobre #0E6E4F (el `ic_launcher_background` de la app) en
  - apps/viajero Android: primer plano adaptativo (mipmap-*/ic_launcher_foreground.png)
    e íconos heredados (mipmap-*/ic_launcher.png);
  - apps/viajero iOS: AppIcon.appiconset, todos los tamaños de su Contents.json, opacos;
  - apps/viajero web y apps/panel_svelte/public: favicon.png, icons/Icon-{192,512}.png y
    los maskable;
  - apps/panel_svelte/public/logo_diverso.png: copia de la máscara para `Logo.svelte`.

Márgenes: cada ícono se escala para que el punto más lejano del ave (medido desde el centro
de su caja) quede dentro de un círculo de radio fijo; la caja del ave queda centrada.
  - adaptativo Android: círculo de 66 dp sobre el lienzo de 108 dp;
  - maskable web: círculo de seguridad del 80 % del lado;
  - resto: círculo del 88 % del lado (el ave ocupa ~65 % de la altura).

Uso (desde cualquier carpeta; solo requiere Pillow):
    python -I -B tools/iconos/generar_iconos.py
"""
import json
import shutil
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
MAESTRO = RAIZ / "packages/diverso_core/assets/logo_diverso.png"
FONDO = (0x0E, 0x6E, 0x4F)  # ic_launcher_background
TINTA = (255, 255, 255)

# Radio del círculo que debe contener al ave, como fracción del lado del lienzo.
# El 0,98 deja un píxel de aire para el suavizado del borde.
R_ADAPTATIVO = 33 / 108 * 0.98  # zona segura de 66 dp
R_MASCABLE = 0.40 * 0.98  # círculo de seguridad del 80 %
R_ICONO = 0.44  # resto de íconos

VIAJERO = RAIZ / "apps/viajero"
RES = VIAJERO / "android/app/src/main/res"
APPICON = VIAJERO / "ios/Runner/Assets.xcassets/AppIcon.appiconset"
PANEL_PUBLIC = RAIZ / "apps/panel_svelte/public"
DENSIDADES = {"mdpi": 1.0, "hdpi": 1.5, "xhdpi": 2.0, "xxhdpi": 3.0, "xxxhdpi": 4.0}


def cargar_maestro():
    """Devuelve (alfa 1024 con la caja del ave centrada, radio máximo del ave en px)."""
    alfa = Image.open(MAESTRO).convert("RGBA").getchannel("A")
    ancho, alto = alfa.size
    izq, arr, der, aba = alfa.getbbox()
    # Caja del ave al centro exacto del lienzo.
    centrada = Image.new("L", alfa.size, 0)
    centrada.paste(alfa, (ancho // 2 - (izq + der) // 2, alto // 2 - (arr + aba) // 2))
    # Punto opaco más lejano del centro.
    datos = centrada.tobytes()
    cx, cy = ancho / 2, alto / 2
    radio2 = max(
        (i % ancho + 0.5 - cx) ** 2 + (i // ancho + 0.5 - cy) ** 2
        for i, v in enumerate(datos)
        if v
    )
    return centrada, radio2**0.5


ALFA, RADIO = cargar_maestro()


def mascara(lado, radio_rel):
    """Máscara `lado`x`lado` con el ave centrada y contenida en radio_rel * lado."""
    n = round(ALFA.width * radio_rel * lado / RADIO)
    ave = ALFA.resize((n, n), Image.LANCZOS)
    lienzo = Image.new("L", (lado, lado), 0)
    lienzo.paste(ave, ((lado - n) // 2, (lado - n) // 2))
    return lienzo


def icono_opaco(lado, radio_rel):
    """Ave blanca sobre el fondo de marca, sin canal alfa."""
    lienzo = Image.new("RGB", (lado, lado), FONDO)
    lienzo.paste(Image.new("RGB", (lado, lado), TINTA), mask=mascara(lado, radio_rel))
    return lienzo


def primer_plano(lado, radio_rel):
    """Ave blanca sobre transparente (capa de primer plano / monocroma)."""
    capa = Image.new("RGBA", (lado, lado), TINTA + (0,))
    capa.putalpha(mascara(lado, radio_rel))
    return capa


def guardar(imagen, ruta):
    ruta.parent.mkdir(parents=True, exist_ok=True)
    imagen.save(ruta, optimize=True)
    print(ruta.relative_to(RAIZ).as_posix(), imagen.size, imagen.mode)


def android():
    for dpi, factor in DENSIDADES.items():
        carpeta = RES / f"mipmap-{dpi}"
        guardar(primer_plano(round(108 * factor), R_ADAPTATIVO), carpeta / "ic_launcher_foreground.png")
        guardar(icono_opaco(round(48 * factor), R_ICONO), carpeta / "ic_launcher.png")


def ios():
    contenido = json.loads((APPICON / "Contents.json").read_text(encoding="utf-8"))
    for entrada in contenido["images"]:
        lado = round(float(entrada["size"].split("x")[0]) * int(entrada["scale"].rstrip("x")))
        guardar(icono_opaco(lado, R_ICONO), APPICON / entrada["filename"])


def web(carpeta):
    guardar(icono_opaco(48, R_ICONO), carpeta / "favicon.png")
    for lado in (192, 512):
        guardar(icono_opaco(lado, R_ICONO), carpeta / "icons" / f"Icon-{lado}.png")
        guardar(icono_opaco(lado, R_MASCABLE), carpeta / "icons" / f"Icon-maskable-{lado}.png")


def main():
    android()
    ios()
    web(VIAJERO / "web")
    web(PANEL_PUBLIC)
    destino = PANEL_PUBLIC / "logo_diverso.png"
    shutil.copyfile(MAESTRO, destino)
    print(destino.relative_to(RAIZ).as_posix(), "(copia de la máscara)")


if __name__ == "__main__":
    main()
