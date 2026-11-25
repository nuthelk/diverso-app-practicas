"""Genera todos los íconos de Diverso a partir de la máscara maestra del colibrí.

Fuente única: apps/viajero/assets/logo_diverso.png (1024x1024, negro + alfa; la misma que
dibuja `DiversoLogo`). No se redibuja ni se vuelve a trazar.

Resultado (ave blanca sobre #0E6E4F, el verde de marca, salvo donde se dice otra cosa):
  - apps/viajero/assets (Expo, los lee app.json):
      icon.png                 ícono opaco 1024 (iOS y el resto de plataformas);
      adaptive-icon.png        primer plano adaptativo de Android, sobre fondo #0E6E4F;
      splash-colibri.png       pantalla de arranque: solo el ave, verde de marca, sin fondo;
      splash-colibri-oscuro.png  la misma en menta, para el modo oscuro;
      favicon.png              favicon web;
  - apps/panel_svelte/static: favicon.png, icons/Icon-{192,512}.png y los maskable;
  - apps/panel_svelte/static/logo_diverso.png: copia de la máscara para `Logo.svelte`.

Márgenes: cada ícono se escala para que el punto más lejano del ave (medido desde el centro
de su caja) quede dentro de un círculo de radio fijo; la caja del ave queda centrada.
  - adaptativo Android: círculo de 66 dp sobre el lienzo de 108 dp;
  - arranque (ícono sin fondo): círculo de 192 dp sobre el lienzo de 288 dp (`imageWidth: 288`);
  - maskable web: círculo de seguridad del 80 % del lado;
  - resto: círculo del 88 % del lado (el ave ocupa ~65 % de la altura).

Uso (desde cualquier carpeta; solo requiere Pillow):
    python -I -B tools/iconos/generar_iconos.py
"""
import shutil
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
VIAJERO_ASSETS = RAIZ / "apps/viajero/assets"
MAESTRO = VIAJERO_ASSETS / "logo_diverso.png"
FONDO = (0x0E, 0x6E, 0x4F)  # ic_launcher_background
TINTA = (255, 255, 255)
MENTA = (0xA8, 0xF2, 0xCE)  # primaryContainer claro = onPrimaryContainer oscuro (logo del login)

# Radio del círculo que debe contener al ave, como fracción del lado del lienzo.
# El 0,98 deja un píxel de aire para el suavizado del borde.
R_ADAPTATIVO = 33 / 108 * 0.98  # zona segura de 66 dp
R_ARRANQUE = 96 / 288 * 0.98  # círculo de 192 dp (ícono de arranque sin fondo)
R_MASCABLE = 0.40 * 0.98  # círculo de seguridad del 80 %
R_ICONO = 0.44  # resto de íconos

PANEL_STATIC = RAIZ / "apps/panel_svelte/static"


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


def primer_plano(lado, radio_rel, tinta=TINTA):
    """Ave de color `tinta` (blanca por defecto) sobre transparente."""
    capa = Image.new("RGBA", (lado, lado), tinta + (0,))
    capa.putalpha(mascara(lado, radio_rel))
    return capa


def guardar(imagen, ruta):
    ruta.parent.mkdir(parents=True, exist_ok=True)
    imagen.save(ruta, optimize=True)
    print(ruta.relative_to(RAIZ).as_posix(), imagen.size, imagen.mode)


def viajero():
    """Assets de Expo: los mismos íconos y arranque que tenía la app Flutter."""
    guardar(icono_opaco(1024, R_ICONO), VIAJERO_ASSETS / "icon.png")
    guardar(primer_plano(1024, R_ADAPTATIVO), VIAJERO_ASSETS / "adaptive-icon.png")
    lado = 288 * 4  # lienzo de 288 dp a 4x
    guardar(primer_plano(lado, R_ARRANQUE, FONDO), VIAJERO_ASSETS / "splash-colibri.png")
    guardar(primer_plano(lado, R_ARRANQUE, MENTA), VIAJERO_ASSETS / "splash-colibri-oscuro.png")
    guardar(icono_opaco(48, R_ICONO), VIAJERO_ASSETS / "favicon.png")


def web(carpeta):
    guardar(icono_opaco(48, R_ICONO), carpeta / "favicon.png")
    for lado in (192, 512):
        guardar(icono_opaco(lado, R_ICONO), carpeta / "icons" / f"Icon-{lado}.png")
        guardar(icono_opaco(lado, R_MASCABLE), carpeta / "icons" / f"Icon-maskable-{lado}.png")


def main():
    viajero()
    web(PANEL_STATIC)
    destino = PANEL_STATIC / "logo_diverso.png"
    shutil.copyfile(MAESTRO, destino)
    print(destino.relative_to(RAIZ).as_posix(), "(copia de la máscara)")


if __name__ == "__main__":
    main()
