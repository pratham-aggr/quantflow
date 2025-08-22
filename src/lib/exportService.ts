import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import html2canvas from 'html2canvas'
import { saveAs } from 'file-saver'

// Export types
export type ExportFormat = 'pdf' | 'csv' | 'png' | 'json'
export type ReportType = 'portfolio' | 'performance' | 'risk' | 'transactions' | 'custom'

// Export interfaces
export interface ExportOptions {
  format: ExportFormat
  filename?: string
  includeCharts?: boolean
  includeTables?: boolean
  includeMetadata?: boolean
  pageSize?: 'a4' | 'letter' | 'legal'
  orientation?: 'portrait' | 'landscape'
  margins?: {
    top: number
    right: number
    bottom: number
    left: number
  }
  styling?: {
    primaryColor?: string
    secondaryColor?: string
    fontSize?: number
    fontFamily?: string
  }
}

export interface PortfolioExportData {
  portfolio: {
    name: string
    totalValue: number
    totalPnL: number
    totalPnLPercent: number
    riskScore: number
    lastUpdated: string
  }
  holdings: Array<{
    symbol: string
    companyName: string
    quantity: number
    avgPrice: number
    currentPrice: number
    totalValue: number
    pnl: number
    pnlPercent: number
    sector: string
  }>
  performance: Array<{
    date: string
    value: number
    change: number
    changePercent: number
  }>
  riskMetrics: {
    volatility: number
    sharpeRatio: number
    maxDrawdown: number
    beta: number
    alpha: number
    correlation: number
    var: number
    trackingError: number
  }
  transactions: Array<{
    date: string
    type: 'buy' | 'sell'
    symbol: string
    quantity: number
    price: number
    total: number
    fees: number
  }>
}

export interface PerformanceExportData {
  timeRange: string
  totalReturn: number
  annualizedReturn: number
  volatility: number
  sharpeRatio: number
  maxDrawdown: number
  benchmarkComparison: {
    benchmark: string
    benchmarkReturn: number
    excessReturn: number
    trackingError: number
    informationRatio: number
  }
  monthlyReturns: Array<{
    month: string
    return: number
    cumulativeReturn: number
  }>
  sectorAllocation: Array<{
    sector: string
    allocation: number
    return: number
  }>
}

export interface RiskExportData {
  riskMetrics: {
    volatility: number
    sharpeRatio: number
    maxDrawdown: number
    beta: number
    alpha: number
    correlation: number
    var: number
    trackingError: number
  }
  stressTests: Array<{
    scenario: string
    impact: number
    probability: number
  }>
  correlationMatrix: Array<Array<number>>
  sectorAnalysis: Array<{
    sector: string
    allocation: number
    volatility: number
    contribution: number
  }>
  monteCarloResults: {
    simulations: number
    confidenceIntervals: Array<{
      percentile: number
      value: number
    }>
  }
}

// Export service class
export class ExportService {
  private defaultOptions: ExportOptions = {
    format: 'pdf',
    filename: 'portfolio-report',
    includeCharts: true,
    includeTables: true,
    includeMetadata: true,
    pageSize: 'a4',
    orientation: 'portrait',
    margins: {
      top: 20,
      right: 20,
      bottom: 20,
      left: 20
    },
    styling: {
      primaryColor: '#3b82f6',
      secondaryColor: '#6b7280',
      fontSize: 12,
      fontFamily: 'helvetica'
    }
  }

  // Generate PDF report
  async generatePDFReport(
    data: PortfolioExportData | PerformanceExportData | RiskExportData,
    type: ReportType,
    options: Partial<ExportOptions> = {}
  ): Promise<Blob> {
    const opts = { ...this.defaultOptions, ...options }
    const doc = new jsPDF({
      orientation: opts.orientation,
      unit: 'mm',
      format: opts.pageSize
    })

    // Set styling
    doc.setFont(opts.styling?.fontFamily || 'helvetica')
    doc.setFontSize(opts.styling?.fontSize || 12)

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = opts.margins!

    let yPosition = margin.top

    // Header
    yPosition = this.addHeader(doc, type, yPosition, pageWidth, margin, opts.styling!)

    // Content based on type
    switch (type) {
      case 'portfolio':
        yPosition = await this.addPortfolioContent(doc, data as PortfolioExportData, yPosition, pageWidth, margin, opts)
        break
      case 'performance':
        yPosition = await this.addPerformanceContent(doc, data as PerformanceExportData, yPosition, pageWidth, margin, opts)
        break
      case 'risk':
        yPosition = await this.addRiskContent(doc, data as RiskExportData, yPosition, pageWidth, margin, opts)
        break
      default:
        yPosition = this.addCustomContent(doc, data, yPosition, pageWidth, margin, opts)
    }

    // Footer
    this.addFooter(doc, pageHeight, margin, opts.styling!)

    return doc.output('blob')
  }

