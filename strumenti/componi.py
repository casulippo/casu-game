"""
Compone i fogli generati in sprite sheet uniformi, pronti per il gioco.

I fogli in arrivo dal generatore non sono utilizzabili così: le figure stanno
in posizioni irregolari, a volte più d'una per riquadro, su fondi diversi. Qui
ogni figura viene ritagliata singolarmente, appoggiata a una linea di terra
comune e centrata, in una griglia di 4 colonne per 4 righe.

L'ordine delle righe è quello che il gioco si aspetta: fronte, schiena,
sinistra, destra. La destra si ottiene specchiando la sinistra — un profilo
speculare è indistinguibile da uno disegnato apposta, e costa la metà.
"""

from PIL import Image
import numpy as np
import os

from sprite import BASE, FOGLI, figure, maschera_figura, ritaglia

USCITA = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "public", "personaggi"
)

CELLA = 128
COLONNE = 4
RIGHE = 4

# Per ogni personaggio: quali figure usare, e quanto è alto rispetto alla cella.
# L'altezza tiene le proporzioni tra i personaggi: l'armiere è un armadio,
# Kai è un ragazzino.
SCELTE = {
    "kai":       {"fronte": [0, 1, 2, 3], "schiena": [4, 5, 6, 7],  "lato": [8, 11, 14, 21], "altezza": 0.84},
    "armiere":   {"fronte": [0, 1, 2, 3], "schiena": [4, 5, 6, 7],  "lato": [8, 11, 16, 20], "altezza": 0.94},
    "venditore": {"fronte": [0, 1, 2, 3], "schiena": [8, 10, 12, 13], "lato": [16, 18, 19, 20], "altezza": 0.87},
    "mafia":     {"fronte": [0, 1, 2, 3], "schiena": [8, 9, 10, 11], "lato": [16, 17, 18, 20], "altezza": 0.92},
    "capo":      {"fronte": [0, 1, 2, 3], "schiena": [8, 9, 10, 11], "lato": [16, 17, 18, 20], "altezza": 0.84},
}


def pezzi(nome):
    im = Image.open(os.path.join(BASE, FOGLI[nome])).convert("RGB")
    m = maschera_figura(np.asarray(im))
    return [ritaglia(im, m, r) for r in figure(np.asarray(im), m)]


def posa(tela, pezzo, colonna, riga, altezza_utile):
    """Appoggia la figura sulla linea di terra della sua cella, centrata."""
    scala = altezza_utile / pezzo.height
    largo = max(1, round(pezzo.width * scala))
    alto = max(1, round(pezzo.height * scala))
    ridotto = pezzo.resize((largo, alto), Image.LANCZOS)

    x = colonna * CELLA + (CELLA - largo) // 2
    # Un filo di margine sotto i piedi, così l'ombra non tocca il bordo.
    y = riga * CELLA + CELLA - alto - 4
    tela.alpha_composite(ridotto, (x, y))


def componi(nome):
    scelta = SCELTE[nome]
    tutti = pezzi(nome)
    altezza_utile = round(CELLA * scelta["altezza"])

    tela = Image.new("RGBA", (COLONNE * CELLA, RIGHE * CELLA), (0, 0, 0, 0))

    righe = [
        scelta["fronte"],
        scelta["schiena"],
        scelta["lato"],
        scelta["lato"],
    ]

    for r, indici in enumerate(righe):
        for c, i in enumerate(indici):
            pezzo = tutti[i]
            if r == 3:
                pezzo = pezzo.transpose(Image.FLIP_LEFT_RIGHT)
            posa(tela, pezzo, c, r, altezza_utile)

    os.makedirs(USCITA, exist_ok=True)
    percorso = os.path.join(USCITA, f"{nome}.png")
    tela.save(percorso)
    print(f"{nome}: {len(tutti)} figure disponibili -> {percorso}")


if __name__ == "__main__":
    for nome in SCELTE:
        componi(nome)
