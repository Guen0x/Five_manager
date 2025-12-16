'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabaseClient'
import Link from 'next/link'
import { ArrowLeft, Save, DownloadCloud, Loader2, Users, Video } from 'lucide-react'

export default function CreateMatch() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  
  // Champs Formulaire
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [fiveUrl, setFiveUrl] = useState('')
  
  // Données Importées
  const [detectedVideo, setDetectedVideo] = useState('')
  const [detectedPlayers, setDetectedPlayers] = useState<string[]>([])
  
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login')
      else setCurrentUser(data.user.id)
    })
  }, [])

  // --- IMPORTATION ---
  async function importFromFive() {
    if (!fiveUrl) return alert("Colle d'abord l'URL !")
    setImporting(true)
    setDetectedPlayers([])
    setDetectedVideo('')

    try {
        const res = await fetch('/api/scrape', {
            method: 'POST',
            body: JSON.stringify({ url: fiveUrl })
        })
        const json = await res.json()

        if (json.success) {
            if (json.data.location) setLocation(json.data.location)
            if (json.data.video_url) setDetectedVideo(json.data.video_url)
            if (json.data.players && Array.isArray(json.data.players)) {
                setDetectedPlayers(json.data.players)
            }
            
            // Date par défaut (Aujourd'hui 20h)
            const today = new Date().toISOString().split('T')[0]
            setDate(today)
            setTime("20:00")
            
            alert(`Succès ! \n📍 Lieu trouvé\n📹 Vidéo: ${json.data.video_url ? 'Oui' : 'Non'}\n👥 Joueurs: ${json.data.players.length}`)
        } else {
            alert("Erreur: " + json.error)
        }
    } catch (e) {
        alert("Erreur de connexion serveur.")
    }
    setImporting(false)
  }

  // --- CRÉATION FINALE ---
  async function createMatch() {
    if (!date || !time || !location) return alert("Remplis la date, l'heure et le lieu !")
    if (!currentUser) return
    setLoading(true)

    // 1. Créer le Match
    const fullDate = new Date(`${date}T${time}:00`).toISOString()
    
    const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .insert({
            date: fullDate,
            location: location,
            created_by: currentUser,
            status: 'scheduled'
        })
        .select()
        .single()

    if (matchError || !matchData) {
        console.error(matchError)
        alert("Erreur lors de la création du match.")
        setLoading(false)
        return
    }

    const newMatchId = matchData.id

    // 2. Ajouter la Vidéo (si détectée)
    if (detectedVideo) {
        await supabase.from('videos').insert({
            match_id: newMatchId,
            url: detectedVideo,
            description: 'Match Complet (Importé)',
            added_by: currentUser
        })
    }

    // 3. Ajouter les Joueurs (si détectés)
    if (detectedPlayers.length > 0) {
        // On divise les joueurs en 2 équipes arbitrairement (les 5 premiers en A, le reste en B)
        const lineupInserts = detectedPlayers.map((name, index) => ({
            match_id: newMatchId,
            team: index < 5 ? 'A' : 'B', // Répartition auto
            guest_name: name,
            user_id: null // Ce sont des invités car on ne connait pas leur compte Five Manager
        }))

        const { error: lineupError } = await supabase.from('lineups').insert(lineupInserts)
        if (lineupError) console.error("Erreur ajout joueurs:", lineupError)
    }

    // Terminé
    router.push(`/match/${newMatchId}`)
  }

  return (
    <main className="min-h-screen bg-gray-900 p-4 text-white flex flex-col items-center justify-center">
      <div className="w-full max-w-md bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-xl">
        
        <Link href="/" className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition">
            <ArrowLeft size={16} className="mr-2"/> Annuler
        </Link>

        <h1 className="text-2xl font-bold mb-6 text-center">Nouveau Match ⚽</h1>

        {/* SECTION IMPORT */}
        <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 p-5 rounded-xl border border-blue-500/30 mb-8">
            <label className="block text-xs font-bold text-blue-400 uppercase mb-2">Importer depuis LeFive.fr</label>
            <div className="flex gap-2 mb-3">
                <input 
                    type="text" 
                    placeholder="Lien du match (Doit être PUBLIC)"
                    value={fiveUrl}
                    onChange={(e) => setFiveUrl(e.target.value)}
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
                />
                <button 
                    onClick={importFromFive}
                    disabled={importing}
                    className="bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-lg text-white disabled:opacity-50 transition shadow-lg"
                >
                    {importing ? <Loader2 size={18} className="animate-spin"/> : <DownloadCloud size={18} />}
                </button>
            </div>
            
            {/* Résumé de l'import */}
            {(detectedVideo || detectedPlayers.length > 0) && (
                <div className="bg-black/20 p-3 rounded-lg text-sm space-y-1">
                    {detectedVideo && <p className="text-green-400 flex items-center gap-2"><Video size={14}/> Vidéo trouvée !</p>}
                    {detectedPlayers.length > 0 && <p className="text-green-400 flex items-center gap-2"><Users size={14}/> {detectedPlayers.length} joueurs trouvés</p>}
                    {detectedPlayers.length > 0 && (
                        <p className="text-xs text-gray-500 pl-6 italic truncate">{detectedPlayers.join(', ')}</p>
                    )}
                </div>
            )}
        </div>

        <div className="space-y-4 border-t border-gray-700 pt-6">
            <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Date</label>
                <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-xl py-3 px-4 focus:border-green-500 outline-none [color-scheme:dark]"
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Heure</label>
                <input 
                    type="time" 
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-xl py-3 px-4 focus:border-green-500 outline-none [color-scheme:dark]"
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Lieu</label>
                <input 
                    type="text" 
                    placeholder="Ex: Le Five Marville"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-xl py-3 px-4 focus:border-green-500 outline-none"
                />
            </div>

            <button 
                onClick={createMatch}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-900/20 mt-4 flex items-center justify-center gap-2 transition transform hover:scale-[1.02]"
            >
                {loading ? 'Création...' : <><Save size={20} /> Créer le Match</>}
            </button>
        </div>

      </div>
    </main>
  )
}