  // Generate CSV export
  generateCSVExport(
    data: any,
    type: ReportType,
    options: Partial<ExportOptions> = {}
  ): Blob {
    const opts = { ...this.defaultOptions, ...options }
    let csvContent = ''

    switch (type) {
      case 'portfolio':
        csvContent = this.generatePortfolioCSV(data as PortfolioExportData)
        break
      case 'performance':
        csvContent = this.generatePerformanceCSV(data as PerformanceExportData)
        break
      case 'risk':
        csvContent = this.generateRiskCSV(data as RiskExportData)
        break
      case 'transactions':
        csvContent = this.generateTransactionsCSV(data)
        break
      default:
        csvContent = this.generateGenericCSV(data)
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    return blob
  }

  // Export chart as image
  async exportChartAsImage(
    chartElement: HTMLElement,
    options: Partial<ExportOptions> = {}
  ): Promise<Blob> {
    const opts = { ...this.defaultOptions, ...options }
    
    try {
      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true
      })

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob!)
        }, 'image/png')
      })
    } catch (error) {
      console.error('Error exporting chart:', error)
      throw new Error('Failed to export chart as image')
    }
  }

  // Export dashboard as image
  async exportDashboardAsImage(
    dashboardElement: HTMLElement,
    options: Partial<ExportOptions> = {}
  ): Promise<Blob> {
    const opts = { ...this.defaultOptions, ...options }
    
    try {
      const canvas = await html2canvas(dashboardElement, {
        backgroundColor: '#ffffff',
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0,
        width: dashboardElement.scrollWidth,
        height: dashboardElement.scrollHeight
      })

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob!)
        }, 'image/png')
      })
    } catch (error) {
      console.error('Error exporting dashboard:', error)
      throw new Error('Failed to export dashboard as image')
    }
  }

  // Download file
  downloadFile(blob: Blob, filename: string, format: ExportFormat): void {
    const extension = format === 'pdf' ? 'pdf' : format === 'csv' ? 'csv' : 'png'
    const fullFilename = `${filename}.${extension}`
    saveAs(blob, fullFilename)
  }

  // Private methods for PDF generation
  private addHeader(
    doc: jsPDF,
    type: ReportType,
    yPosition: number,
    pageWidth: number,
    margin: any,
    styling: any
  ): number {
    const title = this.getReportTitle(type)
    const subtitle = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Title
    doc.setFontSize(24)
    doc.setTextColor(styling.primaryColor)
    doc.text(title, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 10

    // Subtitle
    doc.setFontSize(12)
    doc.setTextColor(styling.secondaryColor)
    doc.text(subtitle, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 15

    return yPosition
  }

  private async addPortfolioContent(
    doc: jsPDF,
    data: PortfolioExportData,
    yPosition: number,
    pageWidth: number,
    margin: any,
    options: ExportOptions
  ): Promise<number> {
    const contentWidth = pageWidth - margin.left - margin.right

    // Portfolio Summary
    yPosition = this.addSectionTitle(doc, 'Portfolio Summary', yPosition, margin.left)
    yPosition += 5

    const summaryData = [
      ['Portfolio Name', data.portfolio.name],
      ['Total Value', this.formatCurrency(data.portfolio.totalValue)],
      ['Total P&L', this.formatCurrency(data.portfolio.totalPnL)],
      ['P&L %', this.formatPercentage(data.portfolio.totalPnLPercent)],
      ['Risk Score', data.portfolio.riskScore.toString()],
      ['Last Updated', data.portfolio.lastUpdated]
    ]

    doc.autoTable({
      startY: yPosition,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 10 }
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10

    // Holdings Table
    if (options.includeTables && data.holdings.length > 0) {
      yPosition = this.addSectionTitle(doc, 'Holdings', yPosition, margin.left)
      yPosition += 5

      const holdingsData = data.holdings.map(holding => [
        holding.symbol,
        holding.companyName,
        holding.quantity.toString(),
        this.formatCurrency(holding.avgPrice),
        this.formatCurrency(holding.currentPrice),
        this.formatCurrency(holding.totalValue),
        this.formatCurrency(holding.pnl),
        this.formatPercentage(holding.pnlPercent),
        holding.sector
      ])

      doc.autoTable({
        startY: yPosition,
        head: [['Symbol', 'Company', 'Qty', 'Avg Price', 'Current', 'Value', 'P&L', 'P&L %', 'Sector']],
        body: holdingsData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 40 },
          2: { cellWidth: 15 },
          3: { cellWidth: 20 },
          4: { cellWidth: 20 },
          5: { cellWidth: 25 },
          6: { cellWidth: 20 },
          7: { cellWidth: 15 },
          8: { cellWidth: 25 }
        }
      })

      yPosition = (doc as any).lastAutoTable.finalY + 10
    }

    // Risk Metrics
    if (options.includeMetadata) {
      yPosition = this.addSectionTitle(doc, 'Risk Metrics', yPosition, margin.left)
      yPosition += 5

      const riskData = [
        ['Volatility', this.formatPercentage(data.riskMetrics.volatility)],
        ['Sharpe Ratio', data.riskMetrics.sharpeRatio.toFixed(2)],
        ['Max Drawdown', this.formatPercentage(data.riskMetrics.maxDrawdown)],
        ['Beta', data.riskMetrics.beta.toFixed(2)],
        ['Alpha', this.formatPercentage(data.riskMetrics.alpha)],
        ['VaR (95%)', this.formatPercentage(data.riskMetrics.var)]
      ]

      doc.autoTable({
        startY: yPosition,
        head: [['Metric', 'Value']],
        body: riskData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 10 }
      })

      yPosition = (doc as any).lastAutoTable.finalY + 10
    }

    return yPosition
  }

  private async addPerformanceContent(
    doc: jsPDF,
    data: PerformanceExportData,
    yPosition: number,
    pageWidth: number,
    margin: any,
    options: ExportOptions
  ): Promise<number> {
    // Performance Summary
    yPosition = this.addSectionTitle(doc, 'Performance Summary', yPosition, margin.left)
    yPosition += 5

    const summaryData = [
      ['Time Range', data.timeRange],
      ['Total Return', this.formatPercentage(data.totalReturn)],
      ['Annualized Return', this.formatPercentage(data.annualizedReturn)],
      ['Volatility', this.formatPercentage(data.volatility)],
      ['Sharpe Ratio', data.sharpeRatio.toFixed(2)],
      ['Max Drawdown', this.formatPercentage(data.maxDrawdown)]
    ]

    doc.autoTable({
      startY: yPosition,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 10 }
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10

    // Benchmark Comparison
    yPosition = this.addSectionTitle(doc, 'Benchmark Comparison', yPosition, margin.left)
    yPosition += 5

    const benchmarkData = [
      ['Benchmark', data.benchmarkComparison.benchmark],
      ['Benchmark Return', this.formatPercentage(data.benchmarkComparison.benchmarkReturn)],
      ['Excess Return', this.formatPercentage(data.benchmarkComparison.excessReturn)],
      ['Tracking Error', this.formatPercentage(data.benchmarkComparison.trackingError)],
      ['Information Ratio', data.benchmarkComparison.informationRatio.toFixed(2)]
    ]

    doc.autoTable({
      startY: yPosition,
      head: [['Metric', 'Value']],
      body: benchmarkData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 10 }
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10

    // Monthly Returns
    if (options.includeTables && data.monthlyReturns.length > 0) {
      yPosition = this.addSectionTitle(doc, 'Monthly Returns', yPosition, margin.left)
      yPosition += 5

      const monthlyData = data.monthlyReturns.map(month => [
        month.month,
        this.formatPercentage(month.return),
        this.formatPercentage(month.cumulativeReturn)
      ])

      doc.autoTable({
        startY: yPosition,
        head: [['Month', 'Return', 'Cumulative']],
        body: monthlyData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 }
      })

      yPosition = (doc as any).lastAutoTable.finalY + 10
    }

    return yPosition
  }

  private async addRiskContent(
    doc: jsPDF,
    data: RiskExportData,
    yPosition: number,
    pageWidth: number,
    margin: any,
    options: ExportOptions
  ): Promise<number> {
    // Risk Metrics
    yPosition = this.addSectionTitle(doc, 'Risk Metrics', yPosition, margin.left)
    yPosition += 5

    const riskData = [
      ['Volatility', this.formatPercentage(data.riskMetrics.volatility)],
      ['Sharpe Ratio', data.riskMetrics.sharpeRatio.toFixed(2)],
      ['Max Drawdown', this.formatPercentage(data.riskMetrics.maxDrawdown)],
      ['Beta', data.riskMetrics.beta.toFixed(2)],
      ['Alpha', this.formatPercentage(data.riskMetrics.alpha)],
      ['VaR (95%)', this.formatPercentage(data.riskMetrics.var)],
      ['Tracking Error', this.formatPercentage(data.riskMetrics.trackingError)]
    ]

    doc.autoTable({
      startY: yPosition,
      head: [['Metric', 'Value']],
      body: riskData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 10 }
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10

    // Stress Tests
    if (options.includeMetadata && data.stressTests.length > 0) {
      yPosition = this.addSectionTitle(doc, 'Stress Tests', yPosition, margin.left)
      yPosition += 5

      const stressData = data.stressTests.map(test => [
        test.scenario,
        this.formatPercentage(test.impact),
        this.formatPercentage(test.probability)
      ])

      doc.autoTable({
        startY: yPosition,
        head: [['Scenario', 'Impact', 'Probability']],
        body: stressData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 }
      })

      yPosition = (doc as any).lastAutoTable.finalY + 10
    }

    // Sector Analysis
    if (options.includeTables && data.sectorAnalysis.length > 0) {
      yPosition = this.addSectionTitle(doc, 'Sector Analysis', yPosition, margin.left)
      yPosition += 5

      const sectorData = data.sectorAnalysis.map(sector => [
        sector.sector,
        this.formatPercentage(sector.allocation),
        this.formatPercentage(sector.volatility),
        this.formatPercentage(sector.contribution)
      ])

      doc.autoTable({
        startY: yPosition,
        head: [['Sector', 'Allocation', 'Volatility', 'Contribution']],
        body: sectorData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 }
      })

      yPosition = (doc as any).lastAutoTable.finalY + 10
    }

    return yPosition
  }

  private addCustomContent(
    doc: jsPDF,
    data: any,
    yPosition: number,
    pageWidth: number,
    margin: any,
    options: ExportOptions
  ): number {
    // Generic content for custom reports
    yPosition = this.addSectionTitle(doc, 'Custom Report', yPosition, margin.left)
    yPosition += 5

    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.text('Custom report content would be generated here based on the provided data.', margin.left, yPosition)

    return yPosition + 20
  }

  private addFooter(
    doc: jsPDF,
    pageHeight: number,
    margin: any,
    styling: any
  ): void {
    const footerText = `Generated by QuantFlow on ${new Date().toLocaleDateString()}`
    
    doc.setFontSize(8)
    doc.setTextColor(styling.secondaryColor)
    doc.text(footerText, margin.left, pageHeight - margin.bottom)
  }

  private addSectionTitle(
    doc: jsPDF,
    title: string,
    yPosition: number,
    xPosition: number
  ): number {
    doc.setFontSize(14)
    doc.setTextColor(59, 130, 246)
    doc.setFont('helvetica', 'bold')
    doc.text(title, xPosition, yPosition)
    doc.setFont('helvetica', 'normal')
    
    return yPosition + 8
  }

  private getReportTitle(type: ReportType): string {
    switch (type) {
      case 'portfolio': return 'Portfolio Report'
      case 'performance': return 'Performance Report'
      case 'risk': return 'Risk Analysis Report'
      case 'transactions': return 'Transaction History'
      default: return 'Custom Report'
    }
  }

  // CSV generation methods
  private generatePortfolioCSV(data: PortfolioExportData): string {
    let csv = 'Portfolio Summary\n'
    csv += 'Portfolio Name,Total Value,Total P&L,P&L %,Risk Score,Last Updated\n'
    csv += `${data.portfolio.name},${data.portfolio.totalValue},${data.portfolio.totalPnL},${data.portfolio.totalPnLPercent},${data.portfolio.riskScore},${data.portfolio.lastUpdated}\n\n`
    
    csv += 'Holdings\n'
    csv += 'Symbol,Company,Quantity,Avg Price,Current Price,Total Value,P&L,P&L %,Sector\n'
    data.holdings.forEach(holding => {
      csv += `${holding.symbol},${holding.companyName},${holding.quantity},${holding.avgPrice},${holding.currentPrice},${holding.totalValue},${holding.pnl},${holding.pnlPercent},${holding.sector}\n`
    })
    
    csv += '\nRisk Metrics\n'
    csv += 'Metric,Value\n'
    csv += `Volatility,${data.riskMetrics.volatility}\n`
    csv += `Sharpe Ratio,${data.riskMetrics.sharpeRatio}\n`
    csv += `Max Drawdown,${data.riskMetrics.maxDrawdown}\n`
    csv += `Beta,${data.riskMetrics.beta}\n`
    csv += `Alpha,${data.riskMetrics.alpha}\n`
    csv += `VaR,${data.riskMetrics.var}\n`
    
    return csv
  }

  private generatePerformanceCSV(data: PerformanceExportData): string {
    let csv = 'Performance Summary\n'
    csv += 'Time Range,Total Return,Annualized Return,Volatility,Sharpe Ratio,Max Drawdown\n'
    csv += `${data.timeRange},${data.totalReturn},${data.annualizedReturn},${data.volatility},${data.sharpeRatio},${data.maxDrawdown}\n\n`
    
    csv += 'Benchmark Comparison\n'
    csv += 'Benchmark,Benchmark Return,Excess Return,Tracking Error,Information Ratio\n'
    csv += `${data.benchmarkComparison.benchmark},${data.benchmarkComparison.benchmarkReturn},${data.benchmarkComparison.excessReturn},${data.benchmarkComparison.trackingError},${data.benchmarkComparison.informationRatio}\n\n`
    
    csv += 'Monthly Returns\n'
    csv += 'Month,Return,Cumulative Return\n'
    data.monthlyReturns.forEach(month => {
      csv += `${month.month},${month.return},${month.cumulativeReturn}\n`
    })
    
    return csv
  }

  private generateRiskCSV(data: RiskExportData): string {
    let csv = 'Risk Metrics\n'
    csv += 'Metric,Value\n'
    csv += `Volatility,${data.riskMetrics.volatility}\n`
    csv += `Sharpe Ratio,${data.riskMetrics.sharpeRatio}\n`
    csv += `Max Drawdown,${data.riskMetrics.maxDrawdown}\n`
    csv += `Beta,${data.riskMetrics.beta}\n`
    csv += `Alpha,${data.riskMetrics.alpha}\n`
    csv += `VaR,${data.riskMetrics.var}\n\n`
    
    csv += 'Stress Tests\n'
    csv += 'Scenario,Impact,Probability\n'
    data.stressTests.forEach(test => {
      csv += `${test.scenario},${test.impact},${test.probability}\n`
    })
    
    csv += '\nSector Analysis\n'
    csv += 'Sector,Allocation,Volatility,Contribution\n'
    data.sectorAnalysis.forEach(sector => {
      csv += `${sector.sector},${sector.allocation},${sector.volatility},${sector.contribution}\n`
    })
    
    return csv
  }

  private generateTransactionsCSV(data: any): string {
    let csv = 'Date,Type,Symbol,Quantity,Price,Total,Fees\n'
    data.transactions.forEach((tx: any) => {
      csv += `${tx.date},${tx.type},${tx.symbol},${tx.quantity},${tx.price},${tx.total},${tx.fees}\n`
    })
    return csv
  }

  private generateGenericCSV(data: any): string {
    if (Array.isArray(data)) {
      if (data.length === 0) return ''
      const headers = Object.keys(data[0])
      let csv = headers.join(',') + '\n'
      data.forEach(row => {
        csv += headers.map(header => row[header]).join(',') + '\n'
      })
      return csv
    }
    return JSON.stringify(data)
  }

  // Utility methods
  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  private formatPercentage(value: number): string {
    return `${(value * 100).toFixed(2)}%`
  }
}

// Export singleton instance
export const exportService = new ExportService()

// Convenience functions
export const generatePDFReport = (
  data: PortfolioExportData | PerformanceExportData | RiskExportData,
  type: ReportType,
  options?: Partial<ExportOptions>
) => exportService.generatePDFReport(data, type, options)

export const generateCSVExport = (
  data: any,
  type: ReportType,
  options?: Partial<ExportOptions>
) => exportService.generateCSVExport(data, type, options)

export const exportChartAsImage = (
  chartElement: HTMLElement,
  options?: Partial<ExportOptions>
) => exportService.exportChartAsImage(chartElement, options)

export const exportDashboardAsImage = (
  dashboardElement: HTMLElement,
  options?: Partial<ExportOptions>
) => exportService.exportDashboardAsImage(dashboardElement, options)

export const downloadFile = (
  blob: Blob,
  filename: string,
  format: ExportFormat
) => exportService.downloadFile(blob, filename, format)
