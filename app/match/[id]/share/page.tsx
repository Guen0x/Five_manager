'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/utils/supabaseClient'
import html2canvas from 'html2canvas'
import Link from 'next/link'
import { Download, ArrowLeft, Trophy, MapPin, Calendar } from 'lucide-react'

interface Match {
  id: number
  date: string
  location: string
  score_team_a: number
  score_team_b: number
}

interface Profile {
  username: string
  avatar_url: string | null
}

export default function SharePage() {
  const params = useParams()
  const matchId = params.id as string
  const storyRef = useRef<HTMLDivElement>(null)
  
  const [match, setMatch] = useState<Match | null>(null)
  const [mvp, setMvp] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    // 1. Récupérer le match
    const { data: matchData } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single()

    setMatch(matchData)

    // 2. Calculer le MVP (Moyenne des votes)
    const { data: votes } = await supabase
      .from('votes')
      .select('target_id, rating')
      .eq('match_id', matchId)

    if (votes && votes.length > 0) {
      // Grouper les votes par joueur
      const ratings: Record<string, number[]> = {}
      votes.forEach(vote => {
        if (!ratings[vote.target_id]) ratings[vote.target_id] = []
        ratings[vote.target_id].push(vote.rating)
      })

      // Calculer la moyenne
      let bestAvg = -1
      let mvpId = null

      Object.entries(ratings).forEach(([id, scores]) => {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length
        if (avg > bestAvg) {
            bestAvg = avg
            mvpId = id
        }
      })

      // Récupérer le profil du MVP
      if (mvpId) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', mvpId)
            .single()
        setMvp(profile)
      }
    }
    setLoading(false)
  }

  const downloadStory = async () => {
    if (!storyRef.current) return
    setIsDownloading(true)
    
    // Petite attente pour le rendu
    await new Promise(r => setTimeout(r, 100))

    try {
        const canvas = await html2canvas(storyRef.current, {
            scale: 2, // Meilleure qualité
            useCORS: true, // Important pour les images (avatar)
            backgroundColor: null, // Garde le dégradé CSS
        })

        const image = canvas.toDataURL("image/png")
        const link = document.createElement('a')
        link.href = image
        link.download = `match-${matchId}-story.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    } catch (err) {
        console.error(err)
        alert("Erreur lors du téléchargement")
    }
    setIsDownloading(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-green-400">Chargement...</div>
  if (!match) return <div className="min-h-screen flex items-center justify-center text-red-400">Match introuvable</div>

  const formatDate = (date: string) => new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })

  return (
    <main className="min-h-screen bg-black flex flex-col items-center p-4">
        
        {/* Header Navigation */}
        <div className="w-full max-w-md flex justify-between items-center mb-6">
            <Link href={`/match/${matchId}`} className="text-gray-400 hover:text-white flex items-center gap-2">
                <ArrowLeft size={20} /> Retour
            </Link>
            <h1 className="text-green-400 font-bold">Story Generator 📸</h1>
        </div>

        {/* --- ZONE À CAPTURER (Format Story 9:16) --- */}
        <div className="relative shadow-2xl overflow-hidden rounded-3xl mb-8 border border-gray-800"
             style={{ width: '360px', height: '640px' }} // Format fixe pour la capture
        >
            <div ref={storyRef} className="w-full h-full relative flex flex-col items-center text-center p-8 bg-gray-900">
                
                {/* FOND : Dégradé et Effets */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-800 via-gray-900 to-black z-0"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 z-0"></div>
                
                {/* CONTENU */}
                <div className="relative z-10 w-full flex flex-col h-full">
                    
                    {/* EN-TÊTE MATCH */}
                    <div className="mt-8 mb-6">
                        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 text-sm mb-4">
                            <Calendar size={14} /> {formatDate(match.date)}
                        </div>
                        <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">
                            Résultat <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">Final</span>
                        </h2>
                        <div className="flex justify-center items-center gap-2 text-gray-400 text-sm mt-2">
                            <MapPin size={14} /> {match.location}
                        </div>
                    </div>

                    {/* SCORE */}
                    <div className="flex justify-center items-center gap-6 my-4">
                        <div className="text-7xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                            {match.score_team_a}
                        </div>
                        <div className="h-16 w-1 bg-gray-700 rounded-full"></div>
                        <div className="text-7xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                            {match.score_team_b}
                        </div>
                    </div>

                    {/* LIGNE DE SÉPARATION */}
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent my-8"></div>

                    {/* SECTION MVP */}
                    {mvp ? (
                        <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-700">
                            <div className="relative">
                                <Trophy size={40} className="absolute -top-6 -right-6 text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)] rotate-12" />
                                <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-yellow-400 via-orange-500 to-red-500 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
                                    <img 
                                        src={mvp.avatar_url || "https://i.pravatar.cc/150?u=default"} 
                                        alt="MVP"
                                        crossOrigin="anonymous" // Important pour html2canvas
                                        className="w-full h-full rounded-full object-cover border-4 border-gray-900 bg-gray-800"
                                    />
                                </div>
                            </div>
                            <div className="mt-4 bg-gray-800/80 backdrop-blur px-6 py-2 rounded-xl border border-yellow-500/30">
                                <span className="block text-yellow-500 text-xs font-bold uppercase tracking-widest mb-1">Homme du match</span>
                                <span className="text-2xl font-bold text-white">{mvp.username}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                            <p>MVP non défini</p>
                            <p className="text-xs">Votez pour le voir apparaître !</p>
                        </div>
                    )}

                    {/* FOOTER */}
                    <div className="mt-auto mb-6 opacity-60">
                         <p className="text-xs font-mono text-green-400">Generated by Five Manager</p>
                    </div>

                </div>
            </div>
        </div>

        {/* BOUTON D'ACTION */}
        <button 
            onClick={downloadStory}
            disabled={isDownloading}
            className="w-full max-w-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/40 flex items-center justify-center gap-3 transition transform hover:scale-105"
        >
            {isDownloading ? (
                <>⏳ Génération...</>
            ) : (
                <>
                    <Download size={20} /> Télécharger la Story
                </>
            )}
        </button>
        <p className="text-gray-500 text-xs mt-4 max-w-xs text-center">
            Astuce : Enregistre l'image et poste-la sur Instagram en ajoutant de la musique ! 🎵
        </p>

    </main>
  )
}