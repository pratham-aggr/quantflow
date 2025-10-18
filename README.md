# QuantFlow

**Advanced Portfolio Management & Risk Analysis Platform**

QuantFlow is a comprehensive financial technology platform that provides institutional-grade portfolio management, risk analysis, and automated rebalancing capabilities. Built with modern microservices architecture and containerized deployment, it offers real-time market data integration, advanced risk modeling, and intelligent portfolio optimization.

## Architecture Overview

QuantFlow employs a microservices architecture with clear separation of concerns:

- **Frontend**: React-based single-page application with TypeScript
- **Backend**: Python Flask API with advanced financial modeling
- **Database**: PostgreSQL with Supabase for authentication and data persistence
- **Containerization**: Docker-based deployment with orchestration
- **Infrastructure**: Cloud-native deployment on Vercel and Render

## Key Features

### Portfolio Management
- Real-time portfolio tracking with live market data
- Multi-asset class support (stocks, ETFs, bonds, alternatives)
- Performance analytics with historical analysis
- Portfolio allocation visualization and optimization

### Risk Analysis Engine
- Advanced risk metrics calculation (VaR, CVaR, Sharpe Ratio, Beta)
- Monte Carlo simulation for scenario analysis
- Correlation analysis and diversification scoring
- Machine learning-based volatility prediction
- Stress testing and sensitivity analysis

### Automated Rebalancing
- Intelligent rebalancing algorithms
- Tax-loss harvesting optimization
- Custom rebalancing strategies and rules
- What-if analysis for portfolio scenarios

### Market Intelligence
- Real-time market data integration
- Financial news aggregation and sentiment analysis
- Technical indicators and trend analysis
- Market sentiment scoring

## Technology Stack

### Frontend Technologies
- **React 18** - Modern UI framework with hooks and concurrent features
- **TypeScript 5.0** - Type-safe JavaScript development
- **Tailwind CSS** - Utility-first CSS framework for responsive design
- **Chart.js** - Interactive financial charts and visualizations
- **React Router** - Client-side routing and navigation
- **Axios** - HTTP client for API communication

### Backend Technologies
- **Python 3.9+** - High-performance backend programming language
- **Flask 2.3+** - Lightweight and flexible web framework
- **NumPy** - Numerical computing and mathematical operations
- **Pandas** - Data manipulation and analysis
- **SciPy** - Scientific computing and statistical analysis
- **scikit-learn** - Machine learning algorithms and models
- **yfinance** - Yahoo Finance API integration for market data
- **Gunicorn** - WSGI HTTP Server for production deployment

### Database & Authentication
- **PostgreSQL** - Robust relational database system
- **Supabase** - Backend-as-a-Service with real-time features
- **JWT** - JSON Web Tokens for secure authentication
- **Row Level Security** - Database-level security policies

### Infrastructure & DevOps
- **Docker** - Containerization platform
- **Docker Compose** - Multi-container orchestration
- **Nginx** - High-performance web server and reverse proxy
- **Vercel** - Frontend hosting and deployment platform
- **Render** - Backend hosting and deployment platform
- **GitHub Actions** - CI/CD pipeline automation

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for development)
- Python 3.9+ (for development)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/pratham-aggr/quantflow.git
   cd quantflow
   ```

2. **Environment Configuration**
   ```bash
   # Frontend environment
   cp .env.example .env.local
   
   # Backend environment
   cd backend-api
   cp .env.example .env
   ```

3. **Development with Docker**
   ```bash
   # Start all services
   docker-compose up -d
   
   # View logs
   docker-compose logs -f
   ```

4. **Development without Docker**
   ```bash
   # Frontend
   npm install
   npm start
   
   # Backend
   cd backend-api
   pip install -r requirements.txt
   python app.py
   ```

### Production Deployment

1. **Build and Deploy**
   ```bash
   # Production build
   docker-compose -f docker-compose.prod.yml up -d
   
   # Scale services
   docker-compose -f docker-compose.prod.yml up -d --scale backend=3
   ```

2. **Environment Variables**
   ```bash
   # Required environment variables
   export FRONTEND_URL=https://your-domain.com
   export BACKEND_URL=https://api.your-domain.com
   export SUPABASE_URL=your-supabase-url
   export SUPABASE_KEY=your-supabase-key
   ```

## Docker Deployment

### Pull and Run with Docker

1. **Clone the repository**
   ```bash
   git clone https://github.com/pratham-aggr/quantflow.git
   cd quantflow
   ```

2. **Start the application**
   ```bash
   # Development environment
   make dev
   
   # Or using docker-compose directly
   docker-compose up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Health Check: http://localhost:5000/health

