# Supabase Password Reset Configuration

## The Problem
When you click the password reset link from Supabase, it tries to redirect to your local development server (`http://localhost:3000`), but Supabase can't reach localhost from the internet.

## Solutions

### Solution 1: Use ngrok (Recommended for Development)

1. **Install ngrok**:
   ```bash
   # Download from https://ngrok.com/download
   # Or use npm
   npm install -g ngrok
   ```

2. **Start ngrok tunnel**:
   ```bash
   ngrok http 3000
   ```

3. **Copy the public URL** (e.g., `https://abc123.ngrok.io`)

4. **Configure Supabase**:
   - Go to your Supabase dashboard
   - Navigate to **Authentication** → **URL Configuration**
   - Set **Site URL** to your ngrok URL
   - Add **Redirect URLs**:
     - `https://abc123.ngrok.io/reset-password`
     - `https://abc123.ngrok.io/auth/callback`

5. **Update your app** to use the ngrok URL when running ngrok

### Solution 2: Production Configuration

For production deployment:

1. **Go to Supabase Dashboard** → **Authentication** → **URL Configuration**
2. **Set Site URL** to your production domain (e.g., `https://yourdomain.com`)
3. **Add Redirect URLs**:
   - `https://yourdomain.com/reset-password`
   - `https://yourdomain.com/auth/callback`

### Solution 3: Manual Token Handling (Alternative)

If you prefer to handle the reset manually:

1. **Update the reset form** to accept the token from URL parameters
2. **Handle the reset** without relying on Supabase's automatic redirect

## Current Configuration

Your app is currently configured to:
- Send reset emails to: `http://localhost:3000/reset-password`
- This works only if Supabase can reach your local server

## Testing Steps

1. **Set up ngrok** and configure Supabase with the public URL
2. **Request password reset** from your app
3. **Click the link** in the email
4. **Verify** you're redirected to your app's reset password form

## Troubleshooting

- **"Could not connect to server"**: Supabase can't reach your localhost
- **"Invalid redirect URL"**: URL not configured in Supabase
- **"Token expired"**: Reset link was clicked too late

## Recommended Approach

For development: Use **ngrok** to create a public tunnel
For production: Use your actual domain in Supabase configuration
