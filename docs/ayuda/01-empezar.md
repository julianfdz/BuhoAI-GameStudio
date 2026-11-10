---
categoria: Empezar
resumen: Qué es Búho Game Studio y cómo se organiza un proyecto
---
# Qué es Búho Game Studio

La mesa de trabajo de un videojuego, para personas y agentes de IA. Cada proyecto es **una carpeta de verdad** del disco: lo que ves en la app son sus archivos, y se pueden abrir también con el Explorador, Blender, Unity o git.

## Abrir o crear un proyecto

- **Nuevo proyecto**: crea la carpeta con la plantilla estándar (Contexto, Assets, Tareas, Capturas, Builds).
- **Abrir carpeta**: abre una carpeta que ya es un proyecto, o adopta una carpeta cualquiera tal cual.
- Para qué sirve cada carpeta (y la bandeja **Sin procesar**): mira «Estructura del proyecto».
- La app guarda lo suyo en la carpeta oculta `.buhostudio/` del proyecto: IDs, fichas, estados, comentarios e historial. Todo lo demás son archivos normales.

## Las pestañas

| Pestaña | Para qué |
|---|---|
| **Inicio** | Resumen del proyecto, lo pendiente y una tarjeta por sección para ir directo |
| **Archivos** | Árbol a la izquierda, galería o archivo en el centro, ficha y comentarios a la derecha |
| **Tareas** | Kanban de tareas: por hacer, en curso, revisar y hecha |
| **Estados** | Assets agrupados por estado (idea, en curso, revisar, aprobado) |
| **Actividad** | Comentarios abiertos e historial firmado de todo el proyecto |
| **Conectores** | Blender, Unity, ComfyUI y tu nombre para firmar |
| **Ayuda** | Estas páginas |

## Trabajar con la IA

Un agente (Claude Code, Codex…) trabaja con el CLI `buho-studio` y lo que hace aparece al momento en la app, firmado con su nombre. Para pedirle algo concreto, copia la **ID** de lo que quieres cambiar y pégala en el chat (mira «IDs»).
