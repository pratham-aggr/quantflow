import { supabase } from './supabase';

const API_BASE_URL = process.env.REACT_APP_BACKEND_API_URL || '';

export interface FinnhubNewsItem {
  id: string;
  title: string;
  url: string;
  time_published: string;
  authors: string[];
  summary: string;
  banner_image: string;
  source: string;
  category_within_source: string;
  source_domain: string;
  topics: any[];
  overall_sentiment_score: number;
  overall_sentiment_label: string;
  ticker_sentiment: any[];
}

export interface NewsResponse {
  success: boolean;
  count: number;
  news: FinnhubNewsItem[];
  source?: string;
}

export interface CompanyNewsResponse extends NewsResponse {
  symbol: string;
}

class FinnhubNewsService {
  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `${API_BASE_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Finnhub News API Error:', error);
      throw error;
    }
  }

  async getGeneralNews(params: {
    category?: string;
    q?: string;
    limit?: number;
  } = {}): Promise<NewsResponse> {
    const queryParams: Record<string, any> = {};
    
    if (params.category) queryParams.category = params.category;
    if (params.q) queryParams.q = params.q;
    if (params.limit) queryParams.limit = params.limit;

    return this.makeRequest('/api/news/market', queryParams);
  }

  async getCompanyNews(symbol: string, limit: number = 20): Promise<CompanyNewsResponse> {
    return this.makeRequest(`/api/news/company/${symbol}`, { limit });
  }

  async getMarketNews(limit: number = 30, category: string = 'general'): Promise<NewsResponse> {
    return this.makeRequest('/api/news/market', { limit, category });
  }

  async getNewsWithSentiment(params: {
    tickers?: string[];
    limit?: number;
  } = {}): Promise<NewsResponse> {
    const queryParams: Record<string, any> = {};
    
    if (params.tickers) queryParams.tickers = params.tickers.join(',');
    if (params.limit) queryParams.limit = params.limit;

    return this.makeRequest('/api/news/sentiment', queryParams);
  }

  async getPortfolioNews(symbols: string[], limit: number = 50): Promise<NewsResponse> {
    // For portfolio news, get news for the first symbol
    if (symbols.length > 0) {
      return this.getCompanyNews(symbols[0], limit);
    }
    return this.getMarketNews(limit);
  }

  async getTopStories(limit: number = 20): Promise<NewsResponse> {
    return this.getMarketNews(limit, 'general');
  }

  async getEarningsNews(limit: number = 30): Promise<NewsResponse> {
    return this.getMarketNews(limit, 'earnings');
  }

  async getEconomicNews(limit: number = 30): Promise<NewsResponse> {
    return this.getMarketNews(limit, 'economy');
  }
}

export const finnhubNewsService = new FinnhubNewsService();
export default finnhubNewsService;
