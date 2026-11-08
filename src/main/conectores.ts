import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { delimiter, extname, join } from 'node:path'
import type { Conector, Proyecto } from '@shared/types'

/**
 * Conectores opcionales. El estudio no depende de ningún motor ni programa: si están instalados, se usan.
 *
 * - buho-blender: miniaturas de .blend/.fbx/.obj y «Abrir en Blender».
 * - buho-unity:   enlazar el proyecto con su proyecto de Unity y lanzar sus órdenes (cuando exista el CLI).
 * - ComfyUI:      previsto para generar imágenes y texturas (solo se guarda la URL; sin implementar).
 */

/** Busca un CLI de Búho en el PATH y en su carpeta de instalación (%LOCALAPPDATA%\Programs\<App>\cli). */
export function buscarCli(nombre: string, carpetaApp: string[]): string | null {
  const exts = process.platform === 'win32' ? ['.cmd', '.exe', '.bat', ''] : ['']
  const dirs = (process.env.PATH ?? process.env.Path ?? '').split(delimiter).filter(Boolean)
  const local = process.env.LOCALAPPDATA ?? ''
  for (const c of carpetaApp) dirs.push(join(local, 'Programs', c, 'cli'))
  // El PATH heredado puede ser viejo (terminal abierta antes de instalar): por eso también la carpeta de instalación
  for (const d of dirs) for (const e of exts) if (existsSync(join(d, nombre + e))) return join(d, nombre + e)
  return null
}

const blenderCli = (): string | null => process.env.BUHO_BLENDER_CLI || buscarCli('buho-blender', ['BuhoBlender'])
const unityCli = (): string | null => process.env.BUHO_UNITY_CLI || buscarCli('buho-unity', ['BuhoUnity', 'BuhoAI-Unity-CLI'])

