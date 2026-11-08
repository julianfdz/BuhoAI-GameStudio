---
name: buho-studio
description: Trabajar en el proyecto de un videojuego con Búho Game Studio y su CLI `buho-studio`, independiente del motor (Unity, Godot, Unreal…). Proyectos = carpetas reales con Contexto (lore, historia, personajes, estilo, objetivos, referencias en Markdown), Assets (modelos 3D, mapas, sonidos, texturas, imágenes, animaciones), Tareas, Capturas y Builds; estados por archivo (idea, en curso, revisar, aprobado), comentarios que el agente lee y contesta, miniaturas de modelos (.glb/.fbx/.obj y .blend con buho-blender) e historial firmado. Úsala SIEMPRE que haya que escribir o revisar el lore, la historia, los personajes, el diseño o los objetivos de un juego, ordenar o subir assets de un juego, ver qué está pendiente de revisar, contestar comentarios del equipo, enlazar el proyecto con su proyecto de Unity o preparar el contexto de un juego para otros agentes, aunque no se nombre la app. Lo que hagas aparece al momento en la app, firmado con tu nombre. Vale para cualquier agente con terminal (Claude, Codex, Copilot, Gemini, scripts).
---

# Búho Game Studio · CLI `buho-studio`

Búho Game Studio es la mesa de trabajo de un videojuego. **Un proyecto es una carpeta normal del disco** (como en VS Code):
lo que crees con el CLI son archivos de verdad, y la app los enseña en directo (el árbol se abre y brilla, sale un aviso con
tu nombre). Si la app está cerrada, el CLI la abre.

Lo interno del estudio vive en `.buhostudio/` dentro del proyecto: `proyecto.json` (nombre y enlaces, p. ej. a Unity),
`estados.json`, `comentarios.json`, `historial.jsonl` (firmado) y `miniaturas/` (caché). **No lo edites a mano**: usa el CLI.

Plantilla de un proyecto nuevo:

```
LEEME.md
Contexto/   Lore.md · Historia.md · Personajes.md · Estilo visual.md · Objetivos.md · Mecánicas.md · Referencias.md
Assets/     Modelos 3D/ · Mapas/ · Sonidos/ · Texturas/ · Imágenes/ · Animaciones/
Tareas/     Hitos.md · Pendientes.md
Capturas/   Builds/
```

Todo es personalizable: puedes crear las carpetas y notas que haga falta.

## Comandos

Las rutas son **relativas a la carpeta del proyecto**, con `/` (`Contexto/Lore.md`, `Assets/Sonidos`). La raíz es `/` o `""`.
Firma siempre con `--autor "<tu nombre de agente>"` (o la variable `BUHO_AUTOR`): así el equipo sabe qué hizo cada uno.

