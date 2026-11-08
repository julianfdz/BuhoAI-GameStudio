import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { cargar, encuadrar, escena, esqueleto } from '@/lib/tres'

/** Visor 3D de .glb/.gltf/.fbx/.obj/.stl: girar con el ratón, zoom con la rueda, animaciones si las trae. */
export function Visor3D({ url, ext }: { url: string; ext: string }): React.JSX.Element {
  const caja = useRef<HTMLDivElement>(null)
  const [info, setInfo] = useState<string>('Cargando modelo…')
  const [error, setError] = useState<string | null>(null)
  const [anims, setAnims] = useState<string[]>([])
  const [anim, setAnim] = useState(0)
  const [giro, setGiro] = useState(true)
  const ctl = useRef<{ mezclador?: THREE.AnimationMixer; clips: THREE.AnimationClip[]; controles?: OrbitControls }>({ clips: [] })

  useEffect(() => {
    const el = caja.current!
    let vivo = true
    const r = new THREE.WebGLRenderer({ antialias: true })
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    r.toneMapping = THREE.ACESFilmicToneMapping
    r.outputColorSpace = THREE.SRGBColorSpace
    r.shadowMap.enabled = true
    el.appendChild(r.domElement)
    const s = escena(r)
    const cam = new THREE.PerspectiveCamera(35, 1, 0.01, 1000)
    const controles = new OrbitControls(cam, r.domElement)
    controles.enableDamping = true
    controles.autoRotate = true
    controles.autoRotateSpeed = 1.2
    ctl.current.controles = controles
    const reloj = new THREE.Clock()
    const medir = (): void => {
      const w = el.clientWidth
      const h = el.clientHeight
      r.setSize(w, h)
      cam.aspect = w / Math.max(h, 1)
      cam.updateProjectionMatrix()
    }
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    cargar(url, ext)
      .then(({ objeto, animaciones, triangulos, mallas }) => {
        if (!vivo) return
        s.add(objeto)
        if (!mallas) s.add(esqueleto(objeto))
        const { centro, radio } = encuadrar(objeto, cam)
        controles.target.copy(centro)
        const rejilla = new THREE.GridHelper(radio * 6, 24, 0x00c1b8, 0x23466e)
        ;(rejilla.material as THREE.Material).transparent = true
        ;(rejilla.material as THREE.Material).opacity = 0.5
        s.add(rejilla)
        const tam = new THREE.Box3().setFromObject(objeto).getSize(new THREE.Vector3())
        setInfo(mallas ? `${triangulos.toLocaleString('es-ES')} triángulos` : `Solo esqueleto y animación (sin malla)`)
        if (mallas) setInfo(`${triangulos.toLocaleString('es-ES')} triángulos · ${mallas} mallas · ${tam.x.toFixed(2)} × ${tam.y.toFixed(2)} × ${tam.z.toFixed(2)} (unidades del archivo)`)
        if (animaciones.length) {
          ctl.current.mezclador = new THREE.AnimationMixer(objeto)
          ctl.current.clips = animaciones
          ctl.current.mezclador.clipAction(animaciones[0]).play()
          setAnims(animaciones.map((a, i) => a.name || `Animación ${i + 1}`))
        }
      })
      .catch((e) => vivo && setError(String(e?.message ?? e)))
    r.setAnimationLoop(() => {
      ctl.current.mezclador?.update(reloj.getDelta())
      controles.update()
      r.render(s, cam)
    })
    return () => {
      vivo = false
      ro.disconnect()
      r.setAnimationLoop(null)
      controles.dispose()
      r.dispose()
      el.removeChild(r.domElement)
      ctl.current = { clips: [] }
    }
  }, [url, ext])

  useEffect(() => {
    const { mezclador, clips } = ctl.current
    if (!mezclador || !clips[anim]) return
    mezclador.stopAllAction()
    mezclador.clipAction(clips[anim]).play()
  }, [anim])
  useEffect(() => {
    if (ctl.current.controles) ctl.current.controles.autoRotate = giro
  }, [giro])

  return (
    <div className="visor3d">
      <div className="lienzo3d" ref={caja} />
      <div className="visor3d-pie">
        {error ? <span className="peligro">No se pudo cargar: {error}</span> : <span>{info}</span>}
        <span className="der fila">
          {anims.length > 0 && (
            <select value={anim} onChange={(e) => setAnim(Number(e.target.value))} title="Animación">
              {anims.map((a, i) => (
                <option key={i} value={i}>
                  ▶ {a}
                </option>
              ))}
            </select>
          )}
          <label className="fila">
            <input type="checkbox" checked={giro} onChange={(e) => setGiro(e.target.checked)} /> Girar solo
          </label>
        </span>
      </div>
    </div>
  )
}
