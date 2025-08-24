# QuantFlow - Advanced Portfolio Management & Risk Analysis Platform

[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.9+-green.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-2.3+-red.svg)](https://flask.palletsprojects.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-orange.svg)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black.svg)](https://vercel.com/)
[![Render](https://img.shields.io/badge/Deployed%20on-Render-blue.svg)](https://render.com/)

> **QuantFlow** is a comprehensive portfolio management platform that combines real-time market data, advanced risk analysis, automated rebalancing, and intelligent portfolio optimization. Built with modern technologies for professional-grade financial analysis.

## 🚀 Live Demo

- **Frontend:** [https://quantflow-git-main-pratham-aggrs-projects.vercel.app](https://quantflow-git-main-pratham-aggrs-projects.vercel.app)
- **Backend API:** [https://quantflow-backend-api.onrender.com](https://quantflow-backend-api.onrender.com)

## ✨ Features

### 📊 **Portfolio Management**
- **Real-time Portfolio Tracking** - Monitor your investments with live market data
- **Multi-Asset Support** - Stocks, ETFs, and other securities
- **Performance Analytics** - Detailed performance metrics and historical analysis
- **Portfolio Allocation** - Visual breakdown of asset allocation

### 🎯 **Advanced Risk Analysis**
- **Risk Metrics Calculation** - VaR, Sharpe Ratio, Beta, Alpha, and more
- **Portfolio Stress Testing** - Scenario analysis and stress testing
- **Correlation Analysis** - Asset correlation and diversification insights
- **Risk-Adjusted Returns** - Comprehensive risk-adjusted performance metrics

### ⚖️ **Automated Rebalancing**
- **Smart Rebalancing Engine** - Automated portfolio rebalancing strategies
- **What-If Analysis** - Test different rebalancing scenarios
- **Tax-Loss Harvesting** - Optimize tax efficiency
- **Custom Rebalancing Rules** - Define your own rebalancing criteria

### 📈 **Market Intelligence**
- **Real-time Market Data** - Live stock quotes and market information
- **Financial News Feed** - Relevant market news and insights
- **Technical Indicators** - Moving averages, RSI, and other technical analysis
- **Market Trends** - Market sentiment and trend analysis

### 🔐 **Security & Authentication**
- **Secure User Authentication** - Supabase-powered authentication
- **Role-based Access** - User permissions and access control
- **Data Encryption** - Secure data transmission and storage
- **API Security** - Protected API endpoints with CORS

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (React/TS)    │◄──►│   (Python/Flask)│◄──►│   (Supabase)    │
│   Vercel        │    │   Render        │    │   PostgreSQL    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Market Data   │    │   Risk Engine   │    │   User Data     │
│   (yfinance)    │    │   (Custom)      │    │   (Profiles)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Tech Stack

### **Frontend**
- **React 18** - Modern UI framework with hooks
- **TypeScript** - Type-safe JavaScript development
- **Tailwind CSS** - Utility-first CSS framework
- **Chart.js** - Interactive charts and visualizations
- **React Router** - Client-side routing

### **Backend**
- **Python 3.9+** - Backend programming language
- **Flask** - Lightweight web framework
- **yfinance** - Yahoo Finance API for market data
- **NumPy/Pandas** - Data analysis and manipulation
- **Gunicorn** - WSGI HTTP Server for production

### **Database & Authentication**
- **Supabase** - PostgreSQL database with real-time features
- **Row Level Security** - Database-level security
- **JWT Authentication** - Secure token-based auth

### **Deployment**
- **Vercel** - Frontend hosting and deployment
- **Render** - Backend hosting and deployment
- **GitHub** - Version control and CI/CD

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and **npm**
- **Python** 3.9+
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/pratham-aggr/quantflow.git
cd quantflow
```

### 2. Frontend Setup
```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Add your environment variables
REACT_APP_SUPABASE_URL=your-supabase-url
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
REACT_APP_BACKEND_API_URL=http://localhost:5000

# Start development server
npm start
```

### 3. Backend Setup
```bash
# Navigate to backend directory
cd backend-api

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
python app.py
```

### 4. Database Setup
1. Create a [Supabase](https://supabase.com/) project
2. Set up your database schema
3. Configure authentication
4. Update environment variables with your Supabase credentials

## 📁 Project Structure

```
quantflow/
├── src/                          # Frontend source code
│   ├── components/               # React components
│   │   ├── dashboard/           # Dashboard components
│   │   ├── auth/                # Authentication components
│   │   └── ...                  # Other UI components
│   ├── lib/                     # Utility libraries
│   │   ├── supabase.ts          # Database client
│   │   ├── marketDataService.ts # Market data service
│   │   └── ...                  # Other services
│   ├── contexts/                # React contexts
│   ├── hooks/                   # Custom React hooks
│   └── types/                   # TypeScript type definitions
├── backend-api/                  # Backend Python application
│   ├── app.py                   # Main Flask application
│   ├── advanced_risk_engine.py  # Risk analysis engine
│   ├── rebalancing_engine.py    # Portfolio rebalancing
│   ├── requirements.txt         # Python dependencies
│   └── ...                      # Other backend modules
├── public/                      # Static assets
├── render.yaml                  # Render deployment config
├── package.json                 # Frontend dependencies
└── README.md                    # This file
```

## 🔧 Configuration

### Environment Variables

#### Frontend (.env.local)
```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
REACT_APP_BACKEND_API_URL=http://localhost:5000
```

#### Backend (Environment)
```env
FRONTEND_URL=https://your-frontend-url.vercel.app
PYTHON_VERSION=3.9.16
PORT=10000
```

## 🚀 Deployment

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Backend (Render)
1. Connect your GitHub repository to Render
2. Configure environment variables in Render dashboard
3. Set build command: `cd backend-api && pip install -r requirements.txt`
4. Set start command: `cd backend-api && gunicorn app:app`

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## 📊 API Documentation

### Market Data Endpoints
- `GET /api/market-data/quote/{symbol}` - Get stock quote
- `GET /api/market-data/quotes` - Get multiple quotes
- `GET /api/market-data/search` - Search stocks
- `GET /api/market-data/news` - Get market news

### Risk Analysis Endpoints
- `POST /api/risk/analyze` - Analyze portfolio risk
- `POST /api/risk/stress-test` - Stress test portfolio
- `GET /api/risk/metrics` - Get risk metrics

### Portfolio Endpoints
- `POST /api/portfolio/rebalance` - Rebalance portfolio
- `POST /api/portfolio/what-if` - What-if analysis
- `GET /api/portfolio/performance` - Get performance data

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Yahoo Finance** - Market data provider
- **Supabase** - Database and authentication
- **Vercel** - Frontend hosting
- **Render** - Backend hosting
- **React** - Frontend framework
- **Flask** - Backend framework

## 📞 Support

- **Documentation:** [https://github.com/pratham-aggr/quantflow](https://github.com/pratham-aggr/quantflow)
- **Issues:** [GitHub Issues](https://github.com/pratham-aggr/quantflow/issues)
- **Email:** [your-email@example.com]

---

<div align="center">
  <p>Made with ❤️ by <a href="https://github.com/pratham-aggr">Pratham Aggarwal</a></p>
  <p>⭐ Star this repository if you found it helpful!</p>
</div>
