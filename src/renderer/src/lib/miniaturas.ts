import { useEffect, useState } from 'react'
import type { Entrada } from '@shared/types'
import { EN_APP, miniatura as pintar } from './tres'
import { urlArchivo } from './util'

/**
 * Miniaturas de modelos 3D. Las de .glb/.gltf/.fbx/.obj/.stl las pinta la propia app con three.js (de una en una) y
 * las guarda en la caché del proyecto; las de .blend las hace el proceso principal con buho-blender y avisa al acabar.
 */
const cache = new Map<string, string | null>()
const oyentes = new Set<() => void>()
let cola: Promise<unknown> = Promise.resolve()
const enCola = new Set<string>()

const clave = (e: Entrada): string => `${e.ruta}|${e.mtime}`
const avisar = (): void => oyentes.forEach((f) => f())

export const extDe = (ruta: string): string => (/\.[^./]+$/.exec(ruta)?.[0] ?? '').toLowerCase()

/** Pinta y guarda (lo usa también el CLI: el proceso principal pide «pedir-miniatura»). */
export function pintarYGuardar(ruta: string, mtime?: number, peticion?: string): Promise<string> {
  const t = cola.then(async () => {
    const png = await pintar(urlArchivo(ruta, mtime ?? Date.now()), extDe(ruta))
    return window.buho.guardarMiniatura(ruta, png, peticion)
  })
  cola = t.catch(() => undefined)
  return t
}

async function pedir(e: Entrada, forzar = false): Promise<void> {
  const k = clave(e)
  if (enCola.has(k)) return
  enCola.add(k)
  try {
    let url = await window.buho.miniatura(e.ruta, forzar)
    if (!url && EN_APP.includes(extDe(e.ruta))) url = await pintarYGuardar(e.ruta, e.mtime)
    cache.set(k, url)
    if (url) avisar()
  } catch {
    cache.set(k, null)
  } finally {
    enCola.delete(k)
  }
}

/** La miniatura de un modelo (URL) o null mientras se hace. */
export function useMiniatura(e: Entrada | undefined): string | null {
  const [, set] = useState(0)
  useEffect(() => {
    const f = (): void => set((n) => n + 1)
    oyentes.add(f)
    return () => void oyentes.delete(f)
  }, [])
  if (!e || e.clase !== 'modelo') return null
  const k = clave(e)
  if (!cache.has(k)) {
    cache.set(k, null)
    void pedir(e)
  }
  return cache.get(k) ?? null
}

/** Cuando buho-blender acaba una miniatura (o el CLI hace una), se vuelve a pedir. */
export function refrescarMiniatura(ruta: string): void {
  for (const k of [...cache.keys()]) if (k.startsWith(ruta + '|')) cache.delete(k)
  avisar()
}

export function rehacerMiniatura(e: Entrada): void {
  cache.delete(clave(e))
  void pedir(e, true)
}
