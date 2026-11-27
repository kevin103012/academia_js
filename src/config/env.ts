export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? '',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
  managedAuth: import.meta.env.VITE_SUPABASE_MANAGED_AUTH === 'true',
  get hasSupabase() {
    return this.managedAuth && Boolean(this.supabaseUrl && this.supabasePublishableKey)
  },
  get useMocks() {
    return !this.apiUrl && !this.hasSupabase
  },
} as const
