import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key:', supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Board {
  id: string
  user_id: string
  name: string
  color: string
  position: number
  created_at: string
  updated_at: string
}

export interface Folder {
  id: string
  board_id: string
  name: string
  color: string
  position: number
  created_at: string
  updated_at: string
}

export interface Link {
  id: string
  folder_id: string
  title: string
  url: string
  description?: string
  favicon?: string
  position: number
  created_at: string
  updated_at: string
}

export interface ShareLink {
  id: string
  resource_type: 'board' | 'folder' | 'link'
  resource_id: string
  shared_by: string
  share_token: string
  expires_at?: string
  created_at: string
}
