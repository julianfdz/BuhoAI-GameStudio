# Búho Game Studio · Decisiones de diseño

Fuente de verdad del alcance. Cada decisión con su número, estado y fecha.

| # | Decisión | Estado | Fecha |
|---|---|---|---|
| D-01 | **Proyecto = carpeta real**, como VS Code. Lo propio del estudio va en `.buhostudio/` (proyecto.json, estados.json, comentarios.json, historial.jsonl, miniaturas/). Nada en una base de datos aparte: el proyecto se puede copiar, versionar con git o compartir por Drive. | vigente | 08/11/2026 |
| D-02 | «Abrir carpeta» sobre una carpeta que no es proyecto la **adopta** sin tocar nada (solo crea `.buhostudio/`). «Nuevo proyecto» crea la plantilla. | vigente | 08/11/2026 |
| D-03 | **Plantilla**: `Contexto/` (Lore, Historia, Personajes, Estilo visual, Objetivos, Mecánicas, Referencias), `Assets/` (Modelos 3D, Mapas, Sonidos, Texturas, Imágenes, Animaciones), `Tareas/` (Hitos, Pendientes), `Capturas/`, `Builds/` y `LEEME.md`. | vigente | 08/11/2026 |
| D-04 | **Independiente del motor.** Unity, Blender y ComfyUI son conectores opcionales que se detectan (PATH o `%LOCALAPPDATA%\Programs\<App>\cli`). El proyecto del estudio no va dentro del de Unity (su `Assets/` chocaría): se enlaza con `enlaces.unity`. | vigente | 08/11/2026 |
| D-05 | Las órdenes de Unity se pasan tal cual a `buho-unity` con `cwd` = proyecto de Unity y `BUHO_UNITY_PROJECT` = su ruta. El estudio no reimplementa nada del motor. | vigente | 08/11/2026 |
| D-06 | **Miniaturas 3D**: `.glb/.gltf/.fbx/.obj/.stl` las pinta la propia app con three.js (rápido, sin Blender); `.blend` (y el resto) con `buho-blender captura --fondo`, de una en una. Caché en `.buhostudio/miniaturas/<sha1(ruta|mtime)>.png`, ignorada por git. Si el CLI pide una miniatura de un .glb, el proceso principal se la pide a la interfaz (`pedir-miniatura`) y espera. | vigente | 08/11/2026 |
| D-07 | **Estados** fijos: idea, en curso, revisar, aprobado (los colores no cambian nunca). Se guardan por ruta relativa; al mover o renombrar desde la app o el CLI, el estado y los comentarios siguen al archivo. Si se mueve desde fuera (Explorador), se pierden. | vigente | 08/11/2026 |
| D-08 | **Comentarios** en hilos de un nivel (comentario raíz + respuestas). Resolver se hace sobre el hilo. Un hilo pendiente = raíz sin resolver. | vigente | 08/11/2026 |
| D-09 | **Historial firmado** (`historial.jsonl`, una línea por acción): autor (la persona en Ajustes o el `--autor` del agente), usuario de la app, origen (persona / ia / externo), canal (app / cli / externo), equipo y acción. Los cambios de fuera los detecta el vigilante comparando una foto del árbol (rutas + fechas); tras cada acción propia se rehace la foto, así no se apuntan dos veces. | vigente | 08/11/2026 |
| D-10 | **Agentic first**: todo lo que hace la app lo hace el CLI `buho-studio` por la API local (127.0.0.1:47362, token en `api.json`). Si la app está cerrada, el CLI la abre (instalada o, en desarrollo, el Electron del repo). | vigente | 08/11/2026 |
| D-11 | `anadir` **copia** (nunca mueve) y no pisa: si existe, «nombre (2).ext». Los `.meta` de Unity se saltan. Borrar va a la papelera de Windows. | vigente | 08/11/2026 |
| D-12 | Marca Búho: barra y árbol navy `#0A1F3A`, acento turquesa `#00C1B8`, Georgia en títulos. Un solo tema por ahora. | vigente | 08/11/2026 |
| D-13 | Repo **público** (MIT). Las capturas del README son del proyecto Búho Zombies; nada del juego (assets, docs) va en el repo. | vigente | 08/11/2026 |
| D-14 | **Ficha** de cada archivo o carpeta: nombre legible y descripción en `.buhostudio/fichas.json` (no renombra el archivo). Sigue al archivo al mover o renombrar, se borra con él y entra en la búsqueda. CLI: `ficha`, `fichas --faltan`, `anadir --nombre --descripcion`. | vigente | 09/11/2026 |
