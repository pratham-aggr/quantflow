# Risk Engine Deployment Guide

Since your QuantFlow app is deployed on Vercel (serverless), the Python risk engine needs to be deployed separately to a platform that supports Python applications.

## 🚀 Quick Deployment Options

### Option 1: Railway (Recommended - Free Tier)

1. **Fork/Clone the repository** to a separate repository for the risk engine
2. **Go to [Railway.app](https://railway.app)** and sign up
3. **Create a new project** and connect your GitHub repository
4. **Deploy the risk-engine directory** as a new service
5. **Get the deployment URL** (e.g., `https://your-risk-engine.railway.app`)
6. **Add environment variable** to your Vercel deployment:
   - Name: `REACT_APP_RISK_ENGINE_URL`
   - Value: `https://your-risk-engine.railway.app`

### Option 2: Render (Free Tier)

1. **Go to [Render.com](https://render.com)** and sign up
2. **Create a new Web Service**
3. **Connect your GitHub repository**
4. **Configure the service**:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python app.py`
   - Environment: Python 3
5. **Deploy and get the URL**
6. **Add the environment variable** to Vercel as above

### Option 3: Heroku (Paid)

1. **Install Heroku CLI**
2. **Create a new Heroku app**
3. **Deploy using the Procfile**
4. **Add the environment variable** to Vercel

## 🔧 Environment Variables

Add this to your Vercel deployment:

```
REACT_APP_RISK_ENGINE_URL=https://your-risk-engine-url.com
```

## 📁 Required Files for Deployment

The risk-engine directory contains all necessary files:
- `app.py` - Main Flask application
- `requirements.txt` - Python dependencies
- `Procfile` - Deployment configuration
- `railway.json` - Railway-specific config
- `nixpacks.toml` - Nixpacks configuration

## 🧪 Testing the Deployment

After deployment, test the risk engine:

```bash
# Health check
curl https://your-risk-engine-url.com/health

# Advanced risk analysis
curl -X POST https://your-risk-engine-url.com/api/risk/advanced \
  -H "Content-Type: application/json" \
  -d '{"holdings":[],"risk_tolerance":"moderate"}'
```

## 🔄 Automatic Deployment

Both Railway and Render support automatic deployments:
- Connect your GitHub repository
- Every push to main branch triggers a new deployment
- No manual intervention required

## 💰 Cost Considerations

- **Railway**: Free tier includes 500 hours/month
- **Render**: Free tier includes 750 hours/month
- **Heroku**: Paid plans only (no free tier)

## 🚨 Troubleshooting

### Common Issues:

1. **CORS Errors**: The risk engine includes CORS headers for `http://localhost:3000`
2. **Port Issues**: The app uses `PORT` environment variable
3. **Dependencies**: All required packages are in `requirements.txt`

### Debug Commands:

```bash
# Check if the service is running
curl https://your-risk-engine-url.com/health

# Check logs (Railway/Render dashboard)
# Look for Python errors or missing dependencies
```

## 📈 Performance

The risk engine is optimized for:
- **Caching**: Historical data cached for 1 hour
- **Rate Limiting**: Respects Yahoo Finance API limits
- **Error Handling**: Graceful degradation when data unavailable

## 🔐 Security

- The risk engine only accepts requests from your frontend domain
- No sensitive data is stored
- All calculations are performed in memory

