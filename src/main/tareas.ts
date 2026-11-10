import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import type { DatosTarea, EstadoTarea, GravedadBug, Paso, PrioridadTarea, Reproduce, Tarea } from '@shared/types'
import { ESTADOS_TAREA } from '@shared/types'
import * as est from './estudio'

/**
 * Tareas del proyecto. Cada tarea es un Markdown en `Tareas/` (o una subcarpeta) con una cabecera YAML:
 *
 *   ---
 *   tipo: tarea
 *   id: t-1a2b3c4d
 *   estado: por-hacer            por-hacer | en-curso | revisar | hecha
 *   prioridad: media             alta | media | baja
 *   asignada: Claude             persona o agente (libre)
 *   enlaces: [a-3f9c21b0, c-77aa0011]   IDs de assets o carpetas relacionados
 *   creada: 2026-11-10T12:00:00.000Z
 *   autor: Julián
 *   ---
 *   # Título
 *   Descripción en Markdown…
 *   ## Pasos
 *   - [ ] primer paso
 *   - [x] segundo paso (hecho)
 *
 * Es un archivo normal: se puede editar a mano, con un agente o desde la app. El avance sale de los pasos marcados.
 *
 * Un **bug** es una tarea con `tipo: bug` (en `Tareas/Bugs/`) y campos propios: `gravedad` (bloqueante | grave |
 * menor | cosmetico), `build` (versión donde sale), `reproduce` (si | a-veces | no | sin-probar) y, en el cuerpo,
 * «## Cómo reproducirlo», «## Qué pasa» y «## Qué debería pasar». Todas las tareas guardan `cerrada` (cuándo pasaron
 * a hecha) y `reabierta` (veces que se sacaron de hecha): de ahí sale el histórico de la vista de Bugs.
 */

const CARPETA = 'Tareas'
const CAB = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/
const PRIORIDADES: PrioridadTarea[] = ['alta', 'media', 'baja']
const GRAVEDADES: GravedadBug[] = ['bloqueante', 'grave', 'menor', 'cosmetico']
const REPRODUCE: Reproduce[] = ['si', 'a-veces', 'no', 'sin-probar']
const TIPOS = ['tarea', 'bug']
const ESTADOS = ESTADOS_TAREA.map((e) => e.id)

function leerCabecera(texto: string): { campos: Record<string, string>; cuerpo: string } | null {
  const m = CAB.exec(texto)
  if (!m) return null
  const campos: Record<string, string> = {}
  for (const l of m[1].split(/\r?\n/)) {
    const x = /^([A-Za-zÀ-ÿ_]+):\s*(.*)$/.exec(l)
    if (x) campos[x[1].toLowerCase()] = x[2].trim()
  }
  return { campos, cuerpo: texto.slice(m[0].length) }
}

const lista = (v: string | undefined): string[] =>
  (v ?? '')
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((x) => x.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean)

const ORDEN_CAMPOS = ['tipo', 'id', 'estado', 'prioridad', 'gravedad', 'build', 'reproduce', 'asignada', 'enlaces', 'creada', 'autor', 'cerrada', 'reabierta']
function escribirCabecera(campos: Record<string, string>, cuerpo: string): string {
  const claves = [...ORDEN_CAMPOS.filter((k) => k in campos), ...Object.keys(campos).filter((k) => !ORDEN_CAMPOS.includes(k))]
  return `---\n${claves.map((k) => `${k}: ${campos[k]}`).join('\n')}\n---\n${cuerpo.replace(/^\r?\n/, '')}`
}

function pasosDe(cuerpo: string): Paso[] {
  return [...cuerpo.matchAll(/^\s*[-*] \[( |x|X)\] (.+)$/gm)].map((m) => ({ texto: m[2].trim(), hecho: m[1] !== ' ' }))
}

