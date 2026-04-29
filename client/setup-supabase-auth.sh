#!/bin/bash

# ===================================
# SETUP SCRIPT FOR SUPABASE AUTH
# ===================================
# This script configures everything needed for glassmorphism auth

set -e

echo "🎨 Setting up Glassmorphism Auth with Supabase..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created!"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and add your Supabase credentials:"
    echo "   VITE_SUPABASE_URL=https://your-project.supabase.co"
    echo "   VITE_SUPABASE_ANON_KEY=your-anon-key-here"
    echo ""
    echo "Get these from: https://supabase.com/dashboard → Your Project → Settings → API"
    echo ""
    read -p "Press Enter after you've configured .env..."
else
    echo "✅ .env file already exists"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed!"
else
    echo "✅ Dependencies already installed"
fi

echo ""
echo "🔧 Verifying configuration..."

# Check if .env has SUPABASE_URL
if grep -q "VITE_SUPABASE_URL=https://your-project" .env; then
    echo "⚠️  WARNING: .env still has placeholder values!"
    echo "   Please edit .env and add your real Supabase credentials"
    echo ""
    exit 1
fi

echo "✅ Configuration looks good!"
echo ""

echo "🎯 Setup complete! Next steps:"
echo ""
echo "1. Make sure Supabase Auth is enabled:"
echo "   - Go to: https://supabase.com/dashboard"
echo "   - Your Project → Authentication → Settings"
echo "   - Enable 'Email Auth'"
echo ""
echo "2. Configure Redirect URLs:"
echo "   - Authentication → URL Configuration"
echo "   - Add: http://localhost:5173/**"
echo ""
echo "3. Start the dev server:"
echo "   npm run dev"
echo ""
echo "4. Open http://localhost:5173"
echo ""
echo "✨ You should see the glassmorphism auth screen!"
echo ""