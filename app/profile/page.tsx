'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabaseClient'
import { User, Save, UserCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  
  // Champs du profil
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    getProfile()
  }, [])

  async function getProfile() {
    // 1. Récupérer l'user connecté
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)

    // 2. Récupérer son profil existant
    const { data, error } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', user.id)
      .single()

    if (data) {
        setUsername(data.username || '')
        setAvatarUrl(data.avatar_url || '')
    }
    setLoading(false)
  }

  async function updateProfile() {
    setSaving(true)
    
    const updates = {
      id: user.id, // On force l'ID pour que ça matche
      username: username,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    }

    // Upsert = Met à jour si existe, sinon crée
    const { error } = await supabase.from('profiles').upsert(updates)

    if (error) {
      alert("Erreur lors de la mise à jour")
      console.error(error)
    } else {
      alert("Profil mis à jour ! ✅")
      router.refresh() // Rafraîchit les données
    }
    setSaving(false)
  }

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Chargement...</div>

  return (
    <main className="min-h-screen bg-gray-900 p-4 text-white flex flex-col items-center">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition">
            <ArrowLeft size={16} className="mr-2"/> Retour Accueil
        </Link>

        <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-xl">
            <div className="text-center mb-8">
                <div className="w-24 h-24 mx-auto bg-gray-700 rounded-full flex items-center justify-center mb-4 overflow-hidden border-4 border-gray-600">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <UserCircle size={64} className="text-gray-500" />
                    )}
                </div>
                <h1 className="text-2xl font-bold">Mon Profil</h1>
                <p className="text-gray-400 text-sm">{user?.email}</p>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-gray-300 mb-2">Pseudo (Affiché dans les matchs)</label>
                    <div className="relative">
                        <User size={18} className="absolute left-3 top-3 text-gray-500" />
                        <input 
                            type="text" 
                            placeholder="Ex: CR7 du 93"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded-xl py-3 pl-10 pr-4 focus:border-green-500 outline-none transition"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-300 mb-2">URL Avatar (Image)</label>
                    <input 
                        type="text" 
                        placeholder="https://..."
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded-xl py-3 px-4 text-sm focus:border-green-500 outline-none transition"
                    />
                    <p className="text-xs text-gray-500 mt-1">Colle le lien d'une image (Google Images, Imgur...)</p>
                </div>

                <button 
                    onClick={updateProfile}
                    disabled={saving}
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 mt-6 transition transform hover:scale-[1.02]"
                >
                    {saving ? 'Sauvegarde...' : <><Save size={18} /> Enregistrer</>}
                </button>
            </div>
        </div>
      </div>
    </main>
  )
}