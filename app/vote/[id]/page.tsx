'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabaseClient'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import Link from 'next/link'

interface Player {
  id: string
  username: string
  avatar_url: string | null
}

export default function VotePage() {
  const params = useParams()
  const router = useRouter()
  const matchId = params.id as string

  const [players, setPlayers] = useState<Player[]>([])
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isBrowser, setIsBrowser] = useState(false) 

  useEffect(() => {
    setIsBrowser(true)
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user?.id || null)
    })
    fetchLineup()
  }, [])

  async function fetchLineup() {
    const { data, error } = await supabase
      .from('lineups')
      .select('profile:profiles(id, username, avatar_url)')
      .eq('match_id', matchId)

    if (error) console.error(error)
    
    // CORRECTION ICI :
    // On mappe les profils, mais on FILTRE ceux qui sont "null" (les invités)
    // On retire aussi l'utilisateur actuel (on ne vote pas pour soi)
    let playerList = data
        ?.map((entry: any) => entry.profile) // Récupère le profil
        .filter((p: any) => p !== null)      // Retire les Invités (qui sont null)
        || []
    
    // Décommente cette ligne si tu veux t'empêcher de voter pour toi-même
    // playerList = playerList.filter((p: Player) => p.id !== currentUser)

    setPlayers(playerList)
    setLoading(false)
  }

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(players)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setPlayers(items)
  }

  async function submitVotes() {
    if (!currentUser) return alert("Tu dois être connecté")
    
    // Conversion du classement en points
    const votesToInsert = players.map((player, index) => {
        let points = 10 - index 
        if (points < 1) points = 1 

        return {
            match_id: Number(matchId),
            voter_id: currentUser,
            target_id: player.id,
            rating: points 
        }
    })

    if (votesToInsert.length === 0) return alert("Aucun joueur à noter.")

    const { error } = await supabase.from('votes').insert(votesToInsert)

    if (error) {
      alert("Erreur (as-tu déjà voté ?)")
      console.error(error)
    } else {
      alert("Classement validé ! 🥇")
      router.push(`/match/${matchId}`) // Retour au match pour voir les résultats
    }
  }

  if (loading || !isBrowser) return <div className="text-white p-10 text-center">Chargement...</div>

  return (
    <main className="min-h-screen bg-gray-900 p-4 text-white flex flex-col items-center">
      <Link href={`/match/${matchId}`} className="self-start text-gray-400 mb-6">← Retour au match</Link>
      
      <h1 className="text-3xl font-bold text-yellow-400 mb-2">Top 10 du Match 🏆</h1>
      <p className="text-gray-400 mb-6">Glisse les joueurs pour faire ton classement.</p>

      <div className="w-full max-w-md">
        {players.length === 0 ? (
            <div className="text-center bg-gray-800 p-6 rounded text-gray-400">
                <p>Aucun joueur inscrit n'est présent sur la feuille de match.</p>
                <p className="text-xs mt-2">(Les invités ne peuvent pas être notés)</p>
            </div>
        ) : (
            <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="players-list">
                {(provided) => (
                <div 
                    {...provided.droppableProps} 
                    ref={provided.innerRef}
                    className="space-y-3"
                >
                    {players.map((player, index) => (
                    <Draggable key={player.id} draggableId={player.id} index={index}>
                        {(provided, snapshot) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{ ...provided.draggableProps.style }}
                            className={`p-4 rounded-lg flex items-center justify-between border select-none
                                ${snapshot.isDragging ? 'bg-blue-600 border-blue-400 shadow-xl scale-105' : 'bg-gray-800 border-gray-700'}
                            `}
                        >
                            <div className="flex items-center gap-4">
                                <span className={`font-bold text-xl w-8 h-8 flex items-center justify-center rounded-full 
                                    ${index === 0 ? 'bg-yellow-500 text-black' : 
                                    index === 1 ? 'bg-gray-400 text-black' : 
                                    index === 2 ? 'bg-orange-700 text-white' : 'bg-gray-700 text-gray-400'}
                                `}>
                                    {index + 1}
                                </span>
                                
                                <span className="font-bold text-lg">{player.username}</span>
                            </div>

                            <span className="text-gray-500 text-2xl">☰</span>
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
            disabled={players.length === 0}
            className="w-full bg-green-600 text-white font-bold py-4 rounded-lg hover:bg-green-500 transition mt-8 disabled:opacity-50"
        >
            Valider mon Top 10 ✅
        </button>
      </div>
    </main>
  )
}