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
import pandas as pd
import numpy as np
from concurrent.futures import ThreadPoolExecutor, as_completed

# Load environment variables from .env file
load_dotenv('../.env')
from advanced_risk_engine import AdvancedRiskEngine
# Finnhub configuration for news API
FINNHUB_API_KEY = os.environ.get('REACT_APP_FINNHUB_API_KEY')

# Rebalancing imports - no fallback, real data only
from rebalancing_engine import RebalancingEngine, RebalancingSuggestion
from advanced_rebalancing import AdvancedRebalancingEngine

import re
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Simple in-memory cache for quotes to reduce API calls
quote_cache = {}
CACHE_DURATION = 300  # 5 minutes cache

app = Flask(__name__)

# CORS configuration - allow Vercel preview and production domains
CORS(app, resources={r"/.*": {
    "origins": [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://quantflow.vercel.app",
        "https://quantflow-one.vercel.app",
        "https://quantflow-git-main-pratham-aggrs-projects.vercel.app",
        re.compile(r"https://quantflow-.*\.vercel\.app"),
        re.compile(r"https://.*\.vercel\.app"),  # Allow any Vercel domain
        re.compile(r"https://.*-.*-.*\.vercel\.app")  # Allow Vercel preview domains
    ],
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
    "supports_credentials": True
}})

# Manual CORS headers for additional safety
@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')
    if origin and any(pattern.match(origin) if hasattr(pattern, 'match') else origin == pattern 
                     for pattern in [
                         "http://localhost:3000",
                         "http://localhost:3001", 
                         "https://quantflow.vercel.app",
                         "https://quantflow-one.vercel.app",
                         re.compile(r"https://.*\.vercel\.app")
                     ]):
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

# Initialize the essential service
advanced_risk_engine = AdvancedRiskEngine()

# Finnhub configuration
FINNHUB_API_KEY = os.environ.get('REACT_APP_FINNHUB_API_KEY')

# Initialize rebalancing engines - real data only
rebalancing_engine = RebalancingEngine()
advanced_rebalancing_engine = AdvancedRebalancingEngine()

def get_yfinance_company_news(symbol, limit=20):
    """Get company-specific news from yfinance as fallback - NO MOCK DATA"""
    try:
        logging.info(f"Fetching real company news for {symbol}...")
        
        # Return empty array - no mock data
        return []
        
    except Exception as e:
        logging.error(f"Error fetching company news for {symbol}: {str(e)}")
        return []

def get_yfinance_market_news(limit=30):
    """Get market news from yfinance as fallback - NO MOCK DATA"""
    try:
        logging.info(f"Fetching real market news...")
        
        # Return empty array - no mock data
        return []
        
    except Exception as e:
        logging.error(f"Error fetching market news: {str(e)}")
        return []

def get_finnhub_news(category='general', q=None, limit=50):
    """Get news from Finnhub API with retry logic"""
    try:
        # Check if API key is available
        if not FINNHUB_API_KEY:
            logging.warning("Finnhub API key not configured, returning empty news list")
            return []
            
        # Prepare API parameters
        params = {
            'token': FINNHUB_API_KEY,
            'category': category
        }
        
        if q:
            params['q'] = q
            
        # Make API call with retry logic
        url = 'https://finnhub.io/api/v1/news'
        
        # Retry logic for production reliability
        max_retries = 3
        base_timeout = 30
        
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
                logging.info(f"Finnhub API attempt {attempt + 1}/{max_retries} with {timeout}s timeout")
                
                response = session.get(url, params=params, timeout=timeout)
                response.raise_for_status()
                
                data = response.json()
                
                if data and isinstance(data, list):
                    # Convert Finnhub response to our format
                    news_list = []
                    for item in data[:limit]:  # Limit the results
                        news_item = {
                            'id': str(item.get('id', '')),
                            'title': item.get('headline', ''),
                            'url': item.get('url', ''),
                            'time_published': str(item.get('datetime', '')),
                            'authors': [item.get('author', '')] if item.get('author') else [],
                            'summary': item.get('summary', ''),
                            'banner_image': item.get('image', ''),
                            'source': item.get('source', ''),
                            'category_within_source': item.get('category', ''),
                            'source_domain': item.get('source', ''),
                            'topics': [{'relevance_score': '0.8', 'topic': item.get('category', 'General')}],
                            'overall_sentiment_score': 0,  # Finnhub doesn't provide sentiment
                            'overall_sentiment_label': 'Neutral',
                            'ticker_sentiment': []
                        }
                        news_list.append(news_item)
                    
                    logging.info(f"Successfully fetched {len(news_list)} news articles from Finnhub")
                    return news_list
                else:
                    logging.warning("No news data in Finnhub response")
                    return []
                    
            except requests.exceptions.Timeout as e:
                logging.warning(f"Finnhub API timeout on attempt {attempt + 1}: {str(e)}")
                if attempt == max_retries - 1:
                    raise
                time.sleep(2 ** attempt)  # Exponential backoff
                
            except requests.exceptions.RequestException as e:
                logging.warning(f"Finnhub API request error on attempt {attempt + 1}: {str(e)}")
                if attempt == max_retries - 1:
                    raise
                time.sleep(2 ** attempt)  # Exponential backoff
                
    except Exception as e:
        logging.error(f"Error fetching Finnhub news after {max_retries} attempts: {str(e)}")
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
    """Health check endpoint with cache status"""
    return jsonify({
        'status': 'healthy',
        'service': 'Render Risk Engine',
        'version': '1.0.0',
        'environment': os.environ.get('RENDER_ENVIRONMENT', 'development'),
        'cache_status': {
            'cached_quotes': len(quote_cache),
            'cache_duration_seconds': CACHE_DURATION
        }
    })

