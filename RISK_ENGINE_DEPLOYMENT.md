# Risk Engine Deployment Guide

## 🚨 Nix Build Error Solutions

If you're getting Nix build errors on Railway like:
```
error: builder for '/nix/store/504kp7hrb2zpz043h4wdcpbhlz8rd7w9-python3.9-setuptools-75.1.0.drv' failed with exit code 1
```

Or Docker build errors like:
```
exit code: 127 - conda command not found
```

Here are the solutions:

## Solution 1: Use Dockerfile Deployment (Recommended)

1. **Enable Docker on Railway:**
   - Go to your Railway project
   - Go to Settings → General
   - Enable "Use Dockerfile for deployment"

2. **Deploy with Dockerfile:**
   - Railway will automatically detect the `Dockerfile`
   - This properly installs conda and creates your environment
   - Most reliable deployment method

## Solution 2: Use Procfile Instead of nixpacks

1. **Disable nixpacks:**
   - Rename `nixpacks.toml` to `nixpacks.toml.backup`
   - Railway will use the `Procfile` instead

2. **Deploy:**
   - Railway will use the Procfile configuration
   - Simpler build process

## Solution 3: Use Render.com (Alternative Platform)

1. **Create account on Render.com**
2. **Connect your repository**
3. **Configure as Python service:**
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn --bind 0.0.0.0:$PORT app:app`

## 🚀 Quick Deployment Steps

### Option A: Railway with Docker (Recommended)

1. **Push your code to GitHub**
2. **Connect to Railway**
3. **Enable Docker deployment**
4. **Deploy**

### Option B: Railway with Procfile

1. **Rename nixpacks.toml:**
   ```bash
   mv risk-engine/nixpacks.toml risk-engine/nixpacks.toml.backup
   ```

2. **Deploy to Railway**

### Option C: Render.com

1. **Sign up at render.com**
2. **Connect your GitHub repository**
3. **Create new Web Service**
4. **Configure:**
   - Environment: Python 3
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn --bind 0.0.0.0:$PORT app:app`

## 🔧 Environment Variables

Set these in your deployment platform:

```
PORT=5000
FLASK_ENV=production
```

## 🧪 Testing Your Deployment

After deployment, test with:

```bash
curl https://your-risk-engine-url.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "Risk Assessment Engine",
  "version": "1.0.0"
}
```

## 🔗 Connect to Frontend

Add this environment variable to your Vercel deployment:

```
REACT_APP_RISK_ENGINE_URL=https://your-risk-engine-url.com
```

## 📁 Files Overview

- `Dockerfile` - Docker deployment with conda (most reliable)
- `Procfile` - Alternative to nixpacks
- `nixpacks.toml` - Railway nixpacks config (may have issues)
- `railway.json` - Railway configuration
- `environment.yml` - Conda environment specification
- `requirements.txt` - Python dependencies (for pip-based deployment)
- `runtime.txt` - Python version specification

## 🆘 Troubleshooting

### Build Fails
1. Try Docker deployment (recommended)
2. Use Render.com instead
3. Check Python version compatibility

### App Won't Start
1. Check PORT environment variable
2. Verify gunicorn is in requirements.txt
3. Check logs for specific errors

### Health Check Fails
1. Verify the `/health` endpoint exists
2. Check if app is binding to correct port
3. Review application logs