function aTarea(ruta: string, texto: string, mtime: number): Tarea | null {
  const c = leerCabecera(texto)
  if (!c || !TIPOS.includes(c.campos.tipo)) return null
  const tipo = c.campos.tipo as 'tarea' | 'bug'
  const titulo = /^#\s+(.+)$/m.exec(c.cuerpo)?.[1].trim() ?? ruta.split('/').pop()!.replace(/\.md$/i, '')
  const pasos = pasosDe(c.cuerpo)
  // Descripción: el cuerpo sin el título ni la sección de pasos
  const descripcion = c.cuerpo
    .replace(/^#\s+.+$/m, '')
    .replace(/^##\s+Pasos[\s\S]*?(?=^##\s|$(?![\s\S]))/m, '')
    .trim()
  const estado = (ESTADOS.includes(c.campos.estado as EstadoTarea) ? c.campos.estado : 'por-hacer') as EstadoTarea
  const prioridad = (PRIORIDADES.includes(c.campos.prioridad as PrioridadTarea) ? c.campos.prioridad : 'media') as PrioridadTarea
  return {
    id: (c.campos.id || est.idDe(ruta) || '').toLowerCase(),
    ruta,
    tipo,
    titulo,
    estado,
    prioridad,
    asignada: c.campos.asignada || undefined,
    enlaces: lista(c.campos.enlaces),
    creada: c.campos.creada || undefined,
    autor: c.campos.autor || undefined,
    descripcion,
    pasos,
    hechos: pasos.filter((p) => p.hecho).length,
    mtime,
    ...(c.campos.cerrada ? { cerrada: c.campos.cerrada } : {}),
    ...(Number(c.campos.reabierta) ? { reabierta: Number(c.campos.reabierta) } : {}),
    ...(tipo === 'bug'
      ? {
          gravedad: (GRAVEDADES.includes(c.campos.gravedad as GravedadBug) ? c.campos.gravedad : 'menor') as GravedadBug,
          build: c.campos.build || undefined,
          reproduce: (REPRODUCE.includes(c.campos.reproduce as Reproduce) ? c.campos.reproduce : 'sin-probar') as Reproduce
        }
      : {})
  }
}

/** Todas las tareas del proyecto (los .md de Tareas/ con `tipo: tarea`). */
export function listar(filtro: { estado?: string; asignada?: string; tipo?: string } = {}): Tarea[] {
  const notas = est.plano().filter((x) => x.clase === 'nota' && (x.ruta === CARPETA || x.ruta.startsWith(CARPETA + '/')))
  const pend: Record<string, number> = {}
  for (const c of est.comentarios()) if (!c.respuestaA && !c.resuelto) pend[c.ruta] = (pend[c.ruta] ?? 0) + 1
  const out: Tarea[] = []
  for (const n of notas) {
    let texto = ''
    try {
      texto = readFileSync(est.abs(n.ruta), 'utf8').replace(/^﻿/, '')
    } catch {
      continue
    }
    const t = aTarea(n.ruta, texto, n.mtime)
    if (!t) continue
    // La ID de la cabecera manda: si el registro de IDs no la tiene (p. ej. tarea copiada a mano), se fija
    if (t.id && est.idDe(n.ruta) !== t.id) est.fijarId(n.ruta, t.id)
    if (pend[n.ruta]) t.pendientes = pend[n.ruta]
    out.push(t)
  }
  const pri = (t: Tarea): number => PRIORIDADES.indexOf(t.prioridad)
  return out
    .filter((t) => (!filtro.tipo || t.tipo === filtro.tipo) && (!filtro.estado || t.estado === filtro.estado) && (!filtro.asignada || (t.asignada ?? '').toLowerCase() === filtro.asignada.toLowerCase()))
    .sort((a, b) => pri(a) - pri(b) || (a.creada ?? '').localeCompare(b.creada ?? ''))
}

/** Una tarea por su ID o su ruta. */
export function una(idOruta: string): Tarea {
  const r = est.norm(idOruta)
  const t = listar().find((x) => x.ruta === r || x.id === idOruta.toLowerCase())
  if (!t) throw new Error(`«${idOruta}» no es una tarea`)
  return t
}

const limpio = (n: string): string =>
  n
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
    .slice(0, 90)

const validar = <T extends string>(v: string | undefined, ok: T[], que: string): T | undefined => {
  if (v === undefined || v === '') return undefined
  const x = v.toLowerCase().replace(/\s+/g, '-') as T
  if (!ok.includes(x)) throw new Error(`${que} no válida: «${v}». Usa: ${ok.join(', ')}`)
  return x
}

/** Comprueba que los enlaces son IDs del proyecto (o rutas, que se pasan a ID). */
function enlacesValidos(xs: string[]): string[] {
  return xs.map((x) => {
    const r = est.norm(x)
    est.entrada(r)
    return est.idDe(r) ?? x
  })
}

export type { DatosTarea }

export function crear(d: DatosTarea, autor: string): Tarea {
  const titulo = d.titulo?.trim()
  const esBug = (d.tipo ?? 'tarea').toLowerCase() === 'bug'
  if (!titulo) throw new Error(esBug ? 'Falta el título del bug' : 'Falta el título de la tarea')
  const carpeta = d.carpeta ? est.norm(d.carpeta) : esBug ? `${CARPETA}/Bugs` : CARPETA
  const dir = est.abs(carpeta)
  mkdirSync(dir, { recursive: true })
  let f = join(dir, limpio(titulo) + '.md')
  for (let i = 2; existsSync(f); i++) f = join(dir, `${limpio(titulo)} (${i}).md`)
  const id = est.idNueva('t')
  const gravedad = validar(d.gravedad, GRAVEDADES, 'Gravedad') ?? 'menor'
  const campos: Record<string, string> = {
    tipo: esBug ? 'bug' : 'tarea',
    id,
    estado: validar(d.estado, ESTADOS, 'Estado') ?? 'por-hacer',
    // en un bug, la prioridad sale de la gravedad si no se da
    prioridad: validar(d.prioridad, PRIORIDADES, 'Prioridad') ?? (esBug ? (gravedad === 'bloqueante' || gravedad === 'grave' ? 'alta' : gravedad === 'menor' ? 'media' : 'baja') : 'media'),
    ...(esBug
      ? {
          gravedad,
          ...(d.build?.trim() ? { build: d.build.trim() } : {}),
          reproduce: validar(d.reproduce, REPRODUCE, 'Reproduce') ?? 'sin-probar'
        }
      : {}),
    ...(d.asignada?.trim() ? { asignada: d.asignada.trim() } : {}),
    enlaces: `[${enlacesValidos(d.enlaces ?? []).join(', ')}]`,
    creada: new Date().toISOString(),
    autor
  }
  const pasos = (d.pasos ?? []).map((p) => p.trim()).filter(Boolean)
  const rep = (d.reproducir ?? []).map((x) => x.trim()).filter(Boolean)
  const bug = esBug
    ? `## Cómo reproducirlo\n\n${rep.length ? rep.map((x, i) => `${i + 1}. ${x}`).join('\n') : '1. '}\n\n## Qué pasa\n\n${d.pasa?.trim() ?? ''}\n\n## Qué debería pasar\n\n${d.deberia?.trim() ?? ''}\n\n`
    : ''
  const cuerpo = `# ${titulo}\n\n${d.descripcion?.trim() ? d.descripcion.trim() + '\n\n' : ''}${bug}${pasos.length ? `## Pasos\n\n${pasos.map((p) => `- [ ] ${p}`).join('\n')}\n` : ''}`
  writeFileSync(f, escribirCabecera(campos, cuerpo))
  est.invalidar()
  const ruta = est.rel(f)
  est.fijarId(ruta, id)
  return una(ruta)
}

function reescribir(t: Tarea, cambio: (campos: Record<string, string>, cuerpo: string) => { campos: Record<string, string>; cuerpo: string }): void {
  const p = est.abs(t.ruta)
  const c = leerCabecera(readFileSync(p, 'utf8').replace(/^﻿/, ''))!
  const r = cambio({ ...c.campos }, c.cuerpo)
  writeFileSync(p, escribirCabecera(r.campos, r.cuerpo))
  est.invalidar()
}

/** Cambia campos de una tarea. Cambiar el título renombra el archivo (la ID se queda). */
export function editar(idOruta: string, d: DatosTarea): Tarea {
  const t = una(idOruta)
  reescribir(t, (campos, cuerpo) => {
    const e = validar(d.estado, ESTADOS, 'Estado')
    if (e && e !== campos.estado) {
      if (e === 'hecha') campos.cerrada = new Date().toISOString()
      else if (campos.estado === 'hecha') {
        delete campos.cerrada
        campos.reabierta = String((Number(campos.reabierta) || 0) + 1)
      }
      campos.estado = e
    }
    const g = validar(d.gravedad, GRAVEDADES, 'Gravedad')
    if (g) campos.gravedad = g
    const rp = validar(d.reproduce, REPRODUCE, 'Reproduce')
    if (rp) campos.reproduce = rp
    if (d.build !== undefined) {
      if (d.build.trim()) campos.build = d.build.trim()
      else delete campos.build
    }
    if (d.tipo && TIPOS.includes(d.tipo)) campos.tipo = d.tipo
    const pr = validar(d.prioridad, PRIORIDADES, 'Prioridad')
    if (pr) campos.prioridad = pr
    if (d.asignada !== undefined) {
      if (d.asignada.trim()) campos.asignada = d.asignada.trim()
      else delete campos.asignada
    }
    if (d.enlaces !== undefined) campos.enlaces = `[${enlacesValidos(d.enlaces).join(', ')}]`
    if (d.titulo?.trim()) cuerpo = /^#\s+.+$/m.test(cuerpo) ? cuerpo.replace(/^#\s+.+$/m, `# ${d.titulo.trim()}`) : `# ${d.titulo.trim()}\n\n${cuerpo}`
    if (d.descripcion !== undefined) {
      const titulo = /^#\s+.+$/m.exec(cuerpo)?.[0] ?? `# ${t.titulo}`
      const pasos = /^##\s+Pasos[\s\S]*?(?=^##\s|$(?![\s\S]))/m.exec(cuerpo)?.[0] ?? ''
      cuerpo = `${titulo}\n\n${d.descripcion.trim() ? d.descripcion.trim() + '\n\n' : ''}${pasos.trim() ? pasos.trim() + '\n' : ''}`
    }
    return { campos, cuerpo }
  })
  if (d.titulo?.trim() && d.titulo.trim() !== t.titulo) {
    const p = est.abs(t.ruta)
    let n = join(dirname(p), limpio(d.titulo.trim()) + '.md')
    if (n.toLowerCase() !== p.toLowerCase()) {
      for (let i = 2; existsSync(n); i++) n = join(dirname(p), `${limpio(d.titulo.trim())} (${i}).md`)
      // renombrar mueve también la ID, el estado y los comentarios
      est.renombrar(t.ruta, basename(n))
    }
  }
  return una(t.id)
}

/** Marca (o desmarca) el paso n (desde 1). */
export function marcarPaso(idOruta: string, n: number, hecho: boolean): Tarea {
  const t = una(idOruta)
  if (!Number.isInteger(n) || n < 1 || n > t.pasos.length) throw new Error(`La tarea tiene ${t.pasos.length} pasos: usa un número del 1 al ${t.pasos.length}`)
  reescribir(t, (campos, cuerpo) => {
    let i = 0
    cuerpo = cuerpo.replace(/^(\s*[-*] \[)( |x|X)(\] .+)$/gm, (m, a, _x, b) => (++i === n ? `${a}${hecho ? 'x' : ' '}${b}` : m))
    return { campos, cuerpo }
  })
  return una(t.id)
}

/** Añade un paso al final de «## Pasos» (la crea si no existe). */
export function anadirPaso(idOruta: string, texto: string): Tarea {
  if (!texto.trim()) throw new Error('El paso está vacío')
  const t = una(idOruta)
  reescribir(t, (campos, cuerpo) => {
    const linea = `- [ ] ${texto.trim()}`
    const m = /^##\s+Pasos[\s\S]*?(?=^##\s|$(?![\s\S]))/m.exec(cuerpo)
    if (m) {
      const bloque = m[0].replace(/\s*$/, '') + `\n${linea}\n`
      cuerpo = cuerpo.slice(0, m.index) + bloque + cuerpo.slice(m.index + m[0].length).replace(/^\n*/, '\n')
    } else cuerpo = cuerpo.replace(/\s*$/, '') + `\n\n## Pasos\n\n${linea}\n`
    return { campos, cuerpo }
  })
  return una(t.id)
}

/** ¿Es esta ruta una tarea? (para que la app la enseñe como tarea y no como nota) */
export function esTarea(ruta: string): boolean {
  try {
    const p = est.abs(ruta)
    return !!existsSync(p) && TIPOS.includes(leerCabecera(readFileSync(p, 'utf8').slice(0, 600) + '\n')?.campos.tipo ?? '')
  } catch {
    return false
  }
}
