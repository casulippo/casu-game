# Asset

Ogni risorsa grafica usata nel gioco va registrata qui con provenienza e licenza,
**prima** di essere usata. È la differenza tra poter pubblicare e non poterlo fare.

## Asset di gioco

Terreno, alberi e arredo di periferia sono disegnati a runtime (canvas), stile
cartoon piatto — nessun file da registrare. Restano immagini vere solo i
personaggi.

| File | Contenuto | Provenienza | Licenza |
|---|---|---|---|
| `public/personaggi/*.png` | Walk-cycle 4 direzioni, cartoon cel-shaded | da verificare con chi li ha prodotti | da tracciare |

## Specifiche per nuovi asset

Perché un'immagine sia utilizzabile e non solo ispirazione:

- **Formato PNG**, mai JPEG: la compressione lossy sfoca i bordi netti.
- **Prospettiva dall'alto, piatta**: niente isometrico né obliquo — vedi CLAUDE.md.
- **Tile 48×48 px** (`TILE_W`/`TILE_H` in `src/engine/iso.ts`), o multipli esatti
  per gli oggetti che occupano più celle.
- **Fondo trasparente** per tutto ciò che non è pavimentazione.

## Nota sulla prospettiva

Il gioco è in top-down ortogonale, griglia quadrata (`src/engine/iso.ts`). Gli
edifici e l'arredo verticale mostrano solo una fascia di facciata verso chi
guarda — mai una faccia obliqua o isometrica, nemmeno negli asset.
