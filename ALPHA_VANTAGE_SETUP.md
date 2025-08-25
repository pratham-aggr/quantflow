# Alpha Vantage Integration Setup

This guide explains how to set up Alpha Vantage API for news functionality in QuantFlow.

## Overview

Alpha Vantage provides real-time and historical financial data, including news with sentiment analysis. The integration includes:

- Real-time news with sentiment analysis
- Company-specific news
- Market-wide news
- Portfolio-relevant news
- Sentiment filtering capabilities

## Setup Instructions

### 1. Get Alpha Vantage API Key

1. Visit [Alpha Vantage](https://www.alphavantage.co/)
2. Sign up for a free account
3. Get your API key from the dashboard

### 2. Environment Variables

Add your Alpha Vantage API key to your environment variables:

#### For Local Development
Create or update your `.env` file:
```bash
ALPHA_VANTAGE_API_KEY=your_api_key_here
```

#### For Production (Render)
Add the environment variable in your Render dashboard:
- Go to your service settings
- Add environment variable: `ALPHA_VANTAGE_API_KEY`
- Set the value to your API key

#### For Vercel
Add the environment variable in your Vercel project settings:
- Go to your project settings
- Add environment variable: `ALPHA_VANTAGE_API_KEY`
- Set the value to your API key

### 3. API Endpoints

The following endpoints are now available:

#### General News
```
GET /api/news/alpha-vantage
```
Parameters:
- `tickers`: Comma-separated stock symbols
- `topics`: Comma-separated topics
- `time_from`: Start time (YYYYMMDDTHHMMSS)
- `time_to`: End time (YYYYMMDDTHHMMSS)
- `sort`: RELEVANCE, LATEST, EARLIEST
- `limit`: Number of articles (max 50)

#### Company News
```
GET /api/news/company/{symbol}
```
Parameters:
- `limit`: Number of articles (default 20)

#### Market News
```
GET /api/news/market
```
Parameters:
- `limit`: Number of articles (default 30)
- `topics`: Topic filter (default 'financial_markets')

#### News with Sentiment
```
GET /api/news/sentiment
```
Parameters:
- `tickers`: Comma-separated stock symbols
- `limit`: Number of articles (default 50)
- `sentiment`: positive, negative, neutral

### 4. Frontend Components

#### AlphaVantageNewsFeed Component
```tsx
import { AlphaVantageNewsFeed } from './components/AlphaVantageNewsFeed';

// Basic usage
<AlphaVantageNewsFeed />

// With portfolio symbols
<AlphaVantageNewsFeed 
  symbols={['AAPL', 'GOOGL', 'MSFT']}
  category="portfolio"
  limit={20}
  showSentiment={true}
/>

// Market news
<AlphaVantageNewsFeed 
  category="market"
  limit={15}
/>
```

#### Enhanced MarketNewsFeed Component
The existing `MarketNewsFeed` component now automatically falls back to Alpha Vantage when the primary news source fails.

### 5. Features

#### Sentiment Analysis
- Positive, negative, and neutral sentiment labels
- Sentiment scores for quantitative analysis
- Visual indicators with color coding

#### News Filtering
- Filter by sentiment
- Filter by topics
- Filter by time range
- Filter by specific companies

#### Real-time Data
- Latest news articles
- Real-time sentiment analysis
- Market-relevant content

### 6. Rate Limits

Alpha Vantage has the following rate limits:
- Free tier: 5 API calls per minute, 500 per day
- Premium tiers: Higher limits available

### 7. Error Handling

The integration includes comprehensive error handling:
- Automatic fallback to alternative news sources
- Graceful degradation when API is unavailable
- User-friendly error messages

### 8. Usage Examples

#### Get Portfolio News
```typescript
import { alphaVantageNewsService } from '../lib/alphaVantageNewsService';

const portfolioNews = await alphaVantageNewsService.getPortfolioNews(
  ['AAPL', 'GOOGL', 'MSFT'], 
  20
);
```

#### Get Market News with Sentiment
```typescript
const marketNews = await alphaVantageNewsService.getNewsWithSentiment({
  limit: 30,
  sentiment: 'positive'
});
```

#### Get Company-Specific News
```typescript
const companyNews = await alphaVantageNewsService.getCompanyNews('AAPL', 15);
```

## Troubleshooting

### Common Issues

1. **API Key Not Working**
   - Verify the API key is correct
   - Check if you've exceeded rate limits
   - Ensure the environment variable is set correctly

2. **No News Data**
   - Check if the API key has news access
   - Verify the endpoint URLs are correct
   - Check network connectivity

3. **Rate Limit Exceeded**
   - Implement caching for repeated requests
   - Consider upgrading to a premium plan
   - Reduce request frequency

### Support

For Alpha Vantage API issues, visit their [documentation](https://www.alphavantage.co/documentation/) or contact their support.

For QuantFlow integration issues, check the application logs or create an issue in the repository.
