#!/usr/bin/env node
/**
 * buho-studio · CLI de Búho Game Studio para agentes de IA (Claude, Codex, Copilot, scripts…) y personas.
 * Habla con la API local de la app (<userData>/api.json trae URL y token). Si la app está cerrada, la abre.
 * Las rutas son relativas a la carpeta del proyecto abierto («Contexto/Lore.md», «Assets/Sonidos»); "" o / es la raíz.
 * Donde va una ruta también vale una ID («a-3f9c21b0» archivo, «c-…» carpeta, «t-…» tarea): la ID no cambia al
 * mover o renombrar, y es lo que copia la persona en la app (clic derecho → Copiar ID) para pedirte algo.
 * Todo lo que hace queda firmado en el historial con --autor (o BUHO_AUTOR; por defecto «IA»).
 * Guía completa para agentes: `buho-studio skill`.
 *
 * Proyectos
 *   buho-studio estado                                   proyecto abierto, recuentos, API
 *   buho-studio proyectos                                recientes
 *   buho-studio abrir <carpeta>                          abre (o adopta) una carpeta como proyecto
 *   buho-studio nuevo <carpeta> [--nombre "Mi juego"] [--sin-plantilla] [--unity <carpeta Unity>]
 *   buho-studio cerrar
 *
 * Mirar
 *   buho-studio id <id|ruta>                             qué es una ID (ruta, ficha, estado; busca también en otros proyectos)
 *   buho-studio arbol [<ruta>] [--profundidad N]          árbol con IDs, estados (●) y comentarios pendientes (✉)
 *   buho-studio ls [<ruta>]                              lo que hay dentro de una carpeta
 *   buho-studio leer <ruta>                              texto de una nota o archivo de texto
 *   buho-studio buscar "texto" [--max 40]                por nombre y dentro de notas/textos
 *
 * Escribir (se ve al momento en la app)
 *   buho-studio nota <carpeta> "Título" [--text "…" | --text - | --file x.md]
 *   buho-studio escribir <ruta> [--text "…" | --text - | --file x.md] [--anadir]
 *   buho-studio carpeta <padre> "Nombre"
 *   buho-studio anadir <carpeta destino> <archivo|carpeta> [más…] [--nombre "…"] [--descripcion "…"]
 *                                                        COPIA archivos de fuera (no mueve el original)
 *   buho-studio mover <ruta> <carpeta destino>
 *   buho-studio renombrar <ruta> "Nombre nuevo"
 *   buho-studio borrar <ruta>                            a la papelera de Windows
 *
 * Equipo
 *   buho-studio estado-de <ruta> [<ruta>…] <idea|en-curso|revisar|aprobado|ninguno>
 *   buho-studio estados [--estado revisar]
 *   buho-studio ficha <ruta> [--nombre "Ray Gun Búho"] [--descripcion "…" | --file d.md]   nombre y descripción
 *   buho-studio fichas [<carpeta>] [--faltan]            fichas puestas, o assets a los que les falta nombre o descripción
 *   buho-studio comentarios [<ruta>] [--pendientes]      hilos con sus respuestas
 *   buho-studio comentar <ruta> "texto"
 *   buho-studio responder <id> "texto" [--resolver]
 *   buho-studio resolver <id> [--reabrir]
 *   buho-studio historial [<ruta>] [--max 50]            quién hizo qué (persona, IA o cambio externo)
 *
 * Tareas (un .md por tarea en Tareas/, Kanban en la app)
 *   buho-studio tareas [--estado por-hacer|en-curso|revisar|hecha] [--asignada Claude]
 *   buho-studio tarea nueva "Título" [--descripcion "…" | --file d.md] [--prioridad alta|media|baja] [--asignada X]
 *                           [--enlaces a-…,c-…] [--pasos "uno; dos; tres"] [--estado …]
 *   buho-studio tarea ver <id>
 *   buho-studio tarea mover <id> <por-hacer|en-curso|revisar|hecha>
 *   buho-studio tarea editar <id> [--titulo] [--descripcion] [--prioridad] [--asignada] [--enlaces]
 *   buho-studio tarea paso <id> <n> [--pendiente]        marca (o desmarca) el paso n
 *   buho-studio tarea paso <id> --nuevo "texto"          añade un paso
 *
 * Bugs (tareas con tipo: bug en Tareas/Bugs/, vista propia con histórico en la app)
 *   buho-studio bugs [--abiertos | --estado …] [--gravedad grave] [--build v0.3]   lista y resumen
 *   buho-studio bug nuevo "El build se cierra al salir" --gravedad bloqueante|grave|menor|cosmetico [--build v0.3]
 *                         [--reproducir "Abrir; Jugar; Salir"] [--pasa "…"] [--deberia "…"] [--reproduce si|a-veces|no]
 *                         [--asignada Claude] [--enlaces a-…]
 *   buho-studio bug ver|mover|editar|paso <id> …         como «tarea» (mover a hecha lo cierra; sacarlo, lo reabre)
 *
 * Ayuda
 *   buho-studio ayuda [tema]                             la misma ayuda que la app (temas: buho-studio ayuda)
 *
 * Assets 3D y conectores
 *   buho-studio miniatura <ruta> [--forzar] [--blender]  .glb/.fbx/.obj/.stl con three.js en la app; .blend con buho-blender
 *   buho-studio miniaturas [<carpeta>] [--forzar]        todas las de una carpeta
 *   buho-studio blender <ruta>                           abre el modelo en Blender (buho-blender)
 *   buho-studio conectores                               Blender, Unity y ComfyUI (previsto)
 *   buho-studio unity enlazar <carpeta del proyecto de Unity> | unity desenlazar
 *   buho-studio unity -- <orden de buho-unity…>          la lanza sobre el proyecto de Unity enlazado
 *   buho-studio mostrar <ruta>                           la app enseña ese archivo o carpeta
 *   buho-studio skill                                    guía completa para agentes
 *
 * Opciones globales: --json, --autor "Claude", --no-launch (no abrir la app si está cerrada).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const dataDir = process.env.BUHO_DATA_DIR || join(process.env.APPDATA || join(process.env.HOME || '', '.config'), 'BuhoGameStudio')

function die(msg, code = 1) {
  process.stderr.write(msg + '\n')
  process.exit(code)
}

// «unity -- args…»: lo que va detrás de -- pasa tal cual
const argv = process.argv.slice(2)
const corte = argv.indexOf('--')
const tras = corte >= 0 ? argv.slice(corte + 1) : []
function parseArgs(a) {
  const pos = []
  const opt = {}
  for (let i = 0; i < a.length; i++) {
    const x = a[i]
    if (x.startsWith('--') && x.length > 2) {
      const k = x.slice(2)
      const next = a[i + 1]
      opt[k] = next === undefined || (next.startsWith('--') && next !== '-') ? true : a[++i]
    } else pos.push(x)
  }
  return { pos, opt }
}
const { pos, opt } = parseArgs(corte >= 0 ? argv.slice(0, corte) : argv)
const [cmd, ...args] = pos
const autor = typeof opt.autor === 'string' ? opt.autor : process.env.BUHO_AUTOR

const readInfo = () => {
  try {
    return JSON.parse(readFileSync(join(dataDir, 'api.json'), 'utf8'))
  } catch {
    return null
  }
}
const skillPath = () => [join(here, 'SKILL.md'), join(here, '..', 'SKILL.md'), join(here, '..', 'skills', 'buho-studio', 'SKILL.md')].find((p) => existsSync(p))

/** La app: instalada, junto al CLI, o el repo en desarrollo (electron + out/main). */
function lanzador() {
  const local = process.env.LOCALAPPDATA || ''
  const exe = [join(here, '..', 'BuhoGameStudio.exe'), join(local, 'Programs', 'BuhoGameStudio', 'BuhoGameStudio.exe')].find((p) => existsSync(p))
  if (exe) return { cmd: exe, args: [] }
  const repo = process.env.BUHO_STUDIO_REPO || join(here, '..')
  const electron = join(repo, 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron')
  if (existsSync(electron) && existsSync(join(repo, 'out', 'main', 'index.js'))) return { cmd: electron, args: [repo] }
  return null
}

async function alive(info) {
  if (!info) return false
  try {
    return (await fetch(info.url + '/v1/estado', { headers: { authorization: `Bearer ${info.token}` } })).ok
  } catch {
    return false
  }
}

async function connect() {
  let info = readInfo()
  if (await alive(info)) return info
  const l = opt['no-launch'] || process.env.BUHO_NO_LAUNCH ? null : lanzador()
  if (!l) die('Búho Game Studio no está abierta. Ábrela (o instala la app) y vuelve a intentarlo.', 2)
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  spawn(l.cmd, l.args, { detached: true, stdio: 'ignore', env }).unref()
  process.stderr.write('Abriendo Búho Game Studio…\n')
  for (let i = 0; i < 100; i++) {
    await new Promise((r) => setTimeout(r, 250))
    info = readInfo()
    if (await alive(info)) return info
  }
  die('He abierto Búho Game Studio pero no responde. Prueba de nuevo en unos segundos.', 2)
}

let conn = null
async function call(method, body = {}) {
  // Rápido: se llama directamente con lo que diga api.json; solo si no contesta se comprueba y se abre la app
  conn ??= readInfo()
  const pedir = () =>
    fetch(`${conn.url}/v1/${method}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${conn.token}`, 'content-type': 'application/json', 'x-buho-canal': 'cli' },
      body: JSON.stringify({ ...body, ...(autor ? { autor } : {}) })
    })
  let res
  try {
    if (!conn) throw new Error('sin api.json')
    res = await pedir()
    if (res.status === 401) throw new Error('token viejo')
  } catch {
    conn = await connect()
    try {
      res = await pedir()
    } catch {
      die('No puedo conectar con Búho Game Studio. ¿Está abierta?', 2)
    }
  }
  const data = await res.json()
  if (!res.ok) die(`Error: ${data.error ?? res.status}`)
  return data
}

