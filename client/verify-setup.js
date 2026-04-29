#!/usr/bin/env node

/**
 * SETUP VERIFICATION SCRIPT
 * Verifica que todos los archivos y configuraciones estén correctos
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ROOT = path.resolve(__dirname)
const SRC = path.join(ROOT, 'src')

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(color, symbol, message) {
  console.log(`${color}${symbol}${colors.reset} ${message}`)
}

function checkFile(filePath, description) {
  const fullPath = path.join(ROOT, filePath)
  if (fs.existsSync(fullPath)) {
    log(colors.green, '✅', `${description}: ${filePath}`)
    return true
  } else {
    log(colors.red, '❌', `${description}: ${filePath} (NOT FOUND)`)
    return false
  }
}

function checkImport(filePath, importStatement, description) {
  const fullPath = path.join(ROOT, filePath)
  if (!fs.existsSync(fullPath)) {
    log(colors.red, '❌', `${description}: File not found (${filePath})`)
    return false
  }

  const content = fs.readFileSync(fullPath, 'utf-8')
  if (content.includes(importStatement)) {
    log(colors.green, '✅', `${description}: Import found`)
    return true
  } else {
    log(colors.red, '❌', `${description}: Import missing (${importStatement})`)
    return false
  }
}

console.log('\n' + colors.cyan + '🔍 Verifying Supabase Glassmorphism Auth Setup' + colors.reset)
console.log(colors.cyan + '─'.repeat(60) + colors.reset + '\n')

let allChecksPassed = true

// Check required files
console.log(colors.blue + '📁 Checking Required Files...' + colors.reset)
const files = [
  ['.env.example', 'Environment template'],
  ['package.json', 'Package configuration'],
  ['src/App.jsx', 'Main App component'],
  ['src/main.jsx', 'Entry point'],
  ['src/components/AuthScreen.tsx', 'Glassmorphism Auth component'],
  ['src/components/UserMenu.tsx', 'User menu component'],
  ['src/hooks/useAuth.ts', 'Auth hook'],
  ['src/lib/supabase.ts', 'Supabase client'],
  ['src/types/database.ts', 'TypeScript types'],
  ['src/canvas/ContentCanvas.jsx', 'Canvas component'],
]

files.forEach(([file, desc]) => {
  if (!checkFile(file, desc)) allChecksPassed = false
})

console.log('\n' + colors.blue + '🔗 Checking Imports...' + colors.reset)

// Check critical imports
const imports = [
  ['src/App.jsx', "from './hooks/useAuth'", 'Auth hook import in App.jsx'],
  ['src/App.jsx', "from './components/AuthScreen'", 'AuthScreen import in App.jsx'],
  ['src/canvas/ContentCanvas.jsx', "from '../components/UserMenu'", 'UserMenu import in ContentCanvas'],
  ['src/components/AuthScreen.tsx', "from '../hooks/useAuth'", 'useAuth hook in AuthScreen'],
  ['src/hooks/useAuth.ts', "from '../lib/supabase'", 'Supabase client in useAuth'],
  ['src/lib/supabase.ts', '@supabase/supabase-js', 'Supabase SDK import'],
]

imports.forEach(([file, importStmt, desc]) => {
  if (!checkImport(file, importStmt, desc)) allChecksPassed = false
})

console.log('\n' + colors.blue + '📦 Checking Dependencies...' + colors.reset)

// Check package.json dependencies
const packageJsonPath = path.join(ROOT, 'package.json')
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
  const deps = packageJson.dependencies || {}

  const requiredDeps = [
    '@supabase/supabase-js',
    'lucide-react',
    'react',
    'react-dom',
  ]

  requiredDeps.forEach(dep => {
    if (deps[dep]) {
      log(colors.green, '✅', `Dependency: ${dep}@${deps[dep]}`)
    } else {
      log(colors.red, '❌', `Dependency: ${dep} (MISSING)`)
      allChecksPassed = false
    }
  })
} else {
  log(colors.red, '❌', 'package.json not found')
  allChecksPassed = false
}

console.log('\n' + colors.blue + '⚙️  Configuration Check...' + colors.reset)

// Check if .env exists
const envPath = path.join(ROOT, '.env')
if (fs.existsSync(envPath)) {
  log(colors.yellow, '⚠️', '.env file exists (remember to add your Supabase credentials)')

  const envContent = fs.readFileSync(envPath, 'utf-8')
  if (envContent.includes('https://your-project') || envContent.includes('your-anon-key')) {
    log(colors.red, '❌', '.env contains placeholder values (add real Supabase credentials)')
    allChecksPassed = false
  } else {
    log(colors.green, '✅', '.env has been configured with values')
  }
} else {
  log(colors.yellow, '⚠️', '.env file not found (copy from .env.example and add Supabase credentials)')
}

// Summary
console.log('\n' + colors.cyan + '─'.repeat(60) + colors.reset)

if (allChecksPassed) {
  console.log('\n' + colors.green + '✨ All checks passed! Setup is complete.' + colors.reset)
  console.log('\n' + colors.cyan + '🚀 Next steps:' + colors.reset)
  console.log('1. Configure .env with your Supabase credentials')
  console.log('2. Enable Auth in Supabase Dashboard')
  console.log('3. Run: npm run dev')
  console.log('4. Open: http://localhost:5173')
  console.log('\n')
} else {
  console.log('\n' + colors.red + '❌ Some checks failed. Please fix the issues above.' + colors.reset)
  console.log('\n' + colors.cyan + '🔧 Quick fix:' + colors.reset)
  console.log('1. Run the setup script:')
  console.log('   Windows: setup-supabase-auth.bat')
  console.log('   Mac/Linux: ./setup-supabase-auth.sh')
  console.log('2. Or manually install dependencies:')
  console.log('   npm install @supabase/supabase-js lucide-react')
  console.log('\n')
}

process.exit(allChecksPassed ? 0 : 1)