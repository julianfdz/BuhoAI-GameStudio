import { createServer, type Server } from 'node:http'
import { randomBytes } from 'node:crypto'
import { writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'

/**
 * API local para agentes y para el CLI `buho-studio`. Solo escucha en 127.0.0.1 y exige un token aleatorio que se
 * escribe en <userData>/api.json (URL, token y pid). Todas las órdenes son `POST /v1/<método>` con un JSON;
 * `GET /v1/estado` sirve para saber si la app está viva. Lo que se hace por aquí queda firmado en el historial con
 * el `autor` de la petición (o «IA») y el canal (cabecera `x-buho-canal`, por defecto «cli»).
 *
 * Métodos: estado, proyectos, abrir, nuevo, cerrar, arbol, ls, leer, escribir, nota, carpeta, anadir, mover,
 * renombrar, borrar, estado-poner, estados, ficha, fichas, id, tareas, tarea, tarea-nueva, tarea-editar, tarea-paso, comentarios, comentar, responder, resolver, historial, buscar,
 * miniatura, miniaturas, conectores, unity-enlazar, unity, blender-abrir, mostrar.
 */
export type ApiCall = (method: string, params: Record<string, unknown>, canal: string) => Promise<unknown>

export const DEFAULT_PORT = 47362
let server: Server | null = null
let url: string | null = null
const infoFile = (): string => join(app.getPath('userData'), 'api.json')
export const apiUrl = (): string | null => url

export function startApi(call: ApiCall): void {
  const token = randomBytes(24).toString('hex')
  server = createServer(async (req, res) => {
    const send = (status: number, body: unknown): void => {
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify(body))
    }
    if (req.headers.authorization !== `Bearer ${token}`) return send(401, { error: 'Token no válido. Léelo de api.json.' })
    const u = new URL(req.url ?? '/', 'http://127.0.0.1')
    let body: Record<string, unknown> = {}
    if (req.method === 'POST') {
      const chunks: Buffer[] = []
      for await (const c of req) chunks.push(c as Buffer)
      try {
        body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}
      } catch {
        return send(400, { error: 'JSON no válido' })
      }
    }
    const m = /^\/v1\/([a-z-]+)$/.exec(u.pathname)
    if (!m || (req.method === 'GET' && m[1] !== 'estado')) return send(404, { error: `Ruta desconocida: ${req.method} ${u.pathname}` })
    try {
      send(200, await call(m[1], { ...Object.fromEntries(u.searchParams), ...body }, String(req.headers['x-buho-canal'] ?? 'cli')))
    } catch (e) {
      send(400, { error: e instanceof Error ? e.message : String(e) })
    }
  })
  const listen = (port: number): void => {
    server!.once('error', (e: NodeJS.ErrnoException) => {
      if (e.code === 'EADDRINUSE' && port !== 0) listen(0)
    })
    server!.listen(port, '127.0.0.1', () => {
      const addr = server!.address()
      const real = typeof addr === 'object' && addr ? addr.port : port
      url = `http://127.0.0.1:${real}`
      writeFileSync(infoFile(), JSON.stringify({ url, token, pid: process.pid }, null, 2))
    })
  }
  listen(Number(process.env.BUHO_API_PORT) || DEFAULT_PORT)
}

export function stopApi(): void {
  server?.close()
  try {
    rmSync(infoFile(), { force: true })
  } catch {
    /* nada */
  }
}
