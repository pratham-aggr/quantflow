# 📈 QuantFlow - Advanced Portfolio Management & Risk Analysis

A comprehensive portfolio management application with real-time market data, advanced risk analysis, and automated rebalancing capabilities.

## 🚀 Features

- **Real-time Market Data** - Live stock quotes and market information
- **Portfolio Management** - Track and manage your investment portfolios
- **Advanced Risk Analysis** - Comprehensive risk metrics and analysis
- **Automated Rebalancing** - Smart portfolio rebalancing recommendations
- **User Authentication** - Secure user accounts and data protection
- **Responsive UI** - Modern, mobile-friendly interface

## 🏗️ Architecture

```
Frontend (Vercel) ←→ Backend API (Render) ←→ Supabase (Database)
```

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Python Flask + yfinance
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel (Frontend) + Render (Backend)

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- Python 3.9+
- Supabase account

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/quantflow.git
   cd quantflow
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env file
   REACT_APP_SUPABASE_URL=your-supabase-url
   REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
   REACT_APP_BACKEND_API_URL=http://localhost:5000
   ```

4. **Start frontend development server**
   ```bash
   npm start
   ```

5. **Start backend development server**
   ```bash
   cd backend-api
   pip install -r requirements.txt
   python app.py
   ```

## 🚀 Deployment

For production deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

### Quick Deployment Steps:

1. **Deploy Backend to Render**
   - Service name: `quantflow-backend-api`
   - Environment: Python
   - Build: `cd backend-api && pip install -r requirements.txt`
   - Start: `cd backend-api && gunicorn app:app`

2. **Deploy Frontend to Vercel**
   - Framework: Create React App
   - Build: `npm run build`
   - Environment variables: See DEPLOYMENT.md

## 📊 API Endpoints

### Market Data
- `GET /api/market-data/quote/{symbol}` - Get stock quote
- `GET /api/market-data/quotes?symbols=AAPL,GOOGL` - Get multiple quotes
- `GET /api/market-data/search?q=apple` - Search stocks

### Risk Analysis
- `POST /api/risk/advanced` - Advanced risk analysis
- `POST /api/rebalancing/analyze` - Portfolio rebalancing analysis

### Health Check
- `GET /health` - Service health status

## 🔧 Environment Variables

### Frontend (Vercel)
```bash
REACT_APP_BACKEND_API_URL=https://quantflow-backend-api.onrender.com
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Backend (Render)
```bash
PYTHON_VERSION=3.9.16
FRONTEND_URL=https://your-app.vercel.app
```

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Chart.js** - Data visualization
- **React Query** - Data fetching
- **React Router** - Navigation

### Backend
- **Python Flask** - Web framework
- **yfinance** - Market data
- **pandas** - Data manipulation
- **numpy** - Numerical computing
- **scipy** - Scientific computing

### Database
- **Supabase** - PostgreSQL database
- **Row Level Security** - Data protection
- **Real-time subscriptions** - Live updates

## 📁 Project Structure

```
quantflow/
├── src/                    # Frontend React app
│   ├── components/         # React components
│   ├── lib/               # Utility libraries
│   ├── hooks/             # Custom React hooks
│   └── types/             # TypeScript type definitions
├── backend-api/           # Python Flask backend
│   ├── app.py            # Main Flask application
│   ├── requirements.txt  # Python dependencies
│   └── *.py              # Backend modules
├── public/               # Static assets
├── package.json          # Frontend dependencies
└── DEPLOYMENT.md         # Deployment guide
```

## 🔐 Security

- ✅ No API keys exposed in frontend code
- ✅ Environment variables properly configured
- ✅ CORS configured for production
- ✅ Supabase Row Level Security
- ✅ Input validation and sanitization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues:

1. Check the [DEPLOYMENT.md](./DEPLOYMENT.md) for troubleshooting
2. Review the deployment logs
3. Test API endpoints manually
4. Check browser console for errors

## 🎉 Acknowledgments

- **yfinance** for market data
- **Supabase** for database and authentication
- **Render** and **Vercel** for hosting
- **Tailwind CSS** for styling

---

**Happy trading! 📈**
