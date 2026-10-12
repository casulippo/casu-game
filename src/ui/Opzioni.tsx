import { useRef, useState } from 'react'
import type { Carriera } from '../engine/tipi'
import { Bottone, Card } from './comuni'

export function Opzioni({
  carriera,
  onEsporta,
  onImporta,
  onElimina,
  onMenu,
}: {
  carriera: Carriera
  onEsporta: () => void
  onImporta: (f: File) => void
  onElimina: () => void
  onMenu: () => void
}) {
  const file = useRef<HTMLInputElement>(null)
  const [conferma, setConferma] = useState(false)
  return (
    <div className="max-w-xl space-y-4">
      <Card titolo="Salvataggio">
        <p className="text-sm text-slate-400">
          La carriera si salva da sola nel browser dopo ogni giornata. Esporta un file per tenerne una copia o spostarla su un altro
          dispositivo.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Bottone onClick={onEsporta}>Esporta file</Bottone>
          <Bottone variante="secondario" onClick={() => file.current?.click()}>
            Importa file
          </Bottone>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onImporta(f)
              e.target.value = ''
            }}
          />
        </div>
      </Card>
      <Card titolo="Carriera">
        <p className="text-sm text-slate-400">
          Stagione {carriera.stagione} · iniziata il {new Date(carriera.creata).toLocaleDateString('it-IT')}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Bottone variante="secondario" onClick={onMenu}>
            Torna al menu
          </Bottone>
          {conferma ? (
            <>
              <Bottone variante="pericolo" onClick={onElimina}>
                Sì, elimina definitivamente
              </Bottone>
              <Bottone variante="secondario" onClick={() => setConferma(false)}>
                Annulla
              </Bottone>
            </>
          ) : (
            <Bottone variante="pericolo" onClick={() => setConferma(true)}>
              Elimina carriera
            </Bottone>
          )}
        </div>
      </Card>
      <Card titolo="Fonti dei dati">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-400">
          <li>Anagrafica, valori di mercato, contratti e statistiche: Transfermarkt (dataset pubblico, aggiornato a luglio 2026).</li>
          <li>Stipendi: Virgilio Sport (lordi) e Calcio e Finanza (netti), settembre 2026.</li>
          <li>Attributi di gioco: stimati da ruolo, valore ed età, in attesa del modello sulle statistiche reali.</li>
        </ul>
      </Card>
    </div>
  )
}
