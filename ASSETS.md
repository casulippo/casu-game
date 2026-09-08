# Asset

Ogni risorsa grafica usata nel gioco va registrata qui con provenienza e licenza,
**prima** di essere usata. È la differenza tra poter pubblicare e non poterlo fare.

## Asset di gioco

Nessuno: al momento tutto è disegnato a runtime con forme geometriche.

| File | Contenuto | Provenienza | Licenza |
|---|---|---|---|
| — | — | — | — |

## Specifiche per nuovi asset

Perché un'immagine sia utilizzabile e non solo ispirazione:

- **Formato PNG**, mai JPEG: la compressione lossy sfoca i bordi netti della pixel art.
- **Prospettiva isometrica 2:1**, coerente con il resto del gioco.
- **Tile 64×32 px**, o multipli esatti per gli oggetti che occupano più celle.
- **Tileset o spritesheet**, non scene già composte: servono elementi ripetibili
  e componibili, non un ambiente finito.
- **Fondo trasparente** per tutto ciò che non è pavimentazione.

## Nota sulla prospettiva

Il gioco è oggi in isometrica 2:1. Un tileset disegnato in top-down ortogonale
non è convertibile: i due sistemi non si mescolano. Se si decide di passare al
top-down, va deciso prima di produrre gli asset, non dopo.
