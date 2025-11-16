'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, type Profile } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { ArrowLeft, Flag, Trophy } from 'lucide-react'

interface Match {
  id: string
  player1_id: string
  player2_id: string
  status: string
  winner_id: string | null
  moves: any[]
  time_control: string
}

export default function GamePage() {
  const params = useParams()
  const router = useRouter()
  const matchId = params.id as string

  const [game, setGame] = useState(new Chess())
  const [match, setMatch] = useState<Match | null>(null)
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [player1, setPlayer1] = useState<Profile | null>(null)
  const [player2, setPlayer2] = useState<Profile | null>(null)
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white')

  useEffect(() => {
    loadGame()
  }, [matchId])

  useEffect(() => {
    if (!match) return

    const channel = supabase
      .channel(`match:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          const updated = payload.new as Match
          setMatch(updated)

          // Atualizar tabuleiro com novos movimentos
          if (updated.moves && updated.moves.length > 0) {
            const newGame = new Chess()
            updated.moves.forEach((move: any) => {
              newGame.move(move)
            })
            setGame(newGame)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [match, matchId])

  async function loadGame() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    // Carregar perfil do usuário atual
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    setCurrentUser(profile)

    // Carregar partida
    const { data: matchData } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single()

    if (!matchData) {
      router.push('/dashboard')
      return
    }

    setMatch(matchData)

    // Determinar cor do jogador
    if (matchData.player1_id === user.id) {
      setPlayerColor('white')
    } else {
      setPlayerColor('black')
    }

    // Carregar perfis dos jogadores
    const { data: p1 } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', matchData.player1_id)
      .single()

    const { data: p2 } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', matchData.player2_id)
      .single()

    setPlayer1(p1)
    setPlayer2(p2)

    // Carregar movimentos
    if (matchData.moves && matchData.moves.length > 0) {
      const newGame = new Chess()
      matchData.moves.forEach((move: any) => {
        newGame.move(move)
      })
      setGame(newGame)
    }
  }

  async function onDrop(sourceSquare: string, targetSquare: string) {
    if (!match || match.status !== 'playing') return false
    if (!currentUser) return false

    // Verificar se é a vez do jogador
    const isWhiteTurn = game.turn() === 'w'
    const isPlayerTurn = (isWhiteTurn && playerColor === 'white') || (!isWhiteTurn && playerColor === 'black')

    if (!isPlayerTurn) return false

    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      })

      if (move === null) return false

      const newMoves = [...(match.moves || []), move]
      
      // Verificar se o jogo terminou
      let winner_id = null
      let status = 'playing'

      if (game.isGameOver()) {
        status = 'finished'
        if (game.isCheckmate()) {
          winner_id = game.turn() === 'w' ? match.player2_id : match.player1_id
        }
      }

      // Atualizar no banco
      await supabase
        .from('matches')
        .update({
          moves: newMoves,
          status,
          winner_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', matchId)

      setGame(new Chess(game.fen()))
      return true
    } catch (error) {
      return false
    }
  }

  async function handleResign() {
    if (!match || !currentUser) return

    await supabase
      .from('matches')
      .update({
        status: 'finished',
        winner_id: currentUser.id === match.player1_id ? match.player2_id : match.player1_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchId)

    router.push('/dashboard')
  }

  if (!match || !player1 || !player2) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-white text-xl">Carregando partida...</div>
      </div>
    )
  }

  const isGameOver = match.status === 'finished'
  const winner = match.winner_id === player1.id ? player1 : match.winner_id === player2.id ? player2 : null

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="max-w-6xl mx-auto">
        <Button
          variant="ghost"
          className="text-white hover:bg-white/10 mb-6"
          onClick={() => router.push('/dashboard')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tabuleiro */}
          <div className="lg:col-span-2">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
              <Chessboard
                position={game.fen()}
                onPieceDrop={onDrop}
                boardOrientation={playerColor}
                customBoardStyle={{
                  borderRadius: '8px',
                }}
              />

              {isGameOver && (
                <div className="mt-4 text-center">
                  <div className="bg-amber-500/20 border border-amber-500/50 rounded-lg p-4">
                    <Trophy className="w-12 h-12 text-amber-500 mx-auto mb-2" />
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {winner ? `${winner.username} venceu!` : 'Empate!'}
                    </h3>
                    <Button
                      onClick={() => router.push('/dashboard')}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Voltar ao Dashboard
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Informações da partida */}
          <div className="space-y-4">
            {/* Jogador 2 (topo) */}
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={player2.avatar_url} />
                  <AvatarFallback className="bg-slate-700 text-white">
                    {player2.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-white font-bold">{player2.username}</p>
                  <p className="text-gray-400 text-sm">Rating: {player2.rating}</p>
                </div>
                {game.turn() === 'b' && !isGameOver && (
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                )}
              </div>
            </Card>

            {/* Status */}
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-2">Status</p>
                <p className="text-white font-bold text-lg">
                  {isGameOver 
                    ? 'Partida Finalizada' 
                    : game.turn() === 'w' 
                      ? 'Vez das Brancas' 
                      : 'Vez das Pretas'}
                </p>
              </div>
            </Card>

            {/* Jogador 1 (baixo) */}
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={player1.avatar_url} />
                  <AvatarFallback className="bg-slate-700 text-white">
                    {player1.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-white font-bold">{player1.username}</p>
                  <p className="text-gray-400 text-sm">Rating: {player1.rating}</p>
                </div>
                {game.turn() === 'w' && !isGameOver && (
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                )}
              </div>
            </Card>

            {/* Ações */}
            {!isGameOver && (
              <Button
                onClick={handleResign}
                variant="outline"
                className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                <Flag className="w-4 h-4 mr-2" />
                Desistir
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
