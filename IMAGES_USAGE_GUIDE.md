# Guía Rápida - Análisis de Imágenes en el Canvas

## 🎯 Funcionalidad Principal

El análisis de imágenes te permite:
- ✅ **Pegar imágenes directamente** en el canvas (Ctrl+V)
- ✅ **Análisis automático** con GPT-4 Vision
- ✅ **Extraer texto visible** (OCR)
- ✅ **Obtener descripciones** del contenido
- ✅ **Conectar con LLMs** para procesar el texto extraído
- ✅ **Añadir a colecciones** como cualquier otro elemento

## 🚀 Uso Ultra-Simple

### Paso 1: Copiar una imagen
- Haz **clic derecho** en cualquier imagen → "Copiar imagen"
- O presiona **Ctrl+C** en una imagen seleccionada
- O toma una **captura de pantalla** (se copia automáticamente)

### Paso 2: Pegar en el canvas
- Presiona **Ctrl+V** en el canvas
- ¡La imagen aparece **instantáneamente**!
- El análisis comienza **automáticamente**

### Paso 3: Esperar el análisis
- **Indicador púrpura** "Analizando..." → Procesando
- **Indicador verde** ✨ → ¡Listo! Click para ver resultados

### Paso 4: Ver resultados
Click en el indicador ✨ para ver:
- Descripción detallada
- Texto extraído (si lo hay)
- Detalles visuales

## 📋 Resultados del Análisis

### Descripción
- Explicación del contenido visual en español
- 2-3 frases detalladas

### Texto Detectado (OCR)
- Todo el texto visible en la imagen
- Múltiples bloques separados
- Botón para copiar al portapapeles

### Detalles Visuales
- Colores y elementos principales
- Personas, objetos, contexto
- Información relevante del contenido

## 🔗 Conectar y Organizar

### Conectar a un LLM
1. Crea un nodo **LLM** (botón con ícono ⚡ en barra lateral)
2. Arrastra desde el borde derecho de la imagen al LLM
3. El texto extraído está disponible como contexto

### Añadir a colecciones
1. Crea o selecciona una **Colección** (botón 📁)
2. Arrastra la imagen dentro
3. Se organiza automáticamente con otros elementos

### Mover y redimensionar
- **Arrastra** la imagen para moverla
- **Selecciona** (borde púrpura) para ver opciones
- **Elimina** con el botón 🗑️ en la toolbar

## 💡 Casos de Uso Rápidos

### Marketing Digital
```
1. Copia un anuncio de competencia
2. Pégalo en el canvas (Ctrl+V)
3. Extrae el texto y analiza el diseño
4. Conéctalo a un LLM para ideas similares
```

### Investigación de Contenido
```
1. Toma captura de un post/reel/tweet
2. Pégalo en el canvas
3. Obtén descripción y texto automáticamente
4. Añádelo a una colección de referencias
```

### Brainstorming Visual
```
1. Copia imágenes inspiracionales
2. Pégalas todas en el canvas
3. Analiza cada una automáticamente
4. Conecta a un LLM para generar ideas
```

## ⚙️ Configuración (Primera vez)

### API Key de OpenAI
1. Click en **⚙️ Configuración** (abajo a la izquierda)
2. Pestaña **"⚙ Configuración"**
3. Campo **"OpenAI"** → Ingresa tu API key
4. **"Guardar claves"**

### Formato de API Key
```
sk-proj-xxxxxxxxxxxxx
```

**Importante:** Necesitas una API key de OpenAI con acceso a GPT-4 Vision.

## 🛠️ Solución de Problemas

### "API key de OpenAI no configurada"
- **Solución:** Ve a Configuración → Ingresa tu API key de OpenAI

### "No se pudo analizar la imagen"
- Verifica tu conexión a internet
- Confirma que la API key sea válida
- Intenta con otra imagen

### La imagen no se pega
- Asegúrate de copiar una **imagen**, no un archivo
- Intenta de nuevo: Ctrl+C en la imagen → Ctrl+V en el canvas
- Prueba con captura de pantalla

### Análisis lento
- Normal: 2-5 segundos según tamaño
- Imágenes grandes tardan más
- Espera el indicador ✨ verde

### No hay text detected
- Puede que no haya texto visible en la imagen
- El OCR funciona mejor con texto claro y legible
- Imágenes borrosas o texto muy pequeño = difícil extracción

## 📋 Formatos Soportados

- ✅ JPEG / JPG (más común)
- ✅ PNG (con transparencia)
- ✅ GIF (animados se analiza el primer frame)
- ✅ WebP
- ✅ BMP
- ✅ Capturas de pantalla
- ✅ Imágenes del navegador

## 🎯 Tips de Productividad

### Para extracción de texto
- **Zoom** antes de copiar = texto más grande = mejor OCR
- **Contraste alto** (texto claro sobre fondo oscuro o viceversa)
- **Evita** texto borroso o muy estilizado

### Para análisis visual
- **Imágenes nítidas** = mejores descripciones
- **Buen iluminación** = más detalles detectados
- **Sujetos claros** = análisis más preciso

### Organización
- **Agrupa** imágenes similares en colecciones
- **Etiqueta** colecciones por tema o campaña
- **Conecta** múltiples imágenes a un mismo LLM para análisis conjunto

## 💰 Costos y Rendimiento

### Costo por imagen
- ~$0.01-0.05 USD por imagen
- Depende del tamaño y complejidad
- GPT-4o es el modelo usado

### Rendimiento
- 2-5 segundos por imagen
- Análisis en paralelo si pegas varias
- El canvas no se bloquea durante el análisis

## 🚀 Flujo de Trabajo Completo

### Ejemplo: Análisis de Competencia
```
1. Abre el Instagram de la competencia
2. Encuentra un post interesante
3. Copia la imagen (Ctrl+C)
4. Pégala en tu canvas (Ctrl+V)
5. Espera el análisis automático
6. Click en ✨ para ver texto extraído
7. Conecta a un LLM
8. Pide: "Genera 10 variaciones de este post"
9. ¡Listo! Tienes ideas originales basadas en competencia
```

### Ejemplo: Referencias Visuales
```
1. Busca "packaging design" en Pinterest/Google
2. Copia 5-10 imágenes que te gusten
3. Pégalas todas en el canvas (Ctrl+V varias veces)
4. Espera análisis de todas
5. Crea una colección "Packaging Inspo"
6. Arrastra todas las imágenes ahí
7. Conecta a un LLM
8. Pide: "¿Qué elementos en común tienen estos diseños?"
9. Obtén insights de diseño automáticamente
```

---

**¿Necesitas más ayuda?** Consulta `IMAGE_ANALYSIS_FEATURE.md` para detalles técnicos
