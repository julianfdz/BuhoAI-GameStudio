# Búho Game Studio

**La mesa de trabajo de tu videojuego**, para personas y agentes de IA. Hecho por [Búho AI](https://buhoai.es).

Cada proyecto es **una carpeta de verdad** (como en VS Code): el contexto del juego en Markdown, los assets con
miniaturas y visor 3D, estados de revisión, comentarios y un historial que firma cada cambio. Un agente (Claude Code,
Codex, Copilot, Gemini…) trabaja con el CLI `buho-studio` y lo que hace **aparece al momento en la app**.

No depende de ningún motor: Unity, Godot o Unreal se enlazan como conectores opcionales.

![Galería de modelos 3D con miniaturas, estados y comentarios](docs/img/galeria-modelos.png)

## Qué hace

| | |
|---|---|
| **Proyectos = carpetas** | «Nuevo proyecto» o «Abrir carpeta». La app guarda lo suyo en una carpeta oculta `.buhostudio/` y el resto son archivos normales: se pueden abrir con el Explorador, Blender o git. Lista de recientes. |
| **Plantilla estándar** | `Contexto/` (lore, historia, personajes, estilo visual, objetivos, mecánicas y referencias), `Assets/` (modelos 3D, mapas, sonidos, texturas, imágenes y animaciones), `Tareas/`, `Capturas/` y `Builds/`. Después, todo es personalizable. |
| **Notas** | Editor Markdown con vista previa (vista, edición o las dos a la vez), tablas, imágenes del proyecto y enlaces `[[Nombre]]` como en Obsidian. Guarda solo. |
| **Galería de assets** | Miniaturas de imágenes y de modelos 3D: `.glb`, `.gltf`, `.fbx`, `.obj` y `.stl` los pinta la app con three.js; los `.blend`, [`buho-blender`](https://github.com/julianfdz/BuhoAI-Blender-CLI). Filtro por estado y vista con subcarpetas. Arrastra archivos desde el Explorador para copiarlos. |
| **Visor 3D** | Gira, acerca y reproduce las animaciones de `.glb` y `.fbx` (Mixamo incluido). Si el archivo solo trae esqueleto, lo dibuja. |
| **Audio y vídeo** | Se escuchan desde la tarjeta, sin abrir el archivo. |
| **Estados** | Idea → En curso → Revisar → Aprobado, en cualquier archivo o carpeta. El **Tablero** los junta en columnas. |
| **Comentarios** | Por archivo, con respuestas y resolver. Los agentes los leen (`comentarios --pendientes`) y contestan. |
| **Historial firmado** | Quién (persona 👤, agente 🤖 con su nombre, o cambio externo 📁), por dónde (app, CLI) y qué. |
| **En directo** | La app vigila la carpeta: lo que cambie un agente, otra persona o Blender aparece al momento y brilla en el árbol. |

| Nota con vista previa | Visor 3D de un FBX de Mixamo |
|---|---|
| ![Nota](docs/img/nota.png) | ![Visor 3D](docs/img/visor-3d-fbx.png) |

| Tablero por estados | Actividad: comentarios abiertos e historial |
|---|---|
| ![Tablero](docs/img/tablero.png) | ![Actividad](docs/img/actividad.png) |

| Comentarios de un agente | Conectores opcionales |
|---|---|
| ![Comentarios](docs/img/comentarios.png) | ![Conectores](docs/img/conectores.png) |

Las capturas son del proyecto de prueba **Búho Zombies**, un shooter cooperativo hecho con IA (Unity 6.3).

## Conectores (opcionales)

- **Blender** (`buho-blender`): miniaturas de `.blend` y «Abrir en Blender».
- **Unity** (`buho-unity`): enlaza el proyecto del estudio con su proyecto de Unity y lanza sus órdenes
  (`buho-studio unity -- estado`). El proyecto del estudio va **aparte** del de Unity: su `Assets/` chocaría con el del motor.
- **ComfyUI**: previsto para generar imágenes y texturas. Aún sin implementar.

## Instalar

Requisitos: Windows 10/11 y Node 20 o superior.

```bash
git clone https://github.com/julianfdz/BuhoAI-GameStudio
cd BuhoAI-GameStudio
npm install
npm start                  # compila y abre la app
npm run cli:instalar       # pone «buho-studio» en el PATH del usuario y la skill en ~/.claude, ~/.codex y ~/.copilot
```

Instalador para Windows: `npm run dist` crea `dist/Buho-GameStudio-<versión>-x64.exe`. El instalador añade el CLI al
PATH del usuario (`%LOCALAPPDATA%\Programs\BuhoGameStudio\cli`) y, al abrir la app, deja la skill a los agentes.

## CLI para agentes

```bash
buho-studio nuevo "D:\Juegos\Mi juego" --nombre "Mi juego" --unity "D:\Unity\Proyectos\MiJuego"
buho-studio abrir "D:\Juegos\Mi juego"
buho-studio arbol --profundidad 2
buho-studio leer Contexto/Lore.md
buho-studio nota Contexto "Facciones" --file facciones.md --autor Claude
buho-studio anadir "Assets/Modelos 3D" D:\descargas\silla.glb --autor Claude     # copia, no mueve
buho-studio estado-de "Assets/Modelos 3D/silla.glb" revisar --autor Claude
buho-studio comentarios --pendientes
buho-studio responder k-1a2b3c4d "Hecho" --resolver --autor Claude
buho-studio miniaturas "Assets/Modelos 3D"
buho-studio historial --max 20
buho-studio unity -- estado                                                     # orden de buho-unity
buho-studio skill                                                               # guía completa
```

Todas las órdenes aceptan `--json`. La guía para agentes está en [skills/buho-studio/SKILL.md](skills/buho-studio/SKILL.md).

El CLI habla con la API local de la app (`127.0.0.1:47362`, con token en `%APPDATA%\BuhoGameStudio\api.json`). Si la
app está cerrada, la abre.

## Desarrollo

```bash
npm run dev          # electron-vite con recarga
npm run typecheck
npm run test:e2e     # prueba de punta a punta con capturas en e2e/.out/shots
```

- `src/main/estudio.ts`: el núcleo (proyectos, árbol, notas, assets, estados, comentarios, historial).
- `src/main/conectores.ts`: Blender, Unity y ComfyUI.
- `src/renderer/`: la interfaz (React + three.js).
- `bin/buho-studio.mjs`: el CLI. `ia_context/`: decisiones y próximos pasos.

## Licencia

MIT © 2026 Buho Corps Systems.
