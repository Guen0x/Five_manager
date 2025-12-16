'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/utils/supabaseClient'
import { Session } from '@supabase/supabase-js'
import { Calendar, MapPin, Trophy, LogOut, LogIn, Plus, User, Palette } from 'lucide-react'

// --- TYPES ---
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

  // --- EFFETS (Chargement session + matchs) ---
  useEffect(() => {
    // 1. Vérifier la session actuelle
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchMatches()
      else setLoading(false)
    })

    // 2. Écouter les changements de connexion
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchMatches()
      } else {
        setMatches([])
        setLoading(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // --- FONCTION RECUPERATION MATCHS ---
  async function fetchMatches() {
    setLoading(true)
    // Grâce au RLS (Sécurité), cette requête ne renvoie QUE :
    // - Les matchs que j'ai créés
    // - Les matchs où je suis invité
    const { data } = await supabase
      .from('matches')
      .select('*')
      .order('date', { ascending: true })
    
    setMatches(data as Match[] || [])
    setLoading(false)
  }

  // --- FORMATAGE DATE ---
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short', 
      hour: '2-digit', 
      minute:'2-digit' 
    })
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-900 p-4 text-white">
      
      {/* --- NAVBAR (Visible par tous) --- */}
      <nav className="w-full sticky top-0 z-50 border-b border-white/10 bg-gray-900/60 backdrop-blur-md mb-8">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-3xl group-hover:scale-110 transition">⚽</span>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
              Five Manager
            </h1>
          </Link>

          {/* Menu Droite */}
          <div className="flex gap-2 items-center">
             
             {/* ✅ BUILDER (Accessible SANS connexion) */}
             <Link 
               href="/builder" 
               className="text-sm font-medium text-gray-300 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition flex items-center gap-2"
             >
               <Palette size={18} className="text-purple-400" /> 
               <span className="hidden sm:inline">Builder</span>
             </Link>

             {/* Boutons selon état connexion */}
             {session ? (
                <div className="flex gap-2 border-l border-white/10 pl-2 ml-1">
                    <Link href="/profile" className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white px-3 py-2 rounded-lg text-sm font-bold transition">
                      <User size={16} /> <span className="hidden sm:inline">Profil</span>
                    </Link>
                    <button 
                      onClick={() => supabase.auth.signOut()} 
                      className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 bg-red-500/10 px-3 py-2 rounded-lg hover:bg-red-500/20 transition"
                      title="Se déconnecter"
                    >
                      <LogOut size={16} />
                    </button>
                </div>
             ) : (
                <Link href="/login" className="flex items-center gap-2 bg-green-600 px-4 py-2 rounded-lg font-bold hover:bg-green-500 transition shadow-lg shadow-green-900/20 ml-2">
                  <LogIn size={16} /> Connexion
                </Link>
             )}
          </div>
        </div>
      </nav>

      <div className="w-full max-w-5xl">
        
        {/* --- VUE NON CONNECTÉ (Hero) --- */}
        {!session ? (
          <div className="text-center mt-20 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="inline-block p-4 rounded-full bg-green-500/10 mb-4 ring-1 ring-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
              <Trophy size={64} className="text-green-400" />
            </div>
            
            <h2 className="text-5xl font-extrabold tracking-tight sm:text-6xl text-white">
              Organise tes matchs <br/> 
              <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">Comme un Pro</span>
            </h2>
            
            <p className="text-gray-400 text-xl max-w-2xl mx-auto leading-relaxed">
              Fini les galères sur WhatsApp. Vote pour le MVP, génère tes compos tactiques et garde l'historique de tes victoires.
            </p>
            
            <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login" className="inline-flex items-center justify-center gap-2 bg-green-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-green-500 transition hover:scale-105 shadow-xl shadow-green-900/20">
                <LogIn size={20} /> Créer mon compte
              </Link>
              <Link href="/builder" className="inline-flex items-center justify-center gap-2 bg-gray-800 border border-gray-700 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-700 transition hover:scale-105">
                <Palette size={20} className="text-purple-400" /> Tester le Builder
              </Link>
            </div>
          </div>
        ) : (
          
          /* --- VUE CONNECTÉ (Dashboard) --- */
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Dashboard */}
            <div className="flex justify-between items-end border-b border-white/10 pb-4">
                 <div>
                    <h2 className="text-3xl font-bold text-white flex items-center gap-2">
                      📅 Calendrier
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">Tes prochains matchs prévus</p>
                 </div>
                 <Link href="/match/create" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-bold transition shadow-lg shadow-blue-900/20 hover:scale-105">
                    <Plus size={18} /> Nouveau Match
                 </Link>
            </div>
            
            {/* Liste des matchs */}
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-green-500"></div>
              </div>
            ) : matches.length === 0 ? (
              <div className="text-center py-20 bg-gray-800/30 rounded-2xl border border-dashed border-gray-700">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">⚽</div>
                <p className="text-gray-300 font-bold text-lg">Aucun match visible.</p>
                <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
                  Tu n'as pas encore créé de match ou reçu d'invitation.
                </p>
                <Link href="/match/create" className="text-green-400 hover:text-green-300 font-bold hover:underline mt-4 inline-block">
                  Créer le premier maintenant ?
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                {matches.map((match) => (
                  <div key={match.id} className="group relative bg-gray-800/40 backdrop-blur-sm p-6 rounded-2xl border border-white/5 hover:border-green-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-green-900/10 hover:-translate-y-1">
                    {/* Icône décorative */}
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition">
                      <span className="text-7xl grayscale">⚽</span>
                    </div>
                    
                    {/* Info Match */}
                    <div className="flex items-start justify-between mb-6 relative z-10">
                        <div className="space-y-1">
                            <p className="flex items-center gap-2 text-green-400 font-bold text-xl capitalize">
                              <Calendar size={20} />
                              {formatDate(match.date)}
                            </p>
                            <p className="flex items-center gap-2 text-gray-400 text-sm">
                              <MapPin size={16} /> 
                              {match.location}
                            </p>
                        </div>
                    </div>
                    
                    {/* Boutons d'action */}
                    <div className="grid grid-cols-2 gap-3 mt-4 relative z-10">
                        <Link href={`/match/${match.id}`} className="flex justify-center items-center py-3 rounded-xl bg-gray-700/50 hover:bg-gray-700 text-sm font-bold transition border border-white/5 hover:border-white/20">
                          Voir détails
                        </Link>
                        <Link href={`/vote/${match.id}`} className="flex justify-center items-center gap-2 py-3 rounded-xl bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-black font-bold text-sm transition border border-yellow-500/20">
                          <Trophy size={16} />
                          MVP
                        </Link>
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