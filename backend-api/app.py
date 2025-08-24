#!/usr/bin/env python3
"""
Production app with Render-optimized yfinance handling
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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

app = Flask(__name__)

# CORS configuration - allow Vercel preview and production domains
CORS(app, origins=[
    "http://localhost:3000",
    "http://localhost:3001",
    "https://quantflow.vercel.app",
    "https://quantflow-git-main-pratham-aggrs-projects.vercel.app",
    r"https://quantflow-.*-pratham-aggrs-projects\.vercel\.app"
], supports_credentials=True)

# Initialize the essential service
advanced_risk_engine = AdvancedRiskEngine()

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



if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)
