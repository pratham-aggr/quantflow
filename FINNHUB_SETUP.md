# Finnhub API Setup Guide

## Overview
QuantFlow uses Finnhub.io for real-time stock market data. The free tier provides 60 API calls per minute, which is sufficient for most portfolio tracking needs.

## Step 1: Get Your API Key

1. **Visit [finnhub.io](https://finnhub.io)**
2. **Sign up for a free account**
3. **Navigate to your API key** in the dashboard
4. **Copy your API key**

## Step 2: Add Environment Variable

### Local Development
Add to your `.env.local` file:
```bash
REACT_APP_FINNHUB_API_KEY=your_api_key_here
```

### Production (Vercel)
1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add a new variable:
   - **Name**: `REACT_APP_FINNHUB_API_KEY`
   - **Value**: Your Finnhub API key
4. Deploy to all environments (Production, Preview, Development)

## Step 3: Verify Setup

After adding the API key:
1. **Restart your development server** (if running locally)
2. **Check the Market Data Status** in the Portfolio Management page
3. **Look for "✅ Connected"** status

## Features Enabled

With Finnhub API configured, you get:
- ✅ **Real-time stock prices** (updated every 30 seconds)
- ✅ **Company information** and profiles
- ✅ **Stock symbol search** with autocomplete
- ✅ **Portfolio value calculations** with live data
- ✅ **Rate limiting** (60 calls/minute)
- ✅ **15-minute caching** to minimize API usage

## Fallback Behavior

If the API key is not configured:
- ⚠️ **Mock data** is used instead
- 📊 **Demo stock prices** are displayed
- 🔍 **Limited search** functionality
- 📈 **Static portfolio calculations**

## API Usage

The application automatically manages API usage:
- **Rate limiting**: Maximum 60 calls per minute
- **Caching**: 15-minute cache for repeated requests
- **Smart batching**: Multiple stock prices fetched together
- **Error handling**: Graceful fallback to mock data

## Troubleshooting

### "API key not configured" warning
- Check that `REACT_APP_FINNHUB_API_KEY` is set correctly
- Restart your development server
- Clear browser cache and localStorage

### Rate limit exceeded
- The app automatically handles rate limiting
- Wait 1 minute for the limit to reset
- Check your Finnhub dashboard for usage statistics

### No real-time data
- Verify your API key is valid
- Check browser console for error messages
- Ensure you're not in an incognito/private browsing session

## Support

- **Finnhub Documentation**: [https://finnhub.io/docs](https://finnhub.io/docs)
- **API Status**: [https://finnhub.io/status](https://finnhub.io/status)
- **Free Tier Limits**: 60 calls/minute, 1,000 calls/day
