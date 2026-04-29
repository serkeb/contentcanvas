#!/bin/bash

echo "🎨 Content Research Canvas"
echo "=========================="

# Verificar que existe .env
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "⚠️  Se creó .env desde .env.example"
        echo "   Editá .env y agregá tu OPENAI_API_KEY antes de continuar"
        echo ""
    else
        echo "❌ No se encontró .env ni .env.example"
        exit 1
    fi
fi

# Verificar Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 no está instalado"
    exit 1
fi

# Verificar Node
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    exit 1
fi

# Verificar ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  ffmpeg no encontrado — la transcripción de audio puede fallar"
    echo "   Instalá ffmpeg: brew install ffmpeg (Mac) / sudo apt install ffmpeg (Linux)"
fi

# Instalar dependencias Python si no están
echo "📦 Verificando dependencias Python..."
pip install -r requirements.txt -q

# Instalar dependencias Node si no están
echo "📦 Verificando dependencias Node..."
cd client && npm install --silent && cd ..

echo ""
echo "🚀 Iniciando backend en http://localhost:5000"
python3 server.py &
BACKEND_PID=$!

echo "🚀 Iniciando frontend en http://localhost:5173"
cd client && npm run dev &
FRONTEND_PID=$!

sleep 3

# Abrir navegador
if [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:5173
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open http://localhost:5173 2>/dev/null || echo "Abrí http://localhost:5173 en tu navegador"
else
    echo "Abrí http://localhost:5173 en tu navegador"
fi

echo ""
echo "✅ App corriendo. Presioná Ctrl+C para detener."
echo ""

# Esperar y limpiar al salir
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'App detenida.'" EXIT
wait
