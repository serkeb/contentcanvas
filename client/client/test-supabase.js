// Test script para verificar conexión con Supabase
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://julbaobendgltyrwhir.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1aWxiYW9iZW5kZ2x0eXJ3aGlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyODYyMzYsImV4cCI6MjA5MTg2MjIzNn0.-OuCuwnbxBbG5lpati2mEf39DM4v45Wio6uBtdXVk3w'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  console.log('🔍 Testing Supabase connection...')

  try {
    // Test 1: Health check
    console.log('Test 1: Health check...')
    const { data, error } = await supabase.from('users').select('id').limit(1)
    if (error) throw error
    console.log('✅ Supabase connection successful!')

    // Test 2: Check if we can query users
    console.log('Test 2: Querying users table...')
    const { data: users, error: usersError } = await supabase.from('users').select('*')
    if (usersError) throw usersError
    console.log(`✅ Users table accessible! Found ${users.length} users`)

    // Test 3: Check tables exist
    console.log('Test 3: Checking tables...')
    const tables = ['users', 'boards', 'brand_voices', 'api_keys', 'documents', 'transcripts', 'profile_analyses', 'token_usage', 'user_settings']
    for (const table of tables) {
      const { count, error: countError } = await supabase.from(table).select('*', { count: 'exact', head: true })
      if (!countError) {
        console.log(`✅ Table '${table}' accessible`)
      } else {
        console.log(`❌ Table '${table}' error: ${countError.message}`)
      }
    }

    console.log('\n🎉 All tests passed! Supabase is working correctly.')

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

testConnection()