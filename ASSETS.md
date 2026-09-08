# Asset

Ogni risorsa grafica usata nel gioco va registrata qui con provenienza e licenza,
**prima** di essere usata. È la differenza tra poter pubblicare e non poterlo fare.

## Riferimenti visivi

File in `docs/riferimenti/`. Servono a fissare lo stile: palette, livello di
dettaglio, angolo isometrico, resa delle luci. **Non sono asset di gioco** — vedi
le note sotto.

| File | Contenuto | Provenienza | Licenza |
|---|---|---|---|
| `IMG_4040.jpeg` | Appartamento, cucina e soggiorno, vista isometrica diurna | ⚠️ da compilare | ⚠️ da chiarire |
| `IMG_4041.jpeg` | Attico con camino e bar, notturno, vetrate sulla città | ⚠️ da compilare | ⚠️ da chiarire |
| `IMG_4042.jpeg` | ⚠️ da compilare | ⚠️ da compilare | ⚠️ da chiarire |
| `IMG_4044.jpeg` | ⚠️ da compilare | ⚠️ da compilare | ⚠️ da chiarire |
| `IMG_4045.jpeg` | ⚠️ da compilare | ⚠️ da compilare | ⚠️ da chiarire |

### Perché non sono usabili direttamente

1. **Sono JPEG.** La compressione lossy sfoca i bordi netti: è il formato peggiore
   per la pixel art. Gli asset di gioco vogliono PNG.
2. **Sono scene intere, non tileset.** Ogni immagine è un ambiente già composto,
   non una griglia di tile ripetibili né uno spritesheet. Per usarli servirebbe
   ritagliarli in tile coerenti con la griglia del gioco.
3. **L'angolo potrebbe non combaciare.** Il gioco usa una proiezione isometrica
   2:1 (tile 64×32). Un riferimento disegnato con un altro angolo non si incastra.

Restano preziosi come direzione artistica: è a quel livello di densità e di luce
che dobbiamo arrivare.

## Asset di gioco

Nessuno: al momento tutto è disegnato a runtime con forme geometriche.
