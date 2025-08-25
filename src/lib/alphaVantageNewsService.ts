import { supabase } from './supabase';

const API_BASE_URL = process.env.REACT_APP_BACKEND_API_URL || 'https://quantflow-backend-api.onrender.com';

export interface NewsItem {
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
  news: NewsItem[];
  source?: string;
}

export interface CompanyNewsResponse extends NewsResponse {
  symbol: string;
}

class NewsService {
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
      console.error('News API Error:', error);
      throw error;
    }
  }

  async getGeneralNews(params: {
    limit?: number;
    category?: string;
  } = {}): Promise<NewsResponse> {
    const queryParams: Record<string, any> = {};
    
    if (params.limit) queryParams.limit = params.limit;
    if (params.category) queryParams.category = params.category;

    return this.makeRequest('/api/news/market', queryParams);
  }

  async getCompanyNews(symbol: string, limit: number = 20): Promise<CompanyNewsResponse> {
    return this.makeRequest(`/api/news/company/${symbol}`, { limit });
  }

  async getMarketNews(limit: number = 30, category: string = 'general'): Promise<NewsResponse> {
    return this.makeRequest('/api/news/market', { limit, category });
  }

  async getPortfolioNews(symbols: string[], limit: number = 50): Promise<NewsResponse[]> {
    // Get news for each symbol in the portfolio
    const newsPromises = symbols.map(symbol => 
      this.getCompanyNews(symbol, Math.ceil(limit / symbols.length))
    );
    
    return Promise.all(newsPromises);
  }

  async getTopStories(limit: number = 20): Promise<NewsResponse> {
    return this.getMarketNews(limit, 'general');
  }

  async getFinancialNews(limit: number = 30): Promise<NewsResponse> {
    return this.getMarketNews(limit, 'general');
  }

  async getEconomicNews(limit: number = 30): Promise<NewsResponse> {
    return this.getMarketNews(limit, 'general');
  }
}

export const newsService = new NewsService();
export default newsService;