```bash
# Proyecto
buho-studio estado                                   # proyecto abierto y recuentos
buho-studio proyectos                                # recientes
buho-studio abrir "D:\Juegos\Buho Zombies"           # abre (o adopta) una carpeta
buho-studio nuevo "D:\Juegos\Mi juego" --nombre "Mi juego" [--sin-plantilla] [--unity "D:\Unity\Proyectos\MiJuego"]

# Mirar
buho-studio arbol [<ruta>] [--profundidad 2]         # ◇ idea · ◐ en curso · ● revisar · ✔ aprobado · ✉N comentarios
buho-studio ls Assets/Sonidos
buho-studio leer Contexto/Lore.md
buho-studio buscar "linterna"

# Escribir
buho-studio nota Contexto "Facciones" --file facciones.md --autor Claude      # o --text "…" o --text - (entrada)
buho-studio escribir Contexto/Lore.md --file lore.md --autor Claude           # reemplaza el archivo
buho-studio escribir Tareas/Pendientes.md --text "- [ ] Revisar sonidos" --anadir --autor Claude
buho-studio carpeta Assets "Música" --autor Claude
buho-studio anadir "Assets/Modelos 3D" D:\descargas\silla.glb --autor Claude  # COPIA (el original no se toca)
buho-studio mover Assets/Imágenes/boceto.png Assets/Texturas --autor Claude
buho-studio renombrar Contexto/Lore.md "Lore del mundo" --autor Claude        # la extensión se conserva
buho-studio borrar Capturas/vieja.png --autor Claude                          # a la papelera de Windows

# Equipo: estados, comentarios e historial
buho-studio estado-de "Assets/Modelos 3D/raygun.glb" revisar --autor Claude   # idea | en-curso | revisar | aprobado | ninguno
buho-studio estados --estado revisar
buho-studio comentarios --pendientes                # lo que el equipo espera que contestes
buho-studio comentar Contexto/Historia.md "Falta el final del acto 2" --autor Claude
buho-studio responder k-1a2b3c4d "Hecho: añadido en la sección Final" --resolver --autor Claude
buho-studio resolver k-1a2b3c4d [--reabrir]
buho-studio historial [<ruta>] [--max 50]           # quién (persona 👤, IA 🤖, fuera 📁), por dónde y qué

# Modelos 3D y conectores
buho-studio miniatura "Assets/Modelos 3D/raygun.glb"      # .glb/.gltf/.fbx/.obj/.stl: la pinta la app con three.js
buho-studio miniatura "Assets/Modelos 3D/raygun.blend"      # .blend: con buho-blender (Blender sin ventana, ~5 s)
buho-studio miniaturas "Assets/Modelos 3D" [--forzar] [--blender]
buho-studio blender "Assets/Modelos 3D/raygun.blend"      # abre el modelo en Blender (buho-blender)
buho-studio conectores                                    # qué hay instalado: Blender, Unity, ComfyUI (previsto)
buho-studio unity enlazar "D:\Unity\Proyectos\MiJuego"    # enlaza el proyecto con su proyecto de Unity
buho-studio unity -- <orden de buho-unity…>               # la lanza en la carpeta de Unity (cuando exista buho-unity)
buho-studio mostrar Contexto/Lore.md                      # la app enseña ese archivo
```

Opciones globales: `--json` (salida JSON en una línea), `--autor "Nombre"`, `--no-launch` (no abrir la app).

## Cómo trabajar

1. **Mira antes de tocar**: `estado`, `arbol --profundidad 2`, `leer` las notas de `Contexto/` y `comentarios --pendientes`.
2. **Contesta comentarios**: cada comentario va pegado a un archivo o carpeta. Haz lo que pide y responde con
   `responder <id> "qué hiciste" --resolver`. Si no puedes hacerlo o necesitas una decisión, responde sin `--resolver`.
3. **Notas en Markdown**: títulos `#`, tablas, listas. Enlaces a otros archivos con rutas relativas a la nota
   (`[raygun](../Assets/Modelos%203D/raygun.glb)`, `![boceto](../Assets/Imágenes/boceto.png)`) o con `[[Nombre]]`
   (como en Obsidian: busca un archivo del proyecto con ese nombre).
4. **Estados**: pon `revisar` a lo que hayas terminado para que lo vea una persona. No pongas `aprobado` a tu propio
   trabajo salvo que te lo pidan: aprobar es cosa del equipo.
5. **Assets de fuera**: `anadir` copia; el original no se mueve ni se borra. Respeta las licencias (apúntalas en
   `Contexto/Referencias.md` o en una nota de créditos).
6. **No dependas del motor**: el proyecto del estudio no es el proyecto de Unity. Si hay uno enlazado
   (`conectores`), no copies el estudio dentro de su `Assets/`; para lanzar órdenes del motor usa `buho-studio unity -- …`.
7. **Comprueba con los ojos**: tras subir modelos, `miniaturas` y mira las imágenes de `.buhostudio/miniaturas/`
   (la ruta sale en el JSON). Para revisar un .blend a fondo, usa la skill `buho-blender`.

## Errores típicos

- «No hay ningún proyecto abierto» → `buho-studio abrir <carpeta>`.
- «está fuera del proyecto» → las rutas son relativas al proyecto; no uses `..` para salir.
- En Git Bash, una ruta que empiece por `/` se convierte en ruta de Windows: usa `""` o `.` para la raíz.
- Miniatura de .blend con error → hace falta `buho-blender` instalado (ver `buho-studio conectores`).
