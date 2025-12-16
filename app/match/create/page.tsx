'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabaseClient'
import Link from 'next/link'

export default function CreateMatchPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // États du formulaire
  const [date, setDate] = useState('')
  const [time, setTime] = useState('20:00') // Heure standard Five
  const [location, setLocation] = useState('UrbanSoccer')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    // 1. Récupérer l'utilisateur connecté (le futur Admin du match)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      alert("Tu dois être connecté pour créer un match !")
      setLoading(false)
      return
    }

    // 2. Créer la date complète
    const fullDate = new Date(`${date}T${time}:00`)

    // 3. Envoyer à Supabase
    const { error } = await supabase.from('matches').insert({
      date: fullDate.toISOString(),
      location: location,
      status: 'scheduled',
      score_team_a: 0,
      score_team_b: 0,
      created_by: user.id // C'est ici qu'on te définit comme le chef du match !
    })

    if (error) {
      console.error(error)
      alert("Erreur lors de la création du match.")
    } else {
      // 4. Redirection vers l'accueil après succès
      router.push('/')
      router.refresh() 
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-900 p-4 text-white flex flex-col items-center justify-center">
      <div className="w-full max-w-md bg-gray-800 p-8 rounded-lg border border-gray-700 shadow-xl">
        <h1 className="text-2xl font-bold text-green-400 mb-6 text-center">Organiser un Five ⚽</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* DATE */}
            <div>
                <label className="block text-sm text-gray-400 mb-1">Date du match</label>
                <input 
                    type="date" 
                    required
                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:border-green-500 outline-none"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                />
            </div>

            {/* HEURE */}
            <div>
                <label className="block text-sm text-gray-400 mb-1">Heure</label>
                <input 
                    type="time" 
                    required
                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:border-green-500 outline-none"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                />
            </div>

            {/* LIEU */}
            <div>
                <label className="block text-sm text-gray-400 mb-1">Lieu (Urban, Le Five...)</label>
                <input 
                    type="text" 
                    required
                    placeholder="Ex: UrbanSoccer, Stade municipal..."
                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:border-green-500 outline-none"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                />
            </div>

            {/* BOUTONS */}
            <div className="pt-4 flex gap-3">
                <Link 
                    href="/"
                    className="flex-1 py-3 text-center rounded bg-gray-700 hover:bg-gray-600 transition"
                >
                    Annuler
                </Link>
                <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 rounded bg-green-600 hover:bg-green-500 font-bold transition disabled:opacity-50"
                >
                    {loading ? 'Création...' : 'Valider ✅'}
                </button>
            </div>

        </form>
      </div>
    </main>
  )
}