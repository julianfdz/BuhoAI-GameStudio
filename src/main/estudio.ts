import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { createHash, randomBytes } from 'node:crypto'
import type { Clase, Comentario, Entrada, EstadoAsset, Evento, Ficha, Proyecto } from '@shared/types'
import { PLANTILLA } from './plantilla'

/**
 * Núcleo de Búho Game Studio. Un proyecto es una carpeta normal del disco (como en VS Code) con una carpeta oculta
 * `.buhostudio/` que guarda lo que no es un archivo del juego:
 *
 *   .buhostudio/proyecto.json     nombre, id y enlaces (p. ej. la carpeta del proyecto de Unity)
 *   .buhostudio/estados.json      estado de cada archivo o carpeta (idea → en curso → revisar → aprobado)
 *   .buhostudio/fichas.json       nombre y descripción de cada asset (el nombre del archivo no cambia)
 *   .buhostudio/comentarios.json  comentarios por archivo, con respuestas (los agentes los leen y contestan)
 *   .buhostudio/historial.jsonl   historial firmado: quién (persona o agente), por dónde (app, cli) y qué
 *   .buhostudio/miniaturas/       caché de miniaturas de modelos 3D (se puede borrar)
 *
 * Todo lo demás son carpetas y archivos de verdad: se pueden tocar con el Explorador, Blender, VS Code o git.
 */

export const META = '.buhostudio'
const IGNORAR = new Set([META, '.git', 'node_modules', '.vs', '.idea', 'Thumbs.db', 'desktop.ini', '.DS_Store'])

