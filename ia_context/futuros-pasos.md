# Búho Game Studio · Futuros pasos

Lo aplazado, con el motivo y lo que hace falta para retomarlo.

| Tema | Por qué se aplaza | Qué hace falta |
|---|---|---|
| **ComfyUI** (generar imágenes y texturas en `Assets/`) | Fuera del alcance de la v0.1; Julián lo pidió solo previsto | URL del servidor en `proyecto.json` (`conectores.comfyui.url`, ya existe el campo), flujo de ejemplo y orden `buho-studio generar` que deje la imagen con estado «revisar» |
| Acciones de Unity desde la interfaz (botones de refrescar, play, captura) | `buho-unity` acababa de nacer; de momento solo por CLI (`buho-studio unity -- …`) | Panel en Conectores con las órdenes más usadas y su salida |
| Mantener estados y comentarios al mover desde el Explorador | El vigilante solo ve «desaparece» y «aparece» | Emparejar por tamaño + fecha en la misma pasada |
| Miniaturas de vídeo y de texturas grandes (EXR, TGA, PSD) | No las pinta Chromium | Conversión con ffmpeg o con Blender |
| Instalador probado de punta a punta en otro PC | Solo se ha probado en el equipo de Julián | Probar `npm run dist` en limpio |
| Bloqueo cuando dos personas abren el mismo proyecto en Drive | Poco probable al principio | Archivo de bloqueo como en Búho BC3 |
| Enlace a Unity por equipo | `proyecto.json` guarda la ruta de Unity de un PC; al compartir por Drive no vale en otro | Guardar `enlaces.unity` en los ajustes del usuario por id de proyecto, con el del proyecto como valor por defecto |
| Conflictos de Drive en `.buhostudio/*.json` | Dos personas cambiando estados o comentarios a la vez | Un archivo por comentario o por cambio (como el historial, que solo añade) y bloqueo suave con quién lo tiene abierto |

## Ideas para que el estudio sea el núcleo del trabajo de agentes con videojuegos (10/11/2026)

Sin hacer todavía; para hablarlo con Julián.

1. **Encargar a un agente desde la app.** Un botón «Pedir a un agente» en un archivo, una carpeta o un comentario lanza Claude Code (o Codex) con el contexto del proyecto y las skills del juego (`buho-blender`, `buho-unity`, `buho-comfy`). El encargo sale como tarjeta con su log en directo y acaba en «revisar».
2. **Brief del juego para agentes.** `buho-studio contexto --brief` junta estilo visual, lore, mecánicas, convenciones de nombres y decisiones en un solo texto corto. Así todos los agentes trabajan con la misma biblia y no se contradicen.
3. **Tareas como tarjetas que los agentes cogen.** `Tareas/` pasa a tablero con «la coge Claude» (bloqueo), avance y resultado enlazado a los assets que toca. Varios agentes en paralelo sin pisarse.
4. **Cadena de un asset de punta a punta.** Concept (ComfyUI) → modelo (Blender) → hoja de vistas → comparar con el estilo → optimizar → importar en Unity → captura dentro del juego → ficha y estado. Todo con un botón, y cada paso queda en el historial.
5. **QA con bots que graba gameplays.** `buho-unity` juega con bots y graba; el vídeo entra en `Capturas/Gameplay` con su ficha (versión, qué se probó). Un agente revisa vídeo y logs y abre comentarios con los fallos en el archivo o la escena.
6. **Builds con changelog.** Cada build en `Builds/` lleva el changelog sacado del historial y el gameplay de esa versión.
7. **Crítico de arte.** Un agente compara cada asset nuevo con «Estilo visual» y las referencias y deja comentarios («el tono no encaja», «escala rara»).
8. **Créditos y licencias automáticos.** Origen y licencia en la ficha de cada asset y una nota de créditos generada sola.
9. **Panel de agentes.** Quién está trabajando ahora y en qué (a partir del historial con origen IA), con avisos cuando un agente deja algo para revisar.
