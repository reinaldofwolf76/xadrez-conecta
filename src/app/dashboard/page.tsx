'use client'

import { useEffect, useState } from 'react'
import { supabase, type Profile } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Crown, Search, Users, Trophy, Settings, LogOut } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    friends: 0,
    wins: 0,
    totalMatches: 0,
  })

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    // Buscar ou criar perfil
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (existingProfile) {
      setProfile(existingProfile)
      await loadStats(user.id)
    } else {
      // Criar perfil inicial
      const newProfile = {
        id: user.id,
        email: user.email!,
        username: user.email!.split('@')[0],
        rating: 1200,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data } = await supabase
        .from('profiles')
        .insert([newProfile])
        .select()
        .single()

      if (data) setProfile(data)
    }

    setLoading(false)
  }

  async function loadStats(userId: string) {
    // Contar amigos
    const { count: friendsCount } = await supabase
      .from('friendships')
      .select('*', { count: 'exact', head: true })
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq('status', 'accepted')

    // Contar vitórias
    const { count: winsCount } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('winner_id', userId)
      .eq('status', 'finished')

    // Contar total de partidas
    const { count: totalCount } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
      .eq('status', 'finished')

    setStats({
      friends: friendsCount || 0,
      wins: winsCount || 0,
      totalMatches: totalCount || 0,
    })
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#161512]">
        <div className="text-gray-300 text-xl">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-[#161512]">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="w-10 h-10 text-[#d59120]" />
            <h1 className="text-3xl md:text-4xl font-bold text-white">Xadrez Conecta</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-300 hover:bg-[#2b2925] hover:text-white"
              onClick={() => router.push('/profile')}
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-300 hover:bg-[#2b2925] hover:text-white"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="lg:col-span-1 bg-[#2b2925] border-[#3d3d3d] p-6">
            <div className="text-center">
              <Avatar className="w-24 h-24 mx-auto mb-4">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-[#3d3d3d] text-white text-2xl">
                  {profile?.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <h2 className="text-2xl font-bold text-white mb-2">
                {profile?.username || 'Jogador'}
              </h2>
              
              <div className="flex items-center justify-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-[#d59120]" />
                <span className="text-xl text-[#d59120] font-bold">
                  {profile?.rating || 1200}
                </span>
              </div>

              {profile?.bio && (
                <p className="text-gray-400 text-sm mb-4">{profile.bio}</p>
              )}

              <Button
                className="w-full bg-[#3d3d3d] hover:bg-[#4d4d4d] text-white"
                onClick={() => router.push('/profile')}
              >
                Editar Perfil
              </Button>
            </div>
          </Card>

          {/* Main Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Find Match Card */}
            <Card className="bg-gradient-to-br from-[#a88865] to-[#8b6f47] border-0 p-8 hover:shadow-2xl transition-all duration-300">
              <div className="text-center">
                <Search className="w-16 h-16 text-white mx-auto mb-4" />
                <h3 className="text-3xl font-bold text-white mb-3">
                  Buscar Partida
                </h3>
                <p className="text-white/90 mb-6">
                  Encontre um oponente e comece a jogar agora!
                </p>
                <Button
                  size="lg"
                  className="bg-white text-[#8b6f47] hover:bg-gray-100 text-lg px-8 py-6 h-auto font-bold"
                  onClick={() => router.push('/matchmaking')}
                >
                  <Search className="w-6 h-6 mr-2" />
                  Buscar Oponente
                </Button>
              </div>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-[#2b2925] border-[#3d3d3d] p-6 hover:bg-[#3d3d3d] transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="bg-[#3d3d3d] p-3 rounded-lg">
                    <Users className="w-8 h-8 text-[#a88865]" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Amigos</p>
                    <p className="text-white text-2xl font-bold">{stats.friends}</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-[#2b2925] border-[#3d3d3d] p-6 hover:bg-[#3d3d3d] transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="bg-[#3d3d3d] p-3 rounded-lg">
                    <Trophy className="w-8 h-8 text-[#d59120]" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Vitórias</p>
                    <p className="text-white text-2xl font-bold">{stats.wins}</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-[#2b2925] border-[#3d3d3d] p-6 hover:bg-[#3d3d3d] transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="bg-[#3d3d3d] p-3 rounded-lg">
                    <Trophy className="w-8 h-8 text-[#a88865]" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Partidas</p>
                    <p className="text-white text-2xl font-bold">{stats.totalMatches}</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
