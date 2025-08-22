# Risk Assessment Engine Setup Guide

This guide will help you set up and integrate the **Component 4: Risk Assessment Engine** into your QuantFlow platform.

## 🎯 Overview

The Risk Assessment Engine is a Python Flask microservice that provides:
- **Portfolio Risk Analysis**: Volatility, beta, Sharpe ratio, maximum drawdown
- **Value at Risk (VaR)**: Historical simulation method
- **Risk Scoring**: 1-10 scale based on multiple risk factors
- **Risk Alerts**: Automated alerts when portfolio exceeds risk tolerance
- **Diversification Analysis**: Concentration risk and diversification scoring

## 🚀 Quick Start

### Prerequisites
- Python 3.8 or higher
- Conda (Anaconda or Miniconda) - **Recommended**
- Node.js (for the main QuantFlow app)
- Internet connection (for downloading dependencies and market data)

### Step 1: Start the Risk Engine (Conda - Recommended)

1. **Navigate to the risk engine directory**:
```bash
cd risk-engine
```

2. **Run the conda startup script**:
```bash
./start-conda.sh
```

The script will:
- Check if conda is installed
- Create the `quantflow-risk-engine` conda environment
- Install all dependencies
- Start the Flask server on `http://localhost:5000`

### Alternative: Manual Conda Setup

If the startup script doesn't work:

1. **Create conda environment**:
```bash
cd risk-engine
conda env create -f environment.yml
```

2. **Activate environment**:
```bash
conda activate quantflow-risk-engine
```

3. **Start the server**:
```bash
python app.py
```

### Alternative: Virtual Environment

If you prefer using pip/virtualenv:

1. **Create virtual environment**:
```bash
cd risk-engine
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies**:
```bash
pip install -r requirements.txt
```

3. **Start the server**:
```bash
python app.py
```

### Step 2: Verify Installation

Test the risk engine API:

```bash
# Health check
curl http://localhost:5000/health

# Expected response:
{
  "status": "healthy",
  "service": "Risk Assessment Engine",
  "version": "1.0.0"
}
```

### Step 3: Test Portfolio Risk Analysis

```bash
curl -X POST http://localhost:5000/api/risk/portfolio \
  -H "Content-Type: application/json" \
  -d '{
    "holdings": [
      {"symbol": "AAPL", "quantity": 100, "avg_price": 150.00},
      {"symbol": "GOOGL", "quantity": 50, "avg_price": 2800.00}
    ],
    "risk_tolerance": "moderate"
  }'
```

## 🔧 Conda Environment Management

### Useful Commands

**List all conda environments**:
```bash
conda env list
```

**Activate the risk engine environment**:
```bash
conda activate quantflow-risk-engine
```

**Deactivate environment**:
```bash
conda deactivate
```

**Remove environment** (if you need to recreate it):
```bash
conda env remove -n quantflow-risk-engine
```

**Update environment** (if you modify environment.yml):
```bash
conda env update -f environment.yml
```

### Environment Details

The conda environment includes:
- **Python 3.9**: Stable Python version
- **Flask 2.3.3**: Web framework
- **pandas 2.1.1**: Data manipulation
- **numpy 1.24.3**: Numerical computing
- **scipy 1.11.1**: Scientific computing
- **yfinance 0.2.18**: Market data
- **flask-cors 4.0.0**: CORS support

## 🌐 Integration with QuantFlow

### Frontend Integration

The risk engine is already integrated into your React frontend:

1. **Risk Service**: `src/lib/riskService.ts` - Handles API communication
2. **Risk Dashboard**: `src/components/RiskDashboard.tsx` - Displays risk metrics
3. **Updated Dashboard**: `src/components/Dashboard.tsx` - Now includes risk analysis tab

### Environment Variables

Add to your `.env.local` file:
```bash
REACT_APP_RISK_ENGINE_URL=http://localhost:5000
```

### Testing the Integration

1. **Start your main QuantFlow app**:
```bash
npm start
```

2. **Start the risk engine** (in another terminal):
```bash
cd risk-engine
./start-conda.sh  # or conda activate quantflow-risk-engine && python app.py
```

3. **Navigate to the dashboard** and click the "Risk Analysis" tab

## 📊 API Endpoints

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health check |
| `/api/risk/portfolio` | POST | Comprehensive portfolio risk analysis |
| `/api/risk/holding/{symbol}` | GET | Individual stock risk metrics |
| `/api/risk/var` | POST | Value at Risk calculation |
| `/api/risk/beta` | POST | Portfolio beta calculation |
| `/api/risk/score` | POST | Risk score (1-10) |
| `/api/risk/alerts` | POST | Risk alerts based on tolerance |

### Request/Response Examples

#### Portfolio Risk Analysis
```json
// Request
{
  "holdings": [
    {"symbol": "AAPL", "quantity": 100, "avg_price": 150.00}
  ],
  "risk_tolerance": "moderate"
}

