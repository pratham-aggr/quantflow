// Simple script to fix holdings with current market data
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Create Supabase client
const supabase = createClient(
  'https://boxllxhoxsodlbkagzkq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJveGxseGhveHNvZGxia2FnemtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0ODE3MjYsImV4cCI6MjA3MTA1NzcyNn0.sAtRyX-QdPeq_1Bl1em77QFEYjzr9QEvIECTrF0fLGk'
)

// Current market data (from API)
const marketData = {
  'TSLA': { price: 340.01, change: 19.9, changePercent: 6.2166 },
  'NVDA': { price: 177.99, change: 3.01, changePercent: 1.7202 },
  'AAPL': { price: 227.76, change: 2.86, changePercent: 1.2717 },
  'MSFT': { price: 507.23, change: -9.85, changePercent: -1.91 },
  'AMZN': { price: 457.68, change: 13.76, changePercent: 3.10 }
}

async function fixHoldings() {
  try {
    console.log('🔧 Fixing holdings with current market data...')
    
    // Get all holdings
    const { data: holdings, error } = await supabase
      .from('holdings')
      .select('*')
    
    if (error) {
      console.error('Error fetching holdings:', error)
      return
    }
    
    console.log(`Found ${holdings.length} holdings`)
    
    // Update each holding with current market data
    for (const holding of holdings) {
      const stockData = marketData[holding.symbol]
      
      if (stockData) {
        console.log(`📈 Updating ${holding.symbol}...`)
        
        const { error: updateError } = await supabase
          .from('holdings')
          .update({
            current_price: stockData.price,
            change: stockData.change,
            changePercent: stockData.changePercent,
            updated_at: new Date().toISOString()
          })
          .eq('id', holding.id)
        
        if (updateError) {
          console.error(`❌ Error updating ${holding.symbol}:`, updateError)
        } else {
          console.log(`✅ Updated ${holding.symbol}: $${stockData.price} (${stockData.change >= 0 ? '+' : ''}$${stockData.change.toFixed(2)}, ${stockData.change >= 0 ? '+' : ''}${stockData.changePercent.toFixed(2)}%)`)
        }
      } else {
        console.log(`⚠️ No market data for ${holding.symbol}`)
      }
    }
    
    console.log('\n🎉 Holdings fix completed!')
    console.log('Now refresh your dashboard to see the updated data.')
    
  } catch (error) {
    console.error('Error in fixHoldings:', error)
  }
}

// Run the fix
fixHoldings()