const EXT: Record<string, Clase> = {}
const tipo = (c: Clase, exts: string[]): void => exts.forEach((e) => (EXT[e] = c))
tipo('nota', ['.md', '.markdown'])
tipo('imagen', ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.avif'])
tipo('modelo', ['.glb', '.gltf', '.fbx', '.obj', '.blend', '.stl', '.dae', '.3ds', '.usd', '.usdz'])
tipo('audio', ['.ogg', '.wav', '.mp3', '.flac', '.m4a', '.aac'])
tipo('video', ['.mp4', '.webm', '.mov', '.mkv'])
tipo('texto', ['.txt', '.json', '.yaml', '.yml', '.py', '.cs', '.js', '.ts', '.csv', '.xml', '.ini', '.toml', '.shader', '.hlsl', '.lua', '.gd'])
export const claseDe = (nombre: string): Clase => EXT[extname(nombre).toLowerCase()] ?? 'otro'
const TEXTO: Clase[] = ['nota', 'texto']

let raiz = ''
let proyecto: Proyecto | null = null

export const raizActual = (): string => raiz
export const proyectoActual = (): Proyecto | null => proyecto
const meta = (...p: string[]): string => join(raiz, META, ...p)
const exigir = (): void => {
  if (!proyecto) throw new Error('No hay ningún proyecto abierto. Ábrelo con «buho-studio abrir <carpeta>».')
}

/** Normaliza una ruta relativa («Assets\\Sonidos/», «/Contexto») a la forma «Assets/Sonidos». */
export function norm(r: string): string {
  return String(r ?? '')
    .replace(/\\/g, '/')
    .replace(/^\.?\/+/, '')
    .replace(/\/+$/, '')
    .replace(/^\.$/, '')
}

/** Ruta absoluta de algo del proyecto. Acepta relativa o absoluta, pero siempre dentro del proyecto. */
export function abs(r: string): string {
  exigir()
  const p = isAbsolute(r) ? resolve(r) : resolve(raiz, norm(r))
  const rel = relative(raiz, p)
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error(`«${r}» está fuera del proyecto`)
  if (rel.split(sep)[0] === META) throw new Error('La carpeta .buhostudio es interna del estudio')
  return p
}
export const rel = (p: string): string => norm(relative(raiz, p))

function existe(r: string): string {
  const p = abs(r)
  if (!existsSync(p)) throw new Error(`No existe «${norm(r) || '/'}» en el proyecto`)
  return p
}

const leerJson = <T,>(f: string, def: T): T => {
  try {
    return JSON.parse(readFileSync(f, 'utf8')) as T
  } catch {
    return def
  }
}
const guardarJson = (f: string, v: unknown): void => {
  mkdirSync(dirname(f), { recursive: true })
  writeFileSync(f, JSON.stringify(v, null, 2) + '\n')
}

// ------------------------------------------------------------------ proyectos

export const esProyecto = (dir: string): boolean => existsSync(join(dir, META, 'proyecto.json'))

/** Abre una carpeta. Si no es aún un proyecto del estudio, la adopta tal cual (sin plantilla). */
export function abrir(dir: string): Proyecto {
  const d = resolve(dir)
  if (!existsSync(d) || !statSync(d).isDirectory()) throw new Error(`No existe la carpeta ${d}`)
  raiz = d
  const f = meta('proyecto.json')
  let p = leerJson<Proyecto | null>(f, null)
  if (!p) {
    p = { id: 'p-' + randomBytes(5).toString('hex'), nombre: basename(d), creado: new Date().toISOString(), version: 1, enlaces: {} }
    guardarJson(f, p)
    writeFileSync(meta('.gitignore'), 'miniaturas/\n')
  }
  p.enlaces ??= {}
  proyecto = { ...p, raiz: d }
  return proyecto
}

export function cerrar(): void {
  proyecto = null
  raiz = ''
}

/** Crea un proyecto nuevo en `dir` (que puede no existir) con la plantilla estándar. */
export function crear(dir: string, nombre?: string, conPlantilla = true): Proyecto {
  const d = resolve(dir)
  if (esProyecto(d)) throw new Error(`${d} ya es un proyecto de Búho Game Studio: ábrelo`)
  mkdirSync(d, { recursive: true })
  const titulo = nombre?.trim() || basename(d)
  if (conPlantilla) {
    for (const [r, contenido] of Object.entries(PLANTILLA(titulo))) {
      const p = join(d, r)
      if (r.endsWith('/')) mkdirSync(p, { recursive: true })
      else if (!existsSync(p)) {
        mkdirSync(dirname(p), { recursive: true })
        writeFileSync(p, contenido)
      }
    }
  }
  guardarJson(join(d, META, 'proyecto.json'), { id: 'p-' + randomBytes(5).toString('hex'), nombre: titulo, creado: new Date().toISOString(), version: 1, enlaces: {} })
  writeFileSync(join(d, META, '.gitignore'), 'miniaturas/\n')
  return abrir(d)
}

export function guardarProyecto(cambios: Partial<Proyecto>): Proyecto {
  exigir()
  const { raiz: _r, ...resto } = { ...proyecto!, ...cambios }
  guardarJson(meta('proyecto.json'), resto)
  proyecto = { ...resto, raiz }
  return proyecto
}

// ------------------------------------------------------------------ estados y comentarios

type Estados = Record<string, { estado: EstadoAsset; autor: string; fecha: string }>
const estados = (): Estados => leerJson<Estados>(meta('estados.json'), {})
const comentariosTodos = (): Comentario[] => leerJson<Comentario[]>(meta('comentarios.json'), [])
type Fichas = Record<string, Ficha>
const fichas = (): Fichas => leerJson<Fichas>(meta('fichas.json'), {})

/** Al mover o renombrar, el estado y los comentarios siguen al archivo (y a todo lo que cuelga de una carpeta). */
function reubicar(de: string, a: string): void {
  const cambia = (r: string): string | null => (r === de ? a : r.startsWith(de + '/') ? a + r.slice(de.length) : null)
  const e = estados()
  const e2: Estados = {}
  for (const [k, v] of Object.entries(e)) e2[cambia(k) ?? k] = v
  guardarJson(meta('estados.json'), e2)
  const f2: Fichas = {}
  for (const [k, v] of Object.entries(fichas())) f2[cambia(k) ?? k] = v
  guardarJson(meta('fichas.json'), f2)
  const c = comentariosTodos().map((x) => ({ ...x, ruta: cambia(x.ruta) ?? x.ruta }))
  guardarJson(meta('comentarios.json'), c)
}

export function ponerEstado(r: string, estado: string | null, autor: string): void {
  existe(r)
  const ok: EstadoAsset[] = ['idea', 'en-curso', 'revisar', 'aprobado']
  const e = estados()
  const k = norm(r)
  if (estado === null || estado === '' || estado === 'ninguno') delete e[k]
  else {
    const v = estado.toLowerCase().replace(/\s+/g, '-') as EstadoAsset
    if (!ok.includes(v)) throw new Error(`Estado no válido: «${estado}». Usa: ${ok.join(', ')} o ninguno`)
    e[k] = { estado: v, autor, fecha: new Date().toISOString() }
  }
  guardarJson(meta('estados.json'), e)
}

/**
 * Nombre (título legible) y descripción de un asset o carpeta. No renombra el archivo: es la ficha que ven las
 * personas y los agentes. `undefined` deja el campo como estaba; '' lo borra.
 */
export function ponerFicha(r: string, cambios: { titulo?: string; descripcion?: string }, autor: string): Ficha | null {
  existe(r)
  const k = norm(r)
  const f = fichas()
  const antes: Partial<Ficha> = f[k] ?? {}
  const titulo = cambios.titulo === undefined ? antes.titulo : cambios.titulo.trim() || undefined
  const descripcion = cambios.descripcion === undefined ? antes.descripcion : cambios.descripcion.trim() || undefined
  if (!titulo && !descripcion) delete f[k]
  else f[k] = { ...(titulo ? { titulo } : {}), ...(descripcion ? { descripcion } : {}), autor, fecha: new Date().toISOString() }
  guardarJson(meta('fichas.json'), f)
  return f[k] ?? null
}

export function listarFichas(): (Ficha & { ruta: string })[] {
  exigir()
  return Object.entries(fichas()).map(([ruta, v]) => ({ ruta, ...v }))
}

export function listarEstados(): { ruta: string; estado: EstadoAsset; autor: string; fecha: string }[] {
  exigir()
  return Object.entries(estados()).map(([ruta, v]) => ({ ruta, ...v }))
}

export function comentarios(r?: string, pendientes = false): Comentario[] {
  exigir()
  let c = comentariosTodos()
  if (r !== undefined && r !== null && r !== '') {
    const k = norm(r)
    c = c.filter((x) => x.ruta === k || x.ruta.startsWith(k + '/'))
  }
  if (pendientes) {
    // Hilo pendiente = comentario raíz sin resolver
    const raices = c.filter((x) => !x.respuestaA && !x.resuelto)
    const ids = new Set(raices.map((x) => x.id))
    c = c.filter((x) => ids.has(x.id) || (x.respuestaA && ids.has(x.respuestaA)))
  }
  return c
}

export function comentar(r: string, texto: string, autor: string, origen: 'persona' | 'ia', respuestaA?: string): Comentario {
  if (!texto?.trim()) throw new Error('El comentario está vacío')
  const todos = comentariosTodos()
  let ruta = norm(r)
  if (respuestaA) {
    const padre = todos.find((x) => x.id === respuestaA)
    if (!padre) throw new Error(`No existe el comentario ${respuestaA}`)
    respuestaA = padre.respuestaA ?? padre.id
    ruta = padre.ruta
  } else existe(ruta)
  const c: Comentario = { id: 'k-' + randomBytes(4).toString('hex'), ruta, texto: texto.trim(), autor, origen, fecha: new Date().toISOString(), ...(respuestaA ? { respuestaA } : {}) }
  todos.push(c)
  guardarJson(meta('comentarios.json'), todos)
  return c
}

export function resolver(id: string, resuelto = true): Comentario {
  exigir()
  const todos = comentariosTodos()
  const c = todos.find((x) => x.id === id)
  if (!c) throw new Error(`No existe el comentario ${id}`)
  const raizHilo = todos.find((x) => x.id === (c.respuestaA ?? c.id))!
  raizHilo.resuelto = resuelto
  guardarJson(meta('comentarios.json'), todos)
  return raizHilo
}

// ------------------------------------------------------------------ historial firmado

export function registrar(ev: Omit<Evento, 'fecha'>): void {
  if (!proyecto) return
  try {
    appendFileSync(meta('historial.jsonl'), JSON.stringify({ fecha: new Date().toISOString(), ...ev }) + '\n')
  } catch {
    /* sin permisos: no se para por el historial */
  }
}

export function historial(r?: string, max = 200): Evento[] {
  exigir()
  let lineas: Evento[] = []
  try {
    lineas = readFileSync(meta('historial.jsonl'), 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l) as Evento)
  } catch {
    return []
  }
  if (r) {
    const k = norm(r)
    lineas = lineas.filter((e) => e.ruta === k || e.ruta.startsWith(k + '/') || e.detalle?.includes(k))
  }
  return lineas.slice(-max).reverse()
}

