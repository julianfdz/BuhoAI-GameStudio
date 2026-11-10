---
name: buho-studio
description: Trabajar en el proyecto de un videojuego con Búho Game Studio y su CLI `buho-studio`, independiente del motor (Unity, Godot, Unreal…). Proyectos = carpetas reales con Contexto (lore, historia, personajes, estilo, objetivos, referencias y ia_context.md en Markdown), Assets (modelos 3D, mapas, sonidos, texturas, imágenes, animaciones), Tareas (Kanban: crear, mover, marcar pasos), Capturas y Builds; cada archivo, carpeta y tarea tiene una ID (a-…, c-…, t-…) que el usuario copia en la app y te pega para pedirte algo; estados por archivo (idea, en curso, revisar, aprobado), comentarios que el agente lee y contesta, miniaturas de modelos (.glb/.fbx/.obj y .blend con buho-blender) e historial firmado. Úsala SIEMPRE que el usuario pegue una ID como a-3f9c21b0, c-… o t-…, o haya que crear o mover tareas del juego, escribir o revisar el lore, la historia, los personajes, el diseño o los objetivos de un juego, ordenar o subir assets de un juego, ver qué está pendiente de revisar, contestar comentarios del equipo, enlazar el proyecto con su proyecto de Unity o preparar el contexto de un juego para otros agentes, aunque no se nombre la app. Lo que hagas aparece al momento en la app, firmado con tu nombre. Vale para cualquier agente con terminal (Claude, Codex, Copilot, Gemini, scripts).
---

# Búho Game Studio · CLI `buho-studio`

Búho Game Studio es la mesa de trabajo de un videojuego. **Un proyecto es una carpeta normal del disco** (como en VS Code):
lo que crees con el CLI son archivos de verdad, y la app los enseña en directo (el árbol se abre y brilla, sale un aviso con
tu nombre). Si la app está cerrada, el CLI la abre.

Lo interno del estudio vive en `.buhostudio/` dentro del proyecto: `proyecto.json` (nombre y enlaces, p. ej. a Unity),
`ids.json`, `fichas.json`, `estados.json`, `comentarios.json`, `historial.jsonl` (firmado) y `miniaturas/` (caché).
**No lo edites a mano**: usa el CLI.

## IDs: lo primero que vas a recibir

Todo tiene una **ID** estable: `a-3f9c21b0` (archivo), `c-77aa0011` (carpeta), `t-1a2b3c4d` (tarea). No cambia al
renombrar o mover. El usuario la copia en la app (clic derecho → Copiar ID) y te la pega: «cambia `a-3f9c21b0`…».

- **Donde va una ruta vale una ID**, en todas las órdenes (`leer`, `ficha`, `estado-de`, `comentar`, `mover`, `tarea …`).
- `buho-studio id <id>` te dice qué es (ruta, ficha, estado, comentarios, tarea). Si es de otro proyecto reciente, te
  dice cuál: ábrelo con `buho-studio abrir` antes de tocar nada.
- En tus respuestas, nombra las cosas por su nombre **y** su ID («Ray Gun Búho `a-3f9c21b0`»).
- `arbol` y `ls` enseñan la ID de cada cosa entre corchetes.

Plantilla de un proyecto nuevo (la lógica de cada carpeta, en `buho-studio ayuda estructura`):

