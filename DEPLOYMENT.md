# QuantFlow Deployment Guide - Render

This guide will help you deploy QuantFlow to Render with both frontend and backend services.

## Prerequisites

1. A Render account (free tier available)
2. Your code pushed to a GitHub repository

## Deployment Steps

### 1. Connect to Render

1. Go to [render.com](https://render.com) and sign up/login
2. Click "New +" and select "Blueprint"
3. Connect your GitHub repository

### 2. Deploy with Blueprint

1. Render will automatically detect the `render.yaml` file
2. It will create two services:
   - **quantflow-frontend**: Static React app
   - **quantflow-risk-engine**: Python Flask backend

### 3. Environment Variables

The `render.yaml` file is already configured with:
- `REACT_APP_RISK_ENGINE_URL`: Points to the backend service
- `PYTHON_VERSION`: Set to 3.9.16
- `PORT`: Set to 10000

### 4. Manual Deployment (Alternative)

If you prefer to deploy services individually:

#### Frontend Service
1. Create a new "Static Site" service
2. Connect your GitHub repository
3. Set build command: `npm install && npm run build`
4. Set publish directory: `build`
5. Add environment variable: `REACT_APP_RISK_ENGINE_URL` = your backend URL

#### Backend Service
1. Create a new "Web Service"
2. Connect your GitHub repository
3. Set root directory: `risk-engine`
4. Set build command: `pip install -r requirements.txt`
5. Set start command: `gunicorn app:app`
6. Set environment: Python 3

## Testing the Deployment

### Backend Health Check
```bash
curl https://your-backend-url.onrender.com/health
```

### Test yfinance
```bash
curl https://your-backend-url.onrender.com/test-yfinance/AAPL
```

### Test External Requests
```bash
curl https://your-backend-url.onrender.com/test-external-requests
```

## Troubleshooting

### Common Issues

1. **Build Failures**: Check the build logs in Render dashboard
2. **yfinance Issues**: Test with the `/test-yfinance/AAPL` endpoint
3. **CORS Issues**: The backend is configured with CORS enabled for all origins
4. **Environment Variables**: Ensure `REACT_APP_RISK_ENGINE_URL` is set correctly

### Logs

- View logs in the Render dashboard for each service
- Backend logs will show yfinance and request information
- Frontend logs will show build and runtime errors

## Local Testing

Before deploying, test locally:

```bash
# Backend
cd risk-engine
python test-render.py

# Frontend
npm run build
npm install -g serve
serve -s build
```

## URLs

After deployment, you'll have:
- Frontend: `https://quantflow-frontend.onrender.com`
- Backend: `https://quantflow-risk-engine.onrender.com`

The frontend will automatically connect to the backend using the environment variable.