// ------------------------------------------------------------------ árbol

export function arbol(): Entrada[] {
  exigir()
  const e = estados()
  const fs = fichas()
  const pend: Record<string, number> = {}
  for (const c of comentariosTodos()) if (!c.respuestaA && !c.resuelto) pend[c.ruta] = (pend[c.ruta] ?? 0) + 1
  const leerDir = (dir: string, prof: number): Entrada[] => {
    let nombres: string[] = []
    try {
      nombres = readdirSync(dir)
    } catch {
      return []
    }
    const out: Entrada[] = []
    for (const n of nombres) {
      if (IGNORAR.has(n)) continue
      const p = join(dir, n)
      let st
      try {
        st = statSync(p)
      } catch {
        continue
      }
      const r = rel(p)
      const base = { ruta: r, nombre: n, mtime: Math.round(st.mtimeMs), ...(e[r] ? { estado: e[r].estado } : {}), ...(fs[r]?.titulo ? { titulo: fs[r].titulo } : {}), ...(fs[r]?.descripcion ? { descripcion: fs[r].descripcion } : {}), ...(pend[r] ? { pendientes: pend[r] } : {}) }
      if (st.isDirectory()) out.push({ ...base, clase: 'carpeta', ext: '', tam: 0, hijos: prof < 12 ? leerDir(p, prof + 1) : [] })
      else out.push({ ...base, clase: claseDe(n), ext: extname(n).toLowerCase(), tam: st.size })
    }
    return out.sort((a, b) => (a.clase === 'carpeta') !== (b.clase === 'carpeta') ? (a.clase === 'carpeta' ? -1 : 1) : a.nombre.localeCompare(b.nombre, 'es', { numeric: true }))
  }
  return leerDir(raiz, 0)
}

