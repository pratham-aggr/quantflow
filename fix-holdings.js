// Simple script to fix holdings with current market data
const { createClient } = require('@supabase/supabase-js')
const axios = require('axios')
require('dotenv').config()

// Create Supabase client
const supabase = createClient(
  'https://boxllxhoxsodlbkagzkq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJveGxseGhveHNvZGxia2FnemtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0ODE3MjYsImV4cCI6MjA3MTA1NzcyNn0.sAtRyX-QdPeq_1Bl1em77QFEYjzr9QEvIECTrF0fLGk'
)

// Finnhub API configuration
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1'

// Rate limiting configuration
const RATE_LIMIT = {
  callsPerMinute: 60,
  callsPerSecond: 1,
  retryDelay: 1000,
  maxRetries: 3
}

// Fetch real market data for a symbol
async function getStockQuote(symbol) {
  if (!FINNHUB_API_KEY) {
    console.error('❌ Finnhub API key not configured. Cannot fetch real market data.')
    return null
  }

  try {
    const url = `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`
    console.log(`📡 Fetching real market data for ${symbol}...`)
    
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'QuantFlow/1.0'
      }
    })

    if (response.data && response.data.c) {
      const currentPrice = response.data.c
      const previousClose = response.data.pc
      const change = currentPrice - previousClose
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0

      return {
        price: currentPrice,
        change: change,
        changePercent: changePercent
      }
    } else {
      console.warn(`⚠️ No data returned for ${symbol}`)
      return null
    }
  } catch (error) {
    console.error(`❌ Error fetching data for ${symbol}:`, error.message)
    return null
  }
}

async function fixHoldings() {
  try {
    console.log('🔧 Fixing holdings with real market data...')
    
    // Get all holdings
    const { data: holdings, error } = await supabase
      .from('holdings')
      .select('*')
    
    if (error) {
      console.error('Error fetching holdings:', error)
      return
    }
    
    console.log(`Found ${holdings.length} holdings`)
    
    // Update each holding with real market data
    for (const holding of holdings) {
      console.log(`📈 Updating ${holding.symbol}...`)
      
      const stockData = await getStockQuote(holding.symbol)
      
      if (stockData) {
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
        console.log(`⚠️ No market data available for ${holding.symbol}`)
      }
      
      // Rate limiting - wait between requests
      if (holdings.indexOf(holding) < holdings.length - 1) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.retryDelay))
      }
    }
    
    console.log('\n🎉 Holdings fix completed with real market data!')
    console.log('Now refresh your dashboard to see the updated data.')
    
  } catch (error) {
    console.error('Error in fixHoldings:', error)
  }
}

// Run the fix
fixHoldings()
