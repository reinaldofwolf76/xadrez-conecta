'use client'

import { useEffect, useState } from 'react'
import { supabase, type Profile } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, Save } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [chessInterests, setChessInterests] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
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

    if (data) {
      setProfile(data)
      setUsername(data.username || '')
      setBio(data.bio || '')
      setChessInterests(data.chess_interests || '')
    }

    setLoading(false)
  }

  async function handleSave() {
    if (!profile) return

    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({
        username,
        bio,
        chess_interests: chessInterests,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)

    setSaving(false)

    if (!error) {
      router.push('/dashboard')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    )
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
          <h1 className="text-3xl font-bold text-white mb-6">Editar Perfil</h1>

          <div className="space-y-6">
            <div className="flex justify-center mb-6">
              <Avatar className="w-32 h-32">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-slate-700 text-white text-4xl">
                  {username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>

            <div>
              <Label htmlFor="username" className="text-white">Nome de usuário</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                placeholder="Seu nome de usuário"
              />
            </div>

            <div>
              <Label htmlFor="bio" className="text-white">Biografia</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 min-h-[100px]"
                placeholder="Conte um pouco sobre você..."
              />
            </div>

            <div>
              <Label htmlFor="interests" className="text-white">Interesses no Xadrez</Label>
              <Textarea
                id="interests"
                value={chessInterests}
                onChange={(e) => setChessInterests(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 min-h-[100px]"
                placeholder="Aberturas favoritas, estilo de jogo, objetivos..."
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
