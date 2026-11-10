/**
 * Prueba de punta a punta con datos aislados (e2e/.out): crea un proyecto con la plantilla por el CLI, escribe notas,
 * copia assets (una imagen, un .glb generado y un sonido), estados, comentarios con respuesta, historial firmado,
 * cambios externos (como si fuera el Explorador) y la interfaz con capturas en e2e/.out/shots.
 * Si existe BUHO_E2E_GLB (ruta a un .glb), se usa ese modelo en vez del cubo generado.
 */
import { _electron as electron } from 'playwright'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'e2e', '.out')
rmSync(out, { recursive: true, force: true })
const shots = join(out, 'shots')
const proyecto = join(out, 'Mi juego')
const fuera = join(out, 'fuera')
mkdirSync(shots, { recursive: true })
mkdirSync(fuera, { recursive: true })

// Assets de prueba: un PNG pequeño, un WAV de un pitido y un .glb mínimo (un cubo)
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAKklEQVR4nGNgoBAwMjDYMjAwMDAwMPxnYGBgYGBg+M9AMWAcNYBhNAwAAKYfAwGzX2BYAAAAAElFTkSuQmCC', 'base64')
writeFileSync(join(fuera, 'boceto.png'), png)
const sr = 22050
const n = sr / 2
const wav = Buffer.alloc(44 + n * 2)
wav.write('RIFF', 0); wav.writeUInt32LE(36 + n * 2, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22)
wav.writeUInt32LE(sr, 24); wav.writeUInt32LE(sr * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(n * 2, 40)
for (let i = 0; i < n; i++) wav.writeInt16LE(Math.round(Math.sin((i / sr) * 2 * Math.PI * 440) * 8000 * (1 - i / n)), 44 + i * 2)
writeFileSync(join(fuera, 'pitido.wav'), wav)
function cuboGlb() {
  const p = [-1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1, -1].map((v) => v * 0.5)
  const idx = [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 3, 2, 6, 3, 6, 5, 0, 4, 7, 0, 7, 1, 1, 7, 6, 1, 6, 2, 0, 3, 5, 0, 5, 4]
  const pb = Buffer.from(new Float32Array(p).buffer)
  const ib = Buffer.from(new Uint16Array(idx).buffer)
  const bin = Buffer.concat([pb, ib])
  const json = {
    asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }],
    materials: [{ pbrMetallicRoughness: { baseColorFactor: [0, 0.76, 0.72, 1], metallicFactor: 0.2, roughnessFactor: 0.5 } }],
    buffers: [{ byteLength: bin.length }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: pb.length }, { buffer: 0, byteOffset: pb.length, byteLength: ib.length }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 8, type: 'VEC3', min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] }, { bufferView: 1, componentType: 5123, count: idx.length, type: 'SCALAR' }]
  }
  let js = Buffer.from(JSON.stringify(json))
  js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)])
  const h = Buffer.alloc(12); h.write('glTF', 0); h.writeUInt32LE(2, 4); h.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8)
  const c1 = Buffer.alloc(8); c1.writeUInt32LE(js.length, 0); c1.write('JSON', 4)
  const c2 = Buffer.alloc(8); c2.writeUInt32LE(bin.length, 0); c2.write('BIN\0', 4)
  return Buffer.concat([h, c1, js, c2, bin])
}
const glb = process.env.BUHO_E2E_GLB && existsSync(process.env.BUHO_E2E_GLB) ? process.env.BUHO_E2E_GLB : join(fuera, 'cubo.glb')
if (glb.endsWith('cubo.glb')) writeFileSync(glb, cuboGlb())

const env = { ...process.env, BUHO_DATA_DIR: join(out, 'data'), BUHO_E2E: '1', BUHO_API_PORT: '47399', BUHO_NO_LAUNCH: '1' }
delete env.ELECTRON_RUN_AS_NODE
const run = promisify(execFile)
const cli = async (...a) => (await run('node', [join(root, 'bin', 'buho-studio.mjs'), ...a, '--autor', 'Claude (prueba)'], { env, encoding: 'utf8', timeout: 60000 })).stdout
const cliJson = async (...a) => JSON.parse(await cli(...a, '--json'))

const fails = []
const check = (ok, msg) => {
  console.log(`${ok ? 'OK  ' : 'FALLO'} ${msg}`)
  if (!ok) fails.push(msg)
}

