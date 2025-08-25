import { supabase } from './supabase';

const API_BASE_URL = process.env.REACT_APP_BACKEND_API_URL || 'https://quantflow-backend-api.onrender.com';

export interface AlphaVantageNewsItem {
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
  topics: string[];
  overall_sentiment_score: number;
  overall_sentiment_label: string;
  ticker_sentiment: any[];
}

export interface NewsResponse {
  success: boolean;
  count: number;
  news: AlphaVantageNewsItem[];
}

export interface CompanyNewsResponse extends NewsResponse {
  symbol: string;
}

class AlphaVantageNewsService {
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
      console.error('Alpha Vantage News API Error:', error);
      throw error;
    }
  }

  async getGeneralNews(params: {
    tickers?: string[];
    topics?: string[];
    time_from?: string;
    time_to?: string;
    sort?: 'RELEVANCE' | 'LATEST' | 'EARLIEST';
    limit?: number;
  } = {}): Promise<NewsResponse> {
    const queryParams: Record<string, any> = {};
    
    if (params.tickers) queryParams.tickers = params.tickers.join(',');
    if (params.topics) queryParams.topics = params.topics.join(',');
    if (params.time_from) queryParams.time_from = params.time_from;
    if (params.time_to) queryParams.time_to = params.time_to;
    if (params.sort) queryParams.sort = params.sort;
    if (params.limit) queryParams.limit = params.limit;

    return this.makeRequest('/api/news/alpha-vantage', queryParams);
  }

  async getCompanyNews(symbol: string, limit: number = 20): Promise<CompanyNewsResponse> {
    return this.makeRequest(`/api/news/company/${symbol}`, { limit });
  }

  async getMarketNews(limit: number = 30, topics: string = 'financial_markets'): Promise<NewsResponse> {
    return this.makeRequest('/api/news/market', { limit, topics });
  }

  async getNewsWithSentiment(params: {
    tickers?: string[];
    limit?: number;
    sentiment?: 'positive' | 'negative' | 'neutral';
  } = {}): Promise<NewsResponse> {
    const queryParams: Record<string, any> = {};
    
    if (params.tickers) queryParams.tickers = params.tickers.join(',');
    if (params.limit) queryParams.limit = params.limit;
    if (params.sentiment) queryParams.sentiment = params.sentiment;

    return this.makeRequest('/api/news/sentiment', queryParams);
  }

  async getPortfolioNews(symbols: string[], limit: number = 50): Promise<NewsResponse> {
    return this.getGeneralNews({
      tickers: symbols,
      limit,
      sort: 'LATEST'
    });
  }

  async getTopStories(limit: number = 20): Promise<NewsResponse> {
    return this.getMarketNews(limit, 'financial_markets');
  }

  async getEarningsNews(limit: number = 30): Promise<NewsResponse> {
    return this.getGeneralNews({
      topics: ['earnings'],
      limit,
      sort: 'LATEST'
    });
  }

  async getEconomicNews(limit: number = 30): Promise<NewsResponse> {
    return this.getGeneralNews({
      topics: ['economy', 'federal_reserve', 'inflation'],
      limit,
      sort: 'LATEST'
    });
  }
}

export const alphaVantageNewsService = new AlphaVantageNewsService();
export default alphaVantageNewsService;
