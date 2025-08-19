import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const app = express()
app.use(cors({ origin: ['http://localhost:3000'], credentials: true }))
app.use(express.json())

// Environment
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase env vars. Set SUPABASE_URL and SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Auth middleware using Supabase JWT
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) return res.status(401).json({ error: 'Missing Authorization header' })

    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user) return res.status(401).json({ error: 'Invalid or expired token' })

    req.user = data.user
    next()
  } catch (err) {
    console.error('Auth middleware error:', err)
    res.status(401).json({ error: 'Unauthorized' })
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Protected example
app.get('/api/protected', requireAuth, (req, res) => {
  res.json({ message: 'Protected content', user_id: req.user.id, email: req.user.email })
})

// Current user profile from DB (example)
app.get('/api/me', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', req.user.id)
      .single()

    if (error) return res.status(500).json({ error: error.message })

    res.json({ user: req.user, profile: data })
  } catch (err) {
    console.error('GET /api/me error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`))
