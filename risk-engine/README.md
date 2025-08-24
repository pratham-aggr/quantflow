# Risk Assessment Engine

A Python Flask microservice for calculating comprehensive portfolio risk metrics including volatility, beta, Value at Risk (VaR), and risk scoring.

## 🚀 Features

- **Portfolio Risk Analysis**: Volatility, beta, Sharpe ratio, maximum drawdown
- **Value at Risk (VaR)**: Historical simulation method with configurable confidence levels
- **Risk Scoring**: 1-10 scale based on multiple risk factors
- **Risk Alerts**: Automated alerts when portfolio exceeds risk tolerance thresholds
- **Diversification Analysis**: Concentration risk and diversification scoring
- **Real-time Calculations**: Using Yahoo Finance API for historical data

## 🛠️ Technologies

- **Python 3.8+** with Flask
- **pandas & numpy** for financial calculations
- **scipy** for statistical functions
- **yfinance** for market data
- **CORS** support for frontend integration

## 📦 Installation

### Option 1: Conda Environment (Recommended)

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

### Option 2: Manual Conda Setup

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

### Option 3: Virtual Environment (Alternative)

1. **Navigate to the risk engine directory**:
```bash
cd risk-engine
```

2. **Create virtual environment**:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**:
```bash
pip install -r requirements.txt
```

4. **Run the service**:
```bash
python app.py
```

The service will be available at `http://localhost:5000`

## 🔌 API Endpoints

### Health Check
```
GET /health
```
Returns service status and version information.

### Portfolio Risk Analysis
```
POST /api/risk/portfolio
```
Calculate comprehensive risk metrics for a portfolio.

**Request Body**:
```json
{
  "holdings": [
    {
      "symbol": "AAPL",
      "quantity": 100,
      "avg_price": 150.00
    },
    {
      "symbol": "GOOGL", 
      "quantity": 50,
      "avg_price": 2800.00
    }
  ],
  "risk_tolerance": "moderate"
}
```

**Response**:
```json
{
  "portfolio_metrics": {
    "volatility": 18.5,
    "beta": 1.12,
    "correlation": 0.85,
    "r_squared": 0.72,
    "sharpe_ratio": 1.45,
    "max_drawdown": 12.3,
    "concentration_risk": 35.2,
    "diversification_score": 0.65,
    "var_95": 2.1,
    "var_99": 3.8
  },
  "risk_score": {
    "score": 6.2,
    "level": "Moderate",
    "description": "Balanced portfolio with moderate risk"
  },
  "alerts": [
    {
      "type": "high_concentration",
      "severity": "warning",
      "message": "Portfolio concentration risk (35.2%) exceeds moderate threshold (25.0%)"
    }
  ]
}
```

### Individual Stock Risk
```
GET /api/risk/holding/{symbol}
```
Calculate risk metrics for a single stock.

### Value at Risk (VaR)
```
POST /api/risk/var
```
Calculate Value at Risk with configurable confidence levels.

**Request Body**:
```json
{
  "holdings": [...],
  "confidence_level": 0.95,
  "time_horizon": 1
}
```

### Portfolio Beta
```
POST /api/risk/beta
```
Calculate portfolio beta against market benchmark (S&P 500 by default).

### Risk Score
```
POST /api/risk/score
```
Calculate overall risk score (1-10) for portfolio.

### Risk Alerts
```
POST /api/risk/alerts
```
Check for risk alerts based on user's risk tolerance.

## 📊 Risk Metrics Explained

### Volatility
Annualized standard deviation of returns. Higher volatility = higher risk.

### Beta
Measures portfolio sensitivity to market movements:
- β < 1: Less volatile than market
- β = 1: Same volatility as market  
- β > 1: More volatile than market

### Sharpe Ratio
Risk-adjusted return measure. Higher values indicate better risk-adjusted performance.

### Value at Risk (VaR)
Maximum expected loss over a given time period at a specified confidence level.

### Concentration Risk
Herfindahl index measuring portfolio concentration. Higher values = less diversified.

### Risk Score (1-10)
Composite score based on:
- Volatility (25% weight)
- Beta (20% weight)
- Sharpe ratio (15% weight)
- Concentration risk (20% weight)
- VaR (20% weight)

## 🎯 Risk Tolerance Levels

### Conservative
- Max volatility: 15%
- Max beta: 0.8
- Max VaR (95%): 2%
- Max concentration: 15%

### Moderate
- Max volatility: 25%
- Max beta: 1.2
- Max VaR (95%): 3.5%
- Max concentration: 25%

### Aggressive
- Max volatility: 40%
- Max beta: 1.5
- Max VaR (95%): 5%
- Max concentration: 40%

## 🔧 Configuration

### Environment Variables
```bash
PORT=5000  # Server port (default: 5000)
```

### Conda Environment Management

**List environments**:
```bash
conda env list
```

**Activate environment**:
```bash
conda activate quantflow-risk-engine
```

**Deactivate environment**:
```bash
conda deactivate
```

**Remove environment**:
```bash
conda env remove -n quantflow-risk-engine
```

**Update environment**:
```bash
conda env update -f environment.yml
```

### Deployment
The service can be deployed to:
- **Render**: Free tier with Python support (recommended)
- **Vercel**: Serverless deployment
- **Heroku**: Free tier (discontinued)

## 🧪 Testing

Test the API with curl:

```bash
# Health check
curl http://localhost:5000/health

# Portfolio risk analysis
curl -X POST http://localhost:5000/api/risk/portfolio \
  -H "Content-Type: application/json" \
  -d '{
    "holdings": [
      {"symbol": "AAPL", "quantity": 100, "avg_price": 150.00}
    ],
    "risk_tolerance": "moderate"
  }'
```

## 🔗 Integration with QuantFlow

The risk engine integrates with your main QuantFlow application:

1. **Frontend calls risk engine API** for portfolio analysis
2. **Risk metrics displayed** in dashboard components
3. **Alerts shown** when risk thresholds exceeded
4. **Risk scores** used for portfolio recommendations

## 📈 Performance Considerations

- **Caching**: Historical data cached for 1 hour
- **Rate Limiting**: Respects Yahoo Finance API limits
- **Error Handling**: Graceful degradation when data unavailable
- **Async Processing**: Consider implementing for large portfolios

## 🚨 Error Handling

The service includes comprehensive error handling:
- Invalid symbols return appropriate error messages
- Insufficient data points handled gracefully
- Network errors logged and reported
- Malformed requests return 400 status codes

## 📝 License

MIT License - see LICENSE file for details.
