'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabaseClient'
import Link from 'next/link'
import { Calendar, MapPin, ArrowRight, CheckCircle } from 'lucide-react'

export default function JoinPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [match, setMatch] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    checkUserAndMatch()
  }, [])

  async function checkUserAndMatch() {
    // 1. Qui suis-je ?
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    // 2. Chercher le match via le TOKEN (grâce à notre fonction SQL sécurisée)
    const { data, error } = await supabase.rpc('get_match_by_token', { token: token })

    if (data && data.length > 0) {
        setMatch(data[0])
    } else {
        console.error("Match introuvable ou token invalide")
    }
    setLoading(false)
  }

  async function joinMatch() {
    if (!user) {
        // Rediriger vers login avec retour ici après
        router.push(`/login?next=/join/${token}`)
        return
    }
    
    setJoining(true)

    // 1. Vérifier si on est déjà dedans pour éviter les doublons
    const { data: existing } = await supabase
        .from('lineups')
        .select('id')
        .eq('match_id', match.id)
        .eq('user_id', user.id)
        .single()

    if (existing) {
        router.push(`/match/${match.id}`)
        return
    }

    // 2. Ajouter le joueur dans l'équipe A par défaut (il pourra changer après)
    const { error } = await supabase.from('lineups').insert({
        match_id: match.id,
        user_id: user.id,
        team: 'A' 
    })

    if (error) {
        alert("Erreur lors de l'inscription")
        console.error(error)
        setJoining(false)
    } else {
        // Succès ! Maintenant qu'il est dans la lineup, la RLS le laissera voir la page du match
        router.push(`/match/${match.id}`)
    }
  }

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Chargement...</div>

  if (!match) return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-4">
        <h1 className="text-2xl font-bold text-red-500 mb-2">Invitation Invalide 🚫</h1>
        <p className="text-gray-400">Ce lien ne fonctionne plus ou le match a été supprimé.</p>
        <Link href="/" className="mt-6 bg-gray-800 px-4 py-2 rounded text-sm">Retour Accueil</Link>
    </div>
  )

  const dateFormatted = new Date(match.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' })

  return (
    <main className="min-h-screen bg-gray-900 p-4 text-white flex flex-col items-center justify-center">
        <div className="w-full max-w-md bg-gray-800 border border-gray-700 p-8 rounded-2xl shadow-2xl text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
                ✉️
            </div>
            
            <h1 className="text-2xl font-bold mb-2">Tu es invité à un Five ! ⚽</h1>
            <p className="text-gray-400 text-sm mb-8">Rejoins la feuille de match pour participer.</p>

            <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 mb-8 space-y-3 text-left">
                <div className="flex items-center gap-3 text-green-400">
                    <Calendar size={20} />
                    <span className="font-bold capitalize">{dateFormatted}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                    <MapPin size={20} />
                    <span>{match.location}</span>
                </div>
            </div>

            <button 
                onClick={joinMatch}
                disabled={joining}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 transition transform hover:scale-[1.02]"
            >
                {joining ? 'Inscription...' : <>{user ? 'Accepter l\'invitation' : 'Se connecter pour rejoindre'} <ArrowRight size={20} /></>}
            </button>
        </div>
    </main>
  )
}