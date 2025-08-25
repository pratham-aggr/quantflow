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
from advanced_risk_engine import AdvancedRiskEngine
# Alpha Vantage import with fallback
try:
    from alpha_vantage.news_sentiment import NewsSentiment
except ImportError:
    try:
        from alpha_vantage import NewsSentiment
    except ImportError:
        # Fallback: create a mock class if Alpha Vantage is not available
        class NewsSentiment:
            def __init__(self, key=None, output_format=None):
                pass
            def get_news_sentiment(self, **kwargs):
                return None, None

# Rebalancing imports with fallback
try:
    from rebalancing_engine import RebalancingEngine
    from advanced_rebalancing import AdvancedRebalancingEngine
except ImportError as e:
    logging.warning(f"Rebalancing modules not available: {e}")
    # Create mock classes if modules are not available
    class RebalancingEngine:
        def analyze_rebalancing(self, holdings, target_allocation, constraints=None):
            return type('obj', (object,), {
                'current_allocation': {},
                'target_allocation': {},
                'drift_analysis': {},
                'suggestions': [],
                'total_drift': 0,
                'estimated_transaction_cost': 0,
                'rebalancing_score': 0,
                'optimization_method': 'mock'
            })()
        def simulate_rebalancing(self, holdings, target_allocation):
            return {}
    
    class AdvancedRebalancingEngine:
        def analyze_rebalancing_need(self, holdings, target_allocation, last_rebalance_date=None):
            return {'rebalancing_needed': False}
        def generate_smart_rebalancing_plan(self, holdings, target_allocation, last_rebalance_date=None):
            return {'rebalancing_needed': False}
        def simulate_rebalancing_scenarios(self, holdings, target_allocation):
            return []

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

# Initialize rebalancing engines
try:
    rebalancing_engine = RebalancingEngine()
    advanced_rebalancing_engine = AdvancedRebalancingEngine()
except Exception as e:
    logging.warning(f"Could not initialize rebalancing engines: {e}")
    rebalancing_engine = None
    advanced_rebalancing_engine = None

def get_alpha_vantage_news(tickers=None, topics=None, time_from=None, time_to=None, sort='RELEVANCE', limit=50):
    """Get news from Alpha Vantage API"""
    try:
        # Check if Alpha Vantage is available
        if news_sentiment is None:
            logging.warning("Alpha Vantage not available, returning empty news list")
            return []
            
        # Prepare parameters
        params = {
            'sort': sort,
            'limit': limit
        }
        
        if tickers:
            params['tickers'] = tickers
        if topics:
            params['topics'] = topics
        if time_from:
            params['time_from'] = time_from
        if time_to:
            params['time_to'] = time_to
            
        # Get news data
        data, meta_data = news_sentiment.get_news_sentiment(**params)
        
        if data is not None and not data.empty:
            # Convert DataFrame to list of dictionaries
            news_list = []
            for index, row in data.iterrows():
                news_item = {
                    'id': index,
                    'title': row.get('title', ''),
                    'url': row.get('url', ''),
                    'time_published': row.get('time_published', ''),
                    'authors': row.get('authors', []),
                    'summary': row.get('summary', ''),
                    'banner_image': row.get('banner_image', ''),
                    'source': row.get('source', ''),
                    'category_within_source': row.get('category_within_source', ''),
                    'source_domain': row.get('source_domain', ''),
                    'topics': row.get('topics', []),
                    'overall_sentiment_score': row.get('overall_sentiment_score', 0),
                    'overall_sentiment_label': row.get('overall_sentiment_label', ''),
                    'ticker_sentiment': row.get('ticker_sentiment', [])
                }
                news_list.append(news_item)
            
            return news_list
        else:
            return []
            
    except Exception as e:
        logging.error(f"Error fetching Alpha Vantage news: {str(e)}")
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
    """Get company-specific news from Alpha Vantage"""
    try:
        symbol = symbol.upper()
        limit = int(request.args.get('limit', 20))
        
        # Get news for the specific company
        news_data = get_alpha_vantage_news(
            tickers=[symbol],
            limit=limit
        )
        
        return jsonify({
            'success': True,
            'symbol': symbol,
            'count': len(news_data),
            'news': news_data
        })
        
    except Exception as e:
        logging.error(f"Error fetching company news for {symbol}: {str(e)}")
        return jsonify({'error': 'Failed to fetch company news'}), 500

@app.route('/api/news/market', methods=['GET'])
def get_market_news_alpha_vantage():
    """Get general market news from Alpha Vantage"""
    try:
        limit = int(request.args.get('limit', 30))
        topics = request.args.get('topics', 'financial_markets')
        
        # Get general market news
        news_data = get_alpha_vantage_news(
            topics=[topics],
            limit=limit
        )
        
        return jsonify({
            'success': True,
            'count': len(news_data),
            'news': news_data
        })
        
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
        
        # Simulate rebalancing
        simulation = rebalancing_engine.simulate_rebalancing(
            holdings=holdings,
            target_allocation=target_allocation
        )
        
        return jsonify(simulation)
        
    except Exception as e:
        logging.error(f"Error in rebalancing simulation: {str(e)}")
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