// Response
{
  "portfolio_metrics": {
    "volatility": 18.5,
    "beta": 1.12,
    "sharpe_ratio": 1.45,
    "max_drawdown": 12.3,
    "var_95": 2.1
  },
  "risk_score": {
    "score": 6.2,
    "level": "Moderate",
    "description": "Balanced portfolio with moderate risk"
  },
  "alerts": []
}
```

## 🎯 Risk Metrics Explained

### Volatility
- **What**: Annualized standard deviation of returns
- **Range**: 0% - 100%+
- **Interpretation**: Higher = more risk

### Beta
- **What**: Portfolio sensitivity to market movements
- **Range**: Negative to 2+
- **Interpretation**: 
  - β < 1: Less volatile than market
  - β = 1: Same volatility as market
  - β > 1: More volatile than market

### Sharpe Ratio
- **What**: Risk-adjusted return measure
- **Range**: Negative to 3+
- **Interpretation**: Higher = better risk-adjusted performance

### Value at Risk (VaR)
- **What**: Maximum expected loss at confidence level
- **Range**: 0% - 20%+
- **Interpretation**: Higher = more potential loss

### Risk Score (1-10)
- **What**: Composite risk score
- **Range**: 1 (Very Low) to 10 (Very High)
- **Components**: Volatility (25%), Beta (20%), Sharpe (15%), Concentration (20%), VaR (20%)

## 🚨 Risk Alerts

The system automatically generates alerts when:

### Conservative Portfolio
- Volatility > 15%
- Beta > 0.8
- VaR (95%) > 2%
- Single holding > 15%

### Moderate Portfolio
- Volatility > 25%
- Beta > 1.2
- VaR (95%) > 3.5%
- Single holding > 25%

### Aggressive Portfolio
- Volatility > 40%
- Beta > 1.5
- VaR (95%) > 5%
- Single holding > 40%

## 🔍 Troubleshooting

### Common Issues

#### 1. Conda Not Found
```bash
# Install Miniconda
# Download from: https://docs.conda.io/en/latest/miniconda.html

# Or install Anaconda
# Download from: https://www.anaconda.com/products/distribution
```

#### 2. Port Already in Use
```bash
# Check what's using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>
```

#### 3. Conda Environment Creation Failed
```bash
# Update conda
conda update conda

# Try creating environment again
conda env create -f environment.yml
```

#### 4. CORS Errors
The risk engine includes CORS configuration for `localhost:3000` and `localhost:4000`. If you're using different ports, update the CORS configuration in `app.py`.

#### 5. Market Data Unavailable
The risk engine uses Yahoo Finance API. If data is unavailable:
- Check your internet connection
- Verify the stock symbol is valid
- Some international stocks may not be available on the free tier

### Debug Mode

Enable debug mode for detailed logging:
```bash
# Activate environment first
conda activate quantflow-risk-engine

# Set debug environment variables
export FLASK_DEBUG=1
export FLASK_ENV=development

# Start server
python app.py
```

## 🚀 Deployment

### Railway (Recommended)
1. Create account at [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Set environment variables:
   - `PORT`: 5000
4. Deploy the `risk-engine` directory

### Render
1. Create account at [render.com](https://render.com)
2. Create new Web Service
3. Connect your GitHub repository
4. Set build command: `pip install -r requirements.txt`
5. Set start command: `gunicorn app:app`

### Environment Variables for Production
```bash
PORT=5000
FLASK_ENV=production
```

## 📈 Performance Optimization

### Caching
- Historical data cached for 1 hour
- Risk calculations cached for 15 minutes
- Consider Redis for production caching

### Rate Limiting
- Yahoo Finance API: 2,000 requests/hour (free tier)
- Implement request queuing for large portfolios

### Async Processing
For large portfolios, consider implementing async processing:
```python
# Example async implementation
import asyncio
from concurrent.futures import ThreadPoolExecutor

async def calculate_portfolio_risk_async(holdings):
    with ThreadPoolExecutor() as executor:
        # Process holdings in parallel
        pass
```

## 🔐 Security Considerations

### API Security
- Add authentication for production use
- Implement rate limiting
- Use HTTPS in production
- Validate input data

### Data Privacy
- No user data stored permanently
- All calculations done in memory
- Historical data from public APIs only

## 📝 Testing

### Unit Tests
```bash
# Run tests (when implemented)
python -m pytest tests/
```

### Integration Tests
```bash
# Test API endpoints
curl -X POST http://localhost:5000/api/risk/portfolio \
  -H "Content-Type: application/json" \
  -d @test_data.json
```

## 🤝 Contributing

### Code Structure
```
risk-engine/
├── app.py              # Main Flask application
├── risk_calculator.py  # Core risk calculations
├── portfolio_analyzer.py # Portfolio analysis logic
├── requirements.txt    # Python dependencies (pip)
├── environment.yml     # Conda environment
├── start.sh           # Virtual environment startup script
├── start-conda.sh     # Conda environment startup script
└── README.md          # Documentation
```

### Adding New Risk Metrics
1. Add calculation method to `RiskCalculator`
2. Update `PortfolioAnalyzer` to include new metric
3. Add to API response in `app.py`
4. Update frontend components to display new metric

## 📞 Support

If you encounter issues:

1. **Check the logs**: Look for error messages in the terminal
2. **Verify conda environment**: Ensure environment is activated
3. **Test API directly**: Use curl to test endpoints
4. **Check network**: Ensure internet connection for market data

## 🎉 Success!

Once everything is working, you'll have:

✅ **Complete risk assessment system**
✅ **Real-time portfolio risk metrics**
✅ **Automated risk alerts**
✅ **Professional risk dashboard**
✅ **Integration with your existing QuantFlow platform**

Your QuantFlow platform now includes sophisticated risk analysis capabilities that rival professional financial platforms!