const app = await electron.launch({ args: [join(root, 'out', 'main', 'index.js')], env })
const page = await app.firstWindow()
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(e.message))
await page.setViewportSize({ width: 1500, height: 920 })
await page.getByText('La mesa de trabajo de tu videojuego').waitFor({ timeout: 20000 })
for (let i = 0; i < 40 && !existsSync(join(out, 'data', 'api.json')); i++) await page.waitForTimeout(150)
await page.screenshot({ path: join(shots, '01-portada.png') })

// Proyecto con plantilla
const p = await cliJson('nuevo', proyecto, '--nombre', 'Mi juego')
check(p.nombre === 'Mi juego' && existsSync(join(proyecto, '.buhostudio', 'proyecto.json')), 'nuevo crea .buhostudio/proyecto.json')
for (const r of ['Contexto/Lore.md', 'Contexto/Personajes.md', 'Assets/Modelos 3D', 'Assets/Sonidos', 'Assets/Texturas', 'Tareas/Hitos.md', 'Capturas', 'Builds']) check(existsSync(join(proyecto, r)), `plantilla: ${r}`)
await page.getByText('Contexto', { exact: true }).first().waitFor({ timeout: 10000 })

// Notas y carpetas
writeFileSync(join(fuera, 'lore.md'), '# Lore\n\nLa ciudad cayó en **una noche**. Ver [[Personajes]] y [boceto](../Assets/Imágenes/boceto.png).\n\n![boceto](../Assets/Imágenes/boceto.png)\n')
await cli('escribir', 'Contexto/Lore.md', '--file', join(fuera, 'lore.md'))
check(readFileSync(join(proyecto, 'Contexto', 'Lore.md'), 'utf8').includes('una noche'), 'escribir reemplaza la nota')
const nota = await cliJson('nota', 'Contexto', 'Facciones', '--text', '# Facciones\n\n| Facción | Líder |\n|---|---|\n| Búhos | Julián |')
check(nota.ruta === 'Contexto/Facciones.md' && existsSync(join(proyecto, 'Contexto', 'Facciones.md')), 'nota crea el .md')
await cli('escribir', 'Tareas/Pendientes.md', '--text', '- [ ] Revisar la linterna', '--anadir')
check(readFileSync(join(proyecto, 'Tareas', 'Pendientes.md'), 'utf8').includes('linterna'), 'escribir --anadir añade al final')
await cli('carpeta', 'Assets', 'Música')
check(existsSync(join(proyecto, 'Assets', 'Música')), 'carpeta crea la carpeta')

// Assets
const a1 = await cliJson('anadir', 'Assets/Imágenes', join(fuera, 'boceto.png'))
const a2 = await cliJson('anadir', 'Assets/Sonidos', join(fuera, 'pitido.wav'))
const a3 = await cliJson('anadir', 'Assets/Modelos 3D', glb)
check(a1[0].clase === 'imagen' && a2[0].clase === 'audio' && a3[0].clase === 'modelo', 'anadir copia y clasifica imagen, audio y modelo')
check(existsSync(join(fuera, 'boceto.png')), 'anadir no mueve el original')
const otra = await cliJson('anadir', 'Assets/Imágenes', join(fuera, 'boceto.png'))
check(otra[0].ruta === 'Assets/Imágenes/boceto (2).png', 'anadir no pisa: «boceto (2).png»')
await cli('renombrar', 'Assets/Imágenes/boceto (2).png', 'referencia')
check(existsSync(join(proyecto, 'Assets', 'Imágenes', 'referencia.png')), 'renombrar conserva la extensión')
await cli('mover', 'Assets/Imágenes/referencia.png', 'Assets/Texturas')
check(existsSync(join(proyecto, 'Assets', 'Texturas', 'referencia.png')), 'mover a otra carpeta')

