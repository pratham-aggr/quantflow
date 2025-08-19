# Supabase Database Setup Guide

## Required Database Tables

Your QuantFlow app requires the following tables in your Supabase database:

### 1. `user_profiles` Table
```sql
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  risk_tolerance TEXT CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')) DEFAULT 'moderate',
  investment_goals TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Create policy for users to update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create policy for users to insert their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
```

### 2. `portfolios` Table
```sql
CREATE TABLE portfolios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  cash_balance DECIMAL(15,2) DEFAULT 10000.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own portfolios
CREATE POLICY "Users can manage own portfolios" ON portfolios
  FOR ALL USING (auth.uid() = user_id);
```

### 3. `holdings` Table
```sql
CREATE TABLE holdings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  avg_price DECIMAL(10,2) NOT NULL,
  company_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage holdings in their portfolios
CREATE POLICY "Users can manage holdings in own portfolios" ON holdings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM portfolios 
      WHERE portfolios.id = holdings.portfolio_id 
      AND portfolios.user_id = auth.uid()
    )
  );
```

### 4. `transactions` Table
```sql
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  type TEXT CHECK (type IN ('BUY', 'SELL')) NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage transactions in their portfolios
CREATE POLICY "Users can manage transactions in own portfolios" ON transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM portfolios 
      WHERE portfolios.id = transactions.portfolio_id 
      AND portfolios.user_id = auth.uid()
    )
  );
```

## Verification Steps

1. **Check if tables exist** in your Supabase dashboard
2. **Verify Row Level Security** is enabled on all tables
3. **Test authentication** by registering a new user
4. **Test portfolio creation** after logging in
5. **Check the dashboard** to see if it shows "Production Mode"

## Testing Your Setup

1. Go to `http://localhost:3000`
2. Click "Register" to create a new account
3. After registration, you should be automatically logged in
4. Check the dashboard - it should show "✅ Production Mode"
5. Try creating a portfolio to test the database connection

## Troubleshooting

If you see errors:
1. Check that all tables are created with the exact names
2. Verify RLS policies are in place
3. Check that your environment variables are set correctly
4. Look at the browser console for any error messages
