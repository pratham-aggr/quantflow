import React, { useState, useEffect } from 'react';
import { finnhubNewsService, FinnhubNewsItem, NewsResponse } from '../lib/finnhubNewsService';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';

interface FinnhubNewsFeedProps {
  symbols?: string[];
  category?: 'general' | 'market' | 'earnings' | 'economic' | 'portfolio';
  limit?: number;
  showSentiment?: boolean;
  className?: string;
}

export const FinnhubNewsFeed: React.FC<FinnhubNewsFeedProps> = ({
  symbols = [],
  category = 'general',
  limit = 20,
  showSentiment = true,
  className = ''
}) => {
  const [news, setNews] = useState<FinnhubNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');

  useEffect(() => {
    fetchNews();
  }, [symbols, category, limit]);

  const fetchNews = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let response: NewsResponse;
      
      switch (category) {
        case 'market':
          response = await finnhubNewsService.getMarketNews(limit);
          break;
        case 'earnings':
          response = await finnhubNewsService.getEarningsNews(limit);
          break;
        case 'economic':
          response = await finnhubNewsService.getEconomicNews(limit);
          break;
        case 'portfolio':
          response = await finnhubNewsService.getPortfolioNews(symbols, limit);
          break;
        default:
          response = await finnhubNewsService.getGeneralNews({
            q: symbols.length > 0 ? symbols[0] : undefined,
            limit
          });
      }
      
      if (response.success) {
        setNews(response.news);
      } else {
        setError('Failed to fetch news');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch news');
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'negative':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'neutral':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return '📈';
      case 'negative':
        return '📉';
      case 'neutral':
        return '➡️';
      default:
        return '📊';
    }
  };

  const formatTime = (timeString: string) => {
    try {
      // Finnhub format: Unix timestamp
      const timestamp = parseInt(timeString);
      return new Date(timestamp * 1000).toLocaleDateString();
    } catch (error) {
      console.error('Error formatting Finnhub date:', error);
      return 'N/A';
    }
  };

  const filteredNews = sentimentFilter === 'all' 
    ? news 
    : news.filter(item => 
        item.overall_sentiment_label.toLowerCase() === sentimentFilter.toLowerCase()
      );

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Market News
          </h3>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
              Finnhub
            </span>
          </div>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Market News
          </h3>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
              Finnhub
            </span>
          </div>
        </div>
        <div className="space-y-4">
          <ErrorMessage message={error} />
          <button
            onClick={fetchNews}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Market News
        </h3>
        <div className="flex items-center space-x-2">
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
            Finnhub
          </span>
          {showSentiment && (
            <select
              value={sentimentFilter}
              onChange={(e) => setSentimentFilter(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1 bg-white dark:bg-gray-800 dark:border-gray-600"
            >
              <option value="all">All Sentiments</option>
              <option value="positive">Positive</option>
              <option value="negative">Negative</option>
              <option value="neutral">Neutral</option>
            </select>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {filteredNews.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No news articles found</p>
          </div>
        ) : (
          filteredNews.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                    {item.title}
                  </h4>
                  {showSentiment && item.overall_sentiment_label && (
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full border ${getSentimentColor(item.overall_sentiment_label)}`}>
                      {getSentimentIcon(item.overall_sentiment_label)} {item.overall_sentiment_label}
                    </span>
                  )}
                </div>
                
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                  {item.summary}
                </p>
                
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center space-x-4">
                    <span>{item.source}</span>
                    <span>{formatTime(item.time_published)}</span>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Read More →
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
