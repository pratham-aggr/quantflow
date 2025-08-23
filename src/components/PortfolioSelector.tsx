import React, { useState } from 'react'
import { Portfolio, PortfolioWithHoldings } from '../types/portfolio'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

interface PortfolioSelectorProps {
  portfolios: Portfolio[]
  currentPortfolio: PortfolioWithHoldings | null
  onSelectPortfolio: (portfolioId: string) => Promise<void>
}

export const PortfolioSelector: React.FC<PortfolioSelectorProps> = ({
  portfolios,
  currentPortfolio,
  onSelectPortfolio
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const handleSelectPortfolio = async (portfolioId: string) => {
    await onSelectPortfolio(portfolioId)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">Portfolio</h2>
        
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {currentPortfolio ? currentPortfolio.name : 'Select Portfolio'}
            <ChevronDownIcon className="ml-2 h-4 w-4" />
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
              <div className="py-1" role="menu">
                {portfolios.map((portfolio) => (
                  <button
                    key={portfolio.id}
                    onClick={() => handleSelectPortfolio(portfolio.id)}
                    className={`block w-full text-left px-4 py-2 text-sm ${
                      currentPortfolio?.id === portfolio.id
                        ? 'bg-blue-100 text-blue-900'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    role="menuitem"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{portfolio.name}</span>
                      <span className="text-xs text-gray-500">
                        ${portfolio.cash_balance.toLocaleString()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>


    </div>
  )
}