/** Aplana el árbol. */
export function plano(ns: Entrada[] = arbol()): Entrada[] {
  return ns.flatMap((n) => [n, ...plano(n.hijos ?? [])])
}

export function entrada(r: string): Entrada {
  const k = norm(r)
  const n = plano().find((x) => x.ruta === k)
  if (!n) throw new Error(`No existe «${k}»`)
  return n
}

/** Huella barata del árbol (rutas + fechas) para saber si algo cambió fuera de la app. */
export function huella(): Map<string, number> {
  const m = new Map<string, number>()
  if (!proyecto) return m
  for (const n of plano()) m.set(n.ruta, n.clase === 'carpeta' ? 0 : n.mtime)
  return m
}

// ------------------------------------------------------------------ leer y escribir

export function leer(r: string): { ruta: string; texto: string; mtime: number } {
  const p = existe(r)
  const st = statSync(p)
  if (st.isDirectory()) throw new Error(`«${norm(r)}» es una carpeta`)
  if (!TEXTO.includes(claseDe(p)) && st.size > 2_000_000) throw new Error(`«${norm(r)}» no es un archivo de texto`)
  return { ruta: rel(p), texto: readFileSync(p, 'utf8').replace(/^﻿/, ''), mtime: Math.round(st.mtimeMs) }
}

