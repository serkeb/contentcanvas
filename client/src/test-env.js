// Test script para verificar variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('🔍 Variables de entorno:')
console.log('VITE_SUPABASE_URL:', supabaseUrl)
console.log('VITE_SUPABASE_ANON_KEY:', supabaseKey ? '✅ Configurada' : '❌ No configurada')

if (!supabaseUrl || supabaseUrl === 'https://your-project.supabase.co') {
  console.error('❌ Error: VITE_SUPABASE_URL no está configurada correctamente')
  console.log('Por favor, verifica el archivo .env')
} else {
  console.log('✅ VITE_SUPABASE_URL configurada correctamente')
}

if (!supabaseKey || supabaseKey === 'your-anon-key-here') {
  console.error('❌ Error: VITE_SUPABASE_ANON_KEY no está configurada correctamente')
  console.log('Por favor, verifica el archivo .env')
} else {
  console.log('✅ VITE_SUPABASE_ANON_KEY configurada correctamente')
}

console.log('\n🎯 Si ves ✅ en ambas verificaciones, todo está listo!')
export {}
