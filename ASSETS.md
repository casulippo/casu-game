# Asset

Ogni risorsa grafica usata nel gioco va registrata qui con provenienza e licenza,
**prima** di essere usata. È la differenza tra poter pubblicare e non poterlo fare.

## Riferimenti visivi

File in `docs/riferimenti/`. Servono a fissare la direzione artistica: palette,
densità di dettaglio, resa delle luci. **Non sono asset di gioco** — vedi le note
in fondo.

### Quartieri, vista dall'alto

| File | Contenuto | Prospettiva |
|---|---|---|
| `IMG_4034` | Centro storico: ciottolato, café, libreria, fontana, tetti in coppi | Top-down |
| `IMG_4035` | Porto industriale: container, gru, navi, piazzali di manovra | Top-down |
| `IMG_4036` | Periferia povera: palazzi degradati, graffiti, scale antincendio, notte | Top-down |
| `IMG_4037` | Zona ricca: grattacieli a specchio, parco, negozi di lusso, traffico | Top-down |

### Interni

| File | Contenuto | Prospettiva |
|---|---|---|
| `IMG_4038` | Stanza misera: branda, tubi arrugginiti, muffa, scatoloni | Frontale/top-down |
| `IMG_4040` | Appartamento medio: cucina e soggiorno, luce diurna | Isometrica |
| `IMG_4041` | Attico di lusso: camino, bar, vetrate sulla città di notte | Isometrica |
| `IMG_4045` | Nove interni in griglia: appartamento povero, commissariato, mercato, banca, porticciolo, scuola, casinò, magazzino riciclaggio, salotto | Top-down |

### Interfaccia

| File | Contenuto |
|---|---|
| `IMG_4042` | Mappa a distretti "Aethelport" con legenda e zoom |
| `IMG_4044` | Mappa "Casu City" con controllo territorio: i sei quartieri del brief, percentuali per gang, tab Map/Gangs/Stats/Objectives/Economy |

`IMG_4044` non è un riferimento di stile ma un mockup dell'interfaccia di questo
gioco: i quartieri corrispondono uno a uno a quelli del brief.

## Provenienza e licenza

| Origine | Stato |
|---|---|
| ⚠️ da compilare | ⚠️ da chiarire |

Finché questa tabella è vuota, nessuno di questi file può finire nel gioco
pubblicato — solo restare come riferimento interno.

## Perché non sono usabili direttamente

1. **Sono JPEG.** La compressione lossy sfoca i bordi netti: è il formato peggiore
   per la pixel art. Gli asset di gioco vogliono PNG.
2. **Sono scene composte, non tileset.** Nessuna è una griglia di tile ripetibili
   né uno spritesheet.
3. **La prospettiva non è coerente.** Gli esterni sono top-down, il gioco è
   isometrico 2:1. Vedi la nota sotto.

## Nota sulla prospettiva

Il gioco è oggi in **isometrica 2:1** (tile 64×32). I riferimenti degli esterni
sono invece in **top-down ortogonale**, e i due sistemi non si mescolano: un
tileset disegnato per l'uno non si incastra nell'altro.

È una scelta da fare prima di commissionare o produrre asset veri.

## Asset di gioco

Nessuno: al momento tutto è disegnato a runtime con forme geometriche.
