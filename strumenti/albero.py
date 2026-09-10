"""
Ritaglia gli alberi generati, ombra compresa.

A differenza dei personaggi, qui lo sfondo magenta non va tagliato di netto:
l'ombra è magenta scurito, non un colore a parte, e un taglio binario la
trasformerebbe in una macchia dai bordi netti invece che nella dissolvenza
morbida che deve avere.

L'idea: ogni pixel ha una tinta (hue). Il fondo e la sua ombra condividono la
tinta del magenta, a prescindere da quanto sono scuri; la chioma dell'albero
ha una tinta completamente diversa (verde, giallo, bruno). Dove la tinta è
magenta, l'alpha lo decide quanto il pixel è più scuro del fondo puro — è
così che l'ombra resta un'ombra invece di sparire o diventare un bordo duro.
Dove la tinta si allontana dal magenta, il pixel è albero: opaco, colore
originale.

Uso: `python strumenti/albero.py` — legge da `art/alberi/`, scrive in
`public/alberi/` e stampa l'ancora di ciascuno (dove appoggiarlo sulla cella).
"""

from PIL import Image
import numpy as np
import os

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "art", "alberi")
USCITA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "alberi")

ALBERI = ("verde", "autunno", "conifera")

# Tinta del magenta di sfondo, in gradi (0-360). La banda di transizione è
# larga: il renderer tinge leggermente l'ombra a contatto con le chiome più
# calde (l'autunno), e una banda stretta lascerebbe lì una frangia rosa.
TINTA_MAGENTA = 300.0
BANDA_BASSA = 20.0
BANDA_ALTA = 46.0

# L'ombra al massimo scurisce fino a questa opacità: un'ombra a piena forza
# sarebbe una pozza nera invece che un velo.
ALPHA_OMBRA_MAX = 0.55

# Larghezza finale della chioma nel gioco, in pixel: più larga di una cella
# (48px) perché un albero deve sporgere sui vicini, come nella foto originale.
LARGHEZZA_FINALE = 108


def rgb_a_hsv(a):
    """Conversione RGB->HSV vettoriale: quella di PIL/colorsys è per-pixel."""
    a = a.astype(np.float32) / 255.0
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    cmax = np.max(a, axis=-1)
    cmin = np.min(a, axis=-1)
    delta = cmax - cmin

    hue = np.zeros_like(cmax)
    con_delta = delta > 1e-6

    is_r = con_delta & (cmax == r)
    is_g = con_delta & (cmax == g) & ~is_r
    is_b = con_delta & (cmax == b) & ~is_r & ~is_g

    hue[is_r] = (60 * (((g - b) / delta) % 6))[is_r]
    hue[is_g] = (60 * (((b - r) / delta) + 2))[is_g]
    hue[is_b] = (60 * (((r - g) / delta) + 4))[is_b]

    value = cmax
    return hue, value


def differenza_angolare(hue, riferimento):
    d = np.abs(hue - riferimento) % 360
    return np.minimum(d, 360 - d)


def estrai(percorso):
    im = Image.open(percorso).convert("RGB")
    a = np.asarray(im)
    hue, value = rgb_a_hsv(a)

    diff = differenza_angolare(hue, TINTA_MAGENTA)
    # 1 = sicuramente fondo/ombra (stessa tinta del magenta), 0 = sicuramente
    # chioma. In mezzo una banda di transizione morbida sul bordo della chioma.
    e_sfondo = np.clip((BANDA_ALTA - diff) / (BANDA_ALTA - BANDA_BASSA), 0, 1)

    # Quanto è più scuro il fondo/ombra rispetto al magenta pieno: la base
    # dell'ombra, prima di applicarci sopra la tinta.
    valore_fondo = np.median(value[diff < BANDA_BASSA][value[diff < BANDA_BASSA] > 0.85]) \
        if np.any((diff < BANDA_BASSA) & (value > 0.85)) else 1.0
    scurezza = np.clip(1 - value / valore_fondo, 0, 1)

    alpha_ombra = scurezza * ALPHA_OMBRA_MAX
    alpha = e_sfondo * alpha_ombra + (1 - e_sfondo) * 1.0

    # Il colore perde la tinta magenta con la stessa gradualità con cui il
    # pixel viene giudicato "sfondo": una soglia netta lascerebbe una frangia
    # rosa esattamente nella banda di transizione, dove l'antialiasing del
    # generatore mescola il magenta con la chioma.
    rgb = a.astype(np.float32) * (1 - e_sfondo)[..., None]

    risultato = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    return Image.fromarray(risultato, mode="RGBA")


def ritaglia_e_ancora(im):
    a = np.asarray(im)
    alpha = a[..., 3]

    # Il riquadro totale: chioma più ombra, tutto ciò che non è trasparente.
    righe = np.where(alpha.max(axis=1) > 4)[0]
    colonne = np.where(alpha.max(axis=0) > 4)[0]
    y0, y1 = righe[0], righe[-1] + 1
    x0, x1 = colonne[0], colonne[-1] + 1

    margine = 4
    y0, x0 = max(0, y0 - margine), max(0, x0 - margine)
    y1 = min(a.shape[0], y1 + margine)
    x1 = min(a.shape[1], x1 + margine)

    ritaglio = im.crop((x0, y0, x1, y1))

    # L'ancora: il centro della sola chioma opaca, non del riquadro intero —
    # il riquadro include l'ombra, che sbilancerebbe il centro verso il
    # basso-destra dove l'ombra si allunga.
    opaco = np.asarray(ritaglio)[..., 3] > 245
    righe_o = np.where(opaco.any(axis=1))[0]
    colonne_o = np.where(opaco.any(axis=0))[0]
    cx = (colonne_o[0] + colonne_o[-1]) / 2 / ritaglio.width
    cy = (righe_o[0] + righe_o[-1]) / 2 / ritaglio.height

    return ritaglio, (cx, cy)


def main():
    os.makedirs(USCITA, exist_ok=True)
    for nome in ALBERI:
        percorso = os.path.join(BASE, f"{nome}.jpg")
        estratto = estrai(percorso)
        ritaglio, ancora = ritaglia_e_ancora(estratto)

        scala = LARGHEZZA_FINALE / ritaglio.width
        finale = ritaglio.resize(
            (LARGHEZZA_FINALE, round(ritaglio.height * scala)), Image.LANCZOS
        )

        out = os.path.join(USCITA, f"{nome}.png")
        finale.save(out)
        print(f"{nome}: {finale.size} ancora=({ancora[0]:.3f}, {ancora[1]:.3f}) -> {out}")


if __name__ == "__main__":
    main()
