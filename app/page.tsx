'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/utils/supabaseClient'
import { Session } from '@supabase/supabase-js'

interface Match {
  id: number
  date: string
  location: string
  score_team_a: number
  score_team_b: number
  status: string
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null)
  const [matches, setMatches] = useState<Match[]>([]) 
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchMatches()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchMatches()
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchMatches() {
    setLoading(true)
    const { data } = await supabase.from('matches').select('*').order('date', { ascending: true })
    setMatches(data as Match[] || [])
    setLoading(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' })
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-900 p-4 text-white">
      <div className="w-full max-w-4xl">
        <div className="flex items-center justify-between border-b border-gray-700 pb-4 mb-8">
          <h1 className="text-3xl font-bold text-green-400">⚽ Five Manager</h1>
          <div className="flex gap-4">
             <Link href="/builder" className="text-sm bg-gray-700 px-3 py-2 rounded hover:bg-gray-600">🎨 Builder</Link>
             {session ? (
                <button onClick={() => supabase.auth.signOut()} className="text-sm text-red-400 hover:text-red-300">Déconnexion</button>
             ) : (
                <Link href="/login" className="bg-green-600 px-4 py-2 rounded font-bold hover:bg-green-500">Connexion</Link>
             )}
          </div>
        </div>

        {!session ? (
          <div className="text-center mt-20">
            <h2 className="text-2xl font-bold">Bienvenue sur l'appli du Five !</h2>
            <p className="text-gray-400 mt-2 mb-8">Connecte-toi pour gérer les matchs et voter.</p>
            <Link href="/login" className="bg-blue-600 px-6 py-3 rounded-lg font-bold text-lg hover:bg-blue-500">Se connecter</Link>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-bold text-yellow-400">📅 Calendrier</h2>
                 <Link href="/match/create" className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded text-sm transition font-bold">+ Nouveau Match</Link>
            </div>
            
            {loading ? <p>Chargement...</p> : matches.length === 0 ? <p>Aucun match.</p> : (
              <div className="grid gap-4">
                {matches.map((match) => (
                  <div key={match.id} className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-green-400 font-bold text-lg capitalize">{formatDate(match.date)}</p>
                            <p className="text-gray-300">📍 {match.location}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Link href={`/match/${match.id}`} className="flex-1 bg-gray-700 text-center py-2 rounded hover:bg-gray-600">Voir Match</Link>
                        <Link href={`/vote/${match.id}`} className="flex-1 bg-yellow-600 text-center py-2 rounded text-black font-bold hover:bg-yellow-500">Voter MVP</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}