/** Lanza un CLI (.cmd en Windows necesita cmd.exe) y devuelve su salida. */
export function ejecutar(cli: string, args: string[], opts: { cwd?: string; timeout?: number; env?: NodeJS.ProcessEnv } = {}): Promise<{ codigo: number; salida: string; error: string }> {
  return new Promise((ok) => {
    const esCmd = /\.(cmd|bat)$/i.test(cli)
    const env = { ...process.env, ...opts.env }
    delete env.ELECTRON_RUN_AS_NODE
    const p = esCmd
      ? spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `"${[cli, ...args].map((a) => (/[\s&()^|<>"]/.test(a) ? `"${a.replace(/"/g, '""')}"` : a)).join(' ')}"`], { cwd: opts.cwd, env, windowsVerbatimArguments: true, windowsHide: true })
      : spawn(cli, args, { cwd: opts.cwd, env, windowsHide: true })
    let salida = ''
    let error = ''
    p.stdout.on('data', (d) => (salida += d))
    p.stderr.on('data', (d) => (error += d))
    const t = setTimeout(() => p.kill(), opts.timeout ?? 180_000)
    p.on('error', (e) => {
      clearTimeout(t)
      ok({ codigo: -1, salida, error: String(e) })
    })
    p.on('close', (c) => {
      clearTimeout(t)
      ok({ codigo: c ?? -1, salida, error })
    })
  })
}

/** Formatos que Blender puede abrir para hacer la miniatura. */
export const DE_BLENDER = ['.blend', '.fbx', '.obj', '.glb', '.gltf', '.stl', '.ply', '.dae', '.usd', '.usdz']

/**
 * Miniatura de un modelo con `buho-blender captura … --fondo` (sin tocar el Blender abierto).
 * .blend se fotografía directamente; el resto se importa antes en una escena vacía temporal.
 */
export async function miniaturaBlender(archivo: string, salida: string, tmpDir: string): Promise<void> {
  const cli = blenderCli()
  if (!cli) throw new Error('No encuentro buho-blender. Instala Búho Blender CLI para las miniaturas de .blend y .fbx.')
  const ext = extname(archivo).toLowerCase()
  let blend = archivo
  if (ext !== '.blend') {
    blend = join(tmpDir, `mini-${Date.now()}.blend`)
    let r = await ejecutar(cli, ['nuevo', blend, '--vacia', '--fondo'])
    if (r.codigo !== 0) throw new Error('buho-blender nuevo: ' + (r.error || r.salida).slice(-400))
    r = await ejecutar(cli, ['importar', archivo, '--fondo', '--archivo', blend, '--guardar', blend], { timeout: 300_000 })
    if (r.codigo !== 0) throw new Error('buho-blender importar: ' + (r.error || r.salida).slice(-400))
  }
  const r = await ejecutar(cli, ['captura', salida, '--fondo', '--archivo', blend, '--vista', 'tres_cuartos', '--ancho', '512', '--alto', '512'], { timeout: 300_000 })
  if (r.codigo !== 0 || !existsSync(salida)) throw new Error('buho-blender captura: ' + (r.error || r.salida).slice(-400))
}

export async function abrirEnBlender(archivo: string): Promise<{ ok: boolean; error?: string }> {
  const cli = blenderCli()
  if (!cli) return { ok: false, error: 'No encuentro buho-blender' }
  const ext = extname(archivo).toLowerCase()
  // .blend se abre tal cual; el resto se importa en el Blender abierto (o en uno nuevo)
  const r = ext === '.blend' ? await ejecutar(cli, ['abrir', archivo], { timeout: 60_000 }) : await ejecutar(cli, ['importar', archivo], { timeout: 120_000 })
  if (r.codigo !== 0 && ext !== '.blend') {
    const a = await ejecutar(cli, ['abrir'], { timeout: 60_000 })
    if (a.codigo !== 0) return { ok: false, error: (a.error || a.salida).slice(-300) }
    const b = await ejecutar(cli, ['importar', archivo], { timeout: 120_000 })
    return b.codigo === 0 ? { ok: true } : { ok: false, error: (b.error || b.salida).slice(-300) }
  }
  return r.codigo === 0 ? { ok: true } : { ok: false, error: (r.error || r.salida).slice(-300) }
}

/** ¿Es una carpeta de proyecto de Unity? (tiene Assets/ y ProjectSettings/) */
export const esUnity = (dir: string): boolean => existsSync(join(dir, 'Assets')) && existsSync(join(dir, 'ProjectSettings'))

function versionUnity(dir: string): string | null {
  try {
    return /m_EditorVersion:\s*(\S+)/.exec(readFileSync(join(dir, 'ProjectSettings', 'ProjectVersion.txt'), 'utf8'))?.[1] ?? null
  } catch {
    return null
  }
}

/** Lanza una orden de buho-unity sobre el proyecto de Unity enlazado (cwd = esa carpeta y BUHO_UNITY_PROJECT = su ruta, que buho-unity entiende). */
export async function ordenUnity(p: Proyecto, args: string[]): Promise<{ codigo: number; salida: string; error: string }> {
  const dir = p.enlaces.unity
  if (!dir) throw new Error('Este proyecto no está enlazado con Unity. Usa «buho-studio unity enlazar <carpeta del proyecto de Unity>».')
  const cli = unityCli()
  if (!cli) throw new Error('buho-unity aún no está instalado. Cuando lo esté, «buho-studio unity <orden>» la lanzará sobre ' + dir)
  return ejecutar(cli, args, { cwd: dir, env: { BUHO_UNITY_PROJECT: dir }, timeout: 600_000 })
}

export function conectores(p: Proyecto | null): Conector[] {
  const b = blenderCli()
  const u = unityCli()
  const dir = p?.enlaces.unity
  const v = dir ? versionUnity(dir) : null
  return [
    { id: 'blender', nombre: 'Blender (buho-blender)', disponible: !!b, detalle: b ? `Miniaturas de .blend y .fbx, y «Abrir en Blender». CLI: ${b}` : 'No instalado: las miniaturas de .glb/.fbx/.obj se hacen igual dentro de la app; las de .blend necesitan buho-blender.' },
    {
      id: 'unity',
      nombre: 'Unity (buho-unity)',
      disponible: !!u && !!dir,
      enlace: dir,
      detalle: dir
        ? `Enlazado con ${dir}${v ? ` (Unity ${v})` : ''}${existsSync(dir) ? '' : ' — la carpeta ya no existe'}. ${u ? `CLI: ${u}` : 'El CLI buho-unity aún no está instalado: cuando exista, las órdenes se lanzan desde aquí.'}`
        : 'Sin enlazar. Opcional: enlaza la carpeta del proyecto de Unity para lanzar las órdenes de buho-unity.'
    },
    { id: 'comfyui', nombre: 'ComfyUI', disponible: false, enlace: p?.conectores?.comfyui?.url, detalle: 'Previsto: generar imágenes y texturas en Assets/ desde un flujo de ComfyUI. Aún no implementado.' }
  ]
}
