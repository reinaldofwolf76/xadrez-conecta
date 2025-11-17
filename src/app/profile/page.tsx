'use client'

import { useEffect, useState } from 'react'
import { supabase, type Profile } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, Camera, Save } from 'lucide-react'
import { toast } from 'sonner'

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    bio: '',
    chess_interests: '',
    avatar_url: '',
  })

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
      setFormData({
        username: data.username || '',
        bio: data.bio || '',
        chess_interests: data.chess_interests || '',
        avatar_url: data.avatar_url || '',
      })
    }

    setLoading(false)
  }

  async function handleSave() {
    if (!profile) return

    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({
        username: formData.username,
        bio: formData.bio,
        chess_interests: formData.chess_interests,
        avatar_url: formData.avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)

    setSaving(false)

    if (error) {
      toast.error('Erro ao salvar perfil')
    } else {
      toast.success('Perfil atualizado com sucesso!')
      router.push('/dashboard')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          className="text-white hover:bg-white/10 mb-6"
          onClick={() => router.push('/dashboard')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6 md:p-8">
          <h1 className="text-3xl font-bold text-white mb-6">Editar Perfil</h1>

          <div className="space-y-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-4">
              <Avatar className="w-32 h-32">
                <AvatarImage src={formData.avatar_url} />
                <AvatarFallback className="bg-purple-600 text-white text-4xl">
                  {formData.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="w-full">
                <Label htmlFor="avatar" className="text-white">URL da Foto</Label>
                <Input
                  id="avatar"
                  value={formData.avatar_url}
                  onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                  placeholder="https://exemplo.com/foto.jpg"
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <Label htmlFor="username" className="text-white">Nome de Usuário</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Seu nome de usuário"
                className="bg-white/5 border-white/20 text-white"
              />
            </div>

            {/* Bio */}
            <div>
              <Label htmlFor="bio" className="text-white">Biografia</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Conte um pouco sobre você..."
                rows={4}
                className="bg-white/5 border-white/20 text-white"
              />
            </div>

            {/* Chess Interests */}
            <div>
              <Label htmlFor="interests" className="text-white">Interesses em Xadrez</Label>
              <Textarea
                id="interests"
                value={formData.chess_interests}
                onChange={(e) => setFormData({ ...formData, chess_interests: e.target.value })}
                placeholder="Aberturas favoritas, estilo de jogo, objetivos..."
                rows={3}
                className="bg-white/5 border-white/20 text-white"
              />
            </div>

            {/* Save Button */}
            <Button
              className="w-full bg-purple-600 hover:bg-purple-700"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>Salvando...</>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