```
LEEME.md
Sin procesar/   bandeja de entrada: se procesa SOLO cuando lo piden
Contexto/   ia_context.md · Lore.md · Historia.md · Personajes.md · Estilo visual.md · Objetivos.md · Mecánicas.md · Referencias.md
Assets/     Modelos 3D/ · Mapas/ · Sonidos/ · Texturas/ · Imágenes/ · Animaciones/
Tareas/     Hitos.md · Pendientes.md · una nota por tarea (Kanban)
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
buho-studio id a-3f9c21b0                             # qué es una ID (también busca en otros proyectos)
buho-studio arbol [<ruta|id>] [--profundidad 2]      # [id] · ◇ idea · ◐ en curso · ● revisar · ✔ aprobado · ✉N comentarios
buho-studio ls Assets/Sonidos
buho-studio leer Contexto/Lore.md
buho-studio buscar "linterna"

# Escribir
buho-studio nota Contexto "Facciones" --file facciones.md --autor Claude      # o --text "…" o --text - (entrada)
buho-studio escribir Contexto/Lore.md --file lore.md --autor Claude           # reemplaza el archivo
buho-studio escribir Tareas/Pendientes.md --text "- [ ] Revisar sonidos" --anadir --autor Claude
buho-studio carpeta Assets "Música" --autor Claude
buho-studio anadir "Assets/Modelos 3D" D:\descargas\silla.glb --nombre "Silla de oficina" --descripcion "Prop del laboratorio, nivel 2" --autor Claude  # COPIA (el original no se toca)
buho-studio mover Assets/Imágenes/boceto.png Assets/Texturas --autor Claude
buho-studio renombrar Contexto/Lore.md "Lore del mundo" --autor Claude        # la extensión se conserva
buho-studio borrar Capturas/vieja.png --autor Claude                          # a la papelera de Windows

# Equipo: estados, comentarios e historial
buho-studio estado-de "Assets/Modelos 3D/raygun.glb" revisar --autor Claude   # idea | en-curso | revisar | aprobado | ninguno
buho-studio estados --estado revisar

# Ficha de cada asset: nombre legible y descripción (el archivo no se renombra)
buho-studio ficha "Assets/Modelos 3D/raygun.glb" --nombre "Ray Gun Búho" --descripcion "Arma maravilla: dispara bolas de energía verdes; se consigue en la caja misteriosa" --autor Claude
buho-studio ficha "Assets/Modelos 3D/raygun.glb"            # sin opciones: la lee
buho-studio ficha <ruta> --descripcion ""                    # vacío: borra ese campo
buho-studio fichas "Assets" --faltan                         # assets sin nombre o sin descripción
buho-studio comentarios --pendientes                # lo que el equipo espera que contestes
buho-studio comentar Contexto/Historia.md "Falta el final del acto 2" --autor Claude
buho-studio responder k-1a2b3c4d "Hecho: añadido en la sección Final" --resolver --autor Claude
buho-studio resolver k-1a2b3c4d [--reabrir]
buho-studio historial [<ruta>] [--max 50]           # quién (persona 👤, IA 🤖, fuera 📁), por dónde y qué

# Tareas (Kanban de la app; cada tarea es Tareas/<título>.md con cabecera tipo: tarea)
buho-studio tareas [--estado por-hacer|en-curso|revisar|hecha] [--asignada Claude]
buho-studio tarea nueva "Modelar la Ray Gun" --prioridad alta --asignada Claude --enlaces a-3f9c21b0,c-77aa0011 --pasos "Boceto; Modelo; Exportar" [--descripcion "…" | --file d.md] --autor Claude
buho-studio tarea ver t-1a2b3c4d
buho-studio tarea mover t-1a2b3c4d en-curso --autor Claude
buho-studio tarea paso t-1a2b3c4d 2 --autor Claude            # marca el paso 2 (--pendiente lo desmarca)
buho-studio tarea paso t-1a2b3c4d --nuevo "Probar en Unity"
buho-studio tarea editar t-1a2b3c4d [--titulo] [--descripcion] [--prioridad] [--asignada] [--enlaces]
buho-studio comentar t-1a2b3c4d "Modelo hecho; falta la textura" --autor Claude

# Bugs (tareas con tipo: bug en Tareas/Bugs/; vista Bugs con histórico en la app)
buho-studio bug nuevo "El build se cierra al salir" --gravedad bloqueante|grave|menor|cosmetico --build v0.3 --reproducir "Abrir; Jugar; Salir" --pasa "…" --deberia "…" [--reproduce si|a-veces|no] --enlaces a-… --autor Claude
buho-studio bugs [--abiertos] [--gravedad grave] [--build v0.3]
buho-studio bug mover|editar|ver|paso t-… …                   # como tarea; a hecha lo cierra, sacarlo lo reabre

# Ayuda (la misma que ve la persona en la app)
buho-studio ayuda                  # temas
buho-studio ayuda tareas           # una página

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

1. **Mira antes de tocar**: `estado`, `leer Contexto/ia_context.md` (la nota para la IA: qué leer, convenciones, qué no
   tocar), `arbol --profundidad 2`, las notas de `Contexto/` que pida el encargo (una por tema: no hace falta leerlas
   todas) y `comentarios --pendientes`. Si te pegan una ID, empieza por `buho-studio id <id>`.
   Si no existe `Contexto/ia_context.md`, propón crearla (la app tiene un botón en Inicio con la plantilla).
2. **Contesta comentarios**: cada comentario va pegado a un archivo o carpeta. Haz lo que pide y responde con
   `responder <id> "qué hiciste" --resolver`. Si no puedes hacerlo o necesitas una decisión, responde sin `--resolver`.
3. **Notas en Markdown**: títulos `#`, tablas, listas. Enlaces a otros archivos con rutas relativas a la nota
   (`[raygun](../Assets/Modelos%203D/raygun.glb)`, `![boceto](../Assets/Imágenes/boceto.png)`) o con `[[Nombre]]`
   (como en Obsidian: busca un archivo del proyecto con ese nombre).
