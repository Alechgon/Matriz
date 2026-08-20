# SOSER · Ficha de Evaluación de Establecimiento

App móvil tipo formulario (1 pregunta = 1 pantalla) para que las manipuladoras
levanten en terreno la **Ficha de Evaluación** completa: 51 preguntas que caen
exactamente en las 51 columnas de la plantilla Excel.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | Interfaz y estilos (paleta SOSER: carbón `#333333`, naranjo `#F49A0F`, verde `#7DB61C`) |
| `app.js` | Motor del cuestionario, cámara, subida a Drive y envío al Sheet |
| `data.js` | Base de los 118 establecimientos de Santiago y Estación Central |
| `AppsScript_SOSER_v5.gs` | Backend. Mantiene todo lo de "Agregar Caso" y suma la ficha |

## Instalación

**1 · Backend (una sola vez)**

1. Abre el Google Sheet de casos ▸ **Extensiones ▸ Apps Script**
2. Borra todo y pega `AppsScript_SOSER_v5.gs` completo
3. **Implementar ▸ Gestionar implementaciones ▸ ✎ ▸ Versión: Nueva versión ▸ Implementar**
   - Ejecutar como: **Yo** · Acceso: **Cualquier persona**
   - Así conservas la misma URL `/exec`, que ya viene escrita en `app.js`

La hoja **"Ficha de Evaluación"** se crea sola con la primera ficha enviada.
Las fotos van a la carpeta de Drive `SOSER_Fichas_<idHoja>`.

**2 · Frontend**

Sube los 3 archivos al repo y activa GitHub Pages. No hay nada que configurar
en la app: la URL del backend está integrada en el código.

## Flujo

```
Ingresar → Nombre de quien evalúa → Buscar establecimiento (nombre o RBD)
        → 51 preguntas, una por pantalla, con ‹ atrás y Continuar
        → Revisión final → Enviar
```

- **Caché automático.** Se guarda en cada toque. Si se bloquea el celular o se
  cierra el navegador, al volver aparece **"Continuar ficha"**.
- **Saltos.** Si no hay cocina / bodega / baño / vestuario / caseta de gas, se
  omiten sus preguntas y esas columnas se escriben como `NO APLICA`.
- **Fotos.** Suben a Drive en segundo plano con barra de progreso. Donde la foto
  es obligatoria, el botón *Continuar* queda bloqueado hasta que el check verde
  confirme la subida. Si falla, el recuadro rojo permite reintentar.

## Estructura de la hoja

- **Fila 1** — bloques temáticos combinados (naranjo), igual que la plantilla.
- **Fila 2** — los **51 títulos exactos** del Excel (carbón), en **columnas A a AY**.
- **Columnas AZ a CB** — 29 columnas adicionales (azul), cada una con su propio
  título rotulado `→ P## · …` indicando a qué pregunta pertenece. Ninguna
  comparte celda con otra.
- **Fila 3 en adelante** — una ficha por fila.

**Para llenar tu matriz:** selecciona **A3:AY** y copia. Ese rango es
exactamente la plantilla, en el mismo orden y con los mismos títulos. Una línea
azul gruesa marca dónde termina la matriz y empieza lo agregado por la app.

Las no conformidades críticas (sin resolución sanitaria, sin agua potable, piso
o caseta en MALO, sin lavamanos, sin certificación SEC) se pintan solas en rojo.
