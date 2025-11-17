'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Crown } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [redirectUrl, setRedirectUrl] = useState('')

  useEffect(() => {
    // Define a URL de redirecionamento apenas no cliente
    setRedirectUrl(`${window.location.origin}/dashboard`)

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push('/dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#161512]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Crown className="w-12 h-12 text-[#d59120]" />
            <h1 className="text-5xl font-bold text-white">Xadrez Conecta</h1>
          </div>
          <p className="text-gray-400 text-lg">
            Jogue xadrez e faça amigos pelo mundo
          </p>
        </div>

        <div className="bg-[#2b2925] rounded-2xl p-8 shadow-2xl border border-[#3d3d3d]">
          {redirectUrl && (
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: '#a88865',
                      brandAccent: '#8b6f47',
                      defaultButtonBackground: '#a88865',
                      defaultButtonBackgroundHover: '#8b6f47',
                      inputBackground: '#3d3d3d',
                      inputBorder: '#4d4d4d',
                      inputBorderHover: '#a88865',
                      inputBorderFocus: '#d59120',
                      inputText: '#ffffff',
                      inputLabelText: '#d1d5db',
                      inputPlaceholder: '#9ca3af',
                    },
                  },
                },
                className: {
                  button: 'text-white font-semibold',
                  anchor: 'text-[#d59120] hover:text-[#a88865]',
                  input: 'text-white',
                  label: 'text-gray-300',
                },
              }}
              providers={['google', 'github']}
              redirectTo={redirectUrl}
              localization={{
                variables: {
                  sign_in: {
                    email_label: 'Email',
                    password_label: 'Senha',
                    button_label: 'Entrar',
                    loading_button_label: 'Entrando...',
                    social_provider_text: 'Entrar com {{provider}}',
                    link_text: 'Já tem uma conta? Entre',
                  },
                  sign_up: {
                    email_label: 'Email',
                    password_label: 'Senha',
                    button_label: 'Cadastrar',
                    loading_button_label: 'Cadastrando...',
                    social_provider_text: 'Cadastrar com {{provider}}',
                    link_text: 'Não tem conta? Cadastre-se',
                  },
                },
              }}
            />
          )}
        </div>

        <div className="mt-6 text-center text-gray-500 text-sm">
          <p>Ao entrar, você concorda com nossos Termos de Uso</p>
        </div>
      </div>
    </div>
  )
}