### Production Deployment

1. **Production setup**
   ```bash
   # Set environment variables
   export FRONTEND_URL=https://your-domain.com
   export BACKEND_URL=https://api.your-domain.com
   
   # Start production environment
   make prod
   ```

2. **Scale services**
   ```bash
   # Scale backend services
   docker-compose -f docker-compose.prod.yml up -d --scale backend=3
   ```

## API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Token refresh

### Portfolio Management
- `GET /api/portfolio/{id}` - Get portfolio details
- `POST /api/portfolio` - Create new portfolio
- `PUT /api/portfolio/{id}` - Update portfolio
- `DELETE /api/portfolio/{id}` - Delete portfolio

### Risk Analysis
- `POST /api/risk/analyze` - Comprehensive risk analysis
- `POST /api/risk/monte-carlo` - Monte Carlo simulation
- `POST /api/risk/correlation` - Correlation analysis
- `POST /api/risk/ml-prediction` - ML-based predictions

### Market Data
- `GET /api/market-data/quote/{symbol}` - Real-time quotes
- `GET /api/market-data/historical/{symbol}` - Historical data
- `GET /api/market-data/news` - Market news feed

## Contributing

We welcome contributions from developers, financial analysts, and open-source enthusiasts. Here's how you can contribute:

### Getting Started

1. **Fork the repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/your-username/quantflow.git
   cd quantflow
   ```

2. **Set up development environment**
   ```bash
   # Using Docker (recommended)
   make dev
   
   # Or manually
   npm install
   cd backend-api && pip install -r requirements.txt
   ```

3. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

### Development Workflow

1. **Make your changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

2. **Test your changes**
   ```bash
   # Run tests
   npm test
   cd backend-api && python -m pytest
   
   # Check Docker build
   docker-compose build
   ```

3. **Submit a pull request**
   ```bash
   git add .
   git commit -m "Add your feature"
   git push origin feature/your-feature-name
   ```

### Contribution Guidelines

- **Code Style**: Follow existing patterns and use TypeScript/Python best practices
- **Testing**: Add unit tests for new features and bug fixes
- **Documentation**: Update README and code comments as needed
- **Commit Messages**: Use clear, descriptive commit messages
- **Pull Requests**: Provide detailed descriptions of changes

### Areas for Contribution

- **Frontend**: React components, UI/UX improvements, performance optimization
- **Backend**: Financial algorithms, risk models, API enhancements
- **DevOps**: Docker optimization, deployment automation, monitoring
- **Documentation**: API docs, user guides, technical documentation
- **Testing**: Unit tests, integration tests, end-to-end tests

## Security

QuantFlow implements enterprise-grade security measures:

- **Authentication**: JWT-based authentication with Supabase
- **Authorization**: Role-based access control (RBAC)
- **Data Encryption**: TLS 1.3 for data in transit
- **Input Validation**: Comprehensive input sanitization
- **Rate Limiting**: API rate limiting and DDoS protection
- **Security Headers**: CSP, HSTS, and other security headers

## Performance

The platform is optimized for high-performance financial applications:

- **Caching**: Multi-layer caching strategy
- **Database Optimization**: Indexed queries and connection pooling
- **CDN Integration**: Global content delivery
- **Load Balancing**: Horizontal scaling capabilities
- **Monitoring**: Real-time performance metrics

## Monitoring and Observability

- **Health Checks**: Comprehensive health monitoring
- **Logging**: Structured logging with correlation IDs
- **Metrics**: Performance and business metrics
- **Alerting**: Automated alerting for critical issues

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [GitHub Wiki](https://github.com/pratham-aggr/quantflow/wiki)
- **Issues**: [GitHub Issues](https://github.com/pratham-aggr/quantflow/issues)
- **Discussions**: [GitHub Discussions](https://github.com/pratham-aggr/quantflow/discussions)

## Roadmap

- [ ] Advanced portfolio optimization algorithms
- [ ] Real-time collaboration features
- [ ] Mobile application
- [ ] Advanced reporting and analytics
- [ ] Integration with more data providers
- [ ] Machine learning model improvements

---

**QuantFlow** - Professional-grade portfolio management and risk analysis platform.