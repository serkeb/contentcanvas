@echo off
REM ===================================
REM SETUP SCRIPT FOR SUPABASE AUTH (Windows)
REM ===================================

echo.
echo 🎨 Setting up Glassmorphism Auth with Supabase...
echo.

REM Check if .env exists
if not exist .env (
    echo 📝 Creating .env file...
    copy .env.example .env
    echo ✅ .env file created!
    echo.
    echo ⚠️  IMPORTANT: Edit .env and add your Supabase credentials:
    echo    VITE_SUPABASE_URL=https://your-project.supabase.co
    echo    VITE_SUPABASE_ANON_KEY=your-anon-key-here
    echo.
    echo Get these from: https://supabase.com/dashboard → Your Project → Settings → API
    echo.
    pause
) else (
    echo ✅ .env file already exists
)

REM Check if node_modules exists
if not exist node_modules (
    echo.
    echo 📦 Installing dependencies...
    call npm install
    echo ✅ Dependencies installed!
) else (
    echo ✅ Dependencies already installed
)

echo.
echo 🔧 Verifying configuration...

findstr /C:"https://your-project" .env >nul
if %errorlevel%==0 (
    echo ⚠️  WARNING: .env still has placeholder values!
    echo    Please edit .env and add your real Supabase credentials
    echo.
    pause
    exit /b 1
)

echo ✅ Configuration looks good!
echo.

echo 🎯 Setup complete! Next steps:
echo.
echo 1. Make sure Supabase Auth is enabled:
echo    - Go to: https://supabase.com/dashboard
echo    - Your Project → Authentication → Settings
echo    - Enable 'Email Auth'
echo.
echo 2. Configure Redirect URLs:
echo    - Authentication → URL Configuration
echo    - Add: http://localhost:5173/**
echo.
echo 3. Start the dev server:
echo    npm run dev
echo.
echo 4. Open http://localhost:5173
echo.
echo ✨ You should see the glassmorphism auth screen!
echo.
pause