# Environment Setup Guide

## Required Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key

# Risk Engine Configuration
REACT_APP_RISK_ENGINE_URL=http://localhost:5002

# Market Data Configuration
REACT_APP_FINNHUB_API_KEY=your_finnhub_api_key

# Server Configuration (for server/index.js)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
FINNHUB_API_KEY=your_finnhub_api_key

# Redis Configuration (optional - will disable caching if not set)
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
```

## Current Status

### ✅ Working Services
- **React Frontend**: http://localhost:3000
- **Node.js Server**: http://localhost:4000
- **Risk Engine**: http://localhost:5002

### ⚠️ Issues to Fix
1. **Redis Configuration**: Redis is not configured, causing cache failures
2. **Supabase Configuration**: Using placeholder values
3. **Market Data API**: Finnhub API key not configured

## Quick Fix for Redis Issues

The Redis errors in the server logs are because Redis is not configured. This is optional and the app will work without it, but caching will be disabled.

To fix Redis errors, either:
1. Set the Redis environment variables above, OR
2. The server will continue to work without Redis (caching disabled)

## Testing the Application

1. **Frontend**: http://localhost:3000
2. **API Health**: http://localhost:4000/api/health
3. **Risk Engine**: http://localhost:5002/health

## Next Steps

1. Configure Supabase for authentication
2. Configure Finnhub API for market data
3. Optionally configure Redis for caching
4. Test all features end-to-end
