'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabaseClient'
import Link from 'next/link'

// --- TYPES ---
interface Player {
  id: string
  username: string
  avatar_url: string | null
}
interface LineupEntry {
  id: number
  user_id: string | null
  guest_name: string | null
  team: 'A' | 'B'
  profile: Player | null
}
interface MatchInfo {
    id: number
    created_by: string
}
// Ajout du type Vidéo qui manquait
interface Video {
  id: number
  url: string
  description: string
  added_by: string
}

export default function MatchPage() {
  const params = useParams()
  const router = useRouter()
  const matchId = params.id as string

  // États
  const [activeTab, setActiveTab] = useState<'compo' | 'results' | 'videos'>('compo')
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null)

  // Données Compo
  const [teamA, setTeamA] = useState<LineupEntry[]>([])
  const [teamB, setTeamB] = useState<LineupEntry[]>([])
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  
  // Données Vidéos (Ajoutées)
  const [videos, setVideos] = useState<Video[]>([])
  const [newVideoUrl, setNewVideoUrl] = useState('')
  const [newVideoDesc, setNewVideoDesc] = useState('')

  // Input pour ajouter un invité
  const [guestName, setGuestName] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user?.id || null))
    fetchAllData()
  }, [])

  async function fetchAllData() {
    setLoading(true)
    
    // 1. Récupérer infos du match
    const { data: matchData } = await supabase.from('matches').select('id, created_by').eq('id', matchId).single()
    setMatchInfo(matchData)

    // 2. Charger la Compo
    const { data: lineupData } = await supabase
      .from('lineups')
      .select('id, user_id, guest_name, team, profile:profiles(*)')
      .eq('match_id', matchId)
    
    const lineup = (lineupData as any[]) || []
    setTeamA(lineup.filter(p => p.team === 'A'))
    setTeamB(lineup.filter(p => p.team === 'B'))

    // 3. Charger tous les joueurs
    const { data: players } = await supabase.from('profiles').select('*')
    setAllPlayers(players as Player[] || [])

    // 4. Charger les Vidéos (Ajouté)
    const { data: videoData } = await supabase
        .from('videos')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false })
    setVideos(videoData as Video[] || [])

    setLoading(false)
  }

  // --- ACTIONS DU CRÉATEUR (ADMIN) ---

  async function addGuest(team: 'A' | 'B') {
      if (!guestName.trim()) return alert("Mets un nom !")
      await supabase.from('lineups').insert({
          match_id: Number(matchId),
          team: team,
          guest_name: guestName,
          user_id: null
      })
      setGuestName('')
      fetchAllData()
  }

  async function deleteMatch() {
      if (!confirm("⚠️ Es-tu sûr de vouloir supprimer définitivement ce match ?")) return
      await supabase.from('lineups').delete().eq('match_id', matchId)
      await supabase.from('votes').delete().eq('match_id', matchId)
      await supabase.from('videos').delete().eq('match_id', matchId)
      const { error } = await supabase.from('matches').delete().eq('id', matchId)
      if (error) alert("Erreur suppression")
      else router.push('/')
  }

  // --- ACTIONS COMPO ---
  async function movePlayer(userId: string, targetTeam: 'A' | 'B') {
    await supabase.from('lineups').delete().eq('match_id', matchId).eq('user_id', userId)
    await supabase.from('lineups').insert({ match_id: Number(matchId), user_id: userId, team: targetTeam })
    fetchAllData()
  }

  async function removeEntry(lineupId: number) {
    await supabase.from('lineups').delete().eq('id', lineupId)
    fetchAllData()
  }

  // --- ACTIONS VIDÉOS (Restaurées) ---
  function getYoutubeEmbedId(url: string) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return (match && match[2].length === 11) ? match[2] : null
  }

  async function addVideo() {
    if (!newVideoUrl) return
    const embedId = getYoutubeEmbedId(newVideoUrl)
    const finalUrl = embedId ? `https://www.youtube.com/embed/${embedId}` : newVideoUrl

    const { error } = await supabase.from('videos').insert({
        match_id: Number(matchId),
        url: finalUrl,
        description: newVideoDesc,
        added_by: currentUser
    })

    if (error) alert("Erreur ajout vidéo")
    else {
        setNewVideoUrl('')
        setNewVideoDesc('')
        fetchAllData()
    }
  }

  async function deleteVideo(videoId: number) {
      if(!confirm("Supprimer cette vidéo ?")) return
      await supabase.from('videos').delete().eq('id', videoId)
      fetchAllData()
  }


  if (loading) return <div className="text-white p-10 text-center">Chargement...</div>

  const isCreator = currentUser === matchInfo?.created_by

  return (
    <main className="min-h-screen bg-gray-900 p-4 text-white pb-20">
      <Link href="/" className="text-gray-400 hover:text-white mb-4 block">← Retour</Link>
      
      {/* ONGLETS */}
      <div className="flex justify-center gap-2 mb-8">
        <button onClick={() => setActiveTab('compo')} className={`px-4 py-2 rounded-full font-bold ${activeTab === 'compo' ? 'bg-green-500 text-black' : 'bg-gray-800 text-gray-400'}`}>👕 Compo</button>
        <button onClick={() => setActiveTab('results')} className={`px-4 py-2 rounded-full font-bold ${activeTab === 'results' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400'}`}>🏆 Résultats</button>
        <button onClick={() => setActiveTab('videos')} className={`px-4 py-2 rounded-full font-bold ${activeTab === 'videos' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'}`}>🎥 Vidéos</button>
      </div>

      {/* --- ONGLET 1 : COMPO --- */}
      {activeTab === 'compo' && (
        <div className="animate-in fade-in">
           
           {/* SECTION ADMIN (Créateur uniquement) */}
           {isCreator && (
               <div className="bg-gray-800 border border-yellow-500/50 p-4 rounded-lg mb-6 flex flex-col sm:flex-row gap-2 items-center justify-between">
                   <div className="flex-1 w-full">
                       <label className="text-xs text-yellow-500 font-bold uppercase">Zone Admin</label>
                       <input 
                           type="text" 
                           placeholder="Nom du joueur invité (ex: Cousin de Sam)" 
                           className="w-full bg-gray-900 border border-gray-600 rounded p-2 mt-1 text-sm"
                           value={guestName}
                           onChange={(e) => setGuestName(e.target.value)}
                       />
                   </div>
                   <div className="flex gap-2 mt-4 sm:mt-0">
                       <button onClick={() => addGuest('A')} className="bg-blue-600 px-3 py-2 rounded text-sm font-bold hover:bg-blue-500">+ A</button>
                       <button onClick={() => addGuest('B')} className="bg-red-600 px-3 py-2 rounded text-sm font-bold hover:bg-red-500">+ B</button>
                   </div>
               </div>
           )}

           <div className="flex flex-col md:flex-row gap-4 mb-12">
            <div className="flex-1 bg-gray-800 rounded-lg border-t-4 border-blue-500 p-4">
              <h2 className="text-xl font-bold mb-4 text-center">🔵 Équipe A ({teamA.length})</h2>
              <div className="space-y-2">
                {teamA.map((entry) => (
                  <div key={entry.id} className="flex justify-between items-center bg-gray-700 p-2 rounded border border-gray-600">
                    <span className={!entry.user_id ? "text-yellow-400 italic" : "text-white"}>
                        {entry.profile ? entry.profile.username : `${entry.guest_name} (Invité)`}
                    </span>
                    {(isCreator || entry.user_id === currentUser) && (
                        <button onClick={() => removeEntry(entry.id)} className="text-red-400 px-2">✕</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center font-bold text-2xl text-yellow-500">VS</div>

            <div className="flex-1 bg-gray-800 rounded-lg border-t-4 border-red-500 p-4">
              <h2 className="text-xl font-bold mb-4 text-center">🔴 Équipe B ({teamB.length})</h2>
              <div className="space-y-2">
                {teamB.map((entry) => (
                  <div key={entry.id} className="flex justify-between items-center bg-gray-700 p-2 rounded border border-gray-600">
                    <span className={!entry.user_id ? "text-yellow-400 italic" : "text-white"}>
                        {entry.profile ? entry.profile.username : `${entry.guest_name} (Invité)`}
                    </span>
                    {(isCreator || entry.user_id === currentUser) && (
                        <button onClick={() => removeEntry(entry.id)} className="text-red-400 px-2">✕</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg mb-10">
             <h3 className="font-bold mb-2 text-gray-400 text-sm uppercase">Joueurs Inscrits</h3>
             <div className="flex flex-wrap gap-2">
                {allPlayers.map(player => (
                    <div key={player.id} className="bg-gray-700 px-3 py-1 rounded flex gap-2 items-center">
                        <span>{player.username}</span>
                        <div className="flex gap-1">
                            <button onClick={() => movePlayer(player.id, 'A')} className="text-xs bg-blue-600 px-2 rounded hover:bg-blue-500">A</button>
                            <button onClick={() => movePlayer(player.id, 'B')} className="text-xs bg-red-600 px-2 rounded hover:bg-red-500">B</button>
                        </div>
                    </div>
                ))}
             </div>
          </div>

          {isCreator && (
              <div className="mt-12 pt-8 border-t border-gray-800 text-center">
                  <button onClick={deleteMatch} className="text-red-500 text-sm hover:underline">
                    🗑️ Supprimer ce match
                  </button>
              </div>
          )}
        </div>
      )}

      {/* --- ONGLET 2 : RÉSULTATS --- */}
      {activeTab === 'results' && (
        <div className="text-center p-10"><p>Les résultats s'afficheront ici...</p></div>
      )}

      {/* --- ONGLET 3 : VIDÉOS (Restauré !) --- */}
      {activeTab === 'videos' && (
        <div className="max-w-3xl mx-auto animate-in fade-in">
            <div className="bg-gray-800 p-4 rounded-lg mb-8 border border-gray-700">
                <h3 className="font-bold mb-4">Ajouter un Highlight 🎥</h3>
                <div className="flex flex-col gap-3">
                    <input 
                        type="text" 
                        placeholder="Lien YouTube"
                        className="bg-gray-900 p-2 rounded border border-gray-600 text-white"
                        value={newVideoUrl}
                        onChange={(e) => setNewVideoUrl(e.target.value)}
                    />
                    <input 
                        type="text" 
                        placeholder="Description (ex: Petit pont de Mehdi)"
                        className="bg-gray-900 p-2 rounded border border-gray-600 text-white"
                        value={newVideoDesc}
                        onChange={(e) => setNewVideoDesc(e.target.value)}
                    />
                    <button 
                        onClick={addVideo}
                        className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded transition"
                    >
                        Publier
                    </button>
                </div>
            </div>

            <div className="grid gap-8">
                {videos.map((vid) => (
                    <div key={vid.id} className="bg-black rounded-xl overflow-hidden shadow-lg border border-gray-800">
                        <div className="relative pt-[56.25%]">
                            <iframe 
                                className="absolute top-0 left-0 w-full h-full"
                                src={vid.url} 
                                title="YouTube video player" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                            ></iframe>
                        </div>
                        <div className="p-4 flex justify-between items-start">
                            <p className="font-bold text-lg">{vid.description || "Sans titre"}</p>
                            {currentUser === vid.added_by && (
                                <button onClick={() => deleteVideo(vid.id)} className="text-xs text-red-500 hover:underline">
                                    Supprimer
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                {videos.length === 0 && <p className="text-center text-gray-500 mt-10">Aucune vidéo.</p>}
            </div>
        </div>
      )}
    </main>
  )
}