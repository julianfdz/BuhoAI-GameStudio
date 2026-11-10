/**
 * IDs, tareas, ayuda y galería con collage, con datos aislados (e2e/.out/ids-tareas). No toca ningún proyecto real.
 *   npx electron-vite build && node e2e/ids-tareas.mjs
 */
import { _electron as electron } from 'playwright'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'e2e', '.out', 'ids-tareas')
rmSync(out, { recursive: true, force: true })
const shots = join(out, 'shots')
const proyecto = join(out, 'Juego de prueba')
mkdirSync(shots, { recursive: true })

const env = { ...process.env, BUHO_DATA_DIR: join(out, 'data'), BUHO_E2E: '1', BUHO_API_PORT: '47397', BUHO_NO_LAUNCH: '1' }
delete env.ELECTRON_RUN_AS_NODE
const run = promisify(execFile)
const cli = async (...a) => (await run('node', [join(root, 'bin', 'buho-studio.mjs'), ...a, '--autor', 'Claude (prueba)'], { env, encoding: 'utf8', timeout: 60000 })).stdout
const json = async (...a) => JSON.parse(await cli(...a, '--json'))

const fallos = []
const ok = (c, m) => {
  console.log(`${c ? '✔' : '✘'} ${m}`)
  if (!c) fallos.push(m)
}

const app = await electron.launch({ args: [join(root, 'out', 'main', 'index.js')], env })
const page = await app.firstWindow()
await page.setViewportSize({ width: 1600, height: 1000 })
await page.waitForTimeout(1500)

// Proyecto con la plantilla + unos assets
await cli('nuevo', proyecto, '--nombre', 'Juego de prueba')
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAKklEQVR4nGNgoBAwMjDYMjAwMDAwMPxnYGBgYGBg+M9AMWAcNYBhNAwAAKYfAwGzX2BYAAAAAElFTkSuQmCC', 'base64')
for (const n of ['boceto.png', 'fondo.png']) writeFileSync(join(proyecto, 'Assets', 'Imágenes', n), png)
writeFileSync(join(proyecto, 'Assets', 'Sonidos', 'disparo.wav'), Buffer.alloc(64))
writeFileSync(join(proyecto, 'Assets', 'Sonidos', 'paso.wav'), Buffer.alloc(80))
writeFileSync(join(proyecto, 'Assets', 'Mapas', 'nivel1.json'), '{"nivel":1}')
await page.waitForTimeout(2500)

// --- IDs
const arbol = await json('arbol')
const plano = (xs) => xs.flatMap((x) => [x, ...plano(x.hijos ?? [])])
const todos = plano(arbol)
ok(todos.every((x) => /^[ac]-[0-9a-f]{8}$/.test(x.id)), `todo tiene ID (${todos.length} elementos)`)
ok(todos.some((x) => x.ruta === 'Contexto/ia_context.md'), 'la plantilla trae Contexto/ia_context.md')
const boceto = todos.find((x) => x.ruta === 'Assets/Imágenes/boceto.png')
const idB = boceto.id
await cli('ficha', idB, '--nombre', 'Boceto del héroe')
await cli('estado-de', idB, 'revisar')
ok((await json('id', idB)).titulo === 'Boceto del héroe', `ficha por ID (${idB})`)
await cli('renombrar', idB, 'heroe')
let x = await json('id', idB)
ok(x.ruta === 'Assets/Imágenes/heroe.png' && x.titulo === 'Boceto del héroe', `renombrar: la ID sigue → ${x.ruta}`)
// mover desde fuera (como el Explorador)
mkdirSync(join(proyecto, 'Assets', 'Imágenes', 'Héroes'))
renameSync(join(proyecto, 'Assets', 'Imágenes', 'heroe.png'), join(proyecto, 'Assets', 'Imágenes', 'Héroes', 'heroe.png'))
await page.waitForTimeout(2500)
x = await json('id', idB)
ok(x.ruta === 'Assets/Imágenes/Héroes/heroe.png' && x.estado === 'revisar' && x.titulo === 'Boceto del héroe', `mover desde fuera: misma ID, estado y ficha → ${x.ruta}`)
ok((await cli('arbol', 'Assets', '--profundidad', '1')).includes('['), 'arbol enseña las IDs')
let error = ''
try {
  await cli('id', 'a-00000000')
} catch (e) {
  error = String(e.stderr ?? e)
}
ok(/No hay nada con la ID/.test(error), 'ID inexistente: mensaje claro')

// --- Tareas
const sonidos = todos.find((y) => y.ruta === 'Assets/Sonidos')
const t = await json('tarea', 'nueva', 'Modelar la Ray Gun', '--prioridad', 'alta', '--asignada', 'Claude', '--enlaces', `${idB},${sonidos.id}`, '--pasos', 'Boceto; Modelo; Exportar', '--descripcion', 'Low-poly, 3 materiales.')
ok(/^t-[0-9a-f]{8}$/.test(t.id) && t.pasos.length === 3 && t.enlaces.length === 2, `tarea creada ${t.id} con 3 pasos y 2 enlaces`)
await json('tarea', 'nueva', 'Escribir el lore de la isla', '--asignada', 'Julián')
await json('tarea', 'nueva', 'Revisar sonidos', '--prioridad', 'baja', '--estado', 'revisar')
let t2 = await json('tarea', 'mover', t.id, 'en-curso')
ok(t2.estado === 'en-curso', 'tarea mover → en-curso')
t2 = await json('tarea', 'paso', t.id, '1')
t2 = await json('tarea', 'paso', t.id, '--nuevo', 'Probar en Unity')
ok(t2.hechos === 1 && t2.pasos.length === 4, `pasos: ${t2.hechos}/${t2.pasos.length}`)
t2 = await json('tarea', 'editar', t.id, '--titulo', 'Modelar la Ray Gun low-poly')
ok(t2.id === t.id && t2.ruta.endsWith('Modelar la Ray Gun low-poly.md'), `cambiar título renombra el archivo y mantiene la ID → ${t2.ruta}`)
await cli('comentar', t.id, 'Modelo hecho, falta la textura')
ok((await json('tareas', '--asignada', 'Claude')).length === 1, 'tareas --asignada Claude')
ok((await cli('ayuda')).includes('Tareas') && (await cli('ayuda', 'ids')).includes('Copiar ID'), 'buho-studio ayuda (temas y página)')

