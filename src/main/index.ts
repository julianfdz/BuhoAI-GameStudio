import { app, BrowserWindow, dialog, ipcMain, Menu, net, protocol, shell } from 'electron'
import { existsSync, mkdirSync, watch, type FSWatcher } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import { hostname, tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { randomBytes } from 'node:crypto'
import type { Cambio, Evento, Proyecto } from '@shared/types'
import * as est from './estudio'
import { apuntarReciente, guardarAjustes, leerAjustes, quitarReciente } from './ajustes'
import { apiUrl, startApi, stopApi } from './api'
import { syncAgentSkills } from './agentSkills'
import { abrirEnBlender, conectores, esUnity, miniaturaBlender, ordenUnity } from './conectores'
import pkg from '../../package.json'

/**
 * Búho Game Studio (Buho Corps Systems): la mesa de trabajo de un videojuego, independiente del motor.
 * Proyectos = carpetas reales; la app vigila la carpeta y enseña al momento lo que cambian las personas
 * y los agentes (CLI `buho-studio` → API local).
 */
const VERSION = pkg.version
app.setPath('userData', process.env.BUHO_DATA_DIR || join(app.getPath('appData'), 'BuhoGameStudio'))

let win: BrowserWindow | null = null
protocol.registerSchemesAsPrivileged([{ scheme: 'estudio', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, bypassCSP: true, corsEnabled: true } }])

// ---------------------------------------------------------------- cambios en vivo y firma
const emitir = (c: Cambio): void => win?.webContents.send('cambio', c)
let huella = new Map<string, number>()

type Firma = { autor: string; origen: 'persona' | 'ia'; canal: 'app' | 'cli' }
const deApp = (): Firma => ({ autor: leerAjustes().autor, origen: 'persona', canal: 'app' })
const deApi = (p: Record<string, unknown>, canal: string): Firma => ({
  autor: String(p.autor || process.env.BUHO_AUTOR || 'IA'),
  origen: 'ia',
  canal: canal === 'app' ? 'app' : 'cli'
})

/** Apunta en el historial firmado, avisa a la interfaz y rehace la foto del árbol (así el vigilante no lo toma por externo). */
function hecho<T>(f: Firma, accion: string, rutas: string[], r: T, detalle?: string, tipo: Cambio['tipo'] = 'arbol'): T {
  for (const ruta of rutas.length ? rutas : ['']) est.registrar({ autor: f.autor, usuario: leerAjustes().autor, origen: f.origen, canal: f.canal, equipo: hostname(), accion, ruta, ...(detalle ? { detalle } : {}) })
  huella = est.huella()
  emitir({ tipo, rutas, origen: f.origen === 'ia' ? 'ia' : 'app', autor: f.autor })
  return r
}

let vigilante: FSWatcher | null = null
let espera: NodeJS.Timeout | null = null
let sondeo: NodeJS.Timeout | null = null

/** Compara el árbol con la última foto: lo que cambió fuera de la app (Explorador, Blender, git…) se apunta como externo. */
function reescanear(): void {
  if (!est.proyectoActual()) return
  const nueva = est.huella()
  const cambios: { accion: string; ruta: string }[] = []
  for (const [r, m] of nueva) {
    if (!huella.has(r)) cambios.push({ accion: 'aparece', ruta: r })
    else if (huella.get(r) !== m) cambios.push({ accion: 'modifica', ruta: r })
  }
  for (const r of huella.keys()) if (!nueva.has(r)) cambios.push({ accion: 'desaparece', ruta: r })
  huella = nueva
  if (!cambios.length) return
  // Si aparece una carpeta entera, basta con apuntar la carpeta
  const top = cambios.filter((c) => !cambios.some((o) => o !== c && o.accion === c.accion && c.ruta.startsWith(o.ruta + '/')))
  for (const c of top.slice(0, 30)) est.registrar({ autor: 'externo', usuario: leerAjustes().autor, origen: 'externo', canal: 'externo', equipo: hostname(), accion: c.accion, ruta: c.ruta })
  emitir({ tipo: 'arbol', rutas: top.map((c) => c.ruta), origen: 'externo' })
}

