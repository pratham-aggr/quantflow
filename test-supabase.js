// Test script to verify Supabase connection
// Run with: node test-supabase.js

const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config()

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

console.log('🔍 Testing Supabase Connection...')
console.log('URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
console.log('Key:', supabaseAnonKey ? '✅ Set' : '❌ Missing')

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('\n❌ Missing environment variables!')
  console.log('Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  try {
    console.log('\n🔗 Testing connection...')
    
    // Test basic connection
    const { data, error } = await supabase.from('user_profiles').select('count').limit(1)
    
    if (error) {
      console.log('❌ Connection failed:', error.message)
      
      if (error.message.includes('relation "user_profiles" does not exist')) {
        console.log('\n💡 The user_profiles table does not exist.')
        console.log('Please create the required tables in your Supabase dashboard.')
        console.log('See SUPABASE_SETUP.md for the SQL commands.')
      }
      
      return false
    }
    
    console.log('✅ Connection successful!')
    console.log('✅ user_profiles table exists')
    
    // Test other tables
    const tables = ['portfolios', 'holdings', 'transactions']
    
    for (const table of tables) {
      try {
        const { error: tableError } = await supabase.from(table).select('count').limit(1)
        if (tableError) {
          console.log(`❌ ${table} table missing:`, tableError.message)
        } else {
          console.log(`✅ ${table} table exists`)
        }
      } catch (err) {
        console.log(`❌ Error checking ${table} table:`, err.message)
      }
    }
    
    return true
    
  } catch (error) {
    console.log('❌ Test failed:', error.message)
    return false
  }
}

testConnection().then(success => {
  if (success) {
    console.log('\n🎉 Supabase is properly configured!')
    console.log('You can now test the app at http://localhost:3000')
  } else {
    console.log('\n⚠️  Please fix the issues above before testing the app')
  }
})
