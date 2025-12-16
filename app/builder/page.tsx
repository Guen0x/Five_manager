'use client'
import { useState, useRef, useEffect } from 'react'
import Draggable from 'react-draggable'
import html2canvas from 'html2canvas'
import Link from 'next/link'

// --- TYPES ---
interface PlayerToken {
  id: number
  name: string
  number: string
  x: number
  y: number
  color: string
}

// Couleurs HEX sécurisées pour html2canvas
const COLORS = {
  emerald: '#047857',
  white: '#ffffff',
  whiteTransparent: 'rgba(255, 255, 255, 0.5)',
  gray: '#e5e7eb',
  black: '#000000',
  playerColors: {
    blue: '#2563eb',
    red: '#dc2626',
    yellow: '#eab308',
    green: '#16a34a',
    black: '#000000'
  } as Record<string, string>
}

// --- SOUS-COMPOSANT JOUEUR ---
const DraggablePlayer = ({ 
  player, 
  toggleColor 
}: { 
  player: PlayerToken, 
  toggleColor: (id: number) => void 
}) => {
  const nodeRef = useRef(null)

  return (
    <Draggable 
        nodeRef={nodeRef} 
        bounds="parent" 
        defaultPosition={{x: player.x, y: player.y}}
    >
        <div 
            ref={nodeRef} 
            className="absolute cursor-move flex flex-col items-center group w-20 z-10"
        >
            <div 
                className="w-10 h-10 rounded-full border-2 shadow-md flex items-center justify-center font-bold text-lg transition-transform hover:scale-110 select-none"
                style={{ 
                    // ON FORCE TOUT EN STYLE INLINE
                    backgroundColor: COLORS.playerColors[player.color],
                    borderColor: COLORS.white,
                    color: player.color === 'yellow' ? 'black' : 'white'
                }}
                onClick={() => toggleColor(player.id)}
                onTouchStart={() => {}} 
            >
                {player.number}
            </div>
            
            <div 
                className="mt-1 px-2 py-0.5 rounded text-xs font-bold text-white text-center min-w-[60px] select-none shadow-sm"
                style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
            >
                {player.name}
            </div>
        </div>
    </Draggable>
  )
}

