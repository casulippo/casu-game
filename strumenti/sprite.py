"""
Ritaglia le figure da un foglio generato e ne fa un provino numerato.

I fogli che escono da un generatore di immagini non sono mai una griglia
pulita: le figure cadono dove capita, a volte due nello stesso riquadro, e lo
sfondo cambia tinta da una zona all'altra. Invece di fidarsi della griglia,
qui ogni figura si trova da sola per differenza dallo sfondo.

Uso: `python strumenti/sprite.py [nome ...]` — scrive un provino con le figure
numerate, da cui si scelgono i fotogrammi per `componi.py`.
"""

from PIL import Image, ImageDraw
import numpy as np
import os
import sys

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "art", "personaggi")

FOGLI = {
    nome: f"{nome}.jpg"
    for nome in ("kai", "armiere", "venditore", "mafia", "capo")
}


def maschera_figura(a):
    """
    True dove c'è il personaggio, False sullo sfondo.

    La soglia è larga perché il JPEG sbava: attorno alle figure resta un alone
    rosa che, tagliato stretto, sopravvive come contorno fucsia. Nessun colore
    dei personaggi ha rosso e blu insieme molto più alti del verde, quindi
    allargare qui non mangia il soggetto.
    """
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    magenta = (r > 120) & (b > 120) & (r - g > 45) & (b - g > 45)
    lilla = (abs(r - 211) < 45) & (abs(g - 145) < 48) & (abs(b - 207) < 45)
    figura = ~(magenta | lilla)

    # Erosione di un pixel: l'ultimo filo di alone sta proprio sul bordo.
    interno = figura.copy()
    interno[1:, :] &= figura[:-1, :]
    interno[:-1, :] &= figura[1:, :]
    interno[:, 1:] &= figura[:, :-1]
    interno[:, :-1] &= figura[:, 1:]
    return interno


def gruppi(v, soglia, minimo):
    out, dentro, start = [], False, 0
    for i, x in enumerate(v):
        if x > soglia and not dentro:
            dentro, start = True, i
        elif x <= soglia and dentro:
            dentro = False
            if i - start >= minimo:
                out.append((start, i))
    if dentro and len(v) - start >= minimo:
        out.append((start, len(v)))
    return out


def figure(a, m):
    """I riquadri di ogni figura, riga per riga, in ordine di lettura."""
    h, w = m.shape
    trovate = []
    for y0, y1 in gruppi(m.sum(axis=1), w * 0.01, 40):
        fascia = m[y0:y1]
        for x0, x1 in gruppi(fascia.sum(axis=0), (y1 - y0) * 0.04, 28):
            # Stringe il riquadro sul contenuto vero.
            sotto = fascia[:, x0:x1]
            righe_piene = np.where(sotto.sum(axis=1) > 0)[0]
            if len(righe_piene) == 0:
                continue
            trovate.append((x0, y0 + righe_piene[0], x1, y0 + righe_piene[-1] + 1))
    return trovate


def ritaglia(im, m, riquadro):
    x0, y0, x1, y1 = riquadro
    pezzo = im.crop(riquadro).convert("RGBA")
    alpha = Image.fromarray((m[y0:y1, x0:x1] * 255).astype(np.uint8))
    pezzo.putalpha(alpha)
    return pezzo


def provino(nome, sorgente, uscita):
    im = Image.open(sorgente).convert("RGB")
    a = np.asarray(im)
    m = maschera_figura(a)
    riquadri = figure(a, m)

    cella = 150
    colonne = 8
    righe = (len(riquadri) + colonne - 1) // colonne
    tela = Image.new("RGBA", (colonne * cella, righe * (cella + 18)), (30, 30, 40, 255))
    disegno = ImageDraw.Draw(tela)

    for i, riq in enumerate(riquadri):
        pezzo = ritaglia(im, m, riq)
        pezzo.thumbnail((cella - 10, cella - 10))
        cx = (i % colonne) * cella
        cy = (i // colonne) * (cella + 18)
        tela.alpha_composite(pezzo, (cx + (cella - pezzo.width) // 2, cy + (cella - pezzo.height)))
        disegno.text((cx + 6, cy + cella + 2), f"{i}", fill=(255, 220, 120, 255))

    tela.save(uscita)
    print(f"{nome}: {len(riquadri)} figure -> {uscita}")
    return riquadri


if __name__ == "__main__":
    quali = sys.argv[1:] or list(FOGLI)
    for nome in quali:
        provino(nome, os.path.join(BASE, FOGLI[nome]), f"provino-{nome}.png")
