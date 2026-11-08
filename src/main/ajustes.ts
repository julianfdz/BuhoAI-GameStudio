import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { userInfo } from 'node:os'
import { app } from 'electron'
import type { Ajustes, Proyecto } from '@shared/types'

/** Ajustes en <userData>/settings.json: con qué nombre firma la persona y los proyectos recientes. */
const file = (): string => join(app.getPath('userData'), 'settings.json')

function porDefecto(): Ajustes {
  let autor = 'Usuario'
  try {
    autor = userInfo().username || autor
  } catch {
    /* nada */
  }
  return { autor, recientes: [] }
}

export function leerAjustes(): Ajustes {
  try {
    return { ...porDefecto(), ...JSON.parse(readFileSync(file(), 'utf8')) }
  } catch {
    return porDefecto()
  }
}

export function guardarAjustes(c: Partial<Ajustes>): Ajustes {
  const a = { ...leerAjustes(), ...c }
  writeFileSync(file(), JSON.stringify(a, null, 2))
  return a
}

export function apuntarReciente(p: Proyecto): Ajustes {
  const a = leerAjustes()
  const otros = a.recientes.filter((r) => r.raiz.toLowerCase() !== p.raiz!.toLowerCase())
  return guardarAjustes({ recientes: [{ raiz: p.raiz!, nombre: p.nombre, abierto: new Date().toISOString() }, ...otros].slice(0, 15), ultimo: p.raiz })
}

export function quitarReciente(raiz: string): Ajustes {
  const a = leerAjustes()
  return guardarAjustes({ recientes: a.recientes.filter((r) => r.raiz.toLowerCase() !== raiz.toLowerCase()), ultimo: a.ultimo === raiz ? undefined : a.ultimo })
}
