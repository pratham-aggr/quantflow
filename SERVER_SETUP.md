# QuantFlow Server-Side Market Data Service Setup

## Overview
This guide covers setting up the server-side market data service with Redis caching, scheduled jobs, and API endpoints for the QuantFlow application.

## Prerequisites

### 1. Node.js and npm
- Node.js v16 or higher
- npm or yarn package manager

### 2. Redis Database
You have several options for Redis:

#### Option A: Local Redis (Development)
```bash
# macOS with Homebrew
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis-server

# Windows with WSL
sudo apt-get install redis-server
sudo systemctl start redis-server
```

#### Option B: Upstash Redis (Recommended for Production)
1. Visit [upstash.com](https://upstash.com)
2. Create a free account
3. Create a new Redis database
4. Copy the connection details

#### Option C: Redis Cloud
1. Visit [redis.com](https://redis.com)
2. Create a free account
3. Create a new database
4. Copy the connection details

### 3. Finnhub API Key
1. Visit [finnhub.io](https://finnhub.io)
2. Sign up for a free account
3. Get your API key from the dashboard

## Installation

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Environment Configuration
Create a `.env` file in the server directory:

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Redis Configuration
REDIS_URL=redis://localhost:6379
# OR for Upstash/Redis Cloud:
# REDIS_URL=redis://username:password@host:port
# REDIS_PASSWORD=your_redis_password
# REDIS_USERNAME=your_redis_username

# Finnhub API Configuration
FINNHUB_API_KEY=your_finnhub_api_key

# Server Configuration
PORT=4000
NODE_ENV=development
```

### 3. Start the Server
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

## API Endpoints

### Market Data Endpoints

#### Get Stock Quote
```http
GET /api/market-data/quote/AAPL
```
Response:
```json
{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "price": 175.43,
    "change": 2.15,
    "changePercent": 1.24,
    "high": 176.50,
    "low": 173.20,
    "open": 174.10,
    "previousClose": 173.28,
    "volume": 45678900,
    "timestamp": 1703123456789
  },
  "cached": true,
  "timestamp": "2023-12-21T10:30:56.789Z"
}
```

#### Get Multiple Stock Quotes
```http
GET /api/market-data/quotes?symbols=AAPL,GOOGL,MSFT
```

#### Get Company Profile
```http
GET /api/market-data/profile/AAPL
```

#### Search Stocks
```http
GET /api/market-data/search?q=apple
```

#### Get Popular Stocks
```http
GET /api/market-data/popular
```

#### Get Service Status
```http
GET /api/market-data/status
```

### Admin Endpoints

#### Get Services Status
```http
GET /api/admin/services/status
Authorization: Bearer your_jwt_token
```

#### Refresh Cache
```http
POST /api/market-data/refresh
Content-Type: application/json

{
  "type": "popular"
}
```

#### Clear Specific Cache
```http
DELETE /api/market-data/cache/AAPL
```

## Features

### 1. Redis Caching
- **Stock Quotes**: 15-minute cache duration
- **Company Profiles**: 1-hour cache duration
- **Search Results**: 30-minute cache duration
- **Popular Stocks**: 5-minute cache duration

### 2. Rate Limiting
- **Finnhub API**: 60 calls per minute (free tier)
- **Automatic retry**: 3 attempts with exponential backoff
- **Rate limit tracking**: Redis-based rate limiting

### 3. Scheduled Jobs
- **Popular Stocks Update**: Every 5 minutes
- **Cache Cleanup**: Every hour
- **Health Check**: Every 15 minutes

### 4. Error Handling
- **Graceful degradation**: Falls back to cached data
- **API error handling**: Comprehensive error responses
- **Connection resilience**: Automatic reconnection

## Monitoring and Debugging

### 1. Server Logs
The server provides detailed logging:
```bash
# Start server with debug logging
DEBUG=* npm run dev
```

### 2. Health Check
```bash
curl http://localhost:4000/api/health
```

### 3. Cache Statistics
```bash
curl http://localhost:4000/api/market-data/status
```

### 4. Redis Monitoring
```bash
# Connect to Redis CLI
redis-cli

# Monitor Redis operations
MONITOR

# Check cache keys
KEYS stock:*

# Get cache statistics
INFO memory
```

## Performance Optimization

### 1. Cache Strategy
- **Popular stocks**: Pre-cached every 5 minutes
- **User requests**: Cached for 15 minutes
- **Search results**: Cached for 30 minutes

### 2. Batch Processing
- **Multiple quotes**: Fetched in batches
- **Rate limiting**: Respects API limits
- **Connection pooling**: Efficient Redis connections

### 3. Memory Management
- **TTL-based expiration**: Automatic cache cleanup
- **Memory monitoring**: Redis memory usage tracking
- **Graceful shutdown**: Proper cleanup on exit

## Troubleshooting

### Common Issues

#### 1. Redis Connection Failed
```
Error: Redis connection failed
```
**Solution**: Check Redis URL and credentials in `.env`

#### 2. Finnhub API Rate Limit
```
Error: Rate limit exceeded
```
**Solution**: Wait 1 minute or upgrade to paid plan

#### 3. Cache Not Working
```
Error: Cache miss for all requests
```
**Solution**: Check Redis connection and permissions

#### 4. Scheduled Jobs Not Running
```
Warning: Scheduler not started
```
**Solution**: Check if FINNHUB_API_KEY is configured

### Debug Commands

#### Check Redis Connection
```bash
redis-cli ping
# Should return: PONG
```

#### Test Finnhub API
```bash
curl "https://finnhub.io/api/v1/quote?symbol=AAPL&token=YOUR_API_KEY"
```

#### Monitor Server Logs
```bash
# Follow server logs
tail -f server.log

# Check Redis logs
tail -f /var/log/redis/redis-server.log
```

## Production Deployment

### 1. Environment Variables
Set production environment variables:
```bash
NODE_ENV=production
REDIS_URL=your_production_redis_url
FINNHUB_API_KEY=your_finnhub_api_key
```

### 2. Process Management
Use PM2 for production:
```bash
npm install -g pm2
pm2 start server/index.js --name quantflow-api
pm2 startup
pm2 save
```

### 3. Monitoring
Set up monitoring for:
- Redis memory usage
- API response times
- Error rates
- Cache hit rates

### 4. Scaling
- **Horizontal scaling**: Multiple server instances
- **Load balancing**: Use Redis for session storage
- **CDN**: Cache static responses

## Security Considerations

### 1. API Key Protection
- Store API keys in environment variables
- Never commit keys to version control
- Rotate keys regularly

### 2. Rate Limiting
- Implement client-side rate limiting
- Monitor API usage
- Set up alerts for rate limit violations

### 3. Data Validation
- Validate all input parameters
- Sanitize stock symbols
- Implement request size limits

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review server logs
3. Test individual components
4. Contact the development team

## Next Steps

After setting up the server-side market data service:
1. Update frontend to use new API endpoints
2. Implement real-time updates with WebSocket
3. Add historical data support
4. Implement advanced caching strategies

