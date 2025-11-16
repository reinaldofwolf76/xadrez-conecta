import { createClient } from '@supabase/supabase-js'

// Buscar variáveis de ambiente do Supabase
// No ambiente do cliente Next.js, as variáveis devem começar com NEXT_PUBLIC_
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Validação e mensagem de erro clara
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '❌ Variáveis de ambiente do Supabase não configuradas!\n\n' +
    'Configure suas credenciais do Supabase:\n' +
    '1. Clique no banner laranja acima, OU\n' +
    '2. Vá em Configurações do Projeto → Integrações → Conectar Supabase\n\n' +
    'Variáveis necessárias:\n' +
    '- NEXT_PUBLIC_SUPABASE_URL\n' +
    '- NEXT_PUBLIC_SUPABASE_ANON_KEY'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Profile = {
  id: string
  email: string
  username: string
  avatar_url?: string
  bio?: string
  chess_interests?: string
  rating: number
  created_at: string
  updated_at: string
}

export type Match = {
  id: string
  player1_id: string
  player2_id: string | null
  status: 'waiting' | 'active' | 'completed'
  winner_id?: string | null
  moves: string[]
  time_control: string
  created_at: string
  updated_at: string
}

export type Friendship = {
  id: string
  user_id: string
  friend_id: string
  status: 'pending' | 'accepted'
  created_at: string
}