const print = (s) => process.stdout.write(s + '\n')
const out = (o) => process.stdout.write(JSON.stringify(o, null, opt.json ? 0 : 2) + '\n')
const necesita = (n, uso) => {
  if (args.length < n) die(`Uso: buho-studio ${uso}`)
}
/** --nombre y --descripcion (también --titulo). '' borra el campo. */
const ficha = () => {
  const c = {}
  const n = opt.nombre ?? opt.titulo
  if (n !== undefined) c.titulo = n === true ? '' : String(n)
  if (opt.descripcion !== undefined) c.descripcion = opt.descripcion === true ? '' : String(opt.descripcion).replace(/\\n/g, '\n')
  return c
}
const rutaDe = (r) => (r === undefined || r === '/' || r === '.' ? '' : r)

async function leerTexto() {
  if (typeof opt.file === 'string') return readFileSync(resolve(opt.file), 'utf8')
  if (opt.text === '-' || opt.text === true) {
    const chunks = []
    for await (const c of process.stdin) chunks.push(c)
    return Buffer.concat(chunks).toString('utf8')
  }
  if (typeof opt.text === 'string') return opt.text.replace(/\\n/g, '\n')
  return undefined
}

const MARCA = { idea: '◇', 'en-curso': '◐', revisar: '●', aprobado: '✔' }
const ICO = { carpeta: '▸', nota: '✎', imagen: '▣', modelo: '◆', audio: '♪', video: '▶', texto: '≡', otro: '·' }
function pintar(ns, nivel, max) {
  for (const n of ns) {
    const extra = `${n.estado ? `  ${MARCA[n.estado]} ${n.estado}` : ''}${n.pendientes ? `  ✉${n.pendientes}` : ''}`
    print(`${'  '.repeat(nivel)}${ICO[n.clase] ?? '·'} ${n.nombre}${n.clase === 'carpeta' ? '/' : ''}${n.titulo ? `  «${n.titulo}»` : ''}${extra}${n.id ? `  [${n.id}]` : ''}`)
    if (n.hijos && nivel + 1 < max) pintar(n.hijos, nivel + 1, max)
  }
}
const fecha = (iso) => String(iso).slice(0, 16).replace('T', ' ')
const PRI = { alta: '▲', media: '■', baja: '▽' }
function pintarTarea(t, completa = false) {
  const avance = t.pasos.length ? `  ${t.hechos}/${t.pasos.length}` : ''
  print(`  ${PRI[t.prioridad] ?? '·'} ${t.id}  ${t.titulo}${t.asignada ? `  @${t.asignada}` : ''}${avance}${t.pendientes ? `  ✉${t.pendientes}` : ''}`)
  if (!completa) return
  print(`     ${t.tipo === 'bug' ? `BUG ${t.gravedad} · ` : ''}${t.estado} · prioridad ${t.prioridad}${t.build ? ` · build ${t.build}` : ''}${t.reproduce ? ` · se reproduce: ${t.reproduce}` : ''} · ${t.ruta}`)
  if (t.cerrada) print(`     Cerrada ${String(t.cerrada).slice(0, 10)}${t.reabierta ? ` · reabierta ${t.reabierta} veces` : ''}`)
  if (t.enlaces.length) print(`     Enlaces: ${t.enlaces.join(', ')}`)
  if (t.descripcion) print('\n' + t.descripcion.split('\n').map((l) => '     ' + l).join('\n'))
  if (t.pasos.length) {
    print('\n     Pasos:')
    t.pasos.forEach((p, i) => print(`     ${i + 1}. [${p.hecho ? 'x' : ' '}] ${p.texto}`))
  }
}
function pintarComentarios(cs) {
  const raices = cs.filter((c) => !c.respuestaA)
  if (!raices.length) return print('Sin comentarios.')
  for (const r of raices) {
    print(`${r.id}  ${r.resuelto ? '[resuelto] ' : ''}${r.ruta}`)
    print(`   ${r.origen === 'ia' ? '🤖' : '👤'} ${r.autor} · ${fecha(r.fecha)}: ${r.texto}`)
    for (const x of cs.filter((c) => c.respuestaA === r.id)) print(`   ↳ ${x.origen === 'ia' ? '🤖' : '👤'} ${x.autor} · ${fecha(x.fecha)}: ${x.texto}`)
  }
}

