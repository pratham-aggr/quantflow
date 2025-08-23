import { performanceMonitor } from './performance'
import { Holding, Transaction } from '../types/portfolio'

interface CSVImportResult {
  success: boolean
  message: string
  data?: any[]
  errors?: string[]
}

interface CSVExportOptions {
  includeHeaders?: boolean
  dateFormat?: string
  currencyFormat?: string
}

class CSVService {
  // Import CSV file for bulk transactions
  async importTransactions(file: File): Promise<CSVImportResult> {
    return performanceMonitor.trackAsync('csv_import', async () => {
      const text = await file.text()
      const lines = text.split('\n')
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      
      const transactions: any[] = []
      const errors: string[] = []
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        const values = this.parseCSVLine(line)
        if (values.length !== headers.length) {
          errors.push(`Line ${i + 1}: Column count mismatch`)
          continue
        }
        
        const transaction = this.parseTransactionRow(headers, values, i + 1)
        if (transaction.error) {
          errors.push(transaction.error)
        } else if (transaction.data) {
          transactions.push(transaction.data)
        }
      }
      
      return {
        success: errors.length === 0,
        message: `Imported ${transactions.length} transactions${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
        data: transactions,
        errors: errors.length > 0 ? errors : undefined
      }
    })
  }

  // Export portfolio data to CSV
  exportPortfolioData(holdings: Holding[], options: CSVExportOptions = {}): string {
    const {
      includeHeaders = true,
      dateFormat = 'YYYY-MM-DD',
      currencyFormat = 'USD'
    } = options

    const headers = [
      'Symbol',
      'Company Name',
      'Quantity',
      'Average Price',
      'Current Price',
      'Total Value',
      'P&L',
      'P&L %',
      'Sector',
      'Last Updated'
    ]

    const rows = holdings.map(holding => [
      holding.symbol,
      holding.company_name || '',
      holding.quantity.toString(),
      this.formatCurrency(holding.avg_price, currencyFormat),
      this.formatCurrency(holding.current_price || holding.avg_price, currencyFormat),
      this.formatCurrency((holding.current_price || holding.avg_price) * holding.quantity, currencyFormat),
      this.formatCurrency(((holding.current_price || holding.avg_price) - holding.avg_price) * holding.quantity, currencyFormat),
      this.formatPercentage(((holding.current_price || holding.avg_price) - holding.avg_price) / holding.avg_price * 100),
      holding.sector || '',
      this.formatDate(holding.updated_at || holding.created_at, dateFormat)
    ])

    let csv = ''
    
    if (includeHeaders) {
      csv += headers.join(',') + '\n'
    }
    
    csv += rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    
    return csv
  }

  // Export transaction history to CSV
  exportTransactionHistory(transactions: Transaction[], options: CSVExportOptions = {}): string {
    const {
      includeHeaders = true,
      dateFormat = 'YYYY-MM-DD',
      currencyFormat = 'USD'
    } = options

    const headers = [
      'Date',
      'Symbol',
      'Type',
      'Quantity',
      'Price',
      'Total Amount',
      'Portfolio',
      'Notes'
    ]

    const rows = transactions.map(transaction => [
      this.formatDate(transaction.date, dateFormat),
      transaction.symbol,
      transaction.type,
      transaction.quantity.toString(),
      this.formatCurrency(transaction.price, currencyFormat),
      this.formatCurrency(transaction.quantity * transaction.price, currencyFormat),
      transaction.portfolio_name || '',
      transaction.notes || ''
    ])

    let csv = ''
    
    if (includeHeaders) {
      csv += headers.join(',') + '\n'
    }
    
    csv += rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    
    return csv
  }

  // Generate CSV template for import
  generateImportTemplate(): string {
    const headers = [
      'Date',
      'Symbol',
      'Type',
      'Quantity',
      'Price',
      'Notes'
    ]

    const examples = [
      ['2024-01-15', 'AAPL', 'BUY', '10', '150.00', 'Initial purchase'],
      ['2024-01-20', 'MSFT', 'BUY', '5', '300.00', ''],
      ['2024-02-01', 'AAPL', 'SELL', '5', '160.00', 'Partial profit taking']
    ]

    let csv = headers.join(',') + '\n'
    csv += examples.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    
    return csv
  }

  // Download CSV file
  downloadCSV(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // Parse CSV line (handles quoted values)
  private parseCSVLine(line: string): string[] {
    const values: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    values.push(current.trim())
    return values
  }

  // Parse transaction row from CSV
  private parseTransactionRow(headers: string[], values: string[], lineNumber: number): { data?: any; error?: string } {
    try {
      const transaction: any = {}
      
      headers.forEach((header, index) => {
        const value = values[index]
        
        switch (header) {
          case 'date':
            transaction.date = this.parseDate(value)
            break
          case 'symbol':
            transaction.symbol = value.toUpperCase()
            break
          case 'type':
            transaction.type = value.toUpperCase()
            break
          case 'quantity':
            transaction.quantity = parseFloat(value)
            break
          case 'price':
            transaction.price = parseFloat(value)
            break
          case 'notes':
            transaction.notes = value
            break
        }
      })
      
      // Validate required fields
      if (!transaction.date) {
        return { error: `Line ${lineNumber}: Invalid date format` }
      }
      if (!transaction.symbol) {
        return { error: `Line ${lineNumber}: Symbol is required` }
      }
      if (!['BUY', 'SELL'].includes(transaction.type)) {
        return { error: `Line ${lineNumber}: Type must be BUY or SELL` }
      }
      if (isNaN(transaction.quantity) || transaction.quantity <= 0) {
        return { error: `Line ${lineNumber}: Invalid quantity` }
      }
      if (isNaN(transaction.price) || transaction.price <= 0) {
        return { error: `Line ${lineNumber}: Invalid price` }
      }
      
      return { data: transaction }
    } catch (error) {
      return { error: `Line ${lineNumber}: ${error}` }
    }
  }

  // Parse date string
  private parseDate(dateStr: string): string {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format')
    }
    return date.toISOString().split('T')[0]
  }

  // Format currency
  private formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  // Format percentage
  private formatPercentage(percentage: number): string {
    if (isNaN(percentage) || !isFinite(percentage)) {
      return 'N/A'
    }
    return `${percentage.toFixed(2)}%`
  }

  // Format date
  private formatDate(dateStr: string, format: string): string {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    
    return format
      .replace('YYYY', year.toString())
      .replace('MM', month)
      .replace('DD', day)
  }
}

export const csvService = new CSVService()
