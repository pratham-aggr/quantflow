#!/bin/bash

# Risk Engine Deployment Helper Script
echo "🚀 Risk Engine Deployment Helper"
echo "================================"

echo ""
echo "Since your QuantFlow app is deployed on Vercel, you need to deploy the risk engine separately."
echo ""

echo "📋 Quick Steps:"
echo "1. Create a new repository for the risk engine"
echo "2. Copy the risk-engine directory to the new repository"
echo "3. Deploy to Railway or Render"
echo "4. Add the environment variable to your Vercel deployment"
echo ""

echo "🔗 Deployment Options:"
echo "• Railway (Recommended): https://railway.app"
echo "• Render: https://render.com"
echo ""

echo "📝 Environment Variable to add to Vercel:"
echo "Name: REACT_APP_RISK_ENGINE_URL"
echo "Value: https://your-risk-engine-url.com"
echo ""

echo "🧪 Test your deployment with:"
echo "curl https://your-risk-engine-url.com/health"
echo ""

echo "📚 See RISK_ENGINE_DEPLOYMENT.md for detailed instructions"
echo ""

# Check if risk-engine directory exists
if [ -d "risk-engine" ]; then
    echo "✅ Risk engine directory found"
    echo "📁 Files ready for deployment:"
    ls -la risk-engine/ | grep -E "\.(py|txt|json|toml|Procfile)$"
else
    echo "❌ Risk engine directory not found"
fi

