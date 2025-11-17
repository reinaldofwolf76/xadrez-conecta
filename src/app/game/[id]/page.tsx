'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, type Match, type Profile } from '@/lib/supabase'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Flag, 
  MessageSquare, 
  Mic, 
  MicOff, 
  UserPlus,
  Trophy,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'

export default function GamePage() {
  const params = useParams()
  const router = useRouter()
  const matchId = params.id as string

  const [game, setGame] = useState(new Chess())
  const [match, setMatch] = useState<Match | null>(null)
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [player1, setPlayer1] = useState<Profile | null>(null)
  const [player2, setPlayer2] = useState<Profile | null>(null)
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white')
  const [timeLeft, setTimeLeft] = useState({ white: 600, black: 600 }) // 10 minutos
  const [isMicOn, setIsMicOn] = useState(false)
  const [gameOver, setGameOver] = useState(false)

  useEffect(() => {
    loadMatch()
  }, [matchId])

  useEffect(() => {
    if (!match || gameOver) return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const turn = game.turn() === 'w' ? 'white' : 'black'
        const newTime = { ...prev }
        
        if (newTime[turn] > 0) {
          newTime[turn] -= 1
        } else {
          handleTimeOut(turn)
        }
        
        return newTime
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [match, game, gameOver])

  async function loadMatch() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    setCurrentUser(user.id)

    const { data: matchData } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single()

    if (!matchData) {
      toast.error('Partida não encontrada')
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

    // Restaurar movimentos
    if (matchData.moves && matchData.moves.length > 0) {
      const newGame = new Chess()
      matchData.moves.forEach((move: string) => {
        newGame.move(move)
      })
      setGame(newGame)
    }

    // Subscrever a atualizações
    const subscription = supabase
      .channel(`match-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          const updatedMatch = payload.new as Match
          setMatch(updatedMatch)

          if (updatedMatch.moves && updatedMatch.moves.length > 0) {
            const newGame = new Chess()
            updatedMatch.moves.forEach((move: string) => {
              newGame.move(move)
            })
            setGame(newGame)
          }

          if (updatedMatch.status === 'completed') {
            setGameOver(true)
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }

  function onDrop(sourceSquare: string, targetSquare: string) {
    if (gameOver) return false
    if (!match) return false
    if (match.status !== 'active') return false

    const turn = game.turn()
    const isPlayerTurn = 
      (turn === 'w' && playerColor === 'white') ||
      (turn === 'b' && playerColor === 'black')

    if (!isPlayerTurn) return false

    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      })

      if (move === null) return false

      const newMoves = [...(match.moves || []), move.san]

      // Atualizar no banco
      supabase
        .from('matches')
        .update({
          moves: newMoves,
          updated_at: new Date().toISOString(),
        })
        .eq('id', matchId)

      // Adicionar 10 segundos ao tempo
      setTimeLeft((prev) => ({
        ...prev,
        [playerColor]: prev[playerColor] + 10,
      }))

      // Verificar fim de jogo
      if (game.isGameOver()) {
        handleGameOver()
      }

      return true
    } catch (error) {
      return false
    }
  }

  async function handleGameOver() {
    if (!match || !currentUser) return

    let winnerId = null

    if (game.isCheckmate()) {
      winnerId = game.turn() === 'w' ? match.player2_id : match.player1_id
    }

    await supabase
      .from('matches')
      .update({
        status: 'completed',
        winner_id: winnerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchId)

    setGameOver(true)

    if (winnerId === currentUser) {
      toast.success('Você venceu! 🎉')
    } else if (winnerId) {
      toast.error('Você perdeu!')
    } else {
      toast('Empate!')
    }
  }

  async function handleTimeOut(color: 'white' | 'black') {
    if (!match || gameOver) return

    const winnerId = color === 'white' ? match.player2_id : match.player1_id

    await supabase
      .from('matches')
      .update({
        status: 'completed',
        winner_id: winnerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchId)

    setGameOver(true)
    toast.error('Tempo esgotado!')
  }

  async function handleResign() {
    if (!match || !currentUser) return

    const winnerId = currentUser === match.player1_id ? match.player2_id : match.player1_id

    await supabase
      .from('matches')
      .update({
        status: 'completed',
        winner_id: winnerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchId)

    setGameOver(true)
    toast('Você desistiu da partida')
  }

  async function handleAddFriend() {
    if (!currentUser || !match) return

    const friendId = currentUser === match.player1_id ? match.player2_id : match.player1_id

    const { error } = await supabase
      .from('friendships')
      .insert([
        {
          user_id: currentUser,
          friend_id: friendId,
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      ])

    if (error) {
      toast.error('Erro ao adicionar amigo')
    } else {
      toast.success('Solicitação de amizade enviada!')
    }
  }

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const opponent = playerColor === 'white' ? player2 : player1
  const currentPlayer = playerColor === 'white' ? player1 : player2

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game Board */}
          <div className="lg:col-span-2">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4 md:p-6">
              {/* Opponent Info */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={opponent?.avatar_url} />
                    <AvatarFallback className="bg-purple-600 text-white">
                      {opponent?.username?.[0]?.toUpperCase() || 'O'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-white font-semibold">{opponent?.username}</p>
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-yellow-400" />
                      <span className="text-yellow-400 text-sm">{opponent?.rating}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-black/30 px-4 py-2 rounded-lg">
                  <Clock className="w-4 h-4 text-white" />
                  <span className="text-white font-mono text-lg">
                    {formatTime(playerColor === 'white' ? timeLeft.black : timeLeft.white)}
                  </span>
                </div>
              </div>

              {/* Chessboard */}
              <div className="mb-4">
                <Chessboard
                  position={game.fen()}
                  onPieceDrop={onDrop}
                  boardOrientation={playerColor}
                  customBoardStyle={{
                    borderRadius: '8px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                  }}
                />
              </div>

              {/* Current Player Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={currentPlayer?.avatar_url} />
                    <AvatarFallback className="bg-purple-600 text-white">
                      {currentPlayer?.username?.[0]?.toUpperCase() || 'Y'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-white font-semibold">{currentPlayer?.username} (Você)</p>
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-yellow-400" />
                      <span className="text-yellow-400 text-sm">{currentPlayer?.rating}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-black/30 px-4 py-2 rounded-lg">
                  <Clock className="w-4 h-4 text-white" />
                  <span className="text-white font-mono text-lg">
                    {formatTime(playerColor === 'white' ? timeLeft.white : timeLeft.black)}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            {/* Voice Chat */}
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Chat de Voz
              </h3>
              <Button
                className={`w-full ${
                  isMicOn
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
                onClick={() => setIsMicOn(!isMicOn)}
              >
                {isMicOn ? (
                  <>
                    <MicOff className="w-4 h-4 mr-2" />
                    Silenciar
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    Ativar Microfone
                  </>
                )}
              </Button>
              <p className="text-gray-400 text-xs mt-3 text-center">
                {isMicOn ? 'Microfone ativo' : 'Microfone desligado'}
              </p>
            </Card>

            {/* Game Actions */}
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
              <h3 className="text-white font-semibold mb-4">Ações</h3>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full border-white/20 text-white hover:bg-white/10"
                  onClick={handleAddFriend}
                  disabled={gameOver}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Adicionar Amigo
                </Button>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleResign}
                  disabled={gameOver}
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Desistir
                </Button>
              </div>
            </Card>

            {/* Game Status */}
            {gameOver && (
              <Card className="bg-gradient-to-br from-purple-600 to-pink-600 border-0 p-6">
                <h3 className="text-white font-bold text-xl mb-3 text-center">
                  Partida Finalizada!
                </h3>
                <Button
                  className="w-full bg-white text-purple-600 hover:bg-gray-100"
                  onClick={() => router.push('/dashboard')}
                >
                  Voltar ao Início
                </Button>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
