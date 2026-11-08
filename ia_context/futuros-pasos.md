# Búho Game Studio · Futuros pasos

Lo aplazado, con el motivo y lo que hace falta para retomarlo.

| Tema | Por qué se aplaza | Qué hace falta |
|---|---|---|
| **ComfyUI** (generar imágenes y texturas en `Assets/`) | Fuera del alcance de la v0.1; Julián lo pidió solo previsto | URL del servidor en `proyecto.json` (`conectores.comfyui.url`, ya existe el campo), flujo de ejemplo y orden `buho-studio generar` que deje la imagen con estado «revisar» |
| Acciones de Unity desde la interfaz (botones de refrescar, play, captura) | `buho-unity` acababa de nacer; de momento solo por CLI (`buho-studio unity -- …`) | Panel en Conectores con las órdenes más usadas y su salida |
| Mantener estados y comentarios al mover desde el Explorador | El vigilante solo ve «desaparece» y «aparece» | Emparejar por tamaño + fecha en la misma pasada |
| Miniaturas de vídeo y de texturas grandes (EXR, TGA, PSD) | No las pinta Chromium | Conversión con ffmpeg o con Blender |
| Varios temas de color y modo oscuro | Un solo tema por ahora (D-12) | Copiar `lib/temas.ts` de Búho BC3 |
| Instalador probado de punta a punta en otro PC | Solo se ha probado en el equipo de Julián | Probar `npm run dist` en limpio |
| Bloqueo cuando dos personas abren el mismo proyecto en Drive | Poco probable al principio | Archivo de bloqueo como en Búho BC3 |