async function main() {
  switch (cmd) {
    case undefined:
    case 'help':
    case '-h':
    case '--help': {
      const src = readFileSync(fileURLToPath(import.meta.url), 'utf8')
      print(/\/\*\*([\s\S]*?)\*\//.exec(src)[1].replace(/^ \* ?/gm, '').trim())
      return
    }
    case 'skill': {
      const p = skillPath()
      if (!p) die('No encuentro SKILL.md')
      process.stdout.write(readFileSync(p, 'utf8'))
      return
    }
    case 'estado': {
      const r = await call('estado')
      if (opt.json) return out(r)
      if (!r.proyecto) return print(`Búho Game Studio ${r.version} · sin proyecto abierto · API ${r.api}`)
      print(`${r.proyecto.nombre}  (${r.proyecto.raiz})`)
      print(`${r.archivos} archivos en ${r.carpetas} carpetas: ${r.notas} notas, ${r.modelos} modelos, ${r.imagenes} imágenes, ${r.audios} audios · ${r.pendientes} comentarios pendientes`)
      if (r.proyecto.enlaces?.unity) print(`Unity: ${r.proyecto.enlaces.unity}`)
      print(`Búho Game Studio ${r.version} · API ${r.api}`)
      return
    }
    case 'proyectos': {
      const r = await call('proyectos')
      if (opt.json) return out(r)
      if (!r.length) return print('Sin proyectos recientes.')
      for (const p of r) print(`${p.abierto_ahora ? '▶' : ' '} ${p.nombre}  ${p.raiz}${p.existe ? '' : '  (ya no existe)'}`)
      return
    }
    case 'abrir':
      necesita(1, 'abrir <carpeta>')
      return out(await call('abrir', { carpeta: resolve(args[0]) }))
    case 'nuevo':
      necesita(1, 'nuevo <carpeta> [--nombre "…"] [--sin-plantilla] [--unity <carpeta>]')
      return out(await call('nuevo', { carpeta: resolve(args[0]), nombre: typeof opt.nombre === 'string' ? opt.nombre : undefined, plantilla: !opt['sin-plantilla'], unity: typeof opt.unity === 'string' ? resolve(opt.unity) : undefined }))
    case 'cerrar':
      return out(await call('cerrar'))
    case 'arbol': {
      const r = await call('arbol', { ruta: rutaDe(args[0]) })
      if (opt.json) return out(r)
      return pintar(r, 0, Number(opt.profundidad) || 99)
    }
    case 'ls': {
      const r = await call('ls', { ruta: rutaDe(args[0]) })
      if (opt.json) return out(r.map(({ hijos, ...x }) => ({ ...x, ...(hijos ? { elementos: hijos.length } : {}) })))
      return pintar(r, 0, 1)
    }
    case 'leer': {
      necesita(1, 'leer <ruta>')
      const r = await call('leer', { ruta: args[0] })
      return opt.json ? out(r) : process.stdout.write(r.texto)
    }
    case 'buscar': {
      necesita(1, 'buscar "texto"')
      const r = await call('buscar', { q: args.join(' '), max: opt.max })
      if (opt.json) return out(r)
      for (const x of r) print(`${ICO[x.clase] ?? '·'} ${x.ruta}${x.fragmento ? `\n    …${x.fragmento}…` : ''}`)
      if (!r.length) print('Nada.')
      return
    }
    case 'nota': {
      necesita(2, 'nota <carpeta> "Título" [--text "…" | --file x.md]')
      return out(await call('nota', { carpeta: rutaDe(args[0]), titulo: args.slice(1).join(' '), texto: await leerTexto() }))
    }
    case 'escribir': {
      necesita(1, 'escribir <ruta> --text "…" | --file x.md [--anadir]')
      const texto = await leerTexto()
      if (texto === undefined) die('Falta --text o --file')
      return out(await call('escribir', { ruta: args[0], texto, anadir: !!opt.anadir }))
    }
    case 'carpeta':
      necesita(2, 'carpeta <padre> "Nombre"')
      return out(await call('carpeta', { padre: rutaDe(args[0]), nombre: args.slice(1).join(' ') }))
    case 'anadir':
    case 'añadir':
      necesita(2, 'anadir <carpeta destino> <archivo> [más…]')
      return out(
        await call('anadir', {
          destino: rutaDe(args[0]),
          archivos: args.slice(1).map((a) => resolve(a)),
          origen: typeof opt.origen === 'string' ? opt.origen : undefined,
          ...ficha()
        })
      )
    case 'mover':
      necesita(2, 'mover <ruta> <carpeta destino>')
      return out(await call('mover', { ruta: args[0], destino: rutaDe(args[1]) }))
    case 'renombrar':
      necesita(2, 'renombrar <ruta> "Nombre nuevo"')
      return out(await call('renombrar', { ruta: args[0], nombre: args.slice(1).join(' ') }))
    case 'borrar':
      necesita(1, 'borrar <ruta>')
      return out(await call('borrar', { ruta: args[0] }))
    case 'estado-de': {
      necesita(2, 'estado-de <ruta> [<ruta>…] <idea|en-curso|revisar|aprobado|ninguno>')
      const estado = args[args.length - 1]
      const r = await call('estado-poner', { rutas: args.slice(0, -1), estado: estado === 'ninguno' ? null : estado })
      if (opt.json) return out(r)
      for (const x of r) print(`${x.ruta}: ${x.estado ?? 'sin estado'}`)
      return
    }
    case 'ficha': {
      necesita(1, 'ficha <ruta> [--nombre "…"] [--descripcion "…" | --file d.md]')
      const c = ficha()
      if (typeof opt.file === 'string') c.descripcion = readFileSync(resolve(opt.file), 'utf8').trim()
      const r = await call('ficha', { ruta: rutaDe(args[0]), ...c })
      if (opt.json) return out(r)
      print(r.ruta || '/')
      print(`  Nombre:       ${r.titulo ?? '(sin nombre)'}`)
      print(`  Descripción:  ${r.descripcion ?? '(sin descripción)'}`)
      return
    }
    case 'fichas': {
      const r = await call('fichas', { ruta: args[0] ? rutaDe(args[0]) : undefined, faltan: !!opt.faltan })
      if (opt.json) return out(r)
      if (!r.length) return print(opt.faltan ? 'Todos los assets tienen nombre y descripción.' : 'Ningún asset tiene ficha aún.')
      for (const x of r) {
        print(`${x.ruta}`)
        print(`   ${x.titulo ?? '(sin nombre)'}${x.descripcion ? ` · ${x.descripcion}` : '  · (sin descripción)'}`)
      }
      return
    }
    case 'id': {
      necesita(1, 'id <id|ruta>')
      const r = await call('id', { q: args.join(' ') })
      if (opt.json) return out(r)
      print(`${r.id}  ${r.ruta || '/'}${r.abierto ? '' : '   (en otro proyecto)'}`)
      if (r.titulo) print(`  Nombre:       ${r.titulo}`)
      if (r.descripcion) print(`  Descripción:  ${r.descripcion}`)
      if (r.clase) print(`  Tipo:         ${r.clase}${r.elementos !== undefined ? ` (${r.elementos} elementos)` : ''}`)
      if (r.estado) print(`  Estado:       ${r.estado}`)
      if (r.pendientes) print(`  Comentarios:  ${r.pendientes} sin resolver`)
      if (r.tarea) print(`  Tarea:        ${r.tarea.estado} · ${r.tarea.prioridad}${r.tarea.asignada ? ` · ${r.tarea.asignada}` : ''} · ${r.tarea.hechos}/${r.tarea.pasos.length} pasos`)
      print(`  Proyecto:     ${r.proyecto}`)
      if (r.aviso) print(`  ${r.aviso}`)
      return
    }
    case 'tareas': {
      const r = await call('tareas', { estado: opt.estado, asignada: opt.asignada })
      if (opt.json) return out(r)
      if (!r.length) return print('No hay tareas. Crea una con «buho-studio tarea nueva "Título"».')
      for (const col of ['por-hacer', 'en-curso', 'revisar', 'hecha']) {
        const xs = r.filter((t) => t.estado === col)
        if (!xs.length) continue
        print(`\n${col.toUpperCase()} (${xs.length})`)
        for (const t of xs) pintarTarea(t)
      }
      return
    }
    case 'bugs': {
      const r = await call('tareas', { tipo: 'bug', estado: opt.estado, asignada: opt.asignada })
      const xs = r.filter((t) => (!opt.abiertos || t.estado !== 'hecha') && (!opt.gravedad || t.gravedad === opt.gravedad) && (!opt.build || t.build === opt.build))
      if (opt.json) return out(xs)
      const abiertos = r.filter((t) => t.estado !== 'hecha')
      const dias = (a, b) => (new Date(b) - new Date(a)) / 864e5
      const cerrados = r.filter((t) => t.cerrada && t.creada)
      const medio = cerrados.length ? cerrados.reduce((s, t) => s + dias(t.creada, t.cerrada), 0) / cerrados.length : null
      print(`Bugs: ${abiertos.length} abiertos (${['bloqueante', 'grave', 'menor', 'cosmetico'].map((g) => `${abiertos.filter((t) => t.gravedad === g).length} ${g}`).join(', ')}) · ${r.length - abiertos.length} cerrados${medio !== null ? ` · arreglo medio ${medio.toFixed(1)} días` : ''}`)
      if (!xs.length) return print('Ninguno con ese filtro.')
      const G = { bloqueante: '‼', grave: '!', menor: '·', cosmetico: '∘' }
      for (const t of xs) print(`  ${G[t.gravedad] ?? '·'} ${t.id}  ${t.titulo}  [${t.estado}${t.build ? ` · ${t.build}` : ''}${t.asignada ? ` · @${t.asignada}` : ''}]${t.reabierta ? `  reabierto ×${t.reabierta}` : ''}`)
      return
    }
    case 'bug':
    case 'tarea': {
      const esBug = cmd === 'bug'
      const sub = args[0]
      const id = args[1]
      const texto = async () => (typeof opt.file === 'string' ? readFileSync(resolve(opt.file), 'utf8') : typeof opt.descripcion === 'string' ? opt.descripcion.replace(/\\n/g, '\n') : undefined)
      const comunes = async () => ({
        titulo: typeof opt.titulo === 'string' ? opt.titulo : undefined,
        descripcion: await texto(),
        prioridad: opt.prioridad,
        asignada: opt.asignada === true ? '' : opt.asignada,
        enlaces: typeof opt.enlaces === 'string' ? opt.enlaces : opt.enlaces === true ? '' : undefined,
        pasos: typeof opt.pasos === 'string' ? opt.pasos : undefined,
        estado: opt.estado,
        gravedad: opt.gravedad,
        build: opt.build === true ? '' : opt.build,
        reproduce: opt.reproduce,
        reproducir: typeof opt.reproducir === 'string' ? opt.reproducir : undefined,
        pasa: typeof opt.pasa === 'string' ? opt.pasa : undefined,
        deberia: typeof opt.deberia === 'string' ? opt.deberia : undefined
      })
      const mostrar = (t) => {
        if (opt.json) return out(t)
        pintarTarea(t, true)
      }
      if (sub === 'nueva' || sub === 'nuevo') {
        if (args.length < 2) die('Uso: buho-studio tarea nueva "Título" [--descripcion "…"] [--prioridad alta|media|baja] [--asignada X] [--enlaces a-…,c-…] [--pasos "uno; dos"]')
        return mostrar(await call('tarea-nueva', { ...(await comunes()), titulo: args.slice(1).join(' '), carpeta: opt.carpeta, ...(esBug ? { tipo: 'bug' } : {}) }))
      }
      if (sub === 'ver') {
        necesita(2, 'tarea ver <id>')
        return mostrar(await call('tarea', { id }))
      }
      if (sub === 'mover') {
        necesita(3, 'tarea mover <id> <por-hacer|en-curso|revisar|hecha>')
        return mostrar(await call('tarea-editar', { id, estado: args[2] }))
      }
      if (sub === 'editar') {
        necesita(2, 'tarea editar <id> [--titulo] [--descripcion] [--prioridad] [--asignada] [--enlaces]')
        return mostrar(await call('tarea-editar', { id, ...(await comunes()) }))
      }
      if (sub === 'paso') {
        necesita(2, 'tarea paso <id> <n> [--pendiente] | tarea paso <id> --nuevo "texto"')
        if (typeof opt.nuevo === 'string') return mostrar(await call('tarea-paso', { id, nuevo: opt.nuevo }))
        if (!args[2]) die('Falta el número del paso (o --nuevo "texto")')
        return mostrar(await call('tarea-paso', { id, n: Number(args[2]), hecho: !opt.pendiente }))
      }
      die('Uso: buho-studio tarea nueva|ver|mover|editar|paso …  (mira «buho-studio ayuda tareas»)')
    }
    case 'ayuda': {
      const dir = [join(here, 'ayuda'), join(here, '..', 'docs', 'ayuda')].find((d) => existsSync(d))
      if (!dir) die('No encuentro la ayuda (docs/ayuda).')
      const paginas = readdirSync(dir)
        .filter((f) => f.endsWith('.md'))
        .sort()
        .map((f) => {
          const txt = readFileSync(join(dir, f), 'utf8').replace(/^---[\s\S]*?---\r?\n/, '')
          return { id: f.replace(/\.md$/, '').replace(/^\d+-/, ''), titulo: /^#\s+(.+)$/m.exec(txt)?.[1] ?? f, txt }
        })
      if (!args[0]) {
        print('Órdenes del CLI: buho-studio help · guía para agentes: buho-studio skill\n')
        print('Temas de ayuda (buho-studio ayuda <tema>):')
        for (const x of paginas) print(`  ${x.id.padEnd(22)} ${x.titulo}`)
        return
      }
      const q = args.join(' ').toLowerCase()
      const x = paginas.find((y) => y.id === q) ?? paginas.find((y) => y.id.includes(q) || y.titulo.toLowerCase().includes(q))
      if (!x) die(`No hay ningún tema «${q}». Mira «buho-studio ayuda».`)
      return process.stdout.write(x.txt)
    }
    case 'estados': {
      const r = await call('estados', { estado: opt.estado })
      if (opt.json) return out(r)
      for (const x of r) print(`${MARCA[x.estado]} ${x.estado.padEnd(9)} ${x.ruta}  (${x.autor}, ${fecha(x.fecha)})`)
      if (!r.length) print('Nada con estado.')
      return
    }
    case 'comentarios': {
      const r = await call('comentarios', { ruta: args[0] ? rutaDe(args[0]) : undefined, pendientes: !!opt.pendientes })
      return opt.json ? out(r) : pintarComentarios(r)
    }
    case 'comentar':
      necesita(2, 'comentar <ruta> "texto"')
      return out(await call('comentar', { ruta: rutaDe(args[0]), texto: args.slice(1).join(' ') }))
    case 'responder':
      necesita(2, 'responder <id> "texto" [--resolver]')
      return out(await call('responder', { id: args[0], texto: args.slice(1).join(' '), resolver: !!opt.resolver }))
    case 'resolver':
      necesita(1, 'resolver <id> [--reabrir]')
      return out(await call('resolver', { id: args[0], reabrir: !!opt.reabrir }))
    case 'historial': {
      const r = await call('historial', { ruta: args[0] ? rutaDe(args[0]) : undefined, max: opt.max })
      if (opt.json) return out(r)
      for (const h of r) print(`${fecha(h.fecha)}  ${h.origen === 'ia' ? '🤖' : h.origen === 'externo' ? '📁' : '👤'} ${h.autor} [${h.canal}] ${h.accion} ${h.ruta || '/'}${h.detalle ? `  (${h.detalle})` : ''}`)
      if (!r.length) print('Sin historial.')
      return
    }
    case 'miniatura':
      necesita(1, 'miniatura <ruta> [--forzar] [--blender]')
      return out(await call('miniatura', { ruta: args[0], forzar: !!opt.forzar, blender: !!opt.blender }))
    case 'miniaturas':
      return out(await call('miniaturas', { ruta: rutaDe(args[0]), forzar: !!opt.forzar, blender: !!opt.blender }))
    case 'blender':
      necesita(1, 'blender <ruta>')
      return out(await call('blender-abrir', { ruta: args[0] }))
    case 'conectores': {
      const r = await call('conectores')
      if (opt.json) return out(r)
      for (const c of r) print(`${c.disponible ? '✔' : '·'} ${c.nombre}\n    ${c.detalle}`)
      return
    }
    case 'unity': {
      if (args[0] === 'enlazar') {
        necesita(2, 'unity enlazar <carpeta del proyecto de Unity>')
        return out(await call('unity-enlazar', { carpeta: resolve(args[1]) }))
      }
      if (args[0] === 'desenlazar') return out(await call('unity-enlazar', { quitar: true }))
      const orden = tras.length ? tras : args
      if (!orden.length) {
        const r = await call('conectores')
        return print(r.find((c) => c.id === 'unity').detalle)
      }
      const r = await call('unity', { args: orden })
      process.stdout.write(r.salida)
      if (r.error) process.stderr.write(r.error)
      process.exit(r.codigo === 0 ? 0 : 1)
    }
    case 'mostrar':
      return out(await call('mostrar', { ruta: rutaDe(args[0]) }))
  }
  die(`Orden desconocida: ${cmd}. Mira «buho-studio ayuda».`)
}

main().catch((e) => die(String(e?.message ?? e)))
