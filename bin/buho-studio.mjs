#!/usr/bin/env node
/**
 * buho-studio · CLI de Búho Game Studio para agentes de IA (Claude, Codex, Copilot, scripts…) y personas.
 * Habla con la API local de la app (<userData>/api.json trae URL y token). Si la app está cerrada, la abre.
 * Las rutas son relativas a la carpeta del proyecto abierto («Contexto/Lore.md», «Assets/Sonidos»); "" o / es la raíz.
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
 *   buho-studio arbol [<ruta>] [--profundidad N]          árbol con estados (●) y comentarios pendientes (✉)
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
import { existsSync, readFileSync } from 'node:fs'
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
  conn ??= await connect()
  let res
  try {
    res = await fetch(`${conn.url}/v1/${method}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${conn.token}`, 'content-type': 'application/json', 'x-buho-canal': 'cli' },
      body: JSON.stringify({ ...body, ...(autor ? { autor } : {}) })
    })
  } catch {
    die('No puedo conectar con Búho Game Studio. ¿Está abierta?', 2)
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
    print(`${'  '.repeat(nivel)}${ICO[n.clase] ?? '·'} ${n.nombre}${n.clase === 'carpeta' ? '/' : ''}${n.titulo ? `  «${n.titulo}»` : ''}${extra}`)
    if (n.hijos && nivel + 1 < max) pintar(n.hijos, nivel + 1, max)
  }
}
const fecha = (iso) => String(iso).slice(0, 16).replace('T', ' ')
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
    case 'ayuda':
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
