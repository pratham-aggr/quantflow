# 🚀 QuantFlow Deployment Guide

This guide will help you deploy QuantFlow to both Render (backend API) and Vercel (frontend).

## 📋 Prerequisites

- GitHub repository with your QuantFlow code
- Render account (for backend API)
- Vercel account (for frontend)
- Supabase project (for database)

## 🖥️ Backend Deployment (Render)

### Step 1: Deploy to Render

1. **Go to [Render Dashboard](https://dashboard.render.com/)**
2. **Click "New +" → "Web Service"**
3. **Connect your GitHub repository**
4. **Configure the service:**

```
Name: quantflow-backend-api
Environment: Python
Build Command: cd backend-api && pip install -r requirements.txt
Start Command: cd backend-api && gunicorn app:app
Plan: Free
```

### Step 2: Set Environment Variables

In your Render service settings, add these environment variables:

```bash
# Python Version
PYTHON_VERSION=3.9.16

# Port (Render will set this automatically)
PORT=10000

# Frontend URL (for CORS)
FRONTEND_URL=https://your-vercel-app.vercel.app
```

### Step 3: Deploy

Click "Create Web Service" and wait for deployment to complete.

**Your backend will be available at:** `https://quantflow-backend-api.onrender.com`

## 🌐 Frontend Deployment (Vercel)

### Step 1: Deploy to Vercel

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**
2. **Click "New Project"**
3. **Import your GitHub repository**
4. **Configure the project:**

```
Framework Preset: Create React App
Root Directory: ./
Build Command: npm run build
Output Directory: build
Install Command: npm install
```

### Step 2: Set Environment Variables

In your Vercel project settings → Environment Variables, add:

```bash
# Backend API URL
REACT_APP_BACKEND_API_URL=https://quantflow-backend-api.onrender.com

# Supabase Configuration
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Step 3: Deploy

Click "Deploy" and wait for deployment to complete.

**Your frontend will be available at:** `https://your-vercel-app.vercel.app`

## 🔧 Environment Variables Reference

### Backend (Render) Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PYTHON_VERSION` | Python version to use | `3.9.16` |
| `PORT` | Port for the service | `10000` |
| `FRONTEND_URL` | Frontend URL for CORS | `https://your-app.vercel.app` |

### Frontend (Vercel) Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_BACKEND_API_URL` | Backend API URL | `https://quantflow-backend-api.onrender.com` |
| `REACT_APP_SUPABASE_URL` | Supabase project URL | `https://your-project.supabase.co` |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

## 🧪 Testing Your Deployment

### Test Backend API

```bash
# Health check
curl https://quantflow-backend-api.onrender.com/health

# Market data
curl https://quantflow-backend-api.onrender.com/api/market-data/quote/AAPL

# Risk analysis
curl -X POST https://quantflow-backend-api.onrender.com/api/risk/advanced \
  -H "Content-Type: application/json" \
  -d '{"holdings":[{"symbol":"AAPL","quantity":10,"purchasePrice":150}]}'
```

### Test Frontend

1. Visit your Vercel URL
2. Check if market data loads
3. Test portfolio creation
4. Verify risk analysis works

## 🔄 Updating Deployments

### Backend Updates

1. Push changes to GitHub
2. Render will automatically redeploy
3. Check deployment logs in Render dashboard

### Frontend Updates

1. Push changes to GitHub
2. Vercel will automatically redeploy
3. Check deployment logs in Vercel dashboard

## 🐛 Troubleshooting

### Common Issues

#### Backend Issues

**Problem:** Service fails to start
**Solution:** Check Render logs for Python version or dependency issues

**Problem:** CORS errors
**Solution:** Verify `FRONTEND_URL` is set correctly in Render

**Problem:** Market data not working
**Solution:** Check if yfinance is working (no API key needed)

#### Frontend Issues

**Problem:** Can't connect to backend
**Solution:** Verify `REACT_APP_BACKEND_API_URL` is correct

**Problem:** Supabase connection fails
**Solution:** Check `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY`

**Problem:** Build fails
**Solution:** Check Vercel build logs for missing dependencies

### Debug Commands

```bash
# Test backend health
curl https://quantflow-backend-api.onrender.com/health

# Test market data endpoint
curl https://quantflow-backend-api.onrender.com/api/market-data/quote/AAPL

# Check environment variables (frontend)
console.log(process.env.REACT_APP_BACKEND_API_URL)
```

## 📊 Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API    │    │   Supabase      │
│   (Vercel)      │◄──►│   (Render)       │◄──►│   (Database)    │
│                 │    │                  │    │                 │
│ - React App     │    │ - Risk Analysis  │    │ - User Data     │
│ - Market Data   │    │ - Market Data    │    │ - Portfolios    │
│ - Portfolio UI  │    │ - yfinance API   │    │ - Auth          │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🔐 Security Notes

- ✅ No API keys exposed in frontend code
- ✅ Environment variables properly configured
- ✅ CORS configured for production
- ✅ No hardcoded URLs in production
- ✅ Supabase anonymous key is safe for frontend use

## 📞 Support

If you encounter issues:

1. Check the deployment logs in Render/Vercel
2. Verify all environment variables are set correctly
3. Test the API endpoints manually
4. Check browser console for frontend errors

## 🎉 Success!

Once deployed, your QuantFlow application will be fully functional with:
- Real-time market data
- Portfolio management
- Risk analysis
- User authentication
- Responsive UI

Happy trading! 📈
