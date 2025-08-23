// Script to update existing holdings with current market data
const { createClient } = require('@supabase/supabase-js')
const axios = require('axios')
require('dotenv').config()

// Create Supabase client
const supabase = createClient(
  'https://boxllxhoxsodlbkagzkq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJveGxseGhveHNvZGxia2FnemtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0ODE3MjYsImV4cCI6MjA3MTA1NzcyNn0.sAtRyX-QdPeq_1Bl1em77QFEYjzr9QEvIECTrF0fLGk'
)

// Market data API endpoint
const MARKET_DATA_URL = 'http://localhost:4000/api/market-data/quote'

async function getCurrentMarketData(symbol) {
  try {
    const response = await axios.get(`${MARKET_DATA_URL}/${symbol}`)
    return response.data.data
  } catch (error) {
    console.error(`Failed to get market data for ${symbol}:`, error.message)
    return null
  }
}

async function updateHoldingsWithMarketData() {
  try {
    console.log('🔄 Updating holdings with current market data...')
    
    // Get all holdings
    const { data: holdings, error } = await supabase
      .from('holdings')
      .select('*')
    
    if (error) {
      console.error('❌ Error fetching holdings:', error)
      return
    }
    
    if (!holdings || holdings.length === 0) {
      console.log('ℹ️ No holdings found in database')
      return
    }
    
    console.log(`📊 Found ${holdings.length} holdings to update`)
    
    // Update each holding with current market data
    for (const holding of holdings) {
      console.log(`\n📈 Updating ${holding.symbol}...`)
      
      try {
        const marketData = await getCurrentMarketData(holding.symbol)
        
        if (marketData) {
          console.log(`  Current price: $${marketData.price}`)
          console.log(`  Change: $${marketData.change} (${marketData.changePercent}%)`)
          
          const { error: updateError } = await supabase
            .from('holdings')
            .update({
              current_price: marketData.price,
              change: marketData.change,
              changePercent: marketData.changePercent,
              updated_at: new Date().toISOString()
            })
            .eq('id', holding.id)
          
          if (updateError) {
            console.error(`  ❌ Error updating ${holding.symbol}:`, updateError)
          } else {
            console.log(`  ✅ Updated ${holding.symbol} successfully`)
          }
        } else {
          console.log(`  ⚠️ No market data available for ${holding.symbol}`)
        }
      } catch (error) {
        console.error(`  ❌ Error processing ${holding.symbol}:`, error.message)
      }
    }
    
    console.log('\n🎉 Holdings update completed!')
    console.log('Now refresh your dashboard to see the updated market data.')
    
  } catch (error) {
    console.error('❌ Error in updateHoldingsWithMarketData:', error)
  }
}

// Run the update
updateHoldingsWithMarketData()
