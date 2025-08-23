// Script to manually refresh holdings with current market data
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: './server/.env' })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

async function refreshHoldings() {
  try {
    console.log('🔄 Starting holdings refresh...')
    
    // Get all portfolios
    const { data: portfolios, error: portfoliosError } = await supabase
      .from('portfolios')
      .select('id, name')
    
    if (portfoliosError) {
      console.error('Error fetching portfolios:', portfoliosError)
      return
    }
    
    console.log(`Found ${portfolios.length} portfolios`)
    
    for (const portfolio of portfolios) {
      console.log(`\n📊 Processing portfolio: ${portfolio.name}`)
      
      // Get holdings for this portfolio
      const { data: holdings, error: holdingsError } = await supabase
        .from('holdings')
        .select('*')
        .eq('portfolio_id', portfolio.id)
      
      if (holdingsError) {
        console.error(`Error fetching holdings for portfolio ${portfolio.id}:`, holdingsError)
        continue
      }
      
      console.log(`Found ${holdings.length} holdings`)
      
      // Update each holding with current market data
      for (const holding of holdings) {
        try {
          // Fetch current market data from Finnhub API
          const response = await fetch(
            `https://finnhub.io/api/v1/quote?token=${process.env.FINNHUB_API_KEY}&symbol=${holding.symbol}`
          )
          
          if (!response.ok) {
            console.warn(`Failed to fetch data for ${holding.symbol}: ${response.status}`)
            continue
          }
          
          const quote = await response.json()
          
          if (quote.c === 0) {
            console.warn(`No data available for ${holding.symbol}`)
            continue
          }
          
          // Calculate change and change percent
          const change = quote.c - quote.pc
          const changePercent = (change / quote.pc) * 100
          
          // Update the holding
          const { error: updateError } = await supabase
            .from('holdings')
            .update({
              current_price: quote.c,
              change: change,
              changePercent: changePercent,
              updated_at: new Date().toISOString()
            })
            .eq('id', holding.id)
          
          if (updateError) {
            console.error(`Error updating ${holding.symbol}:`, updateError)
          } else {
            console.log(`✅ Updated ${holding.symbol}: $${quote.c} (${change >= 0 ? '+' : ''}$${change.toFixed(2)}, ${change >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`)
          }
          
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100))
          
        } catch (error) {
          console.error(`Error processing ${holding.symbol}:`, error)
        }
      }
    }
    
    console.log('\n🎉 Holdings refresh completed!')
    
  } catch (error) {
    console.error('Error in refreshHoldings:', error)
  }
}

// Run the refresh
refreshHoldings()
