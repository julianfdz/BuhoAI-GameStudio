/**
 * Capturas reales para el README (docs/img) con un proyecto ya montado: abre la app con Playwright sobre ese proyecto
 * (BUHO_PROYECTO o el primer argumento), rehace las miniaturas y fotografía las vistas principales.
 *   node scripts/capturas-readme.mjs "D:\Juegos\Buho Zombies"
 * Usa los datos normales de la app (recientes, firma): ciérrala antes.
 */
import { _electron as electron } from 'playwright'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const proyecto = process.argv[2] || process.env.BUHO_PROYECTO
if (!proyecto) throw new Error('Falta la carpeta del proyecto')
const dir = join(root, 'docs', 'img')
mkdirSync(dir, { recursive: true })
const env = { ...process.env, BUHO_E2E: '1', BUHO_PROYECTO: proyecto, BUHO_NO_LAUNCH: '1' }
delete env.ELECTRON_RUN_AS_NODE
const run = promisify(execFile)
const cli = async (...a) => (await run('node', [join(root, 'bin', 'buho-studio.mjs'), ...a, '--autor', 'Claude'], { env, encoding: 'utf8', timeout: 600000, maxBuffer: 1 << 24 })).stdout

const app = await electron.launch({ args: [join(root, 'out', 'main', 'index.js')], env })
const page = await app.firstWindow()
await page.setViewportSize({ width: 1600, height: 960 })
await page.locator('.arbol').waitFor({ timeout: 20000 })
await page.waitForTimeout(1500)
const foto = async (nombre, espera = 1500) => {
  await page.waitForTimeout(espera)
  await page.screenshot({ path: join(dir, nombre) })
  console.log('captura', nombre)
}
if (process.env.MINIATURAS !== '0') console.log(await cli('miniaturas', '', '--forzar', '--json'))

await cli('mostrar', 'Assets/Modelos 3D')
await page.getByText('Incluir subcarpetas').click()
await foto('galeria-modelos.png', 2500)
await cli('mostrar', 'Capturas')
await foto('galeria-capturas.png')
await cli('mostrar', 'Contexto/Mecánicas.md')
await foto('nota.png')
await cli('mostrar', 'Assets/Modelos 3D/Armas/Ray Gun Búho/raygun_buho.glb')
await foto('visor-3d.png', 3500)
await cli('mostrar', 'Assets/Modelos 3D/Personajes/Zombiegirl.fbx')
await foto('visor-3d-fbx.png', 6000)
await cli('mostrar', 'Assets/Sonidos/Zombie')
await foto('sonidos.png')
await cli('mostrar', 'Contexto/Lore.md')
await foto('comentarios.png')
await page.getByRole('button', { name: 'Tablero' }).click()
await foto('tablero.png')
await page.getByRole('button', { name: 'Actividad' }).click()
await foto('actividad.png')
await page.getByRole('button', { name: 'Conectores' }).click()
await foto('conectores.png')
await page.getByRole('button', { name: 'Archivos', exact: true }).click()
// Un agente trabaja en directo: aviso firmado y el árbol se ilumina
await cli('mostrar', 'Contexto')
await page.waitForTimeout(800)
await cli('estado-de', 'Contexto/Referencias.md', 'revisar')
await foto('agente-en-directo.png', 700)
await app.close()
