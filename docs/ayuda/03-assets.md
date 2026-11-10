---
categoria: Assets
resumen: Galería, fichas (nombre y descripción), estados y miniaturas
---
# Assets, fichas y estados

## Galería

En **Archivos**, cada carpeta se ve como una galería. Las carpetas enseñan lo que tienen dentro: miniaturas de imágenes, fotogramas de vídeo y modelos 3D, o el icono y el nombre de sus sonidos, mapas y notas. Las vacías, un icono.

- **Subir archivos** o arrastrarlos desde el Explorador: se **copian** (el original no se toca).
- Arrastra una tarjeta a una carpeta del árbol para moverla.
- Filtro por estado e «Incluir subcarpetas» para ver todo junto.

## Ficha: nombre y descripción

Cada archivo o carpeta puede tener un **nombre** legible («Ray Gun Búho» en vez de `raygun_v3.glb`) y una **descripción** (qué es, dónde sale en el juego, de dónde viene). Se editan en el bloque **Ficha** del panel derecho y se ven en las tarjetas y en la búsqueda. El archivo no se renombra.

```
buho-studio ficha a-3f9c21b0 --nombre "Ray Gun Búho" --descripcion "Arma maravilla del nivel 2"
buho-studio fichas Assets --faltan     # assets sin nombre o descripción
```

## Estados

**Idea → En curso → Revisar → Aprobado**, en cualquier archivo o carpeta. La pestaña **Estados** los junta en columnas. Un agente pone «revisar» a lo que termina; aprobar es cosa del equipo.

## Modelos 3D

`.glb`, `.gltf`, `.fbx`, `.obj` y `.stl` se ven en el visor 3D (girar, acercar, animaciones). Los `.blend` usan `buho-blender` para la miniatura y «Abrir en Blender».
