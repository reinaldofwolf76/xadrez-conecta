'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session) {
      router.push('/dashboard')
    } else {
      router.push('/login')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#161512]">
      <div className="text-center">
        <Loader2 className="w-16 h-16 text-[#d59120] animate-spin mx-auto mb-4" />
        <p className="text-gray-300 text-xl">Carregando...</p>
      </div>
    </div>
  )
}