// --- Bugs
const bug = await json('bug', 'nuevo', 'El build se cierra al salir', '--gravedad', 'grave', '--build', 'v0.3', '--reproducir', 'Abrir; Jugar; Salir', '--pasa', 'Se cierra con error', '--deberia', 'Salir limpio', '--enlaces', idB)
ok(bug.tipo === 'bug' && bug.gravedad === 'grave' && bug.prioridad === 'alta' && bug.ruta.startsWith('Tareas/Bugs/'), `bug abierto ${bug.id} en ${bug.ruta} (prioridad ${bug.prioridad})`)
await json('bug', 'nuevo', 'Falta el icono del arma', '--gravedad', 'cosmetico', '--build', 'v0.3')
let b2 = await json('bug', 'mover', bug.id, 'hecha')
ok(!!b2.cerrada, 'mover a hecha lo cierra (fecha de cierre)')
b2 = await json('bug', 'mover', bug.id, 'en-curso')
ok(!b2.cerrada && b2.reabierta === 1, `sacarlo de hecha lo reabre (reabierta ${b2.reabierta})`)
const lb = await json('bugs', '--abiertos')
ok(lb.length === 2 && (await json('tareas', '--estado', 'en-curso')).some((t) => t.id === bug.id), 'bugs --abiertos y el bug sale también en tareas')
ok((await cli('bugs')).includes('abiertos'), 'resumen de bugs en texto')

// --- Velocidad del CLI (árbol en memoria)
const tiempos = []
for (let i = 0; i < 5; i++) {
  const t0 = Date.now()
  await cli('estado', '--json')
  tiempos.push(Date.now() - t0)
}
const medio = Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length)
ok(medio < 300, `estado por el CLI: ${medio} ms de media (${tiempos.join(', ')})`)

// --- Interfaz
await page.waitForTimeout(1500)
await page.screenshot({ path: join(shots, '01-inicio.png') })
const tema = await page.evaluate(() => document.documentElement.dataset.tema)
ok(tema === 'claude', `estilo por defecto: ${tema}`)
await page.click('.pestanas >> text=Archivos')
await page.locator('.nodo', { hasText: 'Assets' }).first().click()
await page.waitForTimeout(1500)
const collages = await page.$$eval('.galeria .mini.con-collage .celda', (xs) => xs.length)
ok(collages >= 3, `carpetas con collage en Archivos (${collages} celdas)`)
await page.screenshot({ path: join(shots, '02-archivos-assets.png') })
// clic derecho → Copiar ID
await page.locator('.galeria .tarjeta', { hasText: 'Sonidos' }).first().click({ button: 'right' })
await page.click('.menu >> text=Copiar ID')
await page.waitForTimeout(300)
const portapapeles = await app.evaluate(({ clipboard }) => clipboard.readText())
ok(portapapeles === sonidos.id, `Copiar ID → portapapeles: ${portapapeles}`)
await page.click('.pestanas >> text=Tareas')
await page.waitForTimeout(1200)
ok((await page.$$eval('.kan-tarjeta', (xs) => xs.length)) === 5, 'Kanban con 3 tareas y 2 bugs')
await page.screenshot({ path: join(shots, '03-tareas.png') })
// arrastrar «Escribir el lore» a En curso
{
  const de = await page.locator('.kan-tarjeta', { hasText: 'Escribir el lore' }).boundingBox()
  const a = await page.locator('.kan-col.t-en-curso').boundingBox()
  await page.mouse.move(de.x + de.width / 2, de.y + de.height / 2)
  await page.mouse.down()
  for (let i = 1; i <= 12; i++) await page.mouse.move(de.x + de.width / 2 + ((a.x + a.width / 2 - de.x - de.width / 2) * i) / 12, de.y + de.height / 2 + ((a.y + 80 - de.y - de.height / 2) * i) / 12)
  await page.mouse.up()
}
await page.waitForTimeout(1200)
const lore = (await json('tareas')).find((y) => y.titulo.startsWith('Escribir el lore'))
ok(lore.estado === 'en-curso', `arrastrar en el Kanban mueve la tarea → ${lore.estado}`)
await page.locator('.kan-tarjeta', { hasText: 'Modelar la Ray Gun' }).click()
await page.waitForTimeout(1200)
await page.screenshot({ path: join(shots, '04-tarea.png') })
await page.click('.pestanas >> text=Bugs')
await page.waitForTimeout(1200)
ok((await page.$$eval('.tabla-bugs tbody tr', (xs) => xs.length)) === 2, 'vista Bugs: 2 abiertos en la tabla')
await page.screenshot({ path: join(shots, '05-bugs.png') })
await page.click('.pestanas >> text=Ayuda')
await page.waitForTimeout(600)
await page.click('.ayuda-indice >> text=IDs: hablar con la IA con propiedad')
await page.waitForTimeout(400)
await page.screenshot({ path: join(shots, '06-ayuda.png') })

await app.close()
console.log(fallos.length ? `\n${fallos.length} fallo(s)` : '\nTodo bien')
process.exit(fallos.length ? 1 : 0)
