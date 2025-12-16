'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabaseClient'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import Link from 'next/link'
import { ArrowLeft, Trophy, GripVertical, CheckCircle, AlertTriangle } from 'lucide-react'

// Types
interface Candidate {
  id: string // UUID user ou "guest-123"
  name: string
  isGuest: boolean
}

export default function VotePage() {
  const params = useParams()
  const router = useRouter()
  const matchId = params.id as string

  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [voterId, setVoterId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasVoted, setHasVoted] = useState(false)

  useEffect(() => {
    identifyVoter()
    fetchLineup()
  }, [])

  // --- 1. IDENTIFICATION DU VOTEUR ---
  async function identifyVoter() {
    // A. Est-ce un membre connecté ?
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
        setVoterId(user.id)
        checkIfAlreadyVoted(user.id)
    } else {
        // B. C'est un invité : on regarde dans son navigateur
        let guestId = localStorage.getItem('five_guest_id')
        
        // Si pas d'ID, on en crée un nouveau unique
        if (!guestId) {
            guestId = `anon-${Math.random().toString(36).substr(2, 9)}`
            localStorage.setItem('five_guest_id', guestId)
        }
        setVoterId(guestId)
        checkIfAlreadyVoted(guestId)
    }
  }

  // --- 2. VÉRIFICATION DOUBLE VOTE ---
  async function checkIfAlreadyVoted(id: string) {
      const { data } = await supabase
        .from('votes')
        .select('id')
        .eq('match_id', matchId)
        .eq('voter_id', id)
        .limit(1)
      
      if (data && data.length > 0) {
          setHasVoted(true)
      }
  }

  // --- 3. RÉCUPÉRATION DES JOUEURS ---
  async function fetchLineup() {
    const { data, error } = await supabase
      .from('lineups')
      .select('id, guest_name, profile:profiles(id, username)')
      .eq('match_id', matchId)

    if (error) console.error(error)
    const rawList = data || []
    
    const formattedList: Candidate[] = rawList.map((entry: any) => {
        if (entry.profile) {
            return { id: entry.profile.id, name: entry.profile.username, isGuest: false }
        } else {
            return { id: `guest-${entry.id}`, name: entry.guest_name || "Invité", isGuest: true }
        }
    })
    setCandidates(formattedList)
    setLoading(false)
  }

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const items = Array.from(candidates)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)
    setCandidates(items)
  }

  // --- 4. ENVOI DES VOTES ---
  async function submitVotes() {
    if (!voterId) return
    if (hasVoted) return alert("Tu as déjà voté !")

    const votesToInsert: any[] = []
    
    candidates.forEach((candidate, index) => {
        let points = 10 - index 
        if (points < 1) points = 1 

        votesToInsert.push({
            match_id: Number(matchId),
            voter_id: voterId, // L'ID (User ou Invité)
            target_id: candidate.id,
            rating: points 
        })
    })

    const { error } = await supabase.from('votes').insert(votesToInsert)

    if (error) {
      // Code erreur 23505 = Violated Unique Constraint (Double vote)
      if (error.code === '23505') {
          setHasVoted(true)
          alert("Petit malin ! Tu as déjà voté pour ce match 😉")
      } else {
          console.error(error)
          alert("Erreur lors du vote.")
      }
    } else {
      setHasVoted(true)
      // On redirige vers les résultats
      router.push(`/match/${matchId}`)
    }
  }

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Chargement...</div>

  // --- ÉCRAN SI DÉJÀ VOTÉ ---
  if (hasVoted) return (
      <main className="min-h-screen bg-gray-900 p-4 flex flex-col items-center justify-center text-white">
          <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 text-center max-w-sm">
              <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Vote Enregistré !</h1>
              <p className="text-gray-400 mb-6">Merci pour ta participation.</p>
              <Link href={`/match/${matchId}`} className="block w-full bg-gray-700 hover:bg-gray-600 py-3 rounded-xl font-bold transition">
                  Voir les résultats
              </Link>
          </div>
      </main>
  )

  // --- ÉCRAN DE VOTE ---
  return (
    <main className="min-h-screen p-4 flex flex-col items-center bg-gray-900 text-white">
      <div className="w-full max-w-md">
        <Link href={`/match/${matchId}`} className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition">
            <ArrowLeft size={16} className="mr-2"/> Retour au match
        </Link>
        
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text text-transparent mb-2 inline-flex items-center gap-2">
               <Trophy className="text-yellow-500" /> Top 10 MVP
            </h1>
            <p className="text-gray-400 text-sm">Classe les joueurs du meilleur au moins bon.</p>
            {!loading && voterId && voterId.startsWith('anon-') && (
                <span className="inline-block mt-2 px-2 py-1 bg-gray-800 rounded text-[10px] text-gray-500 uppercase tracking-widest border border-gray-700">
                    Mode Invité
                </span>
            )}
        </div>

        {candidates.length === 0 ? (
            <div className="text-center bg-gray-800/50 border border-dashed border-gray-700 p-8 rounded-xl text-gray-400">
                <p>Pas de joueurs sur la feuille de match.</p>
            </div>
        ) : (
            <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="players-list">
                {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                    {candidates.map((player, index) => (
                    <Draggable key={player.id} draggableId={player.id} index={index}>
                        {(provided, snapshot) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{ ...provided.draggableProps.style }}
                            className={`
                                relative p-4 rounded-xl flex items-center justify-between border transition-all duration-200 select-none
                                ${snapshot.isDragging 
                                    ? 'bg-blue-600/90 border-blue-400 shadow-[0_0_30px_rgba(37,99,235,0.4)] z-50 scale-105' 
                                    : 'bg-gray-800/40 backdrop-blur-sm border-white/5 hover:bg-gray-800/60 hover:border-white/10'
                                }
                            `}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`
                                    w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg
                                    ${index === 0 ? 'bg-yellow-400 text-black shadow-yellow-400/20' : 
                                      index === 1 ? 'bg-gray-300 text-black' : 
                                      index === 2 ? 'bg-orange-400 text-black' : 'bg-gray-700/50 text-gray-400'}
                                `}>
                                    {index + 1}
                                </div>
                                <span className={`font-bold text-lg ${player.isGuest ? 'text-gray-400 italic' : 'text-white'}`}>
                                    {player.name}
                                </span>
                            </div>
                            <GripVertical className="text-gray-600" />
                        </div>
                        )}
                    </Draggable>
                    ))}
                    {provided.placeholder}
                </div>
                )}
            </Droppable>
            </DragDropContext>
        )}

        <button 
            onClick={submitVotes}
            disabled={candidates.length === 0}
            className="w-full mt-8 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-900/20 hover:scale-[1.02] hover:shadow-green-900/40 transition flex justify-center items-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
        >
            <CheckCircle size={20} /> Valider le classement
        </button>
      </div>
    </main>
  )
}