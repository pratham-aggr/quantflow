# QuantFlow - Quantitative Finance Platform

A modern React application for quantitative finance analysis and portfolio management.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd quantflow
```

2. Install dependencies:
```bash
npm install
```

3. Set up Supabase:
   - Follow the instructions in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
   - Create a `.env.local` file with your Supabase credentials

4. Start the development server:
```bash
npm start
```

5. (Optional) Start the Risk Assessment Engine:
```bash
cd risk-engine
./start.sh
```

The app will be available at [http://localhost:3000](http://localhost:3000)

**Risk Assessment Engine**: If you started the risk engine, it will be available at [http://localhost:5000](http://localhost:5000)

## 🔧 Project Structure

```
quantflow/
├── src/                    # React frontend
│   ├── lib/               # Supabase and utility functions
│   ├── types/             # TypeScript type definitions
│   ├── components/        # React components
│   └── contexts/          # React contexts
├── server/                # Express.js market data API
├── risk-engine/           # Python Flask risk assessment microservice
│   ├── app.py            # Main Flask application
│   ├── risk_calculator.py # Core risk calculations
│   ├── portfolio_analyzer.py # Portfolio analysis
│   └── requirements.txt   # Python dependencies
└── README.md             # This file
```

## 🛠️ Built With

- **React 19** - Frontend framework
- **TypeScript** - Type safety
- **Supabase** - Backend and authentication
- **Tailwind CSS** - Styling
- **React Hook Form** - Form handling
- **React Router** - Navigation
- **Chart.js** - Data visualization
- **Python Flask** - Risk assessment microservice
- **pandas/numpy** - Financial calculations
- **yfinance** - Market data integration

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
