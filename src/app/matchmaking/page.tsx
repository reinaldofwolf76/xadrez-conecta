'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Search, Users, Clock } from 'lucide-react'

export default function MatchmakingPage() {
  const router = useRouter()
  const [searching, setSearching] = useState(false)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (searching) {
      interval = setInterval(() => {
        setTimeElapsed((prev) => prev + 1)
      }, 1000)
    }

    return () => clearInterval(interval)
  }, [searching])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    setUserId(user.id)
  }

  async function startSearching() {
    if (!userId) return

    setSearching(true)
    setTimeElapsed(0)

    // Procurar por partidas disponíveis
    const { data: waitingMatches } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'waiting')
      .neq('player1_id', userId)
      .limit(1)

    if (waitingMatches && waitingMatches.length > 0) {
      // Entrar em uma partida existente
      const match = waitingMatches[0]
      
      const { error } = await supabase
        .from('matches')
        .update({
          player2_id: userId,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', match.id)

      if (!error) {
        router.push(`/game/${match.id}`)
      }
    } else {
      // Criar nova partida
      const { data: newMatch, error } = await supabase
        .from('matches')
        .insert([
          {
            player1_id: userId,
            status: 'waiting',
            time_control: '10+10',
            moves: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single()

      if (!error && newMatch) {
        // Aguardar oponente
        const subscription = supabase
          .channel(`match-${newMatch.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'matches',
              filter: `id=eq.${newMatch.id}`,
            },
            (payload) => {
              if (payload.new.status === 'active') {
                router.push(`/game/${newMatch.id}`)
              }
            }
          )
          .subscribe()

        // Cleanup após 60 segundos
        setTimeout(() => {
          subscription.unsubscribe()
          if (searching) {
            cancelSearch(newMatch.id)
          }
        }, 60000)
      }
    }
  }

  async function cancelSearch(matchId?: string) {
    setSearching(false)
    setTimeElapsed(0)

    if (matchId) {
      await supabase
        .from('matches')
        .delete()
        .eq('id', matchId)
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          className="text-white hover:bg-white/10 mb-6"
          onClick={() => router.push('/dashboard')}
          disabled={searching}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-8 md:p-12">
          <div className="text-center">
            {!searching ? (
              <>
                <Search className="w-20 h-20 text-purple-400 mx-auto mb-6" />
                <h1 className="text-4xl font-bold text-white mb-4">
                  Buscar Partida
                </h1>
                <p className="text-gray-300 text-lg mb-8">
                  Encontre um oponente para jogar uma partida rápida de 10 minutos
                </p>

                <div className="bg-white/5 rounded-xl p-6 mb-8">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <Clock className="w-5 h-5 text-yellow-400" />
                    <span className="text-white font-semibold">Tempo de Jogo</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-400">
                    10 min + 10 seg por jogada
                  </p>
                </div>

                <Button
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xl px-12 py-8 h-auto"
                  onClick={startSearching}
                >
                  <Search className="w-6 h-6 mr-3" />
                  Começar Busca
                </Button>
              </>
            ) : (
              <>
                <div className="relative mb-8">
                  <div className="w-32 h-32 mx-auto">
                    <div className="absolute inset-0 border-8 border-purple-600/30 rounded-full"></div>
                    <div className="absolute inset-0 border-8 border-purple-600 rounded-full border-t-transparent animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Users className="w-12 h-12 text-purple-400" />
                    </div>
                  </div>
                </div>

                <h1 className="text-4xl font-bold text-white mb-4">
                  Procurando Oponente...
                </h1>
                <p className="text-gray-300 text-lg mb-6">
                  Aguarde enquanto encontramos um jogador para você
                </p>

                <div className="bg-white/5 rounded-xl p-6 mb-8">
                  <p className="text-gray-400 mb-2">Tempo de busca</p>
                  <p className="text-4xl font-bold text-white">
                    {Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => cancelSearch()}
                >
                  Cancelar Busca
                </Button>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
