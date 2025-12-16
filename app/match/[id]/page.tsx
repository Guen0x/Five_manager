'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabaseClient'
import Link from 'next/link'
import { Trophy, Medal, Video, Users, Trash2, Crown, Link as LinkIcon, Share2, ArrowLeft, ClipboardList } from 'lucide-react'

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
    status: string
    invite_token: string
    date: string
    location: string
}
interface VideoItem {
  id: number
  url: string
  description: string
  added_by: string
}
interface LeaderboardEntry {
  playerId: string
  name: string
  score: number
  avatar?: string | null
  isGuest?: boolean
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

  // Données
  const [teamA, setTeamA] = useState<LineupEntry[]>([])
  const [teamB, setTeamB] = useState<LineupEntry[]>([])
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])

  // Inputs
  const [newVideoUrl, setNewVideoUrl] = useState('')
  const [newVideoDesc, setNewVideoDesc] = useState('')
  const [guestName, setGuestName] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user?.id || null))
    fetchAllData()
  }, [])

  async function fetchAllData() {
    setLoading(true)
    
    // 1. Infos Match
    const { data: matchData } = await supabase
      .from('matches')
      .select('id, created_by, status, invite_token, date, location')
      .eq('id', matchId)
      .single()
    
    setMatchInfo(matchData)

    // 2. Compo (Joueurs + Invités)
    const { data: lineupData } = await supabase
      .from('lineups')
      .select('id, user_id, guest_name, team, profile:profiles(*)')
      .eq('match_id', matchId)
    
    const lineup = (lineupData as any[]) || []
    setTeamA(lineup.filter(p => p.team === 'A'))
    setTeamB(lineup.filter(p => p.team === 'B'))

    // 3. Tous les joueurs (pour le selector)
    const { data: players } = await supabase.from('profiles').select('*')
    setAllPlayers(players as Player[] || [])

    // 4. Vidéos
    const { data: videoData } = await supabase
        .from('videos')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false })
    setVideos(videoData as VideoItem[] || [])

    // 5. RÉSULTATS (Calcul du classement INCLUANT les invités)
    const { data: votes } = await supabase.from('votes').select('target_id, rating').eq('match_id', matchId)
    
    // Calcul des scores bruts
    const scores: Record<string, number> = {}
    if (votes) {
        votes.forEach(v => {
            scores[v.target_id] = (scores[v.target_id] || 0) + v.rating
        })
    }

    // On construit le leaderboard en itérant sur la COMPO
    const fullLeaderboard = lineup.map(entry => {
        const isGuest = !entry.user_id
        // L'ID cible est soit l'UUID du user, soit "guest-{id_lineup}"
        const targetId = isGuest ? `guest-${entry.id}` : entry.user_id
        
        return {
            playerId: targetId,
            name: isGuest ? entry.guest_name : entry.profile?.username,
            avatar: isGuest ? null : entry.profile?.avatar_url,
            isGuest: isGuest,
            score: scores[targetId] || 0 // 0 par défaut
        }
    })

    // Tri : Score décroissant
    fullLeaderboard.sort((a, b) => b.score - a.score)
    setLeaderboard(fullLeaderboard)

    setLoading(false)
  }

  // --- ACTIONS ---

  const copyInviteLink = () => {
    if (!matchInfo?.invite_token) return
    const link = `${window.location.origin}/join/${matchInfo.invite_token}`
    navigator.clipboard.writeText(link)
    alert("Lien d'invitation copié ! 🔗\nEnvoie-le à tes potes.")
  }

  const copyVoteLink = () => {
    const link = `${window.location.origin}/vote/${matchId}`
    navigator.clipboard.writeText(link)
    alert("Lien de vote copié ! 🗳️\nEnvoie-le au groupe WhatsApp pour les invités.")
  }

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
      if (!confirm("⚠️ Supprimer définitivement ce match ?")) return
      await supabase.from('lineups').delete().eq('match_id', matchId)
      await supabase.from('votes').delete().eq('match_id', matchId)
      await supabase.from('videos').delete().eq('match_id', matchId)
      await supabase.from('matches').delete().eq('id', matchId)
      router.push('/')
  }

  async function movePlayer(userId: string, targetTeam: 'A' | 'B') {
    // Supprime l'ancienne position et ajoute la nouvelle
    await supabase.from('lineups').delete().eq('match_id', matchId).eq('user_id', userId)
    await supabase.from('lineups').insert({ match_id: Number(matchId), user_id: userId, team: targetTeam })
    fetchAllData()
  }

  async function removeEntry(lineupId: number) {
    if(!confirm("Retirer ce joueur ?")) return
    await supabase.from('lineups').delete().eq('id', lineupId)
    fetchAllData()
  }

  async function addVideo() {
    if (!newVideoUrl) return
    // Regex pour extraire l'ID Youtube
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = newVideoUrl.match(regExp)
    const embedId = (match && match[2].length === 11) ? match[2] : null
    const finalUrl = embedId ? `https://www.youtube.com/embed/${embedId}` : newVideoUrl

    await supabase.from('videos').insert({
        match_id: Number(matchId),
        url: finalUrl,
        description: newVideoDesc,
        added_by: currentUser
    })
    setNewVideoUrl('')
    setNewVideoDesc('')
    fetchAllData()
  }

  async function deleteVideo(videoId: number) {
      if(!confirm("Supprimer ?")) return
      await supabase.from('videos').delete().eq('id', videoId)
      fetchAllData()
  }

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-green-400">Chargement...</div>

  const isCreator = currentUser === matchInfo?.created_by

  return (
    <main className="min-h-screen bg-gray-900 p-4 text-white pb-20">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER NAVIGATION */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <Link href="/" className="text-gray-400 hover:text-white flex items-center gap-2 self-start md:self-auto">
                <ArrowLeft size={20} /> Accueil
            </Link>

            <div className="flex flex-wrap gap-2 justify-center">
                {/* 1. Inviter (Rejoindre la feuille de match) */}
                <button 
                    onClick={copyInviteLink}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg font-bold text-sm shadow-lg shadow-blue-900/20 flex items-center gap-2 transition"
                >
                    <LinkIcon size={16} /> Inviter
                </button>
                
                {/* 2. Voter (Pour moi) */}
                <Link 
                  href={`/vote/${matchId}`} 
                  className="bg-yellow-500 hover:bg-yellow-400 text-black px-3 py-2 rounded-lg font-bold text-sm shadow-lg shadow-yellow-500/20 flex items-center gap-2 transition"
                >
                  <Trophy size={16} /> Voter MVP
                </Link>

                {/* 3. Lien Vote (Pour les autres) */}
                <button 
                  onClick={copyVoteLink}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-lg font-bold text-sm shadow-lg shadow-purple-900/20 flex items-center gap-2 transition"
                >
                  <ClipboardList size={16} /> Lien Vote
                </button>

                {/* 4. Story (Partage Image) */}
                <Link 
                  href={`/match/${matchId}/share`}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg font-bold text-sm shadow-lg shadow-indigo-900/20 flex items-center gap-2 transition"
                >
                   <Share2 size={16} /> Story
                </Link>
            </div>
        </div>

        {/* INFO MATCH */}
        <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white capitalize">{matchInfo?.location}</h1>
            <p className="text-gray-400 text-sm">
                {matchInfo?.date && new Date(matchInfo.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour:'2-digit', minute:'2-digit' })}
            </p>
        </div>
        
        {/* TABS */}
        <div className="flex justify-center gap-2 mb-8 bg-gray-800 p-1 rounded-full w-fit mx-auto overflow-x-auto max-w-full no-scrollbar">
            <button onClick={() => setActiveTab('compo')} className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold transition whitespace-nowrap ${activeTab === 'compo' ? 'bg-green-500 text-black shadow-lg shadow-green-500/20' : 'text-gray-400 hover:text-white'}`}>
                <Users size={18} /> Compo
            </button>
            <button onClick={() => setActiveTab('results')} className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold transition whitespace-nowrap ${activeTab === 'results' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-gray-400 hover:text-white'}`}>
                <Trophy size={18} /> Résultats
            </button>
            <button onClick={() => setActiveTab('videos')} className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold transition whitespace-nowrap ${activeTab === 'videos' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-gray-400 hover:text-white'}`}>
                <Video size={18} /> Vidéos
            </button>
        </div>

        {/* --- ONGLET 1 : COMPO --- */}
        {activeTab === 'compo' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* ADMIN PANEL (Ajout Invités) */}
                {isCreator && (
                    <div className="bg-gray-800/50 border border-white/10 p-4 rounded-xl mb-8 flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="text-xs text-yellow-500 font-bold uppercase tracking-wider mb-2 block">Ajouter un Invité</label>
                            <input 
                                type="text" 
                                placeholder="Nom du joueur (ex: Alex)" 
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm focus:border-yellow-500 outline-none transition"
                                value={guestName}
                                onChange={(e) => setGuestName(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <button onClick={() => addGuest('A')} className="flex-1 bg-blue-600/20 text-blue-400 border border-blue-600/50 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-600 hover:text-white transition">+ Team A</button>
                            <button onClick={() => addGuest('B')} className="flex-1 bg-red-600/20 text-red-400 border border-red-600/50 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-red-600 hover:text-white transition">+ Team B</button>
                        </div>
                    </div>
                )}

                {/* TEAMS DISPLAY */}
                <div className="flex flex-col md:flex-row gap-6 mb-12">
                    {/* TEAM A */}
                    <div className="flex-1 bg-gray-800/40 rounded-2xl border border-blue-500/30 overflow-hidden">
                        <div className="bg-blue-600/20 p-4 border-b border-blue-500/30 flex justify-between items-center">
                            <h2 className="text-xl font-black text-blue-400 uppercase tracking-widest">Team A</h2>
                            <span className="bg-blue-500/20 text-blue-300 text-xs font-bold px-2 py-1 rounded">{teamA.length}</span>
                        </div>
                        <div className="p-4 space-y-2">
                            {teamA.map((entry) => (
                                <div key={entry.id} className="flex justify-between items-center bg-gray-900/50 p-3 rounded-lg border border-white/5 hover:border-blue-500/30 transition">
                                    <span className={!entry.user_id ? "text-yellow-400 font-medium italic" : "text-white font-bold"}>
                                        {entry.profile ? entry.profile.username : `${entry.guest_name} ★`}
                                    </span>
                                    {(isCreator || entry.user_id === currentUser) && (
                                        <button onClick={() => removeEntry(entry.id)} className="text-gray-500 hover:text-red-400 transition"><Trash2 size={16}/></button>
                                    )}
                                </div>
                            ))}
                            {teamA.length === 0 && <p className="text-center text-gray-500 text-sm italic py-4">Aucun joueur</p>}
                        </div>
                    </div>

                    {/* VS */}
                    <div className="flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-yellow-500 font-black text-xl shadow-xl z-10">VS</div>
                    </div>

                    {/* TEAM B */}
                    <div className="flex-1 bg-gray-800/40 rounded-2xl border border-red-500/30 overflow-hidden">
                        <div className="bg-red-600/20 p-4 border-b border-red-500/30 flex justify-between items-center">
                            <h2 className="text-xl font-black text-red-400 uppercase tracking-widest">Team B</h2>
                            <span className="bg-red-500/20 text-red-300 text-xs font-bold px-2 py-1 rounded">{teamB.length}</span>
                        </div>
                        <div className="p-4 space-y-2">
                            {teamB.map((entry) => (
                                <div key={entry.id} className="flex justify-between items-center bg-gray-900/50 p-3 rounded-lg border border-white/5 hover:border-red-500/30 transition">
                                    <span className={!entry.user_id ? "text-yellow-400 font-medium italic" : "text-white font-bold"}>
                                        {entry.profile ? entry.profile.username : `${entry.guest_name} ★`}
                                    </span>
                                    {(isCreator || entry.user_id === currentUser) && (
                                        <button onClick={() => removeEntry(entry.id)} className="text-gray-500 hover:text-red-400 transition"><Trash2 size={16}/></button>
                                    )}
                                </div>
                            ))}
                             {teamB.length === 0 && <p className="text-center text-gray-500 text-sm italic py-4">Aucun joueur</p>}
                        </div>
                    </div>
                </div>

                {/* SELECTOR (Pour ajouter des membres inscrits déjà existants dans la base) */}
                <div className="bg-gray-800/30 p-6 rounded-2xl border border-white/5">
                    <h3 className="font-bold mb-4 text-gray-400 text-xs uppercase tracking-widest">Joueurs inscrits (Membres)</h3>
                    <div className="flex flex-wrap gap-2">
                        {allPlayers.map(player => (
                            <div key={player.id} className="group bg-gray-900 hover:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-700 flex gap-3 items-center transition cursor-default">
                                <span className="text-sm font-medium text-gray-300 group-hover:text-white">{player.username}</span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => movePlayer(player.id, 'A')} className="w-6 h-6 rounded flex items-center justify-center bg-blue-600 text-[10px] font-bold hover:bg-blue-500">A</button>
                                    <button onClick={() => movePlayer(player.id, 'B')} className="w-6 h-6 rounded flex items-center justify-center bg-red-600 text-[10px] font-bold hover:bg-red-500">B</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {isCreator && (
                    <div className="mt-12 flex justify-center">
                        <button onClick={deleteMatch} className="flex items-center gap-2 text-red-500/50 hover:text-red-500 text-sm transition px-4 py-2 rounded hover:bg-red-500/10">
                            <Trash2 size={14} /> Supprimer le match
                        </button>
                    </div>
                )}
            </div>
        )}

        {/* --- ONGLET 2 : RESULTATS --- */}
        {activeTab === 'results' && (
            <div className="animate-in fade-in zoom-in duration-500 max-w-lg mx-auto">
                {leaderboard.length === 0 ? (
                    <div className="text-center py-20 bg-gray-800/30 rounded-2xl border border-dashed border-gray-700">
                        <Trophy size={48} className="mx-auto text-gray-600 mb-4" />
                        <p className="text-gray-400">Compo vide.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* PODIUM #1 (Si des votes existent) */}
                        {leaderboard[0].score > 0 ? (
                            <div className="relative bg-gradient-to-b from-yellow-500/20 to-yellow-900/10 p-6 rounded-2xl border border-yellow-500/30 text-center mb-8 shadow-2xl shadow-yellow-900/20">
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-500 text-black font-black px-4 py-1 rounded-full text-xs uppercase tracking-widest shadow-lg flex items-center gap-1">
                                    <Crown size={12} /> MVP
                                </div>
                                <Trophy size={64} className="mx-auto text-yellow-400 mb-4 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                                <h2 className="text-3xl font-black text-white mb-1">{leaderboard[0].name}</h2>
                                <p className="text-yellow-400 font-bold text-xl">{leaderboard[0].score} pts</p>
                            </div>
                        ) : (
                             <div className="text-center mb-8 bg-gray-800/40 p-4 rounded-xl border border-white/5">
                                <p className="text-gray-400 text-sm">Le match n'a pas encore commencé ou les votes sont en cours.</p>
                             </div>
                        )}

                        {/* LISTE COMPLÈTE */}
                        <div className="bg-gray-800/50 rounded-xl overflow-hidden border border-white/5">
                            {leaderboard.map((entry, index) => (
                                <div key={entry.playerId} className={`flex items-center justify-between p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition ${entry.isGuest ? 'opacity-75' : ''}`}>
                                    <div className="flex items-center gap-4">
                                        <span className={`font-mono font-bold w-6 text-center text-sm ${index < 3 && entry.score > 0 ? 'text-yellow-400' : 'text-gray-600'}`}>#{index + 1}</span>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-200">{entry.name}</span>
                                            {entry.isGuest && <span className="text-[10px] uppercase text-gray-500 border border-gray-700 px-1 rounded w-fit">Invité</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-400">{entry.score} pts</span>
                                        {index === 0 && entry.score > 0 && <Medal size={16} className="text-yellow-500" />}
                                        {index === 1 && entry.score > 0 && <Medal size={16} className="text-gray-400" />}
                                        {index === 2 && entry.score > 0 && <Medal size={16} className="text-orange-700" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* --- ONGLET 3 : VIDEOS --- */}
        {activeTab === 'videos' && (
            <div className="max-w-2xl mx-auto animate-in fade-in">
                <div className="bg-gray-800/50 p-6 rounded-2xl mb-8 border border-white/10">
                    <h3 className="font-bold mb-4 flex items-center gap-2">Ajouter un Highlight <Video size={18} className="text-red-500"/></h3>
                    <div className="space-y-3">
                        <input 
                            type="text" 
                            placeholder="Lien YouTube"
                            className="w-full bg-gray-900 p-3 rounded-lg border border-gray-700 text-white focus:border-red-500 outline-none"
                            value={newVideoUrl}
                            onChange={(e) => setNewVideoUrl(e.target.value)}
                        />
                        <input 
                            type="text" 
                            placeholder="Titre (ex: Lucarne de Mehdi)"
                            className="w-full bg-gray-900 p-3 rounded-lg border border-gray-700 text-white focus:border-red-500 outline-none"
                            value={newVideoDesc}
                            onChange={(e) => setNewVideoDesc(e.target.value)}
                        />
                        <button 
                            onClick={addVideo}
                            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg transition shadow-lg shadow-red-900/20"
                        >
                            Publier la vidéo
                        </button>
                    </div>
                </div>

                <div className="grid gap-8">
                    {videos.map((vid) => (
                        <div key={vid.id} className="bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
                            <div className="relative pt-[56.25%]">
                                <iframe 
                                    className="absolute top-0 left-0 w-full h-full"
                                    src={vid.url} 
                                    title="YouTube video player" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                    allowFullScreen
                                ></iframe>
                            </div>
                            <div className="p-4 flex justify-between items-center bg-gray-900">
                                <p className="font-bold text-white">{vid.description || "Highlight"}</p>
                                {currentUser === vid.added_by && (
                                    <button onClick={() => deleteVideo(vid.id)} className="text-red-500 hover:bg-red-500/10 p-2 rounded transition">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {videos.length === 0 && <p className="text-center text-gray-500 py-10">Pas encore de vidéos.</p>}
                </div>
            </div>
        )}

      </div>
    </main>
  )
}