/** Nombre de archivo seguro para Windows. */
const limpio = (n: string): string =>
  n
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')

export function escribir(r: string, texto: string, anadir = false): Entrada {
  const p = abs(r)
  if (existsSync(p) && statSync(p).isDirectory()) throw new Error(`«${norm(r)}» es una carpeta`)
  mkdirSync(dirname(p), { recursive: true })
  if (anadir && existsSync(p)) appendFileSync(p, (readFileSync(p, 'utf8').endsWith('\n') ? '' : '\n') + texto)
  else writeFileSync(p, texto)
  return entrada(rel(p))
}

export function crearCarpeta(padre: string, nombre: string): Entrada {
  const n = limpio(nombre)
  if (!n) throw new Error('Falta el nombre de la carpeta')
  const base = existe(padre || '')
  const p = join(base, n)
  if (existsSync(p)) throw new Error(`Ya existe «${rel(p)}»`)
  mkdirSync(p, { recursive: true })
  return entrada(rel(p))
}

export function crearNota(carpeta: string, titulo: string, texto?: string): Entrada {
  const t = limpio(titulo.replace(/\.md$/i, ''))
  if (!t) throw new Error('Falta el título de la nota')
  const base = existe(carpeta || '')
  if (!statSync(base).isDirectory()) throw new Error(`«${norm(carpeta)}» no es una carpeta`)
  const p = join(base, t + '.md')
  if (existsSync(p)) throw new Error(`Ya existe «${rel(p)}»`)
  const cuerpo = texto?.trim() ? (texto.endsWith('\n') ? texto : texto + '\n') : `# ${titulo.replace(/\.md$/i, '').trim()}\n\n`
  writeFileSync(p, cuerpo)
  return entrada(rel(p))
}

/** Nombre libre: «x.png» → «x (2).png» si ya existe. */
function libre(p: string): string {
  if (!existsSync(p)) return p
  const e = extname(p)
  const b = p.slice(0, p.length - e.length)
  for (let i = 2; ; i++) if (!existsSync(`${b} (${i})${e}`)) return `${b} (${i})${e}`
}

/** Copia archivos o carpetas de fuera (o de dentro) al proyecto. No mueve ni borra el original. */
export function anadir(destino: string, archivos: string[]): Entrada[] {
  const base = existe(destino || '')
  if (!statSync(base).isDirectory()) throw new Error(`«${norm(destino)}» no es una carpeta`)
  const hechos: string[] = []
  for (const a of archivos) {
    const src = resolve(a)
    if (!existsSync(src)) throw new Error(`No existe ${src}`)
    const dst = libre(join(base, basename(src)))
    cpSync(src, dst, { recursive: true, filter: (s) => !s.endsWith('.meta') })
    hechos.push(rel(dst))
  }
  return hechos.map(entrada)
}

export function mover(r: string, destino: string): Entrada {
  const p = existe(r)
  const d = existe(destino || '')
  if (!statSync(d).isDirectory()) throw new Error(`«${norm(destino)}» no es una carpeta`)
  if (d === p || d.startsWith(p + sep)) throw new Error('No se puede mover una carpeta dentro de sí misma')
  const n = join(d, basename(p))
  if (n === p) return entrada(rel(p))
  if (existsSync(n)) throw new Error(`Ya existe «${rel(n)}»`)
  const de = rel(p)
  renameSync(p, n)
  reubicar(de, rel(n))
  return entrada(rel(n))
}

