'use client'

import { useEffect, useState } from 'react'
import { supabase, type Profile } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, Users, Clock, Loader2 } from 'lucide-react'

interface Match {
  id: string
  player1_id: string
  player2_id: string | null
  status: string
  time_control: string
  created_at: string
}

export default function MatchmakingPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [searching, setSearching] = useState(false)
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null)
  const [opponent, setOpponent] = useState<Profile | null>(null)

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (currentMatch && currentMatch.status === 'playing') {
      router.push(`/game/${currentMatch.id}`)
    }
  }, [currentMatch, router])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (data) setProfile(data)
  }

  async function startMatchmaking() {
    if (!profile) return

    setSearching(true)

    // Verificar se já existe uma partida esperando
    const { data: waitingMatches } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'waiting')
      .neq('player1_id', profile.id)
      .limit(1)

    if (waitingMatches && waitingMatches.length > 0) {
      // Entrar em partida existente
      const match = waitingMatches[0]
      
      const { data: updatedMatch } = await supabase
        .from('matches')
        .update({
          player2_id: profile.id,
          status: 'playing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', match.id)
        .select()
        .single()

      if (updatedMatch) {
        // Buscar dados do oponente
        const { data: opponentData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', match.player1_id)
          .single()

        setOpponent(opponentData)
        setCurrentMatch(updatedMatch)
      }
    } else {
      // Criar nova partida
      const { data: newMatch } = await supabase
        .from('matches')
        .insert([{
          player1_id: profile.id,
          status: 'waiting',
          time_control: '10+0',
        }])
        .select()
        .single()

      if (newMatch) {
        setCurrentMatch(newMatch)
        
        // Escutar por atualizações na partida
        const channel = supabase
          .channel(`match:${newMatch.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'matches',
              filter: `id=eq.${newMatch.id}`,
            },
            async (payload) => {
              const updated = payload.new as Match
              setCurrentMatch(updated)

              if (updated.player2_id && updated.status === 'playing') {
                // Buscar dados do oponente
                const { data: opponentData } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', updated.player2_id)
                  .single()

                setOpponent(opponentData)
              }
            }
          )
          .subscribe()

        return () => {
          supabase.removeChannel(channel)
        }
      }
    }
  }

  async function cancelMatchmaking() {
    if (currentMatch && currentMatch.status === 'waiting') {
      await supabase
        .from('matches')
        .delete()
        .eq('id', currentMatch.id)
    }

    setSearching(false)
    setCurrentMatch(null)
    setOpponent(null)
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          className="text-white hover:bg-white/10 mb-6"
          onClick={() => router.push('/dashboard')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-6">Buscar Partida</h1>

            {!searching && !currentMatch && (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <Users className="w-24 h-24 text-blue-400" />
                </div>
                
                <p className="text-gray-300 text-lg">
                  Encontre um oponente do seu nível e comece a jogar!
                </p>

                <div className="bg-white/5 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between text-white">
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Tempo de jogo
                    </span>
                    <span className="font-bold">10 minutos</span>
                  </div>
                </div>

                <Button
                  onClick={startMatchmaking}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-6"
                >
                  <Users className="w-5 h-5 mr-2" />
                  Buscar Oponente
                </Button>
              </div>
            )}

            {(searching || currentMatch) && currentMatch?.status === 'waiting' && (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <Loader2 className="w-24 h-24 text-blue-400 animate-spin" />
                </div>

                <h2 className="text-2xl font-bold text-white">
                  Procurando oponente...
                </h2>

                <p className="text-gray-300">
                  Aguarde enquanto encontramos um jogador para você
                </p>

                <Button
                  onClick={cancelMatchmaking}
                  variant="outline"
                  className="w-full border-white/20 text-white hover:bg-white/10"
                >
                  Cancelar Busca
                </Button>
              </div>
            )}

            {opponent && currentMatch?.status === 'playing' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">
                  Oponente encontrado!
                </h2>

                <Avatar className="w-32 h-32 mx-auto">
                  <AvatarImage src={opponent.avatar_url} />
                  <AvatarFallback className="bg-slate-700 text-white text-4xl">
                    {opponent.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="text-white">
                  <p className="text-xl font-bold">{opponent.username}</p>
                  <p className="text-gray-300">Rating: {opponent.rating}</p>
                </div>

                <p className="text-gray-300">
                  Redirecionando para a partida...
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