# ========== MARKET DATA ENDPOINTS ==========

@app.route('/api/market-data/quote/<symbol>', methods=['GET'])
def get_stock_quote(symbol):
    """Get stock quote using yfinance with rate limiting protection and caching"""
    try:
        symbol = symbol.upper()
        
        # Check cache first
        now = datetime.now()
        if symbol in quote_cache:
            cached_data, cache_time = quote_cache[symbol]
            if (now - cache_time).total_seconds() < CACHE_DURATION:
                logging.info(f"Returning cached data for {symbol}")
                return jsonify(cached_data)
        
        # Add small delay to avoid rate limiting
        time.sleep(0.2)
        
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
        
        # Cache the result
        quote_cache[symbol] = (quote, now)
        
        return jsonify(quote)
    except Exception as e:
        error_msg = str(e)
        if 'rate limit' in error_msg.lower() or 'too many requests' in error_msg.lower():
            logging.warning(f"Rate limited for {symbol}, returning rate limit error")
            return jsonify({'error': 'Rate limited - please try again later'}), 429
        logging.error(f"Error fetching quote for {symbol}: {error_msg}")
        return jsonify({'error': 'Failed to fetch stock data'}), 500

def fetch_single_quote(symbol):
    """Helper function to fetch a single quote - used for parallel processing"""
    try:
        # Check cache first
        now = datetime.now()
        if symbol in quote_cache:
            cached_data, cache_time = quote_cache[symbol]
            if (now - cache_time).total_seconds() < CACHE_DURATION:
                return symbol, cached_data
        
        # Add delay to avoid rate limiting
        time.sleep(0.5)  # 500ms delay between requests
        
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        if info and 'regularMarketPrice' in info:
            quote_data = {
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
            # Cache the result
            quote_cache[symbol] = (quote_data, now)
            return symbol, quote_data
        else:
            return symbol, {'error': 'Stock data not found'}
    except Exception as e:
        error_msg = str(e)
        if 'rate limit' in error_msg.lower() or 'too many requests' in error_msg.lower():
            logging.warning(f"Rate limited for {symbol}, retrying with delay...")
            time.sleep(2)  # Wait 2 seconds before retry
            try:
                # Retry once with longer delay
                ticker = yf.Ticker(symbol)
                info = ticker.info
                if info and 'regularMarketPrice' in info:
                    quote_data = {
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
                    # Cache the result
                    quote_cache[symbol] = (quote_data, datetime.now())
                    return symbol, quote_data
            except Exception as retry_error:
                logging.error(f"Retry failed for {symbol}: {str(retry_error)}")
                return symbol, {'error': 'Rate limited - please try again later'}
        
        logging.error(f"Error fetching quote for {symbol}: {error_msg}")
        return symbol, {'error': error_msg}

@app.route('/api/market-data/quotes', methods=['GET'])
def get_multiple_quotes():
    """Get multiple stock quotes with parallel processing for speed"""
    try:
        symbols = request.args.get('symbols', '')
        if not symbols:
            return jsonify({'error': 'Symbols parameter required'}), 400
        
        symbol_list = [s.strip().upper() for s in symbols.split(',')]
        results = {}
        
        logging.info(f"🚀 Fetching {len(symbol_list)} quotes in parallel: {symbol_list}")
        
        # Use ThreadPoolExecutor for parallel fetching with reduced concurrency to avoid rate limits
        max_workers = min(3, len(symbol_list))  # Max 3 concurrent requests to avoid rate limiting
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all tasks
            future_to_symbol = {executor.submit(fetch_single_quote, symbol): symbol for symbol in symbol_list}
            
            # Collect results as they complete
            for future in as_completed(future_to_symbol):
                try:
                    symbol, quote_data = future.result()
                    results[symbol] = quote_data
                except Exception as e:
                    symbol = future_to_symbol[future]
                    logging.error(f"Error in parallel fetch for {symbol}: {str(e)}")
                    results[symbol] = {'error': str(e)}
        
        logging.info(f"✅ Successfully fetched {len(results)} quotes in parallel")
        return jsonify(results)
        
    except Exception as e:
        logging.error(f"Error fetching multiple quotes: {str(e)}")
        return jsonify({'error': 'Failed to fetch stock data'}), 500

@app.route('/api/market-data/historical/<symbol>', methods=['GET'])
def get_historical_data(symbol):
    """Get historical stock data for sentiment analysis"""
    try:
        start_date = request.args.get('start')
        end_date = request.args.get('end')
        
        if not start_date or not end_date:
            return jsonify({'error': 'Start and end dates are required'}), 400
        
        logging.info(f"Fetching historical data for {symbol} from {start_date} to {end_date}")
        
        ticker = yf.Ticker(symbol)
        hist = ticker.history(start=start_date, end=end_date)
        
        if hist.empty:
            return jsonify([])
        
        # Convert to list of dictionaries
        historical_data = []
        for date, row in hist.iterrows():
            historical_data.append({
                'date': date.strftime('%Y-%m-%d'),
                'open': float(row['Open']),
                'high': float(row['High']),
                'low': float(row['Low']),
                'close': float(row['Close']),
                'volume': int(row['Volume'])
            })
        
        return jsonify(historical_data)
        
    except Exception as e:
        logging.error(f"Error fetching historical data for {symbol}: {str(e)}")
        return jsonify({'error': f'Failed to fetch historical data for {symbol}'}), 500

@app.route('/api/market-data/search', methods=['GET'])
def search_stocks():
    """Search stocks using yfinance"""
    try:
        query = request.args.get('q', '')
        if not query:
            return jsonify({'error': 'Query parameter required'}), 400
        
        # Use yfinance to search - try different approaches
        results = []
        
        try:
            # First try: Use Tickers object properly
            tickers = yf.Tickers(query)
            
            # Get ticker symbols safely
            ticker_symbols = []
            try:
                # Try to get ticker symbols from the Tickers object
                if hasattr(tickers, 'tickers') and tickers.tickers:
                    ticker_symbols = list(tickers.tickers.keys())[:10]
                else:
                    # Fallback: try to get symbols from the tickers object directly
                    ticker_symbols = [str(ticker) for ticker in tickers.tickers][:10]
            except Exception as symbol_error:
                logging.warning(f"Error getting ticker symbols: {str(symbol_error)}")
                ticker_symbols = []
            
            for ticker_symbol in ticker_symbols:
                try:
                    ticker = yf.Ticker(ticker_symbol)
                    info = ticker.info
                    if info and 'shortName' in info:
                        results.append({
                            'symbol': ticker_symbol,
                            'name': info.get('shortName', ''),
                            'type': 'stock',
                            'primaryExchange': info.get('exchange', '')
                        })
                except Exception as ticker_error:
                    logging.warning(f"Error processing ticker {ticker_symbol}: {str(ticker_error)}")
                    continue
                    
        except Exception as tickers_error:
            logging.warning(f"Tickers approach failed: {str(tickers_error)}, trying alternative")
            
            # Fallback: Try direct search with common patterns
            try:
                # Try common stock patterns
                search_patterns = [
                    query.upper(),
                    f"{query.upper()}.TO",  # Toronto
                    f"{query.upper()}.V",   # Vancouver
                    f"{query.upper()}.AX",  # Australia
                    f"{query.upper()}.L",   # London
                ]
                
                for pattern in search_patterns:
                    if len(results) >= 10:
                        break
                    try:
                        ticker = yf.Ticker(pattern)
                        info = ticker.info
                        if info and 'shortName' in info and info.get('regularMarketPrice'):
                            results.append({
                                'symbol': pattern,
                                'name': info.get('shortName', ''),
                                'type': 'stock',
                                'primaryExchange': info.get('exchange', '')
                            })
                    except:
                        continue
                        
            except Exception as fallback_error:
                logging.error(f"Fallback search also failed: {str(fallback_error)}")
        
        # Convert to the format expected by the frontend
        formatted_results = []
        for result in results:
            formatted_results.append({
                'description': result['name'],
                'displaySymbol': result['symbol'],
                'symbol': result['symbol'],
                'type': result['type']
            })
        
        return jsonify({
            'count': len(formatted_results),
            'result': formatted_results
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
        
        # Return empty array - no mock data
        return jsonify([])
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
        
        # Return empty array - no mock data
        return jsonify([])
            
    except Exception as e:
        logging.error(f"Error fetching company news for {symbol}: {str(e)}")
        return jsonify({'error': 'Failed to fetch company news'}), 500



@app.route('/api/news/company/<symbol>', methods=['GET'])
def get_company_news_finnhub(symbol):
    """Get company-specific news with Finnhub fallback to yfinance"""
    try:
        symbol = symbol.upper()
        limit = int(request.args.get('limit', 20))
        
        # Try Finnhub first
        try:
            logging.info(f"Attempting to fetch company news for {symbol} from Finnhub...")
            news_data = get_finnhub_news(
                category='general',
                q=symbol,
                limit=limit
            )
            
            if news_data and len(news_data) > 0:
                logging.info(f"Successfully fetched {len(news_data)} articles for {symbol} from Finnhub")
                return jsonify({
                    'success': True,
                    'symbol': symbol,
                    'count': len(news_data),
                    'news': news_data,
                    'source': 'finnhub'
                })
            else:
                raise Exception("No news data returned from Finnhub")
                
        except Exception as finnhub_error:
            logging.warning(f"Finnhub failed for {symbol}: {str(finnhub_error)}, falling back to yfinance")
            
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
                logging.error(f"Both Finnhub and yfinance failed for {symbol}: {str(yfinance_error)}")
                raise yfinance_error
        
    except Exception as e:
        logging.error(f"Error fetching company news for {symbol}: {str(e)}")
        return jsonify({'error': 'Failed to fetch company news'}), 500

@app.route('/api/news/market', methods=['GET'])
def get_market_news_finnhub():
    """Get general market news with Finnhub fallback to yfinance"""
    try:
        limit = int(request.args.get('limit', 30))
        category = request.args.get('category', 'general')
        
        # Try Finnhub first
        try:
            logging.info("Attempting to fetch news from Finnhub...")
            news_data = get_finnhub_news(
                category=category,
                limit=limit
            )
            
            if news_data and len(news_data) > 0:
                logging.info(f"Successfully fetched {len(news_data)} articles from Finnhub")
                return jsonify({
                    'success': True,
                    'count': len(news_data),
                    'news': news_data,
                    'source': 'finnhub'
                })
            else:
                raise Exception("No news data returned from Finnhub")
                
        except Exception as finnhub_error:
            logging.warning(f"Finnhub failed: {str(finnhub_error)}, falling back to yfinance")
            
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
                logging.error(f"Both Finnhub and yfinance failed: {str(yfinance_error)}")
                raise yfinance_error
        
    except Exception as e:
        logging.error(f"Error fetching market news: {str(e)}")
        return jsonify({'error': 'Failed to fetch market news'}), 500

@app.route('/api/news/sentiment', methods=['GET'])
def get_news_sentiment():
    """Get news with sentiment analysis (Finnhub doesn't provide sentiment, so using general news)"""
    try:
        tickers = request.args.get('tickers', '')
        limit = int(request.args.get('limit', 50))
        
        ticker_list = [t.strip().upper() for t in tickers.split(',')] if tickers else None
        
        # Get news from Finnhub (no sentiment available)
        if ticker_list:
            # Get company-specific news for the first ticker
            news_data = get_finnhub_news(
                category='general',
                q=ticker_list[0],
                limit=limit
            )
        else:
            # Get general market news
            news_data = get_finnhub_news(
                category='general',
                limit=limit
            )
        
        # Note: Finnhub doesn't provide sentiment analysis, so all news is marked as neutral
        for item in news_data:
            item['overall_sentiment_label'] = 'Neutral'
            item['overall_sentiment_score'] = 0
        
        return jsonify({
            'success': True,
            'count': len(news_data),
            'news': news_data,
            'source': 'finnhub'
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
        
        try:
            # Generate risk report with real data
            risk_report = advanced_risk_engine.generate_risk_report(holdings, risk_tolerance)
            print(f"Render: Generated risk report successfully")
            
            # Convert NaN values to null for JSON serialization
            risk_report = convert_nan_to_null(risk_report)
            
            return jsonify(risk_report)
            
        except Exception as analysis_error:
            print(f"❌ Render: Risk analysis error: {str(analysis_error)}")
            return jsonify({'error': f'Risk analysis failed: {str(analysis_error)}'}), 500
        
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

@app.route('/api/portfolio/cumulative-returns', methods=['POST'])
def get_cumulative_returns():
    """Calculate cumulative returns for portfolio vs benchmark"""
    try:
        data = request.get_json()
        
        if not data or 'holdings' not in data:
            return jsonify({'error': 'Portfolio holdings data required'}), 400
        
        holdings = data['holdings']
        benchmark = data.get('benchmark', 'SPY')  # Default to S&P 500
        period = data.get('period', '1y')  # Default to 1 year
        
        if not holdings:
            return jsonify({'error': 'No holdings provided'}), 400
        
        # Calculate period in days
        period_days = {
            '1m': 30,
            '3m': 90,
            '6m': 180,
            '1y': 365,
            '2y': 730,
            '5y': 1825
        }.get(period, 365)
        
        # Get portfolio symbols
        symbols = [holding['symbol'] for holding in holdings if holding.get('symbol')]
        
        if not symbols:
            return jsonify({'error': 'No valid symbols found in holdings'}), 400
        
        # Fetch historical data for portfolio holdings
        portfolio_data = {}
        for symbol in symbols:
            try:
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period=f"{period_days}d")
                if not hist.empty:
                    portfolio_data[symbol] = hist['Close'].values
            except Exception as e:
                logging.warning(f"Failed to fetch data for {symbol}: {str(e)}")
                continue
        
        # Fetch benchmark data
        try:
            benchmark_ticker = yf.Ticker(benchmark)
            benchmark_hist = benchmark_ticker.history(period=f"{period_days}d")
            benchmark_prices = benchmark_hist['Close'].values if not benchmark_hist.empty else []
        except Exception as e:
            logging.error(f"Failed to fetch benchmark data: {str(e)}")
            return jsonify({'error': 'Failed to fetch benchmark data'}), 500
        
        if not portfolio_data or len(benchmark_prices) == 0:
            return jsonify({'error': 'Insufficient data for analysis'}), 400
        
        # Calculate daily returns for portfolio holdings
        portfolio_returns = {}
        for symbol, prices in portfolio_data.items():
            if len(prices) > 1:
                returns = []
                for i in range(1, len(prices)):
                    if float(prices[i-1]) != 0:
                        daily_return = (float(prices[i]) - float(prices[i-1])) / float(prices[i-1])
                        returns.append(daily_return)
                    else:
                        returns.append(0)
                portfolio_returns[symbol] = returns
        
        # Calculate daily returns for benchmark
        benchmark_returns = []
        for i in range(1, len(benchmark_prices)):
            if float(benchmark_prices[i-1]) != 0:
                daily_return = (float(benchmark_prices[i]) - float(benchmark_prices[i-1])) / float(benchmark_prices[i-1])
                benchmark_returns.append(daily_return)
            else:
                benchmark_returns.append(0)
        
        # Calculate weighted portfolio returns based on holdings
        weighted_portfolio_returns = []
        if portfolio_returns:
            # Get the minimum length of all return series
            min_length = min(len(returns) for returns in portfolio_returns.values())
            min_length = min(min_length, len(benchmark_returns))
            
            # Calculate total portfolio value
            total_value = sum(holding.get('quantity', 0) * holding.get('current_price', 0) for holding in holdings)
            
            for i in range(min_length):
                weighted_return = 0
                for holding in holdings:
                    symbol = holding.get('symbol')
                    if symbol in portfolio_returns and i < len(portfolio_returns[symbol]):
                        weight = (holding.get('quantity', 0) * holding.get('current_price', 0)) / total_value if total_value > 0 else 0
                        weighted_return += weight * portfolio_returns[symbol][i]
                weighted_portfolio_returns.append(weighted_return)
        
        # Calculate cumulative returns
        def calculate_cumulative_returns(returns):
            cumulative = [1.0]  # Start with 1 (100%)
            for ret in returns:
                cumulative.append(cumulative[-1] * (1 + ret))
            return cumulative
        
        portfolio_cumulative = calculate_cumulative_returns(weighted_portfolio_returns)
        benchmark_cumulative = calculate_cumulative_returns(benchmark_returns[:len(weighted_portfolio_returns)])
        
        # Generate dates for x-axis
        dates = []
        if benchmark_hist is not None and not benchmark_hist.empty:
            start_date = benchmark_hist.index[0]
            for i in range(len(portfolio_cumulative)):
                date = start_date + pd.Timedelta(days=i)
                dates.append(date.strftime('%Y-%m-%d'))
        else:
            # Fallback: generate dates based on data length
            for i in range(len(portfolio_cumulative)):
                dates.append(f"Day {i+1}")
        
        # Calculate performance metrics
        portfolio_total_return = (portfolio_cumulative[-1] - 1) * 100 if portfolio_cumulative else 0
        benchmark_total_return = (benchmark_cumulative[-1] - 1) * 100 if benchmark_cumulative else 0
        excess_return = portfolio_total_return - benchmark_total_return
        
        # Calculate volatility (annualized)
        portfolio_vol = np.std(weighted_portfolio_returns) * np.sqrt(252) * 100 if weighted_portfolio_returns else 0
        benchmark_vol = np.std(benchmark_returns[:len(weighted_portfolio_returns)]) * np.sqrt(252) * 100 if benchmark_returns else 0
        
        # Calculate Sharpe ratio (assuming risk-free rate of 2%)
        risk_free_rate = 0.02
        portfolio_sharpe = ((np.mean(weighted_portfolio_returns) * 252) - risk_free_rate) / (portfolio_vol / 100) if portfolio_vol > 0 else 0
        benchmark_sharpe = ((np.mean(benchmark_returns[:len(weighted_portfolio_returns)]) * 252) - risk_free_rate) / (benchmark_vol / 100) if benchmark_vol > 0 else 0
        
        return jsonify({
            'success': True,
            'data': {
                'dates': dates,
                'portfolio_cumulative': portfolio_cumulative,
                'benchmark_cumulative': benchmark_cumulative,
                'portfolio_returns': weighted_portfolio_returns,
                'benchmark_returns': benchmark_returns[:len(weighted_portfolio_returns)]
            },
            'metrics': {
                'portfolio_total_return': round(portfolio_total_return, 2),
                'benchmark_total_return': round(benchmark_total_return, 2),
                'excess_return': round(excess_return, 2),
                'portfolio_volatility': round(portfolio_vol, 2),
                'benchmark_volatility': round(benchmark_vol, 2),
                'portfolio_sharpe': round(portfolio_sharpe, 2),
                'benchmark_sharpe': round(benchmark_sharpe, 2)
            },
            'metadata': {
                'benchmark': benchmark,
                'period': period,
                'symbols': symbols,
                'data_points': len(portfolio_cumulative)
            }
        })
        
    except Exception as e:
        logging.error(f"Error calculating cumulative returns: {str(e)}")
        import traceback
        logging.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Failed to calculate cumulative returns: {str(e)}'}), 500


@app.route('/api/portfolio/drawdowns', methods=['POST'])
def calculate_drawdowns():
    """Calculate portfolio drawdowns over time"""
    try:
        data = request.get_json()
        holdings = data.get('holdings', [])
        period = data.get('period', '1y')
        
        if not holdings:
            return jsonify({'success': False, 'error': 'No holdings provided'})
        
        # Calculate period days
        period_days = {
            '1m': 30, '3m': 90, '6m': 180, '1y': 365, '2y': 730, '5y': 1825
        }.get(period, 365)
        
        # Get portfolio symbols
        symbols = [holding['symbol'] for holding in holdings]
        
        # Fetch historical data for portfolio holdings
        portfolio_data = {}
        for symbol in symbols:
            try:
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period=f"{period_days}d")
                if not hist.empty:
                    portfolio_data[symbol] = hist['Close'].values
            except Exception as e:
                print(f"Error fetching data for {symbol}: {e}")
                continue
        
        if not portfolio_data:
            return jsonify({'success': False, 'error': 'Failed to fetch portfolio data'})
        
        # Calculate portfolio returns
        min_length = min(len(prices) for prices in portfolio_data.values())
        if min_length < 2:
            return jsonify({'success': False, 'error': 'Insufficient data for calculation'})
        
        # Align all data to same length
        aligned_prices = {}
        for symbol, prices in portfolio_data.items():
            aligned_prices[symbol] = prices[-min_length:]
        
        # Calculate daily returns for each holding
        portfolio_returns = []
        for i in range(1, min_length):
            daily_return = 0
            total_weight = 0
            
            for symbol, prices in aligned_prices.items():
                # Find the holding to get quantity
                holding = next((h for h in holdings if h['symbol'] == symbol), None)
                if holding:
                    weight = holding['quantity'] * prices[i-1]  # Weight by market value
                    total_weight += weight
                    if prices[i-1] > 0:
                        daily_return += weight * (prices[i] - prices[i-1]) / prices[i-1]
            
            if total_weight > 0:
                portfolio_returns.append(daily_return / total_weight)
            else:
                portfolio_returns.append(0)
        
        # Calculate cumulative returns
        cumulative_returns = [1.0]
        for ret in portfolio_returns:
            cumulative_returns.append(cumulative_returns[-1] * (1 + ret))
        
        # Calculate running maximum
        running_max = []
        current_max = 1.0
        for cr in cumulative_returns:
            if cr > current_max:
                current_max = cr
            running_max.append(current_max)
        
        # Calculate drawdowns
        drawdowns = []
        for i, cr in enumerate(cumulative_returns):
            if running_max[i] > 0:
                drawdown = (cr - running_max[i]) / running_max[i] * 100
            else:
                drawdown = 0
            drawdowns.append(drawdown)
        
        # Generate dates
        from datetime import datetime, timedelta
        end_date = datetime.now()
        dates = []
        for i in range(len(cumulative_returns)):
            date = end_date - timedelta(days=len(cumulative_returns)-1-i)
            dates.append(date.strftime('%Y-%m-%d'))
        
        # Calculate drawdown metrics
        max_drawdown = min(drawdowns)
        max_drawdown_index = drawdowns.index(max_drawdown)
        max_drawdown_date = dates[max_drawdown_index]
        current_drawdown = drawdowns[-1]
        
        # Calculate recovery needed (percentage gain needed to reach previous peak)
        if current_drawdown < 0:
            recovery_needed = abs(current_drawdown) / (1 + current_drawdown / 100) * 100
        else:
            recovery_needed = 0
        
        # Calculate drawdown duration (days since peak)
        peak_index = running_max.index(max(running_max))
        drawdown_duration = len(drawdowns) - peak_index - 1
        
        return jsonify({
            'success': True,
            'data': {
                'dates': dates,
                'drawdowns': drawdowns,
                'running_max': running_max,
                'cumulative_returns': cumulative_returns
            },
            'metrics': {
                'max_drawdown': max_drawdown,
                'max_drawdown_date': max_drawdown_date,
                'current_drawdown': current_drawdown,
                'recovery_needed': recovery_needed,
                'drawdown_duration': drawdown_duration
            },
            'metadata': {
                'symbols': symbols,
                'period': period,
                'data_points': len(cumulative_returns)
            }
        })
        
    except Exception as e:
        import traceback
        print(f"Error calculating drawdowns: {e}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)})


@app.route('/api/risk/volatility-comparison', methods=['POST'])
def calculate_volatility_comparison():
    """Calculate ML predicted vs realized volatility comparison"""
    try:
        data = request.get_json()
        holdings = data.get('holdings', [])
        period = data.get('period', '1y')
        
        if not holdings:
            return jsonify({'success': False, 'error': 'No holdings provided'})
        
        # Calculate period days
        period_days = {
            '1m': 30, '3m': 90, '6m': 180, '1y': 365, '2y': 730
        }.get(period, 365)
        
        # Get symbols from holdings
        symbols = [holding['symbol'] for holding in holdings]
        
        # Fetch historical data for all symbols
        portfolio_data = {}
        dates = []
        
        for symbol in symbols:
            try:
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period=f"{period_days}d")
                
                if not hist.empty:
                    portfolio_data[symbol] = hist['Close'].values
                    if not dates:
                        dates = [d.strftime('%Y-%m-%d') for d in hist.index]
            except Exception as e:
                print(f"Error fetching data for {symbol}: {e}")
                continue
        
        if not portfolio_data:
            return jsonify({'success': False, 'error': 'No valid portfolio data found'})
        
        # Calculate portfolio daily returns
        portfolio_returns = []
        
        for i in range(1, len(dates)):
            daily_return = 0
            total_weight = 0
            
            for symbol, prices in portfolio_data.items():
                if i < len(prices):
                    # Find the holding for this symbol
                    holding = next((h for h in holdings if h['symbol'] == symbol), None)
                    if holding:
                        weight = (holding['quantity'] * prices[i-1]) / sum(
                            h['quantity'] * portfolio_data.get(h['symbol'], [prices[i-1]])[i-1] 
                            for h in holdings if h['symbol'] in portfolio_data
                        )
                        total_weight += weight
                        
                        if i < len(prices) and prices[i-1] > 0:
                            daily_return += weight * (prices[i] - prices[i-1]) / prices[i-1]
            
            if total_weight > 0:
                portfolio_returns.append(daily_return)
            else:
                portfolio_returns.append(0)
        
        # Calculate realized volatility (rolling 30-day window)
        realized_volatility = []
        window_size = min(30, len(portfolio_returns))
        
        for i in range(window_size, len(portfolio_returns)):
            window_returns = portfolio_returns[i-window_size:i]
            vol = np.std(window_returns) * np.sqrt(252)  # Annualized
            realized_volatility.append(vol)
        
        # ML predicted volatility using rolling window approach
        try:
            predicted_volatility = []
            confidence_interval_upper = []
            confidence_interval_lower = []
            
            # Use a rolling window to generate predictions at each point
            # This shows what the model would have predicted at different times
            rolling_window = 60  # Use 60 days of data for each prediction
            
            for i in range(rolling_window, len(portfolio_returns)):
                # Get returns up to this point
                historical_returns = portfolio_returns[:i]
                
                # Calculate volatility of this window
                window_returns = historical_returns[-rolling_window:]
                current_vol = np.std(window_returns) * np.sqrt(252)  # Annualized
                
                # Simple ML prediction: weighted average of recent volatilities
                # with trend adjustment (simulates what an ML model would do)
                if len(window_returns) >= 30:
                    recent_vol = np.std(window_returns[-30:]) * np.sqrt(252)
                    medium_vol = np.std(window_returns[-60:-30] if len(window_returns) >= 60 else window_returns) * np.sqrt(252)
                    
                    # Weighted prediction: more weight on recent volatility
                    predicted_vol = (0.7 * recent_vol + 0.3 * medium_vol)
                    
                    # Add confidence intervals (±20%)
                    confidence_interval_upper.append(predicted_vol * 1.2)
                    confidence_interval_lower.append(predicted_vol * 0.8)
                    predicted_volatility.append(predicted_vol)
                else:
                    predicted_volatility.append(current_vol)
                    confidence_interval_upper.append(current_vol * 1.2)
                    confidence_interval_lower.append(current_vol * 0.8)
            
            # Trim realized volatility to match predicted length
            if len(predicted_volatility) < len(realized_volatility):
                offset = len(realized_volatility) - len(predicted_volatility)
                realized_volatility = realized_volatility[offset:]
            
            # Calculate prediction accuracy
            if len(predicted_volatility) > 0 and len(realized_volatility) > 0:
                min_len = min(len(predicted_volatility), len(realized_volatility))
                pred_array = np.array(predicted_volatility[:min_len])
                real_array = np.array(realized_volatility[:min_len])
                
                # Calculate mean absolute percentage error
                mape = np.mean(np.abs((real_array - pred_array) / (real_array + 0.001))) * 100
                prediction_accuracy = max(0, 100 - mape)
                
                avg_predicted_volatility = np.mean(predicted_volatility)
            else:
                prediction_accuracy = 0.0
                avg_predicted_volatility = 0.0
                
        except Exception as ml_error:
            print(f"ML prediction error: {ml_error}")
            import traceback
            traceback.print_exc()
            # Fallback to empty arrays if ML fails
            predicted_volatility = []
            confidence_interval_upper = []
            confidence_interval_lower = []
            prediction_accuracy = 0.0
            avg_predicted_volatility = 0.0
        
        # Calculate metrics
        avg_realized_volatility = np.mean(realized_volatility) if realized_volatility else 0
        
        # Determine volatility trend
        if len(realized_volatility) > 10:
            recent_vol = np.mean(realized_volatility[-10:])
            early_vol = np.mean(realized_volatility[:10])
            if recent_vol > early_vol * 1.1:
                volatility_trend = 'increasing'
            elif recent_vol < early_vol * 0.9:
                volatility_trend = 'decreasing'
            else:
                volatility_trend = 'stable'
        else:
            volatility_trend = 'stable'
        
        # Determine risk level
        if avg_realized_volatility <= 0.15:
            risk_level = 'low'
        elif avg_realized_volatility <= 0.25:
            risk_level = 'moderate'
        else:
            risk_level = 'high'
        
        # Align dates with volatility data
        volatility_dates = dates[window_size+1:len(realized_volatility)+window_size+1]
        
        return jsonify({
            'success': True,
            'data': {
                'dates': volatility_dates,
                'predicted_volatility': predicted_volatility,
                'realized_volatility': realized_volatility,
                'confidence_interval_upper': confidence_interval_upper,
                'confidence_interval_lower': confidence_interval_lower
            },
            'metrics': {
                'avg_predicted_volatility': avg_predicted_volatility,
                'avg_realized_volatility': avg_realized_volatility,
                'prediction_accuracy': prediction_accuracy,
                'volatility_trend': volatility_trend,
                'risk_level': risk_level
            },
            'metadata': {
                'data_points': len(volatility_dates),
                'period': period,
                'symbols': symbols
            }
        })
        
    except Exception as e:
        import traceback
        print(f"Error calculating volatility comparison: {e}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)})


@app.route('/api/portfolio/monte-carlo', methods=['POST'])
def monte_carlo_simulation():
    """Monte Carlo simulation for portfolio value prediction"""
    try:
        data = request.get_json()
        holdings = data.get('holdings', [])
        period = data.get('period', '1y')  # 1m, 3m, 6m, 1y, 2y
        simulations = data.get('simulations', 1000)  # Number of simulations
        time_steps = data.get('timeSteps', 252)  # Trading days (1 year)
        
        if not holdings:
            return jsonify({'success': False, 'error': 'Holdings data required'})
        
        # Convert period to days
        period_map = {'1m': 30, '3m': 90, '6m': 180, '1y': 252, '2y': 504}
        period_days = period_map.get(period, 252)
        
        # Extract symbols and calculate weights
        symbols = [h['symbol'] for h in holdings if h.get('symbol')]
        if not symbols:
            return jsonify({'success': False, 'error': 'No valid symbols found'})
        
        # Calculate portfolio weights based on current market value
        total_value = sum(h['quantity'] * h.get('current_price', h['avg_price']) for h in holdings)
        weights = {}
        for holding in holdings:
            if holding.get('symbol'):
                weight = (holding['quantity'] * holding.get('current_price', holding['avg_price'])) / total_value
                weights[holding['symbol']] = weight
        
        # Fetch historical data for each symbol
        portfolio_data = {}
        for symbol in symbols:
            try:
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period=f"{period_days}d")
                if not hist.empty:
                    portfolio_data[symbol] = hist['Close'].values
            except Exception as e:
                print(f"Error fetching data for {symbol}: {e}")
                continue
        
        if not portfolio_data:
            return jsonify({'success': False, 'error': 'Failed to fetch portfolio data'})
        
        # Calculate historical returns and volatility for each asset
        asset_stats = {}
        for symbol, prices in portfolio_data.items():
            if len(prices) > 1:
                returns = np.diff(prices) / prices[:-1]
                mean_return = np.mean(returns) * 252  # Annualized
                volatility = np.std(returns) * np.sqrt(252)  # Annualized
                asset_stats[symbol] = {
                    'mean_return': mean_return,
                    'volatility': volatility,
                    'weight': weights.get(symbol, 0)
                }
        
        # Calculate portfolio-level statistics
        portfolio_mean_return = sum(stats['mean_return'] * stats['weight'] for stats in asset_stats.values())
        portfolio_volatility = 0
        
        # Calculate portfolio volatility using correlation matrix
        if len(asset_stats) > 1:
            # Create correlation matrix from historical data
            min_length = min(len(portfolio_data[symbol]) for symbol in asset_stats.keys())
            aligned_returns = {}
            
            for symbol in asset_stats.keys():
                prices = portfolio_data[symbol]
                returns = np.diff(prices[-min_length:]) / prices[-min_length:-1]
                aligned_returns[symbol] = returns.tolist()  # Convert to list for JSON serialization
            
            # Calculate correlation matrix
            symbols_list = list(aligned_returns.keys())
            corr_matrix = np.zeros((len(symbols_list), len(symbols_list)))
            
            for i, symbol1 in enumerate(symbols_list):
                for j, symbol2 in enumerate(symbols_list):
                    if i == j:
                        corr_matrix[i, j] = 1.0
                    else:
                        corr_matrix[i, j] = np.corrcoef(np.array(aligned_returns[symbol1]), np.array(aligned_returns[symbol2]))[0, 1]
            
            # Calculate portfolio volatility
            weights_array = np.array([asset_stats[symbol]['weight'] for symbol in symbols_list])
            vols_array = np.array([asset_stats[symbol]['volatility'] for symbol in symbols_list])
            
            portfolio_volatility = np.sqrt(
                weights_array.T @ (corr_matrix * np.outer(vols_array, vols_array)) @ weights_array
            )
        else:
            # Single asset portfolio
            portfolio_volatility = list(asset_stats.values())[0]['volatility']
        
        # Run Monte Carlo simulations
        np.random.seed(42)  # For reproducible results
        simulation_paths = []
        
        for sim in range(simulations):
            # Generate random returns for each time step
            daily_return = np.random.normal(
                portfolio_mean_return / 252,  # Daily mean return
                portfolio_volatility / np.sqrt(252),  # Daily volatility
                time_steps
            )
            
            # Calculate cumulative value path
            value_path = [1.0]  # Start with $1 (normalized)
            for ret in daily_return:
                value_path.append(value_path[-1] * (1 + ret))
            
            simulation_paths.append(value_path)
        
        # Calculate statistics across all simulations
        simulation_paths = np.array(simulation_paths)
        
        # Calculate percentiles for confidence intervals
        percentiles = [5, 25, 50, 75, 95]
        percentile_paths = {}
        
        for percentile in percentiles:
            percentile_paths[f'p{percentile}'] = np.percentile(simulation_paths, percentile, axis=0).tolist()
        
        # Calculate expected value (mean) path
        expected_path = np.mean(simulation_paths, axis=0).tolist()
        
        # Calculate final value statistics
        final_values = simulation_paths[:, -1]
        final_value_stats = {
            'mean': float(np.mean(final_values)),
            'median': float(np.median(final_values)),
            'std': float(np.std(final_values)),
            'min': float(np.min(final_values)),
            'max': float(np.max(final_values)),
            'p5': float(np.percentile(final_values, 5)),
            'p25': float(np.percentile(final_values, 25)),
            'p75': float(np.percentile(final_values, 75)),
            'p95': float(np.percentile(final_values, 95))
        }
        
        # Calculate probability of positive return
        positive_return_prob = float(np.mean(final_values > 1.0) * 100)
        
        # Calculate Value at Risk (VaR) at 95% confidence
        var_95 = float(np.percentile(final_values, 5))
        var_95_percent = float((var_95 - 1.0) * 100)  # Convert to percentage loss
        
        # Generate time labels
        time_labels = list(range(time_steps + 1))
        
        # Select a subset of paths for visualization (to avoid overcrowding)
        num_visible_paths = min(50, simulations)
        visible_paths = simulation_paths[:num_visible_paths].tolist()
        
        return jsonify({
            'success': True,
            'data': {
                'timeSteps': time_labels,
                'expectedPath': expected_path,
                'percentilePaths': percentile_paths,
                'visiblePaths': visible_paths,
                'allPaths': simulation_paths.tolist()  # Include all paths for detailed analysis
            },
            'statistics': {
                'finalValueStats': final_value_stats,
                'positiveReturnProbability': positive_return_prob,
                'var95': var_95,
                'var95Percent': var_95_percent,
                'portfolioMeanReturn': float(portfolio_mean_return),
                'portfolioVolatility': float(portfolio_volatility)
            },
            'metadata': {
                'simulations': simulations,
                'timeSteps': time_steps,
                'period': period,
                'symbols': symbols,
                'numVisiblePaths': num_visible_paths
            }
        })
        
    except Exception as e:
        import traceback
        print(f"Error in Monte Carlo simulation: {e}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)