// --- COMPOSANT PRINCIPAL ---
export default function BuilderPage() {
  const pitchRef = useRef<HTMLDivElement>(null)
  
  const [isMounted, setIsMounted] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false) 

  useEffect(() => { setIsMounted(true) }, [])

  const [players, setPlayers] = useState<PlayerToken[]>([
    { id: 1, name: 'Gardien', number: '1', x: 140, y: 450, color: 'yellow' },
    { id: 2, name: 'Défenseur', number: '4', x: 140, y: 350, color: 'blue' },
    { id: 3, name: 'Ailier G', number: '10', x: 50, y: 200, color: 'blue' },
    { id: 4, name: 'Ailier D', number: '7', x: 230, y: 200, color: 'blue' },
    { id: 5, name: 'Buteur', number: '9', x: 140, y: 100, color: 'blue' },
  ])

  const updatePlayer = (id: number, field: 'name' | 'number', value: string) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const toggleColor = (id: number) => {
    const colors = ['blue', 'red', 'yellow', 'green', 'black']
    setPlayers(prev => prev.map(p => {
        if (p.id !== id) return p
        const currentIndex = colors.indexOf(p.color)
        const nextColor = colors[(currentIndex + 1) % colors.length]
        return { ...p, color: nextColor }
    }))
  }

  const downloadImage = async () => {
    if (!pitchRef.current) return
    setIsDownloading(true)

    // Petite pause pour laisser le temps au DOM de se stabiliser
    await new Promise(r => setTimeout(r, 100))

    try {
        const canvas = await html2canvas(pitchRef.current, {
            backgroundColor: COLORS.emerald, // Fond HEX explicite
            scale: 2, 
            useCORS: true,
            logging: false,
        })

        const image = canvas.toDataURL("image/png")
        const link = document.createElement('a')
        link.href = image
        link.download = 'ma-compo-five.png'
        document.body.appendChild(link) 
        link.click()
        document.body.removeChild(link)
        
    } catch (error) {
        console.error("Erreur téléchargement:", error)
        alert("Erreur: " + (error as Error).message)
    }

    setIsDownloading(false)
  }

  if (!isMounted) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Chargement...</div>

  return (
    <main className="min-h-screen bg-gray-900 p-4 text-white flex flex-col items-center">
      <div className="w-full max-w-5xl flex justify-between items-center mb-6">
        <Link href="/" className="text-gray-400 hover:text-white">← Retour Accueil</Link>
        <h1 className="text-2xl font-bold text-green-400">Générateur de Compo 🎨</h1>
        <button 
            onClick={downloadImage}
            disabled={isDownloading}
            className={`${isDownloading ? 'bg-gray-500 cursor-wait' : 'bg-green-600 hover:bg-green-500'} text-white px-4 py-2 rounded font-bold shadow-lg flex items-center gap-2 transition`}
        >
            {isDownloading ? 'Génération...' : '📸 Télécharger'}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* TERRAIN : J'ai retiré TOUTES les classes de couleur Tailwind ici */}
        <div className="relative p-4 border-4 border-gray-700 rounded-xl bg-gray-800 shadow-2xl">
            <div 
                ref={pitchRef} 
                className="relative w-[350px] h-[550px] overflow-hidden select-none"
                style={{
                    backgroundColor: COLORS.emerald, // Pas de class bg-emerald
                    borderColor: COLORS.white,
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(255,255,255, .1) 25%, rgba(255,255,255, .1) 26%, transparent 27%, transparent 74%, rgba(255,255,255, .1) 75%, rgba(255,255,255, .1) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255,255,255, .1) 25%, rgba(255,255,255, .1) 26%, transparent 27%, transparent 74%, rgba(255,255,255, .1) 75%, rgba(255,255,255, .1) 76%, transparent 77%, transparent)',
                    backgroundSize: '50px 50px'
                }}
            >
                {/* Lignes du terrain : Style inline uniquement */}
                
                {/* Ligne médiane */}
                <div className="absolute top-1/2 left-0 w-full h-0.5 transform -translate-y-1/2" 
                     style={{ backgroundColor: COLORS.whiteTransparent }}></div>
                
                {/* Rond central */}
                <div className="absolute top-1/2 left-1/2 w-24 h-24 rounded-full transform -translate-x-1/2 -translate-y-1/2" 
                     style={{ borderWidth: '2px', borderColor: COLORS.whiteTransparent }}></div>
                
                {/* Surface Haut */}
                <div className="absolute top-0 left-1/2 w-48 h-24 rounded-b-full transform -translate-x-1/2" 
                     style={{ borderWidth: '2px', borderColor: COLORS.whiteTransparent, backgroundColor: 'rgba(4, 120, 87, 0.5)' }}></div>
                
                {/* Surface Bas */}
                <div className="absolute bottom-0 left-1/2 w-48 h-24 rounded-t-full transform -translate-x-1/2" 
                     style={{ borderWidth: '2px', borderColor: COLORS.whiteTransparent, backgroundColor: 'rgba(4, 120, 87, 0.5)' }}></div>
                
                {/* But Haut */}
                <div className="absolute top-[-5px] left-1/2 w-20 h-2 transform -translate-x-1/2" 
                     style={{ backgroundColor: COLORS.gray, borderWidth: '2px', borderColor: COLORS.white }}></div>
                
                {/* But Bas */}
                <div className="absolute bottom-[-5px] left-1/2 w-20 h-2 transform -translate-x-1/2" 
                     style={{ backgroundColor: COLORS.gray, borderWidth: '2px', borderColor: COLORS.white }}></div>

                {/* JOUEURS */}
                {players.map((player) => (
                    <DraggablePlayer 
                        key={player.id} 
                        player={player} 
                        toggleColor={toggleColor} 
                    />
                ))}
            </div>
            <p className="text-center text-gray-500 mt-2 text-xs">five-manager.com</p>
        </div>

        {/* ÉDITEUR */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 w-full max-w-sm">
            <h3 className="font-bold mb-4 text-xl">Modifier les joueurs</h3>
            <div className="space-y-3">
                {players.map((player) => (
                    <div key={player.id} className="flex gap-2 items-center bg-gray-900 p-2 rounded border border-gray-700">
                        <input 
                            type="text" 
                            className="w-10 bg-gray-800 text-center border border-gray-600 rounded p-1 text-white font-bold focus:border-green-500 outline-none"
                            value={player.number}
                            onChange={(e) => updatePlayer(player.id, 'number', e.target.value)}
                        />
                        <input 
                            type="text" 
                            className="flex-1 bg-gray-800 border border-gray-600 rounded p-1 text-white focus:border-green-500 outline-none"
                            value={player.name}
                            onChange={(e) => updatePlayer(player.id, 'name', e.target.value)}
                        />
                    </div>
                ))}
            </div>
        </div>

      </div>
    </main>
  )
}