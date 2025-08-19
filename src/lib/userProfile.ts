import { supabase } from './supabase'
import { User, UserProfile } from '../types/auth'
import { mockUserProfileService } from './mockAuth'

// Check if Supabase is configured
const isSupabaseConfigured = process.env.REACT_APP_SUPABASE_URL && 
  process.env.REACT_APP_SUPABASE_ANON_KEY &&
  process.env.REACT_APP_SUPABASE_URL !== 'https://placeholder.supabase.co' && 
  process.env.REACT_APP_SUPABASE_ANON_KEY !== 'placeholder-key'

export const userProfileService = {
  // Get user profile by ID
  async getUserProfile(userId: string): Promise<User | null> {
    if (!isSupabaseConfigured) {
      return mockUserProfileService.getUserProfile(userId)
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return data
  },

  // Update user profile
  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<User | null> {
    if (!isSupabaseConfigured) {
      return mockUserProfileService.updateUserProfile(userId, updates)
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user profile:', error)
      return null
    }

    return data
  },

  // Create user profile (called automatically on signup)
  async createUserProfile(userId: string, email: string, fullName?: string): Promise<User | null> {
    if (!isSupabaseConfigured) {
      return mockUserProfileService.createUserProfile(userId, email, fullName)
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        email,
        full_name: fullName,
        risk_tolerance: 'moderate', // default value
        investment_goals: []
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating user profile:', error)
      return null
    }

    return data
  }
}
