import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '../../config/env'

let cachedClient: SupabaseClient | null = null

/**
 * Returns a singleton Supabase client configured from VITE_SUPABASE_URL
 * and VITE_SUPABASE_PUBLISHABLE_KEY, or null when running without Supabase env.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!env.hasSupabase) return null
  if (!cachedClient) {
    cachedClient = createClient(env.supabaseUrl, env.supabasePublishableKey, {
      auth: {
        persistSession: env.managedAuth,
        autoRefreshToken: env.managedAuth,
        detectSessionInUrl: env.managedAuth,
      },
    })
  }
  return cachedClient
}
