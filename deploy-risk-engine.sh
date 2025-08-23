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
echo "• Railway with Docker (Alternative): Use Dockerfile"
echo ""

echo "🚨 If you get Nix build errors on Railway:"
echo "1. Try using the Dockerfile instead of nixpacks"
echo "2. Or use Render.com which has better Python support"
echo "3. Or use Railway's Docker deployment option"
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
    ls -la risk-engine/ | grep -E "\.(py|txt|json|toml|Procfile|Dockerfile)$"
    echo ""
    echo "🔧 Deployment files available:"
    echo "• nixpacks.toml (may have Nix build issues)"
    echo "• Procfile (alternative to nixpacks)"
    echo "• Dockerfile (most reliable option)"
    echo "• railway.json (Railway configuration)"
else
    echo "❌ Risk engine directory not found"
fi

