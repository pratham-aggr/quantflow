import React, { useState, useEffect } from 'react';
import { alphaVantageNewsService, AlphaVantageNewsItem, NewsResponse } from '../lib/alphaVantageNewsService';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';

interface AlphaVantageNewsFeedProps {
  symbols?: string[];
  category?: 'general' | 'market' | 'earnings' | 'economic' | 'portfolio';
  limit?: number;
  showSentiment?: boolean;
  className?: string;
}

export const AlphaVantageNewsFeed: React.FC<AlphaVantageNewsFeedProps> = ({
  symbols = [],
  category = 'general',
  limit = 20,
  showSentiment = true,
  className = ''
}) => {
  const [news, setNews] = useState<AlphaVantageNewsItem[]>([]);
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
          response = await alphaVantageNewsService.getMarketNews(limit);
          break;
        case 'earnings':
          response = await alphaVantageNewsService.getEarningsNews(limit);
          break;
        case 'economic':
          response = await alphaVantageNewsService.getEconomicNews(limit);
          break;
        case 'portfolio':
          response = await alphaVantageNewsService.getPortfolioNews(symbols, limit);
          break;
        default:
          response = await alphaVantageNewsService.getGeneralNews({
            tickers: symbols.length > 0 ? symbols : undefined,
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
      const date = new Date(timeString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return timeString;
    }
  };

  const filteredNews = sentimentFilter === 'all' 
    ? news 
    : news.filter(item => item.overall_sentiment_label.toLowerCase() === sentimentFilter);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Market News</h3>
        </div>
        <div className="p-8 flex justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Market News</h3>
        </div>
        <div className="p-4">
          <ErrorMessage message={error} />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {category === 'portfolio' ? 'Portfolio News' : 
             category === 'market' ? 'Market News' :
             category === 'earnings' ? 'Earnings News' :
             category === 'economic' ? 'Economic News' : 'Latest News'}
          </h3>
          {showSentiment && (
            <select
              value={sentimentFilter}
              onChange={(e) => setSentimentFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Sentiment</option>
              <option value="positive">Positive</option>
              <option value="negative">Negative</option>
              <option value="neutral">Neutral</option>
            </select>
          )}
        </div>
      </div>
      
      <div className="divide-y divide-gray-200">
        {filteredNews.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No news available for the selected criteria.
          </div>
        ) : (
          filteredNews.map((item, index) => (
            <div key={`${item.id}-${index}`} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start space-x-3">
                {item.banner_image && (
                  <img
                    src={item.banner_image}
                    alt=""
                    className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {item.source}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatTime(item.time_published)}
                    </span>
                    {showSentiment && item.overall_sentiment_label && (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSentimentColor(item.overall_sentiment_label)}`}>
                        <span className="mr-1">{getSentimentIcon(item.overall_sentiment_label)}</span>
                        {item.overall_sentiment_label}
                      </span>
                    )}
                  </div>
                  
                  <h4 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-600 transition-colors"
                    >
                      {item.title}
                    </a>
                  </h4>
                  
                  {item.summary && (
                    <p className="text-sm text-gray-600 line-clamp-3 mb-2">
                      {item.summary}
                    </p>
                  )}
                  
                  {item.authors && item.authors.length > 0 && (
                    <p className="text-xs text-gray-500">
                      By {item.authors.join(', ')}
                    </p>
                  )}
                  
                  {item.topics && item.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.topics.slice(0, 3).map((topic, topicIndex) => (
                        <span
                          key={topicIndex}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {filteredNews.length > 0 && (
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={fetchNews}
            className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Refresh News
          </button>
        </div>
      )}
    </div>
  );
};
