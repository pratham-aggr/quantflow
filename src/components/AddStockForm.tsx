import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { usePortfolio } from '../contexts/PortfolioContext'
import { FormInput } from './FormInput'
import { LoadingSpinner } from './LoadingSpinner'
import { ErrorMessage } from './ErrorMessage'
import { CreateHoldingSchema, CreateHoldingData } from '../types/portfolio'
import { marketDataService } from '../lib/marketDataService'

interface AddStockFormProps {
  portfolioId: string
  onSuccess?: () => void
}

interface StockSearchResult {
  symbol: string
  name: string
}

export const AddStockForm: React.FC<AddStockFormProps> = ({ portfolioId, onSuccess }) => {
  const { createHolding } = usePortfolio()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [isLoadingPrice, setIsLoadingPrice] = useState(false)
  const [priceAutoFilled, setPriceAutoFilled] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<CreateHoldingData>()

  // Debounced search function
  const debouncedSearch = React.useCallback((query: string) => {
    // Clear any existing timeout
    if ((debouncedSearch as any).timeoutId) {
      clearTimeout((debouncedSearch as any).timeoutId)
    }
    
    // Set new timeout
    (debouncedSearch as any).timeoutId = setTimeout(async () => {
      if (!query || query.length < 1) {
        setSearchResults([])
        setShowSearchResults(false)
        return
      }

      try {
        // Get real-time search results from backend API
        if (marketDataService.isConfigured()) {
          const searchResult = await marketDataService.searchStocks(query)
          if (searchResult && searchResult.result) {
            const realResults = searchResult.result.slice(0, 10).map(item => ({
              symbol: item.symbol,
              name: item.description
            }))
            setSearchResults(realResults)
            setShowSearchResults(true)
            return
          }
        } else {
          console.warn('Market data service not configured - search disabled')
          setSearchResults([])
          setShowSearchResults(false)
        }
      } catch (error) {
        console.error('Failed to fetch search results:', error)
        setSearchResults([])
        setShowSearchResults(false)
      }
    }, 300)
  }, [])

  const selectStock = async (stock: StockSearchResult) => {
    console.log('Selecting stock:', stock)
    setValue('symbol', stock.symbol)
    setValue('company_name', stock.name)
    setShowSearchResults(false)
    
    // Auto-fill average price with current market price
    setIsLoadingPrice(true)
    setPriceAutoFilled(false)
    console.log('Fetching price for:', stock.symbol)
    
    try {
      console.log('Checking if market data service is configured...')
      const isConfigured = marketDataService.isConfigured()
      console.log('Market data service configured:', isConfigured)
      
      if (isConfigured) {
        console.log('Market data service is configured')
        console.log('Calling getStockQuote for:', stock.symbol)
        const quote = await marketDataService.getStockQuote(stock.symbol)
        console.log('Quote received:', quote)
        console.log('Quote type:', typeof quote)
        console.log('Quote price:', quote?.price)
        
        if (quote && quote.price > 0) {
          console.log('Setting price to:', quote.price)
          setValue('avg_price', quote.price)
          setPriceAutoFilled(true)
          console.log('Price auto-fill completed successfully')
        } else {
          console.log('No valid quote received - quote:', quote)
        }
      } else {
        console.log('Market data service not configured')
      }
    } catch (error: any) {
      console.error('Failed to fetch current price for auto-fill:', error)
      console.error('Error details:', error?.message || 'Unknown error')
    } finally {
      setIsLoadingPrice(false)
      console.log('Loading state set to false')
    }
  }

  const onSubmit = async (data: CreateHoldingData) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // Validate data with Zod
      const validatedData = CreateHoldingSchema.parse({
        ...data,
        portfolio_id: portfolioId
      })
      
      const holding = await createHolding(validatedData)
      
      if (holding) {
        reset()
        setSubmitError(null)
        setSearchResults([])
        setShowSearchResults(false)
        setPriceAutoFilled(false)
        onSuccess?.()
      } else {
        setSubmitError('Failed to add stock. Please try again.')
      }
    } catch (error: any) {
      console.error('Add stock error:', error)
      if (error.errors) {
        // Zod validation errors
        setSubmitError(error.errors[0]?.message || 'Validation failed')
      } else {
        setSubmitError('Failed to add stock. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Add New Stock</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Add a new stock holding to your portfolio
        </p>
      </div>

      {submitError && (
        <ErrorMessage 
          message={submitError} 
          onDismiss={() => setSubmitError(null)}
          className="mb-4"
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Stock Symbol Search */}
        <div className="relative">
          <FormInput
            label="Stock Symbol"
            type="text"
            placeholder="e.g., AAPL"
            required
            error={errors.symbol?.message}
            {...register('symbol', {
              required: 'Stock symbol is required',
              minLength: {
                value: 1,
                message: 'Stock symbol must be at least 1 character'
              },
              maxLength: {
                value: 10,
                message: 'Stock symbol must be less than 10 characters'
              },
              onChange: (e) => debouncedSearch(e.target.value)
            })}
          />
          
          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
              {searchResults.map((stock) => (
                <button
                  key={stock.symbol}
                  type="button"
                  onClick={() => selectStock(stock)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none transition-colors"
                >
                  <div className="font-medium text-gray-900 dark:text-white">{stock.symbol}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{stock.name}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Company Name (auto-filled from search) */}
        <FormInput
          label="Company Name"
          type="text"
          placeholder="Company name (optional)"
          error={errors.company_name?.message}
          {...register('company_name')}
        />

        {/* Quantity */}
        <FormInput
          label="Quantity"
          type="number"
          placeholder="100"
          required
          error={errors.quantity?.message}
          {...register('quantity', {
            required: 'Quantity is required',
            valueAsNumber: true,
            min: {
              value: 1,
              message: 'Quantity must be at least 1'
            },
            max: {
              value: 1000000,
              message: 'Quantity cannot exceed 1,000,000'
            }
          })}
        />

        {/* Average Price */}
        <div className="relative">
          <FormInput
            label="Average Price"
            type="number"
            step="0.01"
            placeholder={isLoadingPrice ? "Loading..." : "150.00"}
            required
            error={errors.avg_price?.message}
            disabled={isLoadingPrice}
            {...register('avg_price', {
              required: 'Average price is required',
              valueAsNumber: true,
              min: {
                value: 0.01,
                message: 'Average price must be greater than 0'
              },
              max: {
                value: 100000,
                message: 'Average price cannot exceed $100,000'
              }
            })}
          />
          {isLoadingPrice && (
            <div className="absolute right-3 top-8">
              <LoadingSpinner size="sm" />
            </div>
          )}
        </div>
        
        {/* Auto-fill notification */}
        {priceAutoFilled && (
          <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
            <p className="text-sm text-green-800 dark:text-green-200">
              ✅ Current market price auto-filled. You can adjust this value if needed.
            </p>
          </div>
        )}

        {/* Total Value Preview */}
        {watch('quantity') && watch('avg_price') && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              Total Value: ${((watch('quantity') || 0) * (watch('avg_price') || 0)).toLocaleString()}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 dark:bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <LoadingSpinner size="sm" className="mr-2" />
              Adding Stock...
            </div>
          ) : (
            'Add Stock'
          )}
        </button>
      </form>

      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        <p>Tip: Use the stock symbol search to quickly find and add stocks</p>
        <p>Popular stocks: AAPL, GOOGL, MSFT, AMZN, TSLA</p>
      </div>
    </div>
  )
}
