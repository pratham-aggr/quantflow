### Step 1: Navigate to the risk-engine directory
```bash
cd risk-engine
```
### Step 3: Test yfinance data fetching
```bash
python test-yfinance.py
```
This should show:
```
Testing yfinance data fetching...
Testing AAPL...
  ✅ Got 30 data points for AAPL
  📊 Latest price: $175.43
  ⏱️  Time taken: 1.23s
```

### Step 4: Start the risk engine
```bash
# Option 1: Using the startup script
chmod +x start-simple.sh
./start-simple.sh

# Option 2: Direct Python execution
python app.py
```

The server should start on `http://localhost:5001`

### Step 5: Test the API endpoints
```bash
python test-local.py
```

## 🔧 Manual Testing

### Test Health Check
```bash
curl http://localhost:5001/health
```
Expected response:
```json
{
  "status": "healthy",
  "service": "Risk Assessment Engine",
  "version": "1.0.0"
}
```

### Test Advanced Risk Report
```bash
curl -X POST http://localhost:5001/api/risk/advanced \
  -H "Content-Type: application/json" \
  -d '{
    "holdings": [
      {
        "symbol": "AAPL",
        "quantity": 100,
        "avg_price": 150.0,
        "current_price": 175.0,
        "sector": "Technology"
      }
    ],
    "risk_tolerance": "moderate"
  }'
```

## 📊 Expected Results

### ✅ Successful Test Results
- **Health Check**: Should return status "healthy"
- **Advanced Risk Report**: Should return comprehensive risk analysis
- **Monte Carlo Simulation**: Should return realistic return projections
- **Correlation Analysis**: Should return diversification metrics
- **Sector Analysis**: Should return sector allocation analysis

### ⚠️ Common Issues & Solutions

#### Issue: "No module named 'yfinance'"
```bash
pip install yfinance
```

#### Issue: "Connection refused" on localhost:5001
- Make sure the Flask server is running
- Check if port 5001 is available
- Try a different port: `export FLASK_RUN_PORT=5002`

#### Issue: "Timeout" when fetching market data
- Check your internet connection
- yfinance might be rate-limited, wait a few minutes
- Try with fewer symbols

#### Issue: "Zero values" in risk analysis
- This is expected if no real market data is available
- The system now returns honest zeros instead of fake data
- Check the logs for detailed information

## 🔍 Debugging

### Enable Debug Logging
The risk engine now includes comprehensive logging. Check the console output for:
- Data received from frontend
- yfinance data fetching results
- Monte Carlo simulation progress
- Error details

### Test Individual Components
```bash
# Test yfinance only
python test-yfinance.py

# Test risk calculator
python -c "
from risk_calculator import RiskCalculator
calc = RiskCalculator()
print('Risk Calculator loaded successfully')
"

# Test portfolio analyzer
python -c "
from portfolio_analyzer import PortfolioAnalyzer
analyzer = PortfolioAnalyzer()
print('Portfolio Analyzer loaded successfully')
"
```

## 🌐 Frontend Integration Testing

### Test with React Frontend
1. Start the risk engine: `python app.py`
2. In another terminal, start the React app: `npm start`
3. Navigate to the Risk Analysis page
4. Add some holdings to your portfolio
5. Check if the advanced risk analysis works

### Environment Variables
Make sure your React app has the correct risk engine URL:
```bash
# In your React app's .env file
REACT_APP_RISK_ENGINE_URL=http://localhost:5001
```

## 📈 Performance Testing

### Test with Large Portfolio
```bash
# Create a test script with more holdings
python -c "
import requests
import json

large_portfolio = [
    {'symbol': 'AAPL', 'quantity': 100, 'avg_price': 150, 'current_price': 175},
    {'symbol': 'MSFT', 'quantity': 50, 'avg_price': 280, 'current_price': 320},
    {'symbol': 'GOOGL', 'quantity': 25, 'avg_price': 2500, 'current_price': 2750},
    {'symbol': 'AMZN', 'quantity': 30, 'avg_price': 3000, 'current_price': 3300},
    {'symbol': 'TSLA', 'quantity': 200, 'avg_price': 800, 'current_price': 850}
]

response = requests.post('http://localhost:5001/api/risk/advanced', 
                        json={'holdings': large_portfolio})
print(f'Response time: {response.elapsed.total_seconds():.2f}s')
print(f'Status: {response.status_code}')
"
```

## 🛠️ Troubleshooting

### Check Logs
The risk engine now provides detailed logging. Look for:
- `INFO` messages showing data processing
- `WARNING` messages for missing data
- `ERROR` messages for failures

### Common Error Messages
- **"No holdings provided"**: Check the request payload
- **"Insufficient historical data"**: Symbol might not have enough data
- **"Could not fetch data"**: Network or yfinance issue

### Performance Tips
- The first request might be slow as it fetches market data
- Subsequent requests should be faster
- Consider caching for production use

## ✅ Success Criteria

Your risk engine is working correctly if:
1. ✅ Health check returns "healthy"
2. ✅ Advanced risk report generates without errors
3. ✅ Monte Carlo simulation produces realistic results
4. ✅ No mock data is used (all calculations based on real data)
5. ✅ Frontend can connect and display risk analysis

## 🎉 Next Steps

Once local testing passes:
1. Deploy to Render/Heroku
2. Update frontend environment variables
3. Test the deployed version
4. Monitor logs for any production issues

---

**Note**: This risk engine uses 100% real market data with zero mock data. If you see zero values, it means real data is unavailable, which is the correct behavior.