function vigilar(raiz: string): void {
  vigilante?.close()
  vigilante = null
  if (sondeo) clearInterval(sondeo)
  try {
    vigilante = watch(raiz, { recursive: true }, (_e, f) => {
      if (f && String(f).startsWith(est.META)) return
      if (espera) clearTimeout(espera)
      espera = setTimeout(reescanear, 300)
    })
  } catch {
    /* unidades que no avisan: queda el sondeo */
  }
  // Google Drive y unidades de red no siempre avisan: un repaso cada 4 s
  sondeo = setInterval(reescanear, 4000)
}

function abrirProyecto(dir: string): Proyecto {
  const p = est.abrir(dir)
  apuntarReciente(p)
  huella = est.huella()
  vigilar(p.raiz!)
  win?.setTitle(`${p.nombre} · Búho Game Studio`)
  emitir({ tipo: 'proyecto' })
  return p
}

// ---------------------------------------------------------------- miniaturas de modelos 3D
/** Los que pinta la propia app con three.js (rápido, sin Blender). */
const EN_APP = ['.glb', '.gltf', '.fbx', '.obj', '.stl']
const pendientes = new Map<string, { ok: (f: string) => void; ko: (e: Error) => void }>()
let colaBlender: Promise<unknown> = Promise.resolve()
const enCurso = new Set<string>()

const urlMini = (ruta: string): string => `estudio://mini/${encodeURI(ruta)}?v=${Date.now()}`

/** Pide a la interfaz que pinte la miniatura de un modelo con three.js y espera a que la guarde. */
function miniaturaEnApp(ruta: string): Promise<string> {
  const id = randomBytes(6).toString('hex')
  return new Promise((ok, ko) => {
    const t = setTimeout(() => {
      pendientes.delete(id)
      ko(new Error('La app no ha pintado la miniatura a tiempo'))
    }, 45_000)
    pendientes.set(id, { ok: (f) => (clearTimeout(t), ok(f)), ko: (e) => (clearTimeout(t), ko(e)) })
    emitir({ tipo: 'pedir-miniatura', ruta, peticion: id })
  })
}

/** Con Blender, de una en una (cada una es un Blender sin ventana). */
function miniaturaConBlender(ruta: string): Promise<string> {
  const salida = est.rutaMiniatura(ruta)
  mkdirSync(dirname(salida), { recursive: true })
  const tarea = colaBlender.then(async () => {
    if (existsSync(salida)) return salida
    await miniaturaBlender(est.abs(ruta), salida, tmpdir())
    emitir({ tipo: 'miniatura', ruta })
    return salida
  })
  colaBlender = tarea.catch(() => undefined)
  return tarea
}

async function miniatura(ruta: string, opt: { forzar?: boolean; blender?: boolean; esperar?: boolean } = {}): Promise<string | null> {
  const e = est.entrada(ruta)
  if (e.clase !== 'modelo') return null
  const f = est.rutaMiniatura(e.ruta)
  if (existsSync(f) && !opt.forzar) return f
  const ext = extname(e.ruta).toLowerCase()
  const conBlender = opt.blender || !EN_APP.includes(ext)
  if (!conBlender) return opt.esperar ? miniaturaEnApp(e.ruta) : null
  if (opt.forzar && existsSync(f)) await shell.trashItem(f).catch(() => undefined)
  if (opt.esperar) return miniaturaConBlender(e.ruta)
  if (!enCurso.has(e.ruta)) {
    enCurso.add(e.ruta)
    miniaturaConBlender(e.ruta)
      .catch((err) => console.error('miniatura', e.ruta, err.message))
      .finally(() => enCurso.delete(e.ruta))
  }
  return null
}

