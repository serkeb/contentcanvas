# Content Research Canvas

Pizarrón visual para research de contenido. Pegá un link de YouTube, Instagram o TikTok y obtené transcripción, análisis, ideas y guión generado por IA — todo en un canvas interactivo.

## Requisitos

- **Python 3.9+**
- **Node.js 18+**
- **ffmpeg** (para extraer audio de videos)
- **API Key de OpenAI** con acceso a Whisper y GPT-4o

### Instalar ffmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt install ffmpeg
```

**Windows:**
Descargá desde https://ffmpeg.org/download.html y agregalo al PATH.

## Instalación

```bash
# 1. Cloná o descargá el proyecto
cd content-research

# 2. Configurá tu API key
cp .env.example .env
# Editá .env y reemplazá con tu API key real:
# OPENAI_API_KEY=sk-proj-...

# 3. Instalá dependencias Python
pip install -r requirements.txt

# 4. Instalá dependencias frontend
cd client && npm install && cd ..
```

## Cómo conseguir la API key de OpenAI

1. Entrá a https://platform.openai.com
2. Registrate o iniciá sesión
3. Andá a **API Keys** en el menú lateral
4. Creá una nueva key con el botón **"Create new secret key"**
5. Copiá la key (empieza con `sk-proj-...`) y pegala en tu `.env`

> **Nota:** El uso de Whisper y GPT-4o tiene costo. Verificá los precios en https://openai.com/api/pricing

## Correr la app

### Opción 1: Script automático (recomendado)

```bash
chmod +x start.sh
./start.sh
```

### Opción 2: Manual (dos terminales)

**Terminal 1 — Backend:**
```bash
python3 server.py
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
```

Luego abrí http://localhost:5173 en tu navegador.

## Uso

1. **Pegá un link** con Ctrl+V (o Cmd+V en Mac) en cualquier parte del canvas
2. O usá el **input superior** para pegar la URL manualmente
3. El sistema descarga el audio, lo transcribe con Whisper y lo analiza con GPT-4o
4. En el canvas aparecen nodos conectados con:
   - El video fuente
   - La transcripción completa
   - Análisis del hook, estructura y CTA
   - 8 ideas de contenido derivadas
   - Un guión listo para usar

## Plataformas soportadas

| Plataforma | Soporte | Notas |
|------------|---------|-------|
| YouTube | ✅ Completo | Videos públicos, Shorts |
| Instagram | ⚠️ Parcial | Reels públicos (puede fallar por restricciones) |
| TikTok | ⚠️ Parcial | Videos públicos (puede fallar por restricciones) |

## Limitaciones conocidas

- Solo funciona con videos **públicos**
- Videos muy largos (>2hs) pueden tardar varios minutos en transcribirse
- Instagram y TikTok pueden bloquear la descarga dependiendo de la región y el video
- Si la transcripción falla, podés pegar el texto manualmente en el nodo de error y hacer clic en "Analizar con GPT-4o"
- El canvas se guarda automáticamente en el navegador (localStorage) — no se sincroniza entre dispositivos

## Estructura del proyecto

```
content-research/
├── server.py          # Backend Flask (API de transcripción y análisis)
├── requirements.txt   # Dependencias Python
├── .env               # API key (no commitear)
├── .env.example       # Template de configuración
├── start.sh           # Script de inicio
└── client/            # Frontend React + Vite
    ├── src/
    │   ├── App.jsx
    │   ├── canvas/
    │   │   ├── ContentCanvas.jsx   # Canvas principal con React Flow
    │   │   ├── nodes/
    │   │   │   ├── VideoNode.jsx
    │   │   │   ├── TranscriptNode.jsx
    │   │   │   └── InsightNode.jsx
    │   │   └── utils/
    │   │       ├── api.js          # Llamadas al backend
    │   │       └── storage.js      # Persistencia localStorage
    └── ...
```

## Soporte

Si el backend no responde, verificá:
1. Que `python3 server.py` esté corriendo y sin errores
2. Que el puerto 5000 esté libre (`lsof -i :5000`)
3. Que tu `.env` tenga la API key correcta
