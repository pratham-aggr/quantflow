# QuantFlow

**Advanced Portfolio Management & Risk Analysis Platform**

[![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=flat-square&logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-2.3+-000000?style=flat-square&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Docker](https://img.shields.io/badge/Docker-20.10+-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

---

## Overview

QuantFlow is a comprehensive financial technology platform that provides institutional-grade portfolio management, advanced risk analysis, and automated rebalancing capabilities. Built with modern microservices architecture and containerized deployment.

### Key Features

- **Real-time Portfolio Tracking** with live market data
- **Advanced Risk Analysis** with Monte Carlo simulations
- **Machine Learning** powered volatility predictions
- **Automated Rebalancing** with tax optimization
- **Enterprise Security** with JWT authentication
- **Docker Ready** for easy deployment

## Technology Stack

**Frontend:** React 18, TypeScript, Tailwind CSS, Chart.js, Axios  
**Backend:** Python 3.9+, Flask, NumPy, Pandas, SciPy, scikit-learn  
**Infrastructure:** Docker, Nginx, PostgreSQL, Supabase, Vercel

## Quick Start

### Docker Deployment (Recommended)

```bash
# Clone the repository
git clone https://github.com/pratham-aggr/quantflow.git
cd quantflow

# Start the application
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
```

### Manual Setup

```bash
# Frontend
npm install
npm start

# Backend (in another terminal)
cd backend-api
pip install -r requirements.txt
python app.py
```

## Docker Commands

| Command | Description |
|---------|-------------|
| `make dev` | Start development environment |
| `make prod` | Start production environment |
| `make build` | Build all Docker images |
| `make logs` | View application logs |
| `make clean` | Clean up containers and images |
| `make health` | Check service health |

## Features

### Portfolio Management
- Real-time portfolio tracking with market data
- Multi-asset support (stocks, ETFs, bonds)
- Performance analytics and attribution
- Interactive allocation visualization

### Risk Analysis
- Advanced risk metrics (VaR, CVaR, Sharpe Ratio)
- Monte Carlo simulation and stress testing
- Correlation analysis and diversification scoring
- ML-based volatility forecasting

### Automated Rebalancing
- Intelligent rebalancing algorithms
- Tax-loss harvesting optimization
- Custom rebalancing rules
- What-if scenario analysis

### Market Intelligence
- Real-time market data integration
- Financial news aggregation
- Technical analysis and indicators
- Market sentiment scoring

## API Endpoints

### Authentication
```http
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh
```

### Portfolio Management
```http
GET    /api/portfolio/{id}
POST   /api/portfolio
PUT    /api/portfolio/{id}
DELETE /api/portfolio/{id}
```

### Risk Analysis
```http
POST /api/risk/analyze
POST /api/risk/monte-carlo
POST /api/risk/correlation
POST /api/risk/ml-prediction
```

### Market Data
```http
GET /api/market-data/quote/{symbol}
GET /api/market-data/historical/{symbol}
GET /api/market-data/news
```

## Contributing

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/quantflow.git
   cd quantflow
   ```

2. **Set up development environment**
   ```bash
   make dev
   ```

3. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Make your changes and test**
   ```bash
   npm test
   cd backend-api && python -m pytest
   ```

5. **Submit a pull request**
   ```bash
   git add .
   git commit -m "Add your feature"
   git push origin feature/your-feature-name
   ```

### Contribution Areas

- **Frontend:** React components, UI/UX improvements, performance optimization
- **Backend:** Financial algorithms, risk models, API enhancements
- **DevOps:** Docker optimization, deployment automation, monitoring
- **Documentation:** API docs, user guides, technical documentation
- **Testing:** Unit tests, integration tests, end-to-end tests

## Security

- JWT Authentication with secure token management
- Role-based access control (RBAC)
- TLS 1.3 encryption for data in transit
- Comprehensive input validation and sanitization
- API rate limiting and DDoS protection
- Security headers (CSP, HSTS)

## Performance

- Multi-layer caching strategy (Redis + application-level)
- Database optimization with indexed queries
- CDN integration for global content delivery
- Horizontal scaling capabilities
- Real-time performance monitoring

## Roadmap

- [ ] Advanced portfolio optimization algorithms
- [ ] Real-time collaboration features
- [ ] Mobile application (iOS/Android)
- [ ] Advanced analytics and reporting
- [ ] Multiple data provider integrations
- [ ] Enhanced AI/ML capabilities

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation:** [GitHub Wiki](https://github.com/pratham-aggr/quantflow/wiki)
- **Issues:** [GitHub Issues](https://github.com/pratham-aggr/quantflow/issues)
- **Discussions:** [GitHub Discussions](https://github.com/pratham-aggr/quantflow/discussions)

---

**Made with ❤️ by [Pratham Aggarwal](https://github.com/pratham-aggr)**

[![GitHub stars](https://img.shields.io/github/stars/pratham-aggr/quantflow?style=social)](https://github.com/pratham-aggr/quantflow/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/pratham-aggr/quantflow?style=social)](https://github.com/pratham-aggr/quantflow/network)

⭐ **Star this repository if you found it helpful!**