export function renombrar(r: string, nombre: string): Entrada {
  const p = existe(r)
  let n = limpio(nombre)
  if (!n) throw new Error('Falta el nombre nuevo')
  // Si no se da extensión a un archivo, se mantiene la que tenía
  if (statSync(p).isFile() && !extname(n) && extname(p)) n += extname(p)
  const dst = join(dirname(p), n)
  if (dst === p) return entrada(rel(p))
  if (existsSync(dst) && dst.toLowerCase() !== p.toLowerCase()) throw new Error(`Ya existe «${rel(dst)}»`)
  const de = rel(p)
  renameSync(p, dst)
  reubicar(de, rel(dst))
  return entrada(rel(dst))
}

/** Se borra con la función que pase la app (la papelera de Windows); aquí solo se limpia lo que colgaba. */
export async function borrar(r: string, papelera: (p: string) => Promise<void>): Promise<{ ok: boolean; ruta: string }> {
  const p = existe(r)
  if (p === raiz) throw new Error('No se puede borrar la carpeta del proyecto desde el estudio')
  const k = rel(p)
  await papelera(p)
  const e = estados()
  for (const x of Object.keys(e)) if (x === k || x.startsWith(k + '/')) delete e[x]
  guardarJson(meta('estados.json'), e)
  const f = fichas()
  for (const x of Object.keys(f)) if (x === k || x.startsWith(k + '/')) delete f[x]
  guardarJson(meta('fichas.json'), f)
  return { ok: true, ruta: k }
}

// ------------------------------------------------------------------ buscar

export function buscar(q: string, max = 40): { ruta: string; nombre: string; clase: Clase; fragmento?: string }[] {
  exigir()
  const t = q.trim().toLowerCase()
  if (!t) return []
  const out: { ruta: string; nombre: string; clase: Clase; fragmento?: string; peso: number }[] = []
  for (const n of plano()) {
    let peso = 0
    let fragmento: string | undefined
    if (n.nombre.toLowerCase().includes(t)) peso += 10
    else if (n.ruta.toLowerCase().includes(t)) peso += 4
    if (n.titulo?.toLowerCase().includes(t)) peso += 10
    if (n.descripcion?.toLowerCase().includes(t)) {
      peso += 5
      fragmento = n.descripcion
    }
    if (TEXTO.includes(n.clase) && n.tam < 1_000_000 && !fragmento) {
      try {
        const txt = readFileSync(join(raiz, n.ruta), 'utf8')
        const i = txt.toLowerCase().indexOf(t)
        if (i >= 0) {
          peso += 3
          fragmento = txt.slice(Math.max(0, i - 60), i + t.length + 80).replace(/\s+/g, ' ').trim()
        }
      } catch {
        /* nada */
      }
    }
    if (peso) out.push({ ruta: n.ruta, nombre: n.nombre, clase: n.clase, fragmento, peso })
  }
  return out
    .sort((a, b) => b.peso - a.peso)
    .slice(0, max)
    .map(({ peso: _p, ...x }) => x)
}

// ------------------------------------------------------------------ miniaturas (caché)

/** Archivo de caché de la miniatura de un modelo: depende de la ruta y de la fecha, así se rehace si cambia. */
export function rutaMiniatura(r: string): string {
  const p = existe(r)
  const h = createHash('sha1').update(rel(p) + '|' + Math.round(statSync(p).mtimeMs)).digest('hex').slice(0, 16)
  return meta('miniaturas', h + '.png')
}

export function guardarMiniatura(r: string, png: Buffer): string {
  const f = rutaMiniatura(r)
  mkdirSync(dirname(f), { recursive: true })
  writeFileSync(f, png)
  return f
}

export const resumen = (): { carpetas: number; archivos: number; notas: number; modelos: number; imagenes: number; audios: number; pendientes: number } => {
  const t = plano()
  const n = (c: Clase): number => t.filter((x) => x.clase === c).length
  return {
    carpetas: n('carpeta'),
    archivos: t.length - n('carpeta'),
    notas: n('nota'),
    modelos: n('modelo'),
    imagenes: n('imagen'),
    audios: n('audio'),
    pendientes: comentariosTodos().filter((c) => !c.respuestaA && !c.resuelto).length
  }
}
