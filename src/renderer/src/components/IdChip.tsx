import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

/** Avisa a la app (toast) de que se ha copiado algo. */
export const avisarCopia = (texto: string): void => {
  window.dispatchEvent(new CustomEvent('buho-aviso', { detail: texto }))
}

/** Copia una ID al portapapeles y avisa. */
export async function copiarId(id: string, extra?: string): Promise<void> {
  await window.buho.copiar(extra ?? id)
  avisarCopia(extra ? 'Copiada la referencia completa' : `ID copiada: ${id}`)
}

/**
 * La ID de algo (asset, carpeta, tarea) con un botón de copiar. Es lo que se pega en un chat con la IA para hablar
 * con propiedad: «cambia el asset a-3f9c21b0…». Con Mayús copia también el nombre y la ruta.
 */
export function IdChip({ id, ruta, nombre, grande }: { id: string; ruta?: string; nombre?: string; grande?: boolean }): React.JSX.Element {
  const [hecho, setHecho] = useState(false)
  return (
    <button
      className={`id-chip ${grande ? 'grande' : ''}`}
      title={`Copiar la ID${ruta ? ' (Mayús: con nombre y ruta)' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        void copiarId(id, e.shiftKey && ruta ? `${id} · ${nombre ?? ''} · ${ruta}`.replace(' ·  ·', ' ·') : undefined).then(() => {
          setHecho(true)
          setTimeout(() => setHecho(false), 1400)
        })
      }}
    >
      <span className="mono">{id}</span>
      {hecho ? <Check size={12} /> : <Copy size={12} />}
    </button>
  )
}