// ---------------------------------------------------------------- ventana
function createWindow(): void {
  win = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1000,
    minHeight: 620,
    title: 'Búho Game Studio',
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#0A1F3A', symbolColor: '#ffffff', height: 40 },
    backgroundColor: '#0b1626',
    icon: join(__dirname, '../../build/icon.png'),
    show: false,
    webPreferences: { preload: join(__dirname, '../preload/index.js'), sandbox: false, contextIsolation: true }
  })
  win.once('ready-to-show', () => {
    if (!process.env.BUHO_E2E) win?.maximize()
    win?.show()
  })
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  if (process.env.ELECTRON_RENDERER_URL) void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void win.loadFile(join(__dirname, '../renderer/index.html'))
}

const estadoApp = () => ({ app: 'Búho Game Studio', version: VERSION, proyecto: est.proyectoActual(), api: apiUrl(), ...(est.proyectoActual() ? est.resumen() : {}) })

function registerIpc(): void {
  const A = deApp
  ipcMain.handle('estado', () => estadoApp())
  ipcMain.handle('ajustes', () => leerAjustes())
  ipcMain.handle('guardarAjustes', (_e, a) => guardarAjustes(a))
  ipcMain.handle('quitarReciente', (_e, r: string) => quitarReciente(r))
  ipcMain.handle('elegirCarpeta', async () => {
    const r = await dialog.showOpenDialog(win!, { title: 'Abrir carpeta como proyecto', properties: ['openDirectory', 'createDirectory'] })
    if (r.canceled || !r.filePaths[0]) return null
    const nuevo = !est.esProyecto(r.filePaths[0])
    const p = abrirProyecto(r.filePaths[0])
    if (nuevo) est.registrar({ autor: A().autor, usuario: A().autor, origen: 'persona', canal: 'app', equipo: hostname(), accion: 'adopta carpeta', ruta: '' })
    return p
  })
  ipcMain.handle('nuevoProyecto', async (_e, nombre: string) => {
    const r = await dialog.showOpenDialog(win!, { title: `Dónde crear «${nombre}» (se crea una carpeta con ese nombre dentro)`, properties: ['openDirectory', 'createDirectory'] })
    if (r.canceled || !r.filePaths[0]) return null
    const dir = join(r.filePaths[0], nombre.replace(/[<>:"/\\|?*]/g, '-').trim())
    est.crear(dir, nombre)
    const p = abrirProyecto(dir)
    est.registrar({ autor: A().autor, usuario: A().autor, origen: 'persona', canal: 'app', equipo: hostname(), accion: 'crea proyecto', ruta: '', detalle: 'plantilla estándar' })
    return p
  })
  ipcMain.handle('abrirProyecto', (_e, raiz: string) => abrirProyecto(raiz))
  ipcMain.handle('cerrarProyecto', () => {
    vigilante?.close()
    if (sondeo) clearInterval(sondeo)
    est.cerrar()
    guardarAjustes({ ultimo: undefined })
    win?.setTitle('Búho Game Studio')
  })
  ipcMain.handle('arbol', () => (est.proyectoActual() ? est.arbol() : []))
  ipcMain.handle('leer', (_e, r: string) => est.leer(r))
  ipcMain.handle('escribir', (_e, r: string, t: string) => hecho(A(), 'edita', [r], est.escribir(r, t)))
  ipcMain.handle('crearNota', (_e, c: string, t: string) => {
    const n = est.crearNota(c, t)
    return hecho(A(), 'crea nota', [n.ruta], n)
  })
  ipcMain.handle('crearCarpeta', (_e, p: string, n: string) => {
    const x = est.crearCarpeta(p, n)
    return hecho(A(), 'crea carpeta', [x.ruta], x)
  })
  ipcMain.handle('anadir', (_e, d: string, fs: string[]) => {
    const xs = est.anadir(d, fs)
    return hecho(A(), 'añade', xs.map((x) => x.ruta), xs)
  })
  ipcMain.handle('elegirArchivos', async (_e, d: string) => {
    const r = await dialog.showOpenDialog(win!, { title: `Subir a ${d || 'la raíz del proyecto'}`, properties: ['openFile', 'multiSelections'] })
    if (r.canceled || !r.filePaths.length) return []
    const xs = est.anadir(d, r.filePaths)
    return hecho(A(), 'añade', xs.map((x) => x.ruta), xs)
  })
  ipcMain.handle('mover', (_e, r: string, d: string) => {
    const x = est.mover(r, d)
    return hecho(A(), 'mueve', [x.ruta], x, `desde ${r}`)
  })
  ipcMain.handle('renombrar', (_e, r: string, n: string) => {
    const x = est.renombrar(r, n)
    return hecho(A(), 'renombra', [x.ruta], x, `antes ${r}`)
  })
  ipcMain.handle('borrar', async (_e, r: string) => hecho(A(), 'borra (papelera)', [r], await est.borrar(r, (p) => shell.trashItem(p))))
  ipcMain.handle('ponerEstado', (_e, r: string, s: string | null) => {
    est.ponerEstado(r, s, A().autor)
    return hecho(A(), `estado: ${s ?? 'ninguno'}`, [r], est.entrada(r))
  })
  ipcMain.handle('ponerFicha', (_e, r: string, c: { titulo?: string; descripcion?: string }) => {
    est.ponerFicha(r, c, A().autor)
    return hecho(A(), 'edita ficha', [r], est.entrada(r), resumenFicha(c))
  })
  ipcMain.handle('comentarios', (_e, r?: string) => est.comentarios(r))
  ipcMain.handle('comentar', (_e, r: string, t: string, resp?: string) => {
    const c = est.comentar(r, t, A().autor, 'persona', resp)
    return hecho(A(), resp ? 'responde' : 'comenta', [c.ruta], c, t.slice(0, 120), 'comentarios')
  })
  ipcMain.handle('resolver', (_e, id: string, v: boolean) => {
    const c = est.resolver(id, v)
    return hecho(A(), v ? 'resuelve comentario' : 'reabre comentario', [c.ruta], c, undefined, 'comentarios')
  })
  ipcMain.handle('historial', (_e, r?: string, max?: number) => est.historial(r, max))
  ipcMain.handle('buscar', (_e, q: string) => est.buscar(q))
  ipcMain.handle('miniatura', async (_e, r: string, forzar?: boolean) => {
    const f = await miniatura(r, { forzar })
    return f ? urlMini(r) : null
  })
  ipcMain.handle('guardarMiniatura', (_e, r: string, png: string, peticion?: string) => {
    const f = est.guardarMiniatura(r, Buffer.from(png.replace(/^data:image\/png;base64,/, ''), 'base64'))
    if (peticion) pendientes.get(peticion)?.ok(f)
    if (peticion) pendientes.delete(peticion)
    return urlMini(r)
  })
  ipcMain.handle('conectores', () => conectores(est.proyectoActual()))
  ipcMain.handle('enlazarUnity', (_e, dir: string | null) => enlazarUnity(dir, A()))
  ipcMain.handle('elegirUnity', async () => {
    const r = await dialog.showOpenDialog(win!, { title: 'Carpeta del proyecto de Unity', properties: ['openDirectory'] })
    if (r.canceled || !r.filePaths[0]) return null
    return enlazarUnity(r.filePaths[0], A())
  })
  ipcMain.handle('abrirEnBlender', (_e, r: string) => abrirEnBlender(est.abs(r)))
  ipcMain.handle('revelar', (_e, r: string) => shell.showItemInFolder(est.abs(r)))
  ipcMain.handle('abrirFuera', (_e, r: string) => shell.openPath(est.abs(r)))
}

function enlazarUnity(dir: string | null, f: Firma): Proyecto {
  if (dir && !existsSync(dir)) throw new Error(`No existe ${dir}`)
  if (dir && !esUnity(dir)) throw new Error(`${dir} no parece un proyecto de Unity (le faltan Assets/ y ProjectSettings/)`)
  const p = est.proyectoActual()!
  const r = est.guardarProyecto({ enlaces: { ...p.enlaces, unity: dir ?? undefined } })
  return hecho(f, dir ? 'enlaza Unity' : 'desenlaza Unity', [''], r, dir ?? undefined, 'proyecto')
}

// ---------------------------------------------------------------- API para el CLI
const resumenFicha = (c: { titulo?: string; descripcion?: string }): string =>
  [c.titulo !== undefined ? `nombre: ${c.titulo || '(sin nombre)'}` : '', c.descripcion !== undefined ? `descripción: ${(c.descripcion || '(sin descripción)').slice(0, 100)}` : '']
    .filter(Boolean)
    .join(' · ')
const S = (v: unknown): string => (v === undefined || v === null ? '' : String(v))
const lista = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : v ? [String(v)] : [])

async function apiCall(m: string, p: Record<string, unknown>, canal: string): Promise<unknown> {
  const F = deApi(p, canal)
  switch (m) {
    case 'estado':
      return estadoApp()
    case 'proyectos':
      return leerAjustes().recientes.map((r) => ({ ...r, abierto_ahora: est.proyectoActual()?.raiz === r.raiz, existe: existsSync(r.raiz) }))
    case 'abrir': {
      const dir = S(p.carpeta)
      const nuevo = !est.esProyecto(dir)
      const r = abrirProyecto(dir)
      est.registrar({ autor: F.autor, usuario: leerAjustes().autor, origen: 'ia', canal: F.canal, equipo: hostname(), accion: nuevo ? 'adopta carpeta' : 'abre proyecto', ruta: '' })
      return r
    }
    case 'nuevo': {
      est.crear(S(p.carpeta), p.nombre ? S(p.nombre) : undefined, p.plantilla !== false)
      const r = abrirProyecto(S(p.carpeta))
      est.registrar({ autor: F.autor, usuario: leerAjustes().autor, origen: 'ia', canal: F.canal, equipo: hostname(), accion: 'crea proyecto', ruta: '', detalle: p.plantilla === false ? 'sin plantilla' : 'plantilla estándar' })
      if (p.unity) enlazarUnity(S(p.unity), F)
      return est.proyectoActual()
    }
    case 'cerrar':
      est.cerrar()
      emitir({ tipo: 'proyecto' })
      return { ok: true }
  }
  if (!est.proyectoActual()) throw new Error('No hay ningún proyecto abierto. Usa «buho-studio abrir <carpeta>» o «buho-studio nuevo <carpeta>».')
  switch (m) {
    case 'arbol':
    case 'ls': {
      const desde = est.norm(S(p.ruta))
      const t = desde ? est.entrada(desde).hijos ?? [] : est.arbol()
      return t
    }
    case 'leer':
      return est.leer(S(p.ruta))
    case 'escribir': {
      const r = est.escribir(S(p.ruta), S(p.texto), !!p.anadir)
      return hecho(F, p.anadir ? 'añade texto' : 'escribe', [r.ruta], r)
    }
    case 'nota': {
      const r = est.crearNota(S(p.carpeta), S(p.titulo), p.texto === undefined ? undefined : S(p.texto))
      return hecho(F, 'crea nota', [r.ruta], r)
    }
    case 'carpeta': {
      const r = est.crearCarpeta(S(p.padre), S(p.nombre))
      return hecho(F, 'crea carpeta', [r.ruta], r)
    }
    case 'anadir': {
      const xs = est.anadir(S(p.destino), lista(p.archivos))
      if (xs.length === 1 && (p.titulo !== undefined || p.descripcion !== undefined)) {
        est.ponerFicha(xs[0].ruta, { titulo: p.titulo === undefined ? undefined : S(p.titulo), descripcion: p.descripcion === undefined ? undefined : S(p.descripcion) }, F.autor)
        xs[0] = est.entrada(xs[0].ruta)
      }
      return hecho(F, 'añade', xs.map((x) => x.ruta), xs, p.origen ? `desde ${S(p.origen)}` : undefined)
    }
    case 'mover': {
      const r = est.mover(S(p.ruta), S(p.destino))
      return hecho(F, 'mueve', [r.ruta], r, `desde ${S(p.ruta)}`)
    }
    case 'renombrar': {
      const r = est.renombrar(S(p.ruta), S(p.nombre))
      return hecho(F, 'renombra', [r.ruta], r, `antes ${S(p.ruta)}`)
    }
    case 'borrar':
      return hecho(F, 'borra (papelera)', [est.norm(S(p.ruta))], await est.borrar(S(p.ruta), (x) => shell.trashItem(x)))
    case 'estado-poner': {
      const rutas = lista(p.rutas)
      for (const r of rutas) est.ponerEstado(r, p.estado === null ? null : S(p.estado), F.autor)
      return hecho(F, `estado: ${S(p.estado) || 'ninguno'}`, rutas.map(est.norm), rutas.map((r) => est.entrada(r)))
    }
    case 'ficha': {
      const r = est.norm(S(p.ruta))
      const c = { titulo: p.titulo === undefined ? undefined : S(p.titulo), descripcion: p.descripcion === undefined ? undefined : S(p.descripcion) }
      if (c.titulo === undefined && c.descripcion === undefined) return { ...est.entrada(r), hijos: undefined }
      est.ponerFicha(r, c, F.autor)
      return hecho(F, 'edita ficha', [r], { ...est.entrada(r), hijos: undefined }, resumenFicha(c))
    }
    case 'fichas': {
      const desde = est.norm(S(p.ruta))
      const dentro = (r: string): boolean => !desde || r === desde || r.startsWith(desde + '/')
      if (!p.faltan) return est.listarFichas().filter((x) => dentro(x.ruta))
      // Assets (no carpetas ni notas) que aún no tienen nombre o descripción
      return est
        .plano()
        .filter((x) => x.clase !== 'carpeta' && x.clase !== 'nota' && dentro(x.ruta) && (!x.titulo || !x.descripcion))
        .map((x) => ({ ruta: x.ruta, clase: x.clase, titulo: x.titulo, descripcion: x.descripcion }))
    }
    case 'estados': {
      const xs = est.listarEstados()
      return p.estado ? xs.filter((x) => x.estado === S(p.estado)) : xs
    }
    case 'comentarios':
      return est.comentarios(p.ruta ? S(p.ruta) : undefined, !!p.pendientes)
    case 'comentar': {
      const c = est.comentar(S(p.ruta), S(p.texto), F.autor, 'ia')
      return hecho(F, 'comenta', [c.ruta], c, c.texto.slice(0, 120), 'comentarios')
    }
    case 'responder': {
      const c = est.comentar('', S(p.texto), F.autor, 'ia', S(p.id))
      if (p.resolver) est.resolver(S(p.id), true)
      return hecho(F, p.resolver ? 'responde y resuelve' : 'responde', [c.ruta], c, c.texto.slice(0, 120), 'comentarios')
    }
    case 'resolver': {
      const c = est.resolver(S(p.id), p.reabrir ? false : true)
      return hecho(F, p.reabrir ? 'reabre comentario' : 'resuelve comentario', [c.ruta], c, undefined, 'comentarios')
    }
    case 'historial':
      return est.historial(p.ruta ? S(p.ruta) : undefined, Number(p.max) || 50)
    case 'buscar':
      return est.buscar(S(p.q), Number(p.max) || 40)
    case 'miniatura': {
      const r = est.norm(S(p.ruta))
      const f = await miniatura(r, { forzar: !!p.forzar, blender: !!p.blender, esperar: true })
      if (!f) throw new Error(`«${r}» no es un modelo 3D (las imágenes ya se ven tal cual)`)
      emitir({ tipo: 'miniatura', ruta: r })
      return { ruta: r, miniatura: f }
    }
    case 'miniaturas': {
      const desde = est.norm(S(p.ruta))
      const modelos = est.plano().filter((x) => x.clase === 'modelo' && (!desde || x.ruta === desde || x.ruta.startsWith(desde + '/')))
      const out: { ruta: string; miniatura?: string; error?: string }[] = []
      for (const x of modelos) {
        try {
          out.push({ ruta: x.ruta, miniatura: (await miniatura(x.ruta, { forzar: !!p.forzar, blender: !!p.blender, esperar: true }))! })
          emitir({ tipo: 'miniatura', ruta: x.ruta })
        } catch (e) {
          out.push({ ruta: x.ruta, error: (e as Error).message })
        }
      }
      return out
    }
    case 'conectores':
      return conectores(est.proyectoActual())
    case 'unity-enlazar':
      return enlazarUnity(p.quitar ? null : S(p.carpeta), F)
    case 'unity': {
      const args = lista(p.args)
      const r = await ordenUnity(est.proyectoActual()!, args)
      est.registrar({ autor: F.autor, usuario: leerAjustes().autor, origen: 'ia', canal: F.canal, equipo: hostname(), accion: 'orden Unity', ruta: '', detalle: `buho-unity ${args.join(' ')} → ${r.codigo}` })
      return r
    }
    case 'blender-abrir':
      return abrirEnBlender(est.abs(S(p.ruta)))
    case 'mostrar': {
      const r = est.norm(S(p.ruta))
      if (r) est.entrada(r)
      emitir({ tipo: 'abrir', ruta: r })
      if (win?.isMinimized()) win.restore()
      win?.focus()
      return { ok: true, ruta: r }
    }
  }
  throw new Error(`Método desconocido: ${m}`)
}

// En pruebas (BUHO_E2E) se permite una segunda instancia para no cerrar la app que esté abierta
if (!process.env.BUHO_E2E && !app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
  app.whenReady().then(() => {
    app.setAppUserModelId('es.buhoai.gamestudio')
    // estudio://f/<ruta> = archivo del proyecto; estudio://mini/<ruta> = miniatura en caché de un modelo
    protocol.handle('estudio', async (req) => {
      const u = new URL(req.url)
      const ruta = decodeURIComponent(u.pathname.replace(/^\/+/, ''))
      try {
        const f = u.hostname === 'mini' ? est.rutaMiniatura(ruta) : est.abs(ruta)
        if (!existsSync(f)) return new Response('No existe', { status: 404 })
        const r = await net.fetch(pathToFileURL(f).toString(), { headers: req.headers })
        // three.js carga los modelos con fetch desde file://: hace falta permitir el origen
        const h = new Headers(r.headers)
        h.set('access-control-allow-origin', '*')
        return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h })
      } catch {
        return new Response('No existe', { status: 404 })
      }
    })
    Menu.setApplicationMenu(null)
    registerIpc()
    createWindow()
    const dir = process.env.BUHO_PROYECTO || leerAjustes().ultimo
    if (dir && existsSync(dir)) {
      try {
        abrirProyecto(dir)
      } catch {
        /* se elige en la portada */
      }
    }
    if (!process.env.BUHO_NO_API) startApi(apiCall)
    if (app.isPackaged && !process.env.BUHO_E2E) syncAgentSkills(join(dirname(process.execPath), 'SKILL.md'), VERSION)
  })
  app.on('window-all-closed', () => {
    vigilante?.close()
    if (sondeo) clearInterval(sondeo)
    stopApi()
    app.quit()
  })
}

export type { Evento }
