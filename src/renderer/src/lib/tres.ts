import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

/** Carga y encuadre de modelos 3D con three.js: lo usan el visor y las miniaturas que pinta la propia app. */

export const EN_APP = ['.glb', '.gltf', '.fbx', '.obj', '.stl']

let draco: DRACOLoader | null = null
function gltf(): GLTFLoader {
  const l = new GLTFLoader()
  draco ??= new DRACOLoader().setDecoderPath('./draco/')
  l.setDRACOLoader(draco)
  l.setMeshoptDecoder(MeshoptDecoder)
  return l
}

export interface Cargado {
  objeto: THREE.Object3D
  animaciones: THREE.AnimationClip[]
  triangulos: number
  mallas: number
}

export async function cargar(url: string, ext: string): Promise<Cargado> {
  let objeto: THREE.Object3D
  let animaciones: THREE.AnimationClip[] = []
  if (ext === '.glb' || ext === '.gltf') {
    const g = await gltf().loadAsync(url)
    objeto = g.scene
    animaciones = g.animations
  } else if (ext === '.fbx') {
    const g = await new FBXLoader().loadAsync(url)
    objeto = g
    animaciones = g.animations
  } else if (ext === '.obj') {
    objeto = await new OBJLoader().loadAsync(url)
  } else if (ext === '.stl') {
    const geo = await new STLLoader().loadAsync(url)
    geo.computeVertexNormals()
    objeto = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x9fb3c8, roughness: 0.6, metalness: 0.1 }))
  } else throw new Error(`Formato sin visor: ${ext}`)
  let triangulos = 0
  let mallas = 0
  objeto.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh) {
      mallas++
      const g = m.geometry
      triangulos += g.index ? g.index.count / 3 : (g.attributes.position?.count ?? 0) / 3
      m.castShadow = true
      m.receiveShadow = true
      // Materiales sin color (OBJ sin .mtl): un gris azulado que se lea bien
      const mats = Array.isArray(m.material) ? m.material : [m.material]
      for (const mat of mats) if (mat && (mat as THREE.MeshStandardMaterial).side !== undefined) (mat as THREE.Material).side = THREE.DoubleSide
    }
  })
  return { objeto, animaciones, triangulos: Math.round(triangulos), mallas }
}

/** Escena con luz de estudio y fondo navy. */
export function escena(renderer: THREE.WebGLRenderer, fondo = 0x0d2340): THREE.Scene {
  const s = new THREE.Scene()
  s.background = new THREE.Color(fondo)
  const pm = new THREE.PMREMGenerator(renderer)
  s.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture
  const sol = new THREE.DirectionalLight(0xffffff, 1.6)
  sol.position.set(3, 5, 4)
  s.add(sol, new THREE.HemisphereLight(0xcfe8ff, 0x0a1f3a, 0.6))
  return s
}

/** Centra el objeto en el origen, con la base en el suelo, y coloca la cámara en tres cuartos. */
export function encuadrar(obj: THREE.Object3D, cam: THREE.PerspectiveCamera, margen = 1.25): { centro: THREE.Vector3; radio: number } {
  obj.updateMatrixWorld(true)
  let caja = new THREE.Box3().setFromObject(obj)
  if (caja.isEmpty()) {
    // Sin mallas (solo esqueleto): la caja de las posiciones de los huesos
    caja = new THREE.Box3()
    obj.traverse((o) => caja.expandByPoint(o.getWorldPosition(new THREE.Vector3())))
    if (caja.isEmpty()) return { centro: new THREE.Vector3(), radio: 1 }
    const esfera = caja.getBoundingSphere(new THREE.Sphere())
    const radio = Math.max(esfera.radius, 1e-4)
    const dist = (radio * margen) / Math.sin((cam.fov * Math.PI) / 360)
    cam.position.copy(esfera.center).addScaledVector(new THREE.Vector3(1, 0.4, 1.4).normalize(), dist)
    cam.near = dist / 200
    cam.far = dist * 50
    cam.updateProjectionMatrix()
    cam.lookAt(esfera.center)
    return { centro: esfera.center, radio }
  }
  const c = caja.getCenter(new THREE.Vector3())
  obj.position.sub(new THREE.Vector3(c.x, caja.min.y, c.z))
  obj.updateMatrixWorld(true)
  const caja2 = new THREE.Box3().setFromObject(obj)
  const esfera = caja2.getBoundingSphere(new THREE.Sphere())
  const radio = Math.max(esfera.radius, 1e-4)
  const dist = (radio * margen) / Math.sin((cam.fov * Math.PI) / 360)
  const dir = new THREE.Vector3(1, 0.65, 1.15).normalize()
  cam.position.copy(esfera.center).addScaledVector(dir, dist)
  cam.near = dist / 200
  cam.far = dist * 50
  cam.updateProjectionMatrix()
  cam.lookAt(esfera.center)
  return { centro: esfera.center, radio }
}

/** Líneas turquesa con los huesos (para las animaciones que no traen malla). */
export function esqueleto(obj: THREE.Object3D): THREE.SkeletonHelper {
  const h = new THREE.SkeletonHelper(obj)
  ;(h.material as THREE.LineBasicMaterial).color = new THREE.Color(0x00c1b8)
  return h
}

let compartido: THREE.WebGLRenderer | null = null

/** Pinta una miniatura PNG (dataURL) de 512×512 de un modelo, sin ventana. */
export async function miniatura(url: string, ext: string, lado = 512): Promise<string> {
  compartido ??= new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false })
  const r = compartido
  r.setPixelRatio(1)
  r.setSize(lado, lado, false)
  r.toneMapping = THREE.ACESFilmicToneMapping
  r.outputColorSpace = THREE.SRGBColorSpace
  const s = escena(r)
  const { objeto, animaciones, mallas } = await cargar(url, ext)
  s.add(objeto)
  const cam = new THREE.PerspectiveCamera(35, 1, 0.01, 1000)
  let radio: number
  if (mallas === 0) {
    // Solo animación (p. ej. un FBX de Mixamo sin malla): se pinta el esqueleto a mitad de la animación
    if (animaciones[0]) {
      const m = new THREE.AnimationMixer(objeto)
      m.clipAction(animaciones[0]).play()
      m.update(animaciones[0].duration * 0.4)
    }
    s.add(esqueleto(objeto))
    radio = encuadrar(objeto, cam, 1.15).radio
  } else radio = encuadrar(objeto, cam).radio
  if (mallas > 0) {
    const suelo = new THREE.Mesh(new THREE.CircleGeometry(radio * 1.3, 64), new THREE.MeshStandardMaterial({ color: 0x112a48, roughness: 1 }))
    suelo.rotation.x = -Math.PI / 2
    suelo.position.y = -radio * 0.002
    s.add(suelo)
  }
  // Las texturas de un FBX o GLB tardan un momento en llegar
  await new Promise((ok) => setTimeout(ok, 350))
  r.render(s, cam)
  const png = r.domElement.toDataURL('image/png')
  s.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh) {
      m.geometry?.dispose()
      const mats = Array.isArray(m.material) ? m.material : [m.material]
      mats.forEach((x) => x?.dispose())
    }
  })
  return png
}
