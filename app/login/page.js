'use client'
import { useState, useEffect } from 'react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/utils/supabaseClient'
import Link from 'next/link'

export default function LoginPage() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  // Si connecté -> Message de bienvenue centré
  if (session) {
    return (
        <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
            <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl max-w-sm w-full">
                <h1 className="text-2xl font-bold text-white mb-2">Bon retour ! 👋</h1>
                <p className="text-gray-400 mb-6 text-sm">{session.user.email}</p>
                <div className="flex flex-col gap-3">
                    <Link href="/" className="bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg font-bold">Aller à l'accueil</Link>
                    <button onClick={() => supabase.auth.signOut()} className="text-red-500 hover:bg-red-900/10 py-2 rounded-lg text-sm">Se déconnecter</button>
                </div>
            </div>
        </div>
    )
  }

  // Si pas connecté -> Formulaire centré
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl">
        <h1 className="mb-2 text-center text-2xl font-bold text-white">Connexion</h1>
        <p className="mb-8 text-center text-gray-500 text-sm">Gère tes matchs de Five</p>
        
        <Auth
          supabaseClient={supabase}
          appearance={{ 
            theme: ThemeSupa,
            variables: {
                default: {
                    colors: {
                        brand: '#16a34a', // Vert
                        brandAccent: '#15803d',
                        inputBackground: '#000000',
                        inputText: 'white',
                        inputBorder: '#374151',
                    }
                }
            }
          }}
          theme="dark"
          providers={[]}
          localization={{
            variables: {
                sign_in: { email_label: 'Email', password_label: 'Mot de passe', button_label: 'Se connecter' },
                sign_up: { email_label: 'Email', password_label: 'Mot de passe', button_label: "S'inscrire" }
            }
          }}
        />
        <div className="mt-6 text-center">
            <Link href="/" className="text-gray-500 text-xs hover:text-white transition">← Retour site</Link>
        </div>
      </div>
    </div>
  )
}