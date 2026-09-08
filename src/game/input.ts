import type { SpintaJoystick } from '../engine/joystick'
import { FERMO } from '../engine/joystick'

/**
 * Lo stato del joystick touch, condiviso tra React e Phaser.
 *
 * Deliberatamente NON è nello store Zustand. Il dito si muove a ogni frame, e
 * passare da Zustand vorrebbe dire far ri-renderizzare React 60 volte al secondo
 * per un dato che a React non serve: lo legge solo il game loop.
 *
 * Lo store resta la fonte di verità per lo *stato di gioco*; questo è input
 * grezzo di breve durata, e vive in un semplice oggetto mutabile.
 */
const stato = {
  spinta: FERMO as SpintaJoystick,
}

export function impostaSpinta(nuova: SpintaJoystick) {
  stato.spinta = nuova
}

export function leggiSpinta(): SpintaJoystick {
  return stato.spinta
}
