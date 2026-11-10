/**
 * Prueba de vídeo, Inicio y estilos sobre un proyecto real, sin tocarlo (solo lo abre y lee):
 *   BUHO_E2E_PROYECTO="D:\Juegos\Ultramar" node e2e/medios.mjs
 * Comprueba que estudio:// responde a peticiones por rangos (206) y que un vídeo salta a mitad (seek),
 * y deja capturas del Inicio con cada estilo y del reproductor en e2e/.out/medios.
 */
import { _electron as electron } from 'playwright'
import { mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const proyecto = process.env.BUHO_E2E_PROYECTO
if (!proyecto) throw new Error('Falta BUHO_E2E_PROYECTO')
const out = join(root, 'e2e', '.out', 'medios')
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })

const env = { ...process.env, BUHO_DATA_DIR: join(out, 'data'), BUHO_E2E: '1', BUHO_API_PORT: '47398', BUHO_PROYECTO: proyecto }
delete env.ELECTRON_RUN_AS_NODE
const app = await electron.launch({ args: [join(root, 'out', 'main', 'index.js')], env })
const page = await app.firstWindow()
await page.setViewportSize({ width: 1600, height: 1000 })
await page.waitForSelector('.inicio-pagina', { timeout: 20000 })
await page.waitForTimeout(2500)

const fallos = []
const ok = (c, m) => {
  console.log(`${c ? '✔' : '✘'} ${m}`)
  if (!c) fallos.push(m)
}

// Estilos: una captura del Inicio con cada uno
const temas = await page.$$eval('.tema', (xs) => xs.length).catch(() => 0)
await page.click('text=Estilo')
const nombres = await page.$$eval('.tema b', (xs) => xs.map((x) => x.textContent))
ok(nombres.length >= 5, `${nombres.length} estilos en el selector`)
for (let i = 0; i < nombres.length; i++) {
  if (i) await page.click('text=Estilo')
  await page.locator('.tema').nth(i).click()
  await page.click('.velo-menu').catch(() => {})
  await page.waitForTimeout(700)
  await page.screenshot({ path: join(out, `inicio-${i + 1}-${nombres[i].replace(/\s+/g, '-')}.png`) })
}
void temas

// Vídeo: el primer .mp4 del proyecto
const video = await page.evaluate(async () => {
  const plano = (xs) => xs.flatMap((x) => (x.clase === 'carpeta' ? plano(x.hijos ?? []) : [x]))
  return plano(await window.buho.arbol()).find((x) => x.clase === 'video')?.ruta
})
ok(!!video, `vídeo encontrado: ${video}`)
if (video) {
  const url = `estudio://f/${video.split('/').map(encodeURIComponent).join('/')}`
  const r = await page.evaluate(async (u) => {
    const x = await fetch(u, { headers: { range: 'bytes=1000-1999' } })
    return { status: x.status, rango: x.headers.get('content-range'), largo: (await x.arrayBuffer()).byteLength, acepta: x.headers.get('accept-ranges') }
  }, url)
  ok(r.status === 206 && r.largo === 1000, `rango 1000-1999 → ${r.status}, ${r.largo} bytes, ${r.rango}`)
  const salto = await page.evaluate(
    (u) =>
      new Promise((res) => {
        const v = document.createElement('video')
        v.muted = true
        v.preload = 'auto'
        v.src = u
        v.onloadedmetadata = () => {
          const destino = Math.min(50, v.duration / 2)
          v.onseeked = () => res({ destino, ahora: v.currentTime, duracion: v.duration })
          v.currentTime = destino
        }
        v.onerror = () => res({ error: v.error?.message ?? 'error' })
        setTimeout(() => res({ error: 'sin respuesta' }), 15000)
      }),
    url
  )
  ok(!salto.error && Math.abs(salto.ahora - salto.destino) < 1, `salto en el vídeo: pedido ${salto.destino?.toFixed?.(1)} s → está en ${salto.ahora?.toFixed?.(1)} s de ${salto.duracion?.toFixed?.(0)} s ${salto.error ?? ''}`)

  // Reproductor con navegación
  await page.evaluate((r) => window.buho && r, video)
  await page.locator('.nodo', { hasText: video.split('/').pop().replace(/\.[^.]+$/, '').slice(0, 20) }).first().click().catch(() => {})
  await page.waitForTimeout(400)
  const enArbol = await page.$('.video-vista')
  if (!enArbol) {
    // abrir por la búsqueda si el árbol está plegado
    await page.fill('.buscador input', video.split('/').pop().slice(0, 18))
    await page.waitForTimeout(600)
    await page.locator('.resultados button').first().click()
  }
  await page.waitForSelector('.video-vista', { timeout: 8000 })
  await page.waitForTimeout(1500)
  const nav = await page.$eval('.navegacion', (x) => x.textContent).catch(() => '')
  ok(/de/.test(nav), `navegación: ${nav.replace(/\s+/g, ' ').trim()}`)
  const antes = await page.$eval('h1.h-pagina', (x) => x.textContent)
  await page.keyboard.press('PageDown')
  await page.waitForTimeout(800)
  const despues = await page.$eval('h1.h-pagina', (x) => x.textContent)
  ok(antes !== despues, `AvPág pasa al siguiente: «${antes}» → «${despues}»`)
  await page.screenshot({ path: join(out, 'video.png') })
}

await app.close()
console.log(fallos.length ? `\n${fallos.length} fallo(s)` : '\nTodo bien')
process.exit(fallos.length ? 1 : 0)