// Estados, comentarios, historial
await cli('estado-de', a3[0].ruta, 'revisar')
await cli('estado-de', 'Contexto/Lore.md', 'en-curso')
const es = await cliJson('estados')
check(es.some((x) => x.ruta === a3[0].ruta && x.estado === 'revisar'), 'estado-de guarda el estado')
await cli('estado-de', 'Assets/Texturas/referencia.png', 'idea')
await cli('mover', 'Assets/Texturas/referencia.png', 'Assets/Imágenes')
check((await cliJson('estados')).some((x) => x.ruta === 'Assets/Imágenes/referencia.png'), 'el estado sigue al archivo al moverlo')
const k = await cliJson('comentar', a3[0].ruta, 'Le falta escala: ¿1 unidad = 1 metro?')
const pend = await cliJson('comentarios', '--pendientes')
check(pend.some((c) => c.id === k.id), 'comentarios --pendientes lo lista')
await cli('responder', k.id, 'Sí, 1 m. Lo dejo apuntado en Mecánicas.', '--resolver')
const tras = await cliJson('comentarios', a3[0].ruta)
check(tras.find((c) => c.id === k.id)?.resuelto && tras.some((c) => c.respuestaA === k.id), 'responder --resolver contesta y cierra el hilo')
await cli('comentar', 'Contexto/Lore.md', '¿La caída fue en invierno o en verano?')
const h = await cliJson('historial')
check(h.some((x) => x.autor === 'Claude (prueba)' && x.origen === 'ia' && x.canal === 'cli' && x.accion === 'crea nota'), 'historial firmado (autor, origen ia, canal cli)')
const b = await cliJson('buscar', 'una noche')
check(b[0]?.ruta === 'Contexto/Lore.md', 'buscar dentro de las notas')

// Miniatura de un .glb (la pinta la app con three.js)
const mini = await cliJson('miniatura', a3[0].ruta)
check(existsSync(mini.miniatura), `miniatura del .glb hecha por la app (${mini.miniatura})`)

// Cambio externo (como si fuera el Explorador)
writeFileSync(join(proyecto, 'Capturas', 'externa.png'), png)
await page.waitForTimeout(1500)
const h2 = await cliJson('historial', 'Capturas')
check(h2.some((x) => x.origen === 'externo' && x.ruta === 'Capturas/externa.png'), 'un archivo creado fuera se apunta como externo')

// Interfaz
await cli('mostrar', 'Assets/Modelos 3D')
await page.waitForTimeout(1500)
await page.screenshot({ path: join(shots, '02-galeria-modelos.png') })
await cli('mostrar', 'Assets')
await page.getByText('Incluir subcarpetas').click()
await page.waitForTimeout(1200)
await page.screenshot({ path: join(shots, '03-galeria-assets.png') })
await cli('mostrar', 'Contexto/Lore.md')
await page.waitForTimeout(800)
check(await page.locator('.md strong', { hasText: 'una noche' }).count() === 1, 'la nota se pinta en Markdown')
await page.screenshot({ path: join(shots, '04-nota.png') })
await page.getByRole('button', { name: 'Las dos' }).click()
await page.waitForTimeout(300)
await page.screenshot({ path: join(shots, '05-nota-editar.png') })
// Un agente escribe mientras la nota está abierta: se recarga
await cli('escribir', 'Contexto/Lore.md', '--text', '# Lore\n\nReescrito por el agente en directo.')
await page.waitForTimeout(1500)
check(await page.locator('.md', { hasText: 'Reescrito por el agente' }).count() === 1, 'la nota abierta se recarga cuando un agente la cambia')
await cli('mostrar', a3[0].ruta)
await page.waitForTimeout(2500)
await page.screenshot({ path: join(shots, '06-visor-3d.png') })
check(await page.locator('.lienzo3d canvas').count() === 1, 'visor 3D con three.js')
await page.getByRole('button', { name: 'Estados' }).click()
await page.waitForTimeout(800)
await page.screenshot({ path: join(shots, '07-tablero.png') })
await page.getByRole('button', { name: 'Actividad' }).click()
await page.waitForTimeout(800)
await page.screenshot({ path: join(shots, '08-actividad.png') })
await page.getByRole('button', { name: 'Conectores' }).click()
await page.waitForTimeout(800)
await page.screenshot({ path: join(shots, '09-conectores.png') })

// Desde la app: comentar en el panel y que se vea en el CLI
await cli('mostrar', 'Contexto/Facciones.md')
await page.waitForTimeout(600)
await page.getByPlaceholder(/Comenta este archivo/).fill('Añadir una facción de supervivientes')
await page.getByRole('button', { name: 'Comentar' }).click()
await page.waitForTimeout(600)
const cs = await cliJson('comentarios', 'Contexto/Facciones.md')
check(cs.some((c) => c.origen === 'persona' && c.texto.includes('supervivientes')), 'un comentario hecho en la app lo lee el CLI')

check(errors.length === 0, `sin errores en la consola${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`)
await app.close()
console.log(fails.length ? `\n${fails.length} FALLOS` : '\nTodo bien')
process.exit(fails.length ? 1 : 0)
