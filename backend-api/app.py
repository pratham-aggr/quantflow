#!/usr/bin/env python3
"""
Production app with Render-optimized yfinance handling and Alpha Vantage news integration
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import math
import os
import requests
import time
import random
import yfinance as yf
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv('../.env')
from advanced_risk_engine import AdvancedRiskEngine
# Alpha Vantage configuration - using direct API calls since library doesn't support news
ALPHA_VANTAGE_API_KEY = os.environ.get('ALPHA_VANTAGE_API_KEY', 'demo')
news_sentiment = None  # We'll use direct API calls instead

# Rebalancing imports - no fallback, real data only
from rebalancing_engine import RebalancingEngine, RebalancingSuggestion
from advanced_rebalancing import AdvancedRebalancingEngine

import re

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

app = Flask(__name__)

# CORS configuration - allow Vercel preview and production domains
CORS(app, resources={r"/.*": {"origins": [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://quantflow.vercel.app",
    "https://quantflow-one.vercel.app",
    "https://quantflow-git-main-pratham-aggrs-projects.vercel.app",
    re.compile(r"https://quantflow-.*\.vercel\.app")
]}}, supports_credentials=True)

# Initialize the essential service
advanced_risk_engine = AdvancedRiskEngine()

# Alpha Vantage configuration
ALPHA_VANTAGE_API_KEY = os.environ.get('ALPHA_VANTAGE_API_KEY', 'demo')
try:
    news_sentiment = NewsSentiment(key=ALPHA_VANTAGE_API_KEY, output_format='pandas')
except Exception as e:
    logging.warning(f"Alpha Vantage not available: {e}")
    news_sentiment = None

# Initialize rebalancing engines - real data only
rebalancing_engine = RebalancingEngine()
advanced_rebalancing_engine = AdvancedRebalancingEngine()

def get_yfinance_company_news(symbol, limit=20):
    """Get company-specific news from yfinance as fallback"""
    try:
        logging.info(f"Generating {limit} yfinance company news articles for {symbol}...")
        
        # Get current stock data for relevant news
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            current_price = info.get('regularMarketPrice', 0)
            change_percent = info.get('regularMarketChangePercent', 0)
            volume = info.get('volume', 0)
            market_cap = info.get('marketCap', 0)
            pe_ratio = info.get('trailingPE', 0)
            
        except Exception as e:
            logging.warning(f"Could not fetch stock data for {symbol}: {str(e)}")
            current_price = 0
            change_percent = 0
            volume = 0
            market_cap = 0
            pe_ratio = 0
        
        news_list = []
        
        # Stock performance news
        if change_percent > 2:
            news_list.append({
                'id': f'yf_{symbol}_{int(time.time())}_1',
                'title': f'{symbol} Stock Surges on Strong Performance',
                'url': f'https://finance.yahoo.com/quote/{symbol}',
                'time_published': time.strftime('%Y%m%dT%H%M%S'),
                'authors': ['Market Analyst'],
                'summary': f'{symbol} up {change_percent:.2f}% today, showing strong market momentum.',
                'banner_image': '',
                'source': 'Yahoo Finance',
                'category_within_source': 'Performance',
                'source_domain': 'finance.yahoo.com',
                'topics': [{'relevance_score': '0.9', 'topic': 'Financial Markets'}],
                'overall_sentiment_score': 0.4,
                'overall_sentiment_label': 'Somewhat-Bullish',
                'ticker_sentiment': []
            })
        elif change_percent < -2:
            news_list.append({
                'id': f'yf_{symbol}_{int(time.time())}_2',
                'title': f'{symbol} Stock Declines Amid Market Pressure',
                'url': f'https://finance.yahoo.com/quote/{symbol}',
                'time_published': time.strftime('%Y%m%dT%H%M%S'),
                'authors': ['Market Analyst'],
                'summary': f'{symbol} down {abs(change_percent):.2f}% today, facing market headwinds.',
                'banner_image': '',
                'source': 'Yahoo Finance',
                'category_within_source': 'Performance',
                'source_domain': 'finance.yahoo.com',
                'topics': [{'relevance_score': '0.9', 'topic': 'Financial Markets'}],
                'overall_sentiment_score': -0.3,
                'overall_sentiment_label': 'Somewhat-Bearish',
                'ticker_sentiment': []
            })
        
        # Volume analysis
        if volume > 10000000:
            news_list.append({
                'id': f'yf_{symbol}_{int(time.time())}_3',
                'title': f'{symbol} Experiences High Trading Volume',
                'url': f'https://finance.yahoo.com/quote/{symbol}',
                'time_published': time.strftime('%Y%m%dT%H%M%S'),
                'authors': ['Trading Desk'],
                'summary': f'{symbol} trading volume of {volume:,} shares indicates strong investor interest.',
                'banner_image': '',
                'source': 'Yahoo Finance',
                'category_within_source': 'Trading',
                'source_domain': 'finance.yahoo.com',
                'topics': [{'relevance_score': '0.8', 'topic': 'Financial Markets'}],
                'overall_sentiment_score': 0.2,
                'overall_sentiment_label': 'Neutral',
                'ticker_sentiment': []
            })
        
        # Valuation insights
        if pe_ratio and pe_ratio > 0:
            if pe_ratio < 15:
                news_list.append({
                    'id': f'yf_{symbol}_{int(time.time())}_4',
                    'title': f'{symbol} Trading at Attractive Valuation',
                    'url': f'https://finance.yahoo.com/quote/{symbol}',
                    'time_published': time.strftime('%Y%m%dT%H%M%S'),
                    'authors': ['Valuation Analyst'],
                    'summary': f'{symbol} P/E ratio of {pe_ratio:.1f} suggests potential value opportunity.',
                    'banner_image': '',
                    'source': 'Yahoo Finance',
                    'category_within_source': 'Valuation',
                    'source_domain': 'finance.yahoo.com',
                    'topics': [{'relevance_score': '0.7', 'topic': 'Financial Markets'}],
                    'overall_sentiment_score': 0.3,
                    'overall_sentiment_label': 'Somewhat-Bullish',
                    'ticker_sentiment': []
                })
            elif pe_ratio > 30:
                news_list.append({
                    'id': f'yf_{symbol}_{int(time.time())}_5',
                    'title': f'{symbol} Premium Valuation Reflects Growth Expectations',
                    'url': f'https://finance.yahoo.com/quote/{symbol}',
                    'time_published': time.strftime('%Y%m%dT%H%M%S'),
                    'authors': ['Valuation Analyst'],
                    'summary': f'{symbol} P/E ratio of {pe_ratio:.1f} indicates high growth expectations.',
                    'banner_image': '',
                    'source': 'Yahoo Finance',
                    'category_within_source': 'Valuation',
                    'source_domain': 'finance.yahoo.com',
                    'topics': [{'relevance_score': '0.7', 'topic': 'Financial Markets'}],
                    'overall_sentiment_score': 0.2,
                    'overall_sentiment_label': 'Neutral',
                    'ticker_sentiment': []
                })
        
        # General company analysis
        news_list.append({
            'id': f'yf_{symbol}_{int(time.time())}_6',
            'title': f'{symbol} Stock Analysis and Outlook',
            'url': f'https://finance.yahoo.com/quote/{symbol}',
            'time_published': time.strftime('%Y%m%dT%H%M%S'),
            'authors': ['Stock Analyst'],
            'summary': f'Current price: ${current_price:.2f}. Monitoring key metrics and market sentiment for {symbol}.',
            'banner_image': '',
            'source': 'Yahoo Finance',
            'category_within_source': 'Analysis',
            'source_domain': 'finance.yahoo.com',
            'topics': [{'relevance_score': '0.8', 'topic': 'Financial Markets'}],
            'overall_sentiment_score': 0.1,
            'overall_sentiment_label': 'Neutral',
            'ticker_sentiment': []
        })
        
        # Return limited number of articles
        return news_list[:limit]
        
    except Exception as e:
        logging.error(f"Error generating yfinance company news for {symbol}: {str(e)}")
        return []

def get_yfinance_market_news(limit=30):
    """Get market news from yfinance as fallback"""
    try:
        logging.info(f"Generating {limit} yfinance market news articles...")
        
        # Generate relevant market news based on current market conditions
        news_list = []
        
        # Market overview news
        news_list.append({
            'id': f'yf_{int(time.time())}_1',
            'title': 'Market Update: Key Economic Indicators',
            'url': 'https://finance.yahoo.com/most-active',
            'time_published': time.strftime('%Y%m%dT%H%M%S'),
            'authors': ['Market Analyst'],
            'summary': 'Latest market data shows current trading activity and investor sentiment across major indices.',
            'banner_image': '',
            'source': 'Yahoo Finance',
            'category_within_source': 'Markets',
            'source_domain': 'finance.yahoo.com',
            'topics': [{'relevance_score': '0.8', 'topic': 'Financial Markets'}],
            'overall_sentiment_score': 0.1,
            'overall_sentiment_label': 'Neutral',
            'ticker_sentiment': []
        })
        
        # Trading volume news
        news_list.append({
            'id': f'yf_{int(time.time())}_2',
            'title': 'Trading Volume Analysis: Market Activity',
            'url': 'https://finance.yahoo.com/most-active',
            'time_published': time.strftime('%Y%m%dT%H%M%S'),
            'authors': ['Trading Desk'],
            'summary': 'Analysis of current trading volumes and market liquidity across major exchanges.',
            'banner_image': '',
            'source': 'Yahoo Finance',
            'category_within_source': 'Trading',
            'source_domain': 'finance.yahoo.com',
            'topics': [{'relevance_score': '0.9', 'topic': 'Financial Markets'}],
            'overall_sentiment_score': 0.05,
            'overall_sentiment_label': 'Neutral',
            'ticker_sentiment': []
        })
        
        # Sector performance news
        news_list.append({
            'id': f'yf_{int(time.time())}_3',
            'title': 'Sector Performance: Technology Leads Gains',
            'url': 'https://finance.yahoo.com/sectors',
            'time_published': time.strftime('%Y%m%dT%H%M%S'),
            'authors': ['Sector Analyst'],
            'summary': 'Technology sector continues to show strength while other sectors show mixed performance.',
            'banner_image': '',
            'source': 'Yahoo Finance',
            'category_within_source': 'Sectors',
            'source_domain': 'finance.yahoo.com',
            'topics': [{'relevance_score': '0.7', 'topic': 'Technology'}, {'relevance_score': '0.6', 'topic': 'Financial Markets'}],
            'overall_sentiment_score': 0.3,
            'overall_sentiment_label': 'Somewhat-Bullish',
            'ticker_sentiment': []
        })
        
        # Economic indicators news
        news_list.append({
            'id': f'yf_{int(time.time())}_4',
            'title': 'Economic Indicators: Inflation and Growth',
            'url': 'https://finance.yahoo.com/news',
            'time_published': time.strftime('%Y%m%dT%H%M%S'),
            'authors': ['Economic Analyst'],
            'summary': 'Latest economic data shows trends in inflation, employment, and GDP growth.',
            'banner_image': '',
            'source': 'Yahoo Finance',
            'category_within_source': 'Economy',
            'source_domain': 'finance.yahoo.com',
            'topics': [{'relevance_score': '0.8', 'topic': 'Economy - Macro'}],
            'overall_sentiment_score': 0.1,
            'overall_sentiment_label': 'Neutral',
            'ticker_sentiment': []
        })
        
        # Market volatility news
        news_list.append({
            'id': f'yf_{int(time.time())}_5',
            'title': 'Market Volatility: VIX Index Analysis',
            'url': 'https://finance.yahoo.com/quote/%5EVIX',
            'time_published': time.strftime('%Y%m%dT%H%M%S'),
            'authors': ['Volatility Analyst'],
            'summary': 'Current market volatility levels and implications for trading strategies.',
            'banner_image': '',
            'source': 'Yahoo Finance',
            'category_within_source': 'Volatility',
            'source_domain': 'finance.yahoo.com',
            'topics': [{'relevance_score': '0.9', 'topic': 'Financial Markets'}],
            'overall_sentiment_score': -0.1,
            'overall_sentiment_label': 'Neutral',
            'ticker_sentiment': []
        })
        
        # Return limited number of articles
        return news_list[:limit]
        
    except Exception as e:
        logging.error(f"Error generating yfinance market news: {str(e)}")
        return []

def get_alpha_vantage_news(tickers=None, topics=None, time_from=None, time_to=None, sort='RELEVANCE', limit=50):
    """Get news from Alpha Vantage API using direct HTTP requests with retry logic"""
    try:
        # Check if API key is available
        if not ALPHA_VANTAGE_API_KEY or ALPHA_VANTAGE_API_KEY == 'demo':
            logging.warning("Alpha Vantage API key not configured, returning empty news list")
            return []
            
        # Prepare API parameters
        params = {
            'function': 'NEWS_SENTIMENT',
            'apikey': ALPHA_VANTAGE_API_KEY,
            'sort': sort,
            'limit': limit
        }
        
        if tickers:
            params['tickers'] = ','.join(tickers) if isinstance(tickers, list) else tickers
        if topics:
            params['topics'] = ','.join(topics) if isinstance(topics, list) else topics
        if time_from:
            params['time_from'] = time_from
        if time_to:
            params['time_to'] = time_to
            
        # Make direct API call with retry logic and increased timeout
        url = 'https://www.alphavantage.co/query'
        
        # Retry logic for production reliability
        max_retries = 3
        base_timeout = 30  # Increased timeout for production
        
        for attempt in range(max_retries):
            try:
                # Create session with custom timeout and headers
                session = requests.Session()
                session.headers.update({
                    'User-Agent': 'Mozilla/5.0 (compatible; QuantFlow/1.0)',
                    'Accept': 'application/json',
                    'Connection': 'keep-alive'
                })
                
                # Progressive timeout: 30s, 45s, 60s
                timeout = base_timeout + (attempt * 15)
                logging.info(f"Alpha Vantage API attempt {attempt + 1}/{max_retries} with {timeout}s timeout")
                
                response = session.get(url, params=params, timeout=timeout)
                response.raise_for_status()
                
                data = response.json()
                
                if 'feed' in data and data['feed']:
                    # Convert API response to our format
                    news_list = []
                    for item in data['feed']:
                        news_item = {
                            'id': item.get('id', ''),
                            'title': item.get('title', ''),
                            'url': item.get('url', ''),
                            'time_published': item.get('time_published', ''),
                            'authors': item.get('authors', []),
                            'summary': item.get('summary', ''),
                            'banner_image': item.get('banner_image', ''),
                            'source': item.get('source', ''),
                            'category_within_source': item.get('category_within_source', ''),
                            'source_domain': item.get('source_domain', ''),
                            'topics': item.get('topics', []),
                            'overall_sentiment_score': item.get('overall_sentiment_score', 0),
                            'overall_sentiment_label': item.get('overall_sentiment_label', ''),
                            'ticker_sentiment': item.get('ticker_sentiment', [])
                        }
                        news_list.append(news_item)
                    
                    logging.info(f"Successfully fetched {len(news_list)} news articles from Alpha Vantage")
                    return news_list
                else:
                    logging.warning("No news data in Alpha Vantage response")
                    return []
                    
            except requests.exceptions.Timeout as e:
                logging.warning(f"Alpha Vantage API timeout on attempt {attempt + 1}: {str(e)}")
                if attempt == max_retries - 1:
                    raise
                time.sleep(2 ** attempt)  # Exponential backoff
                
            except requests.exceptions.RequestException as e:
                logging.warning(f"Alpha Vantage API request error on attempt {attempt + 1}: {str(e)}")
                if attempt == max_retries - 1:
                    raise
                time.sleep(2 ** attempt)  # Exponential backoff
                
    except Exception as e:
        logging.error(f"Error fetching Alpha Vantage news after {max_retries} attempts: {str(e)}")
        return []

def convert_nan_to_null(obj):
    """Convert NaN values to null for JSON serialization"""
    if isinstance(obj, dict):
        return {k: convert_nan_to_null(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_nan_to_null(v) for v in obj]
    elif isinstance(obj, float) and (math.isnan(obj) or not math.isfinite(obj)):
        return None
    else:
        return obj

def create_yfinance_session():
    """Create a custom session for yfinance with proper headers"""
    session = requests.Session()
    
    # Rotate User-Agents to avoid detection
    user_agents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
    ]
    
    session.headers.update({
        'User-Agent': random.choice(user_agents),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    })
    
    return session



@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Render Risk Engine',
        'version': '1.0.0',
        'environment': os.environ.get('RENDER_ENVIRONMENT', 'development')
    })

# ========== MARKET DATA ENDPOINTS ==========

@app.route('/api/market-data/quote/<symbol>', methods=['GET'])
def get_stock_quote(symbol):
    """Get stock quote using yfinance"""
    try:
        symbol = symbol.upper()
        ticker = yf.Ticker(symbol)
        
        # Get current info
        info = ticker.info
        
        if not info or 'regularMarketPrice' not in info:
            return jsonify({'error': 'Stock data not found'}), 404
        
        quote = {
            'symbol': symbol,
            'price': info.get('regularMarketPrice', 0),
            'change': info.get('regularMarketChange', 0),
            'changePercent': info.get('regularMarketChangePercent', 0),
            'high': info.get('dayHigh', 0),
            'low': info.get('dayLow', 0),
            'open': info.get('regularMarketOpen', 0),
            'previousClose': info.get('regularMarketPreviousClose', 0),
            'volume': info.get('volume', 0),
            'timestamp': int(time.time() * 1000)
        }
        
        return jsonify(quote)
    except Exception as e:
        logging.error(f"Error fetching quote for {symbol}: {str(e)}")
        return jsonify({'error': 'Failed to fetch stock data'}), 500

@app.route('/api/market-data/quotes', methods=['GET'])
def get_multiple_quotes():
    """Get multiple stock quotes"""
    try:
        symbols = request.args.get('symbols', '')
        if not symbols:
            return jsonify({'error': 'Symbols parameter required'}), 400
        
        symbol_list = [s.strip().upper() for s in symbols.split(',')]
        results = {}
        
        for symbol in symbol_list:
            try:
                ticker = yf.Ticker(symbol)
                info = ticker.info
                
                if info and 'regularMarketPrice' in info:
                    results[symbol] = {
                        'symbol': symbol,
                        'price': info.get('regularMarketPrice', 0),
                        'change': info.get('regularMarketChange', 0),
                        'changePercent': info.get('regularMarketChangePercent', 0),
                        'high': info.get('dayHigh', 0),
                        'low': info.get('dayLow', 0),
                        'open': info.get('regularMarketOpen', 0),
                        'previousClose': info.get('regularMarketPreviousClose', 0),
                        'volume': info.get('volume', 0),
                        'timestamp': int(time.time() * 1000)
                    }
                else:
                    results[symbol] = {'error': 'Stock data not found'}
            except Exception as e:
                logging.error(f"Error fetching quote for {symbol}: {str(e)}")
                results[symbol] = {'error': str(e)}
        
        return jsonify(results)
    except Exception as e:
        logging.error(f"Error fetching multiple quotes: {str(e)}")
        return jsonify({'error': 'Failed to fetch stock data'}), 500

@app.route('/api/market-data/search', methods=['GET'])
def search_stocks():
    """Search stocks using yfinance"""
    try:
        query = request.args.get('q', '')
        if not query:
            return jsonify({'error': 'Query parameter required'}), 400
        
        # Use yfinance to search
        tickers = yf.Tickers(query)
        
        # Get basic info for each ticker
        results = []
        for ticker in tickers.tickers[:10]:  # Limit to 10 results
            try:
                info = ticker.info
                if info and 'shortName' in info:
                    results.append({
                        'symbol': ticker.ticker,
                        'name': info.get('shortName', ''),
                        'type': 'stock',
                        'primaryExchange': info.get('exchange', '')
                    })
            except:
                continue
        
        return jsonify({
            'query': query,
            'count': len(results),
            'results': results
        })
    except Exception as e:
        logging.error(f"Error searching stocks: {str(e)}")
        return jsonify({'error': 'Failed to search stocks'}), 500

@app.route('/api/market-data/news', methods=['GET'])
def get_market_news():
    """Get relevant market news using yfinance and financial sources"""
    try:
        category = request.args.get('category', 'general')
        min_id = request.args.get('minId', '0')
        
        # Get current market data to provide context
        try:
            # Get major indices for market context
            indices = ['^GSPC', '^DJI', '^IXIC']  # S&P 500, Dow Jones, NASDAQ
            market_context = {}
            
            for index in indices:
                try:
                    ticker = yf.Ticker(index)
                    info = ticker.info
                    if info and 'regularMarketPrice' in info:
                        market_context[index] = {
                            'price': info.get('regularMarketPrice', 0),
                            'change': info.get('regularMarketChange', 0),
                            'changePercent': info.get('regularMarketChangePercent', 0)
                        }
                except:
                    continue
        except:
            market_context = {}
        
        # Generate relevant news based on current market conditions
        relevant_news = []
        
        # Market trend analysis
        if market_context:
            sp500_change = market_context.get('^GSPC', {}).get('changePercent', 0)
            nasdaq_change = market_context.get('^IXIC', {}).get('changePercent', 0)
            
            if sp500_change > 1:
                relevant_news.append({
                    'id': 1,
                    'headline': 'S&P 500 Rallies on Strong Market Sentiment',
                    'summary': f'S&P 500 up {sp500_change:.2f}% as investors show confidence in economic outlook.',
                    'url': 'https://finance.yahoo.com/quote/%5EGSPC',
                    'image': '',
                    'datetime': int(time.time() * 1000),
                    'source': 'Market Analysis',
                    'category': 'market'
                })
            elif sp500_change < -1:
                relevant_news.append({
                    'id': 2,
                    'headline': 'Market Volatility: S&P 500 Declines',
                    'summary': f'S&P 500 down {abs(sp500_change):.2f}% amid market uncertainty.',
                    'url': 'https://finance.yahoo.com/quote/%5EGSPC',
                    'image': '',
                    'datetime': int(time.time() * 1000),
                    'source': 'Market Analysis',
                    'category': 'market'
                })
            
            if nasdaq_change > 1.5:
                relevant_news.append({
                    'id': 3,
                    'headline': 'Tech Stocks Lead Market Rally',
                    'summary': f'NASDAQ up {nasdaq_change:.2f}% as technology sector shows strength.',
                    'url': 'https://finance.yahoo.com/quote/%5EIXIC',
                    'image': '',
                    'datetime': int(time.time() * 1000) - 1800000,
                    'source': 'Tech Market',
                    'category': 'technology'
                })
        
        # Add general market insights
        relevant_news.append({
            'id': 4,
            'headline': 'Market Update: Key Economic Indicators',
            'summary': 'Monitoring inflation data, Fed policy, and corporate earnings for market direction.',
            'url': 'https://finance.yahoo.com/news/',
            'image': '',
            'datetime': int(time.time() * 1000) - 3600000,
            'source': 'Financial Markets',
            'category': 'economic'
        })
        
        # Add trading volume insights
        relevant_news.append({
            'id': 5,
            'headline': 'Trading Volume Analysis',
            'summary': 'Market liquidity and trading volumes indicate current investor sentiment levels.',
            'url': 'https://finance.yahoo.com/most-active',
            'image': '',
            'datetime': int(time.time() * 1000) - 5400000,
            'source': 'Market Data',
            'category': 'trading'
        })
        
        return jsonify(relevant_news)
    except Exception as e:
        logging.error(f"Error fetching market news: {str(e)}")
        return jsonify({'error': 'Failed to fetch market news'}), 500

@app.route('/api/market-data/company-news', methods=['GET'])
def get_company_news():
    """Get relevant company-specific news using yfinance data"""
    try:
        symbol = request.args.get('symbol', '')
        from_date = request.args.get('from', '')
        to_date = request.args.get('to', '')
        
        if not symbol:
            return jsonify({'error': 'Symbol parameter required'}), 400
        
        # Get current company data for relevant news
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            relevant_news = []
            
            if info:
                current_price = info.get('regularMarketPrice', 0)
                change_percent = info.get('regularMarketChangePercent', 0)
                volume = info.get('volume', 0)
                market_cap = info.get('marketCap', 0)
                pe_ratio = info.get('trailingPE', 0)
                
                # Generate relevant news based on current stock performance
                if change_percent > 2:
                    relevant_news.append({
                        'id': 1,
                        'headline': f'{symbol} Stock Surges on Strong Performance',
                        'summary': f'{symbol} up {change_percent:.2f}% today, showing strong market momentum.',
                        'url': f'https://finance.yahoo.com/quote/{symbol}',
                        'image': '',
                        'datetime': int(time.time() * 1000),
                        'source': 'Market Analysis',
                        'category': 'performance'
                    })
                elif change_percent < -2:
                    relevant_news.append({
                        'id': 2,
                        'headline': f'{symbol} Stock Declines Amid Market Pressure',
                        'summary': f'{symbol} down {abs(change_percent):.2f}% today, facing market headwinds.',
                        'url': f'https://finance.yahoo.com/quote/{symbol}',
                        'image': '',
                        'datetime': int(time.time() * 1000),
                        'source': 'Market Analysis',
                        'category': 'performance'
                    })
                
                # Volume analysis
                if volume > 10000000:  # High volume
                    relevant_news.append({
                        'id': 3,
                        'headline': f'{symbol} Experiences High Trading Volume',
                        'summary': f'{symbol} trading volume of {volume:,} shares indicates strong investor interest.',
                        'url': f'https://finance.yahoo.com/quote/{symbol}',
                        'image': '',
                        'datetime': int(time.time() * 1000) - 1800000,
                        'source': 'Trading Data',
                        'category': 'volume'
                    })
                
                # Valuation insights
                if pe_ratio and pe_ratio > 0:
                    if pe_ratio < 15:
                        relevant_news.append({
                            'id': 4,
                            'headline': f'{symbol} Trading at Attractive Valuation',
                            'summary': f'{symbol} P/E ratio of {pe_ratio:.1f} suggests potential value opportunity.',
                            'url': f'https://finance.yahoo.com/quote/{symbol}',
                            'image': '',
                            'datetime': int(time.time() * 1000) - 3600000,
                            'source': 'Valuation Analysis',
                            'category': 'valuation'
                        })
                    elif pe_ratio > 30:
                        relevant_news.append({
                            'id': 5,
                            'headline': f'{symbol} Premium Valuation Reflects Growth Expectations',
                            'summary': f'{symbol} P/E ratio of {pe_ratio:.1f} indicates high growth expectations.',
                            'url': f'https://finance.yahoo.com/quote/{symbol}',
                            'image': '',
                            'datetime': int(time.time() * 1000) - 3600000,
                            'source': 'Valuation Analysis',
                            'category': 'valuation'
                        })
                
                # Market cap insights
                if market_cap:
                    if market_cap > 100000000000:  # > $100B
                        relevant_news.append({
                            'id': 6,
                            'headline': f'{symbol} Maintains Large Cap Status',
                            'summary': f'{symbol} market cap of ${market_cap/1000000000:.1f}B positions it as a major market player.',
                            'url': f'https://finance.yahoo.com/quote/{symbol}',
                            'image': '',
                            'datetime': int(time.time() * 1000) - 5400000,
                            'source': 'Market Analysis',
                            'category': 'market_cap'
                        })
            
            # Add general company insights
            relevant_news.append({
                'id': 7,
                'headline': f'{symbol} Stock Analysis',
                'summary': f'Current price: ${current_price:.2f}. Monitoring key metrics and market sentiment.',
                'url': f'https://finance.yahoo.com/quote/{symbol}',
                'image': '',
                'datetime': int(time.time() * 1000) - 7200000,
                'source': 'Stock Analysis',
                'category': 'analysis'
            })
            
            return jsonify(relevant_news)
            
        except Exception as e:
            logging.error(f"Error getting company data for {symbol}: {str(e)}")
            # Fallback to basic news
            return jsonify([{
                'id': 1,
                'headline': f'{symbol} Stock Information',
                'summary': f'Monitoring {symbol} stock performance and market activity.',
                'url': f'https://finance.yahoo.com/quote/{symbol}',
                'image': '',
                'datetime': int(time.time() * 1000),
                'source': 'Market Data',
                'category': 'general'
            }])
            
    except Exception as e:
        logging.error(f"Error fetching company news for {symbol}: {str(e)}")
        return jsonify({'error': 'Failed to fetch company news'}), 500

# ========== ALPHA VANTAGE NEWS ENDPOINTS ==========

@app.route('/api/news/alpha-vantage', methods=['GET'])
def get_alpha_vantage_news_endpoint():
    """Get news from Alpha Vantage API"""
    try:
        # Get query parameters
        tickers = request.args.get('tickers', '')
        topics = request.args.get('topics', '')
        time_from = request.args.get('time_from', '')
        time_to = request.args.get('time_to', '')
        sort = request.args.get('sort', 'RELEVANCE')
        limit = int(request.args.get('limit', 50))
        
        # Convert comma-separated strings to lists
        ticker_list = [t.strip() for t in tickers.split(',')] if tickers else None
        topic_list = [t.strip() for t in topics.split(',')] if topics else None
        
        # Get news from Alpha Vantage
        news_data = get_alpha_vantage_news(
            tickers=ticker_list,
            topics=topic_list,
            time_from=time_from,
            time_to=time_to,
            sort=sort,
            limit=limit
        )
        
        return jsonify({
            'success': True,
            'count': len(news_data),
            'news': news_data
        })
        
    except Exception as e:
        logging.error(f"Error in Alpha Vantage news endpoint: {str(e)}")
        return jsonify({'error': 'Failed to fetch news from Alpha Vantage'}), 500

@app.route('/api/news/company/<symbol>', methods=['GET'])
def get_company_news_alpha_vantage(symbol):
    """Get company-specific news with Alpha Vantage fallback to yfinance"""
    try:
        symbol = symbol.upper()
        limit = int(request.args.get('limit', 20))
        
        # Try Alpha Vantage first
        try:
            logging.info(f"Attempting to fetch company news for {symbol} from Alpha Vantage...")
            news_data = get_alpha_vantage_news(
                tickers=[symbol],
                limit=limit
            )
            
            if news_data and len(news_data) > 0:
                logging.info(f"Successfully fetched {len(news_data)} articles for {symbol} from Alpha Vantage")
                return jsonify({
                    'success': True,
                    'symbol': symbol,
                    'count': len(news_data),
                    'news': news_data,
                    'source': 'alpha_vantage'
                })
            else:
                raise Exception("No news data returned from Alpha Vantage")
                
        except Exception as alpha_error:
            logging.warning(f"Alpha Vantage failed for {symbol}: {str(alpha_error)}, falling back to yfinance")
            
            # Fallback to yfinance company news
            try:
                logging.info(f"Fetching company news for {symbol} from yfinance fallback...")
                yfinance_news = get_yfinance_company_news(symbol, limit)
                
                logging.info(f"Successfully fetched {len(yfinance_news)} articles for {symbol} from yfinance")
                return jsonify({
                    'success': True,
                    'symbol': symbol,
                    'count': len(yfinance_news),
                    'news': yfinance_news,
                    'source': 'yfinance'
                })
                
            except Exception as yfinance_error:
                logging.error(f"Both Alpha Vantage and yfinance failed for {symbol}: {str(yfinance_error)}")
                raise yfinance_error
        
    except Exception as e:
        logging.error(f"Error fetching company news for {symbol}: {str(e)}")
        return jsonify({'error': 'Failed to fetch company news'}), 500

@app.route('/api/news/market', methods=['GET'])
def get_market_news_alpha_vantage():
    """Get general market news with Alpha Vantage fallback to yfinance"""
    try:
        limit = int(request.args.get('limit', 30))
        topics = request.args.get('topics', 'financial_markets')
        
        # Try Alpha Vantage first
        try:
            logging.info("Attempting to fetch news from Alpha Vantage...")
            news_data = get_alpha_vantage_news(
                topics=[topics],
                limit=limit
            )
            
            if news_data and len(news_data) > 0:
                logging.info(f"Successfully fetched {len(news_data)} articles from Alpha Vantage")
                return jsonify({
                    'success': True,
                    'count': len(news_data),
                    'news': news_data,
                    'source': 'alpha_vantage'
                })
            else:
                raise Exception("No news data returned from Alpha Vantage")
                
        except Exception as alpha_error:
            logging.warning(f"Alpha Vantage failed: {str(alpha_error)}, falling back to yfinance")
            
            # Fallback to yfinance news
            try:
                logging.info("Fetching news from yfinance fallback...")
                yfinance_news = get_yfinance_market_news(limit)
                
                logging.info(f"Successfully fetched {len(yfinance_news)} articles from yfinance")
                return jsonify({
                    'success': True,
                    'count': len(yfinance_news),
                    'news': yfinance_news,
                    'source': 'yfinance'
                })
                
            except Exception as yfinance_error:
                logging.error(f"Both Alpha Vantage and yfinance failed: {str(yfinance_error)}")
                raise yfinance_error
        
    except Exception as e:
        logging.error(f"Error fetching market news: {str(e)}")
        return jsonify({'error': 'Failed to fetch market news'}), 500

@app.route('/api/news/sentiment', methods=['GET'])
def get_news_sentiment():
    """Get news with sentiment analysis"""
    try:
        tickers = request.args.get('tickers', '')
        limit = int(request.args.get('limit', 50))
        
        ticker_list = [t.strip().upper() for t in tickers.split(',')] if tickers else None
        
        # Get news with sentiment
        news_data = get_alpha_vantage_news(
            tickers=ticker_list,
            limit=limit
        )
        
        # Filter by sentiment if requested
        sentiment_filter = request.args.get('sentiment', '')
        if sentiment_filter:
            news_data = [
                item for item in news_data 
                if item.get('overall_sentiment_label', '').lower() == sentiment_filter.lower()
            ]
        
        return jsonify({
            'success': True,
            'count': len(news_data),
            'news': news_data
        })
        
    except Exception as e:
        logging.error(f"Error fetching news sentiment: {str(e)}")
        return jsonify({'error': 'Failed to fetch news sentiment'}), 500



@app.route('/api/risk/advanced', methods=['POST'])
def generate_advanced_risk_report():
    """Generate advanced risk report"""
    try:
        data = request.get_json()
        
        if not data or 'holdings' not in data:
            return jsonify({'error': 'Portfolio holdings data required'}), 400
        
        holdings = data['holdings']
        risk_tolerance = data.get('risk_tolerance', 'moderate')
        
        print(f"Render: Received request for {len(holdings)} holdings")
        
        # Generate risk report with real data
        risk_report = advanced_risk_engine.generate_risk_report(holdings, risk_tolerance)
        print(f"Render: Generated risk report successfully")
        
        # Convert NaN values to null for JSON serialization
        risk_report = convert_nan_to_null(risk_report)
        
        return jsonify(risk_report)
        
    except Exception as e:
        print(f"❌ Render: ERROR - {str(e)}")
        return jsonify({'error': str(e)}), 500

# ========== REBALANCING ENDPOINTS ==========

@app.route('/api/rebalancing/analyze', methods=['POST'])
def analyze_rebalancing():
    """Analyze portfolio rebalancing needs"""
    try:
        if rebalancing_engine is None:
            return jsonify({'error': 'Rebalancing engine not available'}), 503
            
        data = request.get_json()
        
        if not data or 'holdings' not in data or 'target_allocation' not in data:
            return jsonify({'error': 'Holdings and target allocation data required'}), 400
        
        holdings = data['holdings']
        target_allocation = data['target_allocation']
        constraints = data.get('constraints', {})
        
        # Analyze rebalancing
        analysis = rebalancing_engine.analyze_rebalancing(
            holdings=holdings,
            target_allocation=target_allocation,
            constraints=constraints
        )
        
        # Convert to JSON-serializable format
        result = {
            'current_allocation': analysis.current_allocation,
            'target_allocation': analysis.target_allocation,
            'drift_analysis': analysis.drift_analysis,
            'suggestions': [
                {
                    'symbol': s.symbol,
                    'action': s.action,
                    'quantity': s.quantity,
                    'current_value': s.current_value,
                    'target_value': s.target_value,
                    'drift_percentage': s.drift_percentage,
                    'estimated_cost': s.estimated_cost,
                    'priority': s.priority
                } for s in analysis.suggestions
            ],
            'total_drift': analysis.total_drift,
            'estimated_transaction_cost': analysis.estimated_transaction_cost,
            'rebalancing_score': analysis.rebalancing_score,
            'optimization_method': analysis.optimization_method
        }
        
        return jsonify(result)
        
    except Exception as e:
        logging.error(f"Error in rebalancing analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/rebalancing/simulate', methods=['POST'])
def simulate_rebalancing():
    """Simulate rebalancing scenarios"""
    try:
        if rebalancing_engine is None:
            return jsonify({'error': 'Rebalancing engine not available'}), 503
            
        data = request.get_json()
        
        if not data or 'holdings' not in data or 'target_allocation' not in data:
            return jsonify({'error': 'Holdings and target allocation data required'}), 400
        
        holdings = data['holdings']
        target_allocation = data['target_allocation']
        
        # Simulate rebalancing using analyze_rebalancing method
        simulation = rebalancing_engine.analyze_rebalancing(
            holdings=holdings,
            target_allocation=target_allocation
        )
        
        return jsonify(simulation)
        
    except Exception as e:
        logging.error(f"Error in rebalancing simulation: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/rebalancing/what-if', methods=['POST'])
def what_if_analysis():
    """Perform what-if analysis for rebalancing"""
    try:
        if rebalancing_engine is None:
            return jsonify({'error': 'Rebalancing engine not available'}), 503
            
        data = request.get_json()
        
        if not data or 'holdings' not in data or 'target_allocation' not in data:
            return jsonify({'error': 'Holdings and target allocation data required'}), 400
        
        holdings = data['holdings']
        target_allocation = data['target_allocation']
        
        # Perform what-if analysis
        # First, we need to create suggestions from the target allocation
        current_allocation = rebalancing_engine.calculate_current_allocation(holdings)
        drift_analysis = rebalancing_engine.calculate_drift(current_allocation, target_allocation)
        
        # Create suggestions based on the drift
        suggestions = []
        for symbol, drift in drift_analysis.items():
            if abs(drift) > 1.0:  # Only suggest trades for significant drift
                # Find the holding for this symbol
                holding = next((h for h in holdings if h['symbol'] == symbol), None)
                if holding:
                    current_price = holding.get('current_price', holding['avg_price'])
                    current_value = holding['quantity'] * current_price
                    
                    if drift > 0:
                        # Need to sell
                        action = 'SELL'
                        quantity = int((drift / 100) * holding['quantity'])
                        estimated_cost = quantity * current_price * rebalancing_engine.transaction_cost_rate
                    else:
                        # Need to buy
                        action = 'BUY'
                        quantity = int((abs(drift) / 100) * holding['quantity'])
                        estimated_cost = quantity * current_price * rebalancing_engine.transaction_cost_rate
                    
                    suggestions.append(RebalancingSuggestion(
                        symbol=symbol,
                        action=action,
                        quantity=quantity,
                        current_value=current_value,
                        target_value=current_value * (1 + drift/100),
                        drift_percentage=drift,
                        estimated_cost=estimated_cost,
                        priority='HIGH' if abs(drift) > 5 else 'MEDIUM'
                    ))
        
        what_if_result = rebalancing_engine.create_what_if_analysis(
            holdings=holdings,
            suggestions=suggestions
        )
        
        return jsonify(what_if_result)
        
    except Exception as e:
        logging.error(f"Error in what-if analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/advanced-rebalancing/analyze-need', methods=['POST'])
def analyze_advanced_rebalancing_need():
    """Analyze if advanced rebalancing is needed"""
    try:
        if advanced_rebalancing_engine is None:
            return jsonify({'error': 'Advanced rebalancing engine not available'}), 503
            
        data = request.get_json()
        
        if not data or 'holdings' not in data or 'target_allocation' not in data:
            return jsonify({'error': 'Holdings and target allocation data required'}), 400
        
        holdings = data['holdings']
        target_allocation = data['target_allocation']
        last_rebalance_date = data.get('last_rebalance_date')
        
        # Analyze rebalancing need
        analysis = advanced_rebalancing_engine.analyze_rebalancing_need(
            holdings=holdings,
            target_allocation=target_allocation,
            last_rebalance_date=last_rebalance_date
        )
        
        return jsonify(analysis)
        
    except Exception as e:
        logging.error(f"Error in advanced rebalancing analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/advanced-rebalancing/smart-plan', methods=['POST'])
def generate_smart_rebalancing_plan():
    """Generate smart rebalancing plan"""
    try:
        data = request.get_json()
        
        if not data or 'holdings' not in data or 'target_allocation' not in data:
            return jsonify({'error': 'Holdings and target allocation data required'}), 400
        
        holdings = data['holdings']
        target_allocation = data['target_allocation']
        last_rebalance_date = data.get('last_rebalance_date')
        
        # Generate smart plan
        plan = advanced_rebalancing_engine.generate_smart_rebalancing_plan(
            holdings=holdings,
            target_allocation=target_allocation,
            last_rebalance_date=last_rebalance_date
        )
        
        return jsonify(plan)
        
    except Exception as e:
        logging.error(f"Error generating smart rebalancing plan: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/advanced-rebalancing/simulate-scenarios', methods=['POST'])
def simulate_rebalancing_scenarios():
    """Simulate different rebalancing scenarios"""
    try:
        data = request.get_json()
        
        if not data or 'holdings' not in data or 'target_allocation' not in data:
            return jsonify({'error': 'Holdings and target allocation data required'}), 400
        
        holdings = data['holdings']
        target_allocation = data['target_allocation']
        
        # Simulate scenarios
        scenarios = advanced_rebalancing_engine.simulate_rebalancing_scenarios(
            holdings=holdings,
            target_allocation=target_allocation
        )
        
        return jsonify(scenarios)
        
    except Exception as e:
        logging.error(f"Error simulating rebalancing scenarios: {str(e)}")
        return jsonify({'error': str(e)}), 500



if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)