4. **Estados**: pon `revisar` a lo que hayas terminado para que lo vea una persona. No pongas `aprobado` a tu propio
   trabajo salvo que te lo pidan: aprobar es cosa del equipo.
5. **Sin procesar** (bandeja de entrada): si te dan algo «para dejarlo ahí» o «para luego», guárdalo en `Sin procesar/`
   (`nota "Sin procesar" "…"` o `anadir "Sin procesar" archivo`, con ficha: de quién viene y para qué) y **no lo
   proceses** ni lo leas entero. Solo cuando te pidan procesarlo: léelo, llévalo a su sitio (nota de Contexto, tarea,
   asset) y quita el original de la bandeja.
6. **Bugs**: cuando encuentres un fallo (en un log, una prueba con bots, una captura o un comentario), ábrelo con
   `bug nuevo`: gravedad, build, cómo reproducirlo, qué pasa, qué debería pasar y enlaces a la captura, el vídeo o el
   asset donde se ve. Antes, mira con `bugs --abiertos` que no exista ya. Al arreglarlo, comenta la causa y déjalo en
   `revisar`; **cerrarlo (hecha) es cosa de una persona**.
7. **Tareas**: si te piden organizar trabajo, créalo como tareas (`tarea nueva`) con pasos y enlaces a las IDs de los
   assets. Al trabajar una tarea: muévela a `en-curso`, marca los pasos según avanzas y al acabar déjala en `revisar`
   con un comentario de qué hiciste. **`hecha` la pone una persona.** Mira las tuyas con `tareas --asignada <tu nombre>`.
8. **Ficha de cada asset**: todo asset que subas o crees lleva **nombre** (cómo se llama en el juego, p. ej.
   «Ray Gun Búho», no `raygun_buho_v3.glb`) y **descripción** (qué es, dónde sale en el juego, de dónde viene).
   Ponlos con `anadir … --nombre --descripcion` o con `ficha`. Revisa `fichas --faltan` antes de pasar algo a `revisar`.
9. **Assets de fuera**: `anadir` copia; el original no se mueve ni se borra. Respeta las licencias (apúntalas en
   `Contexto/Referencias.md` o en una nota de créditos).
10. **No dependas del motor**: el proyecto del estudio no es el proyecto de Unity. Si hay uno enlazado
   (`conectores`), no copies el estudio dentro de su `Assets/`; para lanzar órdenes del motor usa `buho-studio unity -- …`.
11. **Comprueba con los ojos**: tras subir modelos, `miniaturas` y mira las imágenes de `.buhostudio/miniaturas/`
   (la ruta sale en el JSON). Para revisar un .blend a fondo, usa la skill `buho-blender`.

## Errores típicos

- «No hay ningún proyecto abierto» → `buho-studio abrir <carpeta>`.
- «No hay nada con la ID …» → la ID es de otro proyecto: `buho-studio id <id>` dice cuál; o lo borraron (mira `historial`).
- La app tiene **un** proyecto abierto a la vez y otros agentes pueden estar usándola: antes de `abrir` otro proyecto,
  comprueba con `estado` cuál está abierto.
- «está fuera del proyecto» → las rutas son relativas al proyecto; no uses `..` para salir.
- En Git Bash, una ruta que empiece por `/` se convierte en ruta de Windows: usa `""` o `.` para la raíz.
- Miniatura de .blend con error → hace falta `buho-blender` instalado (ver `buho-studio conectores`).
