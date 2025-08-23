// Test script to debug add stock functionality
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Create Supabase client
const supabase = createClient(
  'https://boxllxhoxsodlbkagzkq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJveGxseGhveHNvZGxia2FnemtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0ODE3MjYsImV4cCI6MjA3MTA1NzcyNn0.sAtRyX-QdPeq_1Bl1em77QFEYjzr9QEvIECTrF0fLGk'
)

async function testAddStock() {
  try {
    console.log('🔍 Testing add stock functionality...')
    
    // 1. Check if we have any users (correct table name)
    console.log('\n1. Checking users...')
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(5)
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
    } else {
      console.log(`✅ Found ${users?.length || 0} users`)
      if (users && users.length > 0) {
        console.log('First user:', users[0].email)
      }
    }
    
    // 2. Check if we have any portfolios
    console.log('\n2. Checking portfolios...')
    const { data: portfolios, error: portfoliosError } = await supabase
      .from('portfolios')
      .select('*')
      .limit(5)
    
    if (portfoliosError) {
      console.error('❌ Error fetching portfolios:', portfoliosError)
    } else {
      console.log(`✅ Found ${portfolios?.length || 0} portfolios`)
      if (portfolios && portfolios.length > 0) {
        console.log('First portfolio:', portfolios[0])
      }
    }
    
    // 3. Check if we have any holdings
    console.log('\n3. Checking holdings...')
    const { data: holdings, error: holdingsError } = await supabase
      .from('holdings')
      .select('*')
      .limit(5)
    
    if (holdingsError) {
      console.error('❌ Error fetching holdings:', holdingsError)
    } else {
      console.log(`✅ Found ${holdings?.length || 0} holdings`)
      if (holdings && holdings.length > 0) {
        console.log('First holding:', holdings[0])
      }
    }
    
    // 4. Check all tables in the database
    console.log('\n4. Checking available tables...')
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
    
    if (tablesError) {
      console.error('❌ Error fetching tables:', tablesError)
    } else {
      console.log('Available tables:')
      tables?.forEach(table => {
        console.log(`  - ${table.table_name}`)
      })
    }
    
    console.log('\n🎯 Test completed!')
    console.log('\n💡 DIAGNOSIS:')
    if (users && users.length > 0) {
      console.log('✅ Users exist - you can log in')
    } else {
      console.log('❌ No users found - you need to register first')
    }
    
    if (portfolios && portfolios.length > 0) {
      console.log('✅ Portfolios exist - you can add stocks')
    } else {
      console.log('❌ No portfolios found - you need to create a portfolio first')
    }
    
    console.log('\n📋 NEXT STEPS:')
    console.log('1. Go to http://localhost:3001')
    console.log('2. Register/Login with your account')
    console.log('3. Create a portfolio')
    console.log('4. Then try adding stocks')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testAddStock()
