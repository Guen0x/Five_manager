'use client'
import { useState, useRef, useEffect } from 'react'
import Draggable from 'react-draggable'
import html2canvas from 'html2canvas'
import Link from 'next/link'
import { Download, ArrowLeft, Layout, Zap, Grid, Type, RefreshCcw } from 'lucide-react'

// --- TYPES & CONSTANTES ---
interface PlayerToken {
  id: number
  name: string
  number: string
  x: number
  y: number
  color: string
}

type PitchTheme = 'classic' | 'neon' | 'street'

const PLAYER_COLORS = {
  blue: '#2563eb',
  red: '#dc2626',
  yellow: '#eab308',
  green: '#16a34a',
  black: '#000000',
  purple: '#9333ea',
  orange: '#ea580c',
  white: '#ffffff'
}

// --- SOUS-COMPOSANT JOUEUR ---
const DraggablePlayer = ({ 
  player, 
  toggleColor,
  updatePosition, // Nouvelle prop pour la mise à jour
  theme
}: { 
  player: PlayerToken, 
  toggleColor: (id: number) => void,
  updatePosition: (id: number, x: number, y: number) => void,
  theme: PitchTheme
}) => {
  const nodeRef = useRef(null)

  // Style néon
  const isNeon = theme === 'neon'
  const glowStyle = isNeon ? { boxShadow: `0 0 15px ${PLAYER_COLORS[player.color as keyof typeof PLAYER_COLORS]}` } : {}
  const textColor = ['yellow', 'white', 'orange'].includes(player.color) ? 'black' : 'white'

  return (
    <Draggable 
        nodeRef={nodeRef} 
        bounds="parent" 
        position={{x: player.x, y: player.y}} // Position contrôlée par le state
        onStop={(e, data) => {
            // C'EST ICI LA CORRECTION : On met à jour le state quand on lâche
            updatePosition(player.id, data.x, data.y)
        }}
    >
        <div 
            ref={nodeRef} 
            className="absolute cursor-move flex flex-col items-center group w-16 z-10 hover:z-50"
        >
            <div 
                className="w-10 h-10 rounded-full border-2 flex items-center justify-center font-black text-sm transition-transform hover:scale-110 select-none shadow-md"
                style={{ 
                    backgroundColor: PLAYER_COLORS[player.color as keyof typeof PLAYER_COLORS],
                    borderColor: isNeon ? '#fff' : '#ffffff',
                    color: textColor,
                    ...glowStyle
                }}
                onClick={() => toggleColor(player.id)}
                onTouchStart={() => {}} 
            >
                {player.number}
            </div>
            
            <div 
                className="mt-1 px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold text-white text-center min-w-[50px] select-none uppercase tracking-wide border border-white/10 truncate max-w-full"
                style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
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
  const [currentTheme, setCurrentTheme] = useState<PitchTheme>('classic')
  const [teamName, setTeamName] = useState('Match du Lundi')

  // INITIALISATION DES 10 JOUEURS
  const [players, setPlayers] = useState<PlayerToken[]>([
    // ÉQUIPE A (Bas - Bleus)
    { id: 1, name: 'Gardien A', number: '1', x: 145, y: 500, color: 'yellow' },
    { id: 2, name: 'Def A', number: '4', x: 145, y: 400, color: 'blue' },
    { id: 3, name: 'Gauche A', number: '10', x: 50, y: 300, color: 'blue' },
    { id: 4, name: 'Droite A', number: '7', x: 240, y: 300, color: 'blue' },
    { id: 5, name: 'Buteur A', number: '9', x: 145, y: 250, color: 'blue' },

    // ÉQUIPE B (Haut - Rouges)
    { id: 6, name: 'Gardien B', number: '1', x: 145, y: 20, color: 'green' },
    { id: 7, name: 'Def B', number: '5', x: 145, y: 120, color: 'red' },
    { id: 8, name: 'Gauche B', number: '11', x: 240, y: 200, color: 'red' }, // Inversé pour faire miroir
    { id: 9, name: 'Droite B', number: '8', x: 50, y: 200, color: 'red' },
    { id: 10, name: 'Buteur B', number: '9', x: 145, y: 180, color: 'red' },
  ])

  useEffect(() => { setIsMounted(true) }, [])

  // --- ACTIONS ---

  // Nouvelle fonction pour mettre à jour la position après le drag
  const handlePlayerDragStop = (id: number, x: number, y: number) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, x, y } : p))
  }

  const updatePlayer = (id: number, field: 'name' | 'number', value: string) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const toggleColor = (id: number) => {
    const colors = Object.keys(PLAYER_COLORS)
    setPlayers(prev => prev.map(p => {
        if (p.id !== id) return p
        const currentIndex = colors.indexOf(p.color)
        const nextColor = colors[(currentIndex + 1) % colors.length]
        return { ...p, color: nextColor }
    }))
  }

  const resetPositions = () => {
    applyFormation('1-2-1')
  }

  const applyFormation = (type: '1-2-1' | '2-2' | '1-1-2') => {
      let teamACoords: {x: number, y: number}[] = [] // Bas
      let teamBCoords: {x: number, y: number}[] = [] // Haut (Miroir)

      if (type === '1-2-1') { // Diamant
          teamACoords = [
              { x: 145, y: 510 }, // GB
              { x: 145, y: 420 }, // DC
              { x: 40, y: 320 },  // MG
              { x: 250, y: 320 }, // MD
              { x: 145, y: 270 }, // BU
          ]
          teamBCoords = [
              { x: 145, y: 20 },  // GB
              { x: 145, y: 100 }, // DC
              { x: 250, y: 200 }, // MG (Miroir X)
              { x: 40, y: 200 },  // MD
              { x: 145, y: 160 }, // BU
          ]
      } else if (type === '2-2') { // Carré
          teamACoords = [
              { x: 145, y: 510 },
              { x: 80, y: 400 },
              { x: 210, y: 400 },
              { x: 80, y: 280 },
              { x: 210, y: 280 },
          ]
          teamBCoords = [
              { x: 145, y: 20 },
              { x: 210, y: 120 },
              { x: 80, y: 120 },
              { x: 210, y: 220 },
              { x: 80, y: 220 },
          ]
      } else if (type === '1-1-2') { // Offensif
          teamACoords = [
              { x: 145, y: 510 },
              { x: 145, y: 380 }, // Milieu
              { x: 145, y: 300 }, // MOC
              { x: 60, y: 260 },  // BU G
              { x: 230, y: 260 }, // BU D
          ]
          teamBCoords = [
              { x: 145, y: 20 },
              { x: 145, y: 140 },
              { x: 145, y: 200 },
              { x: 230, y: 240 },
              { x: 60, y: 240 },
          ]
      }

      setPlayers(prev => prev.map((p) => {
          if (p.id <= 5) {
               const coord = teamACoords[p.id - 1]
               return coord ? { ...p, x: coord.x, y: coord.y } : p
          } else {
               const coord = teamBCoords[p.id - 6]
               return coord ? { ...p, x: coord.x, y: coord.y } : p
          }
      }))
  }

  const downloadImage = async () => {
    if (!pitchRef.current) return
    setIsDownloading(true)
    await new Promise(r => setTimeout(r, 100))

    try {
        const canvas = await html2canvas(pitchRef.current, {
            scale: 2, 
            useCORS: true,
            logging: false,
            backgroundColor: null
        })

        const image = canvas.toDataURL("image/png")
        const link = document.createElement('a')
        link.href = image
        link.download = `compo-${teamName.replace(/\s+/g, '-').toLowerCase()}.png`
        document.body.appendChild(link) 
        link.click()
        document.body.removeChild(link)
    } catch (error) {
        console.error(error)
        alert("Erreur téléchargement")
    }
    setIsDownloading(false)
  }

  // --- STYLES DYNAMIQUES ---
  const getPitchStyles = () => {
      if (currentTheme === 'classic') {
          return {
              bg: '#047857',
              lines: 'rgba(255,255,255,0.6)',
              border: '#ffffff',
              pattern: 'linear-gradient(0deg, transparent 24%, rgba(255,255,255, .1) 25%, rgba(255,255,255, .1) 26%, transparent 27%, transparent 74%, rgba(255,255,255, .1) 75%, rgba(255,255,255, .1) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255,255,255, .1) 25%, rgba(255,255,255, .1) 26%, transparent 27%, transparent 74%, rgba(255,255,255, .1) 75%, rgba(255,255,255, .1) 76%, transparent 77%, transparent)'
          }
      } else if (currentTheme === 'neon') {
          return {
              bg: '#111827',
              lines: '#22d3ee',
              border: '#22d3ee',
              pattern: 'radial-gradient(circle, rgba(34,211,238,0.1) 1px, transparent 1px)'
          }
      } else { // Street
          return {
              bg: '#374151',
              lines: '#fbbf24',
              border: '#fbbf24',
              pattern: 'repeating-linear-gradient(45deg, #4b5563 0, #4b5563 1px, transparent 0, transparent 50%)'
          }
      }
  }

  const styles = getPitchStyles()

  if (!isMounted) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Chargement...</div>

  return (
    <main className="min-h-screen bg-gray-950 p-4 text-white flex flex-col items-center pb-20">
      
      {/* HEADER */}
      <div className="w-full max-w-6xl flex justify-between items-center mb-6">
        <Link href="/" className="text-gray-400 hover:text-white flex items-center gap-2 transition hover:-translate-x-1">
            <ArrowLeft size={20} /> <span className="hidden md:inline">Accueil</span>
        </Link>
        <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
            Tactical Board
        </h1>
        <button 
            onClick={downloadImage}
            disabled={isDownloading}
            className={`${isDownloading ? 'bg-gray-700' : 'bg-green-600 hover:bg-green-500'} text-white px-4 md:px-6 py-2 md:py-2.5 rounded-xl font-bold shadow-lg shadow-green-900/20 flex items-center gap-2 transition transform hover:scale-105`}
        >
            {isDownloading ? '...' : <><Download size={20} /> <span className="hidden md:inline">Exporter</span></>}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start w-full max-w-7xl justify-center">
        
        {/* --- ZONE 1 : LE TERRAIN (Capture Zone) --- */}
        <div className="relative shadow-2xl rounded-xl overflow-hidden border-4 border-gray-800 bg-gray-900 mx-auto">
            <div 
                ref={pitchRef} 
                className="relative w-[340px] h-[580px] overflow-hidden select-none transition-colors duration-500"
                style={{
                    backgroundColor: styles.bg,
                    backgroundImage: styles.pattern,
                    backgroundSize: currentTheme === 'street' ? '10px 10px' : '50px 50px'
                }}
            >
                {/* Header sur l'image */}
                <div className="absolute top-1/2 left-0 w-full text-center z-0 opacity-40 -translate-y-1/2 pointer-events-none">
                    <h2 className="text-3xl font-black uppercase tracking-widest -rotate-90 whitespace-nowrap" style={{ color: styles.border }}>
                        {teamName}
                    </h2>
                </div>

                {/* --- LIGNES DU TERRAIN --- */}
                <div className="absolute inset-3 border-2 pointer-events-none" style={{ borderColor: styles.lines, boxShadow: currentTheme === 'neon' ? `0 0 10px ${styles.lines}` : 'none' }}></div>
                <div className="absolute top-1/2 left-3 right-3 h-0.5 transform -translate-y-1/2 pointer-events-none" 
                     style={{ backgroundColor: styles.lines, boxShadow: currentTheme === 'neon' ? `0 0 10px ${styles.lines}` : 'none' }}></div>
                <div className="absolute top-1/2 left-1/2 w-24 h-24 rounded-full transform -translate-x-1/2 -translate-y-1/2 border-2 pointer-events-none" 
                     style={{ borderColor: styles.lines, boxShadow: currentTheme === 'neon' ? `0 0 10px ${styles.lines}` : 'none' }}></div>
                
                {/* Surfaces */}
                <div className="absolute top-3 left-1/2 w-48 h-24 border-2 border-t-0 rounded-b-xl transform -translate-x-1/2 pointer-events-none" style={{ borderColor: styles.lines }}></div>
                <div className="absolute bottom-3 left-1/2 w-48 h-24 border-2 border-b-0 rounded-t-xl transform -translate-x-1/2 pointer-events-none" style={{ borderColor: styles.lines }}></div>
                
                {/* Buts */}
                <div className="absolute top-0 left-1/2 w-24 h-3 border-x-2 border-b-2 transform -translate-x-1/2 bg-black/20 pointer-events-none" style={{ borderColor: styles.lines }}></div>
                <div className="absolute bottom-0 left-1/2 w-24 h-3 border-x-2 border-t-2 transform -translate-x-1/2 bg-black/20 pointer-events-none" style={{ borderColor: styles.lines }}></div>

                {/* --- JOUEURS --- */}
                {players.map((player) => (
                    <DraggablePlayer 
                        key={player.id} 
                        player={player} 
                        toggleColor={toggleColor} 
                        updatePosition={handlePlayerDragStop} // Connecté ici !
                        theme={currentTheme}
                    />
                ))}
            </div>
        </div>

        {/* --- ZONE 2 : PANNEAU DE CONTRÔLE --- */}
        <div className="flex flex-col gap-4 w-full max-w-sm mx-auto lg:mx-0">
            
            {/* 1. Thèmes & Nom */}
            <div className="bg-gray-800/60 backdrop-blur-md p-5 rounded-2xl border border-white/5 space-y-3">
                <div className="flex items-center gap-2 mb-1 text-gray-400 uppercase text-[10px] font-bold tracking-widest">
                    <Type size={12} /> Nom du match
                </div>
                <input 
                    type="text" 
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white font-bold focus:border-green-500 outline-none transition text-center"
                />

                <div className="flex items-center gap-2 mt-4 mb-1 text-gray-400 uppercase text-[10px] font-bold tracking-widest">
                    <Layout size={12} /> Thème
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setCurrentTheme('classic')} className={`p-2 rounded-lg border-2 text-xs font-bold transition ${currentTheme === 'classic' ? 'border-green-500 bg-green-900/20 text-green-400' : 'border-transparent bg-gray-700 hover:bg-gray-600'}`}>
                        🌿 Classic
                    </button>
                    <button onClick={() => setCurrentTheme('neon')} className={`p-2 rounded-lg border-2 text-xs font-bold transition flex items-center justify-center gap-1 ${currentTheme === 'neon' ? 'border-cyan-400 bg-cyan-900/20 text-cyan-400' : 'border-transparent bg-gray-700 hover:bg-gray-600'}`}>
                        <Zap size={12} /> Neon
                    </button>
                    <button onClick={() => setCurrentTheme('street')} className={`p-2 rounded-lg border-2 text-xs font-bold transition ${currentTheme === 'street' ? 'border-yellow-500 bg-yellow-900/20 text-yellow-500' : 'border-transparent bg-gray-700 hover:bg-gray-600'}`}>
                        🚧 Street
                    </button>
                </div>
            </div>

            {/* 2. Formations Rapides */}
            <div className="bg-gray-800/60 backdrop-blur-md p-5 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2 text-gray-400 uppercase text-[10px] font-bold tracking-widest">
                        <Grid size={12} /> Formations (Miroir)
                    </div>
                    <button onClick={resetPositions} className="text-xs text-gray-500 hover:text-white flex gap-1 items-center"><RefreshCcw size={10}/> Reset</button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => applyFormation('1-2-1')} className="py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-bold border border-white/5">
                        1-2-1
                    </button>
                    <button onClick={() => applyFormation('2-2')} className="py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-bold border border-white/5">
                        2-2
                    </button>
                    <button onClick={() => applyFormation('1-1-2')} className="py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-bold border border-white/5">
                        1-1-2
                    </button>
                </div>
            </div>

            {/* 3. Liste Joueurs */}
            <div className="bg-gray-800/60 backdrop-blur-md p-5 rounded-2xl border border-white/5 flex-1 max-h-[300px] overflow-y-auto">
                <h3 className="font-bold text-sm mb-3 text-gray-300">Modifier les joueurs</h3>
                <div className="space-y-2">
                    {players.map((player) => (
                        <div key={player.id} className="flex gap-2 items-center group">
                            {/* Pastille Couleur */}
                            <div 
                                className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] cursor-pointer shadow-sm border border-white/10 shrink-0 hover:scale-110 transition"
                                style={{ backgroundColor: PLAYER_COLORS[player.color as keyof typeof PLAYER_COLORS], color: ['yellow', 'white', 'orange'].includes(player.color) ? 'black' : 'white' }}
                                onClick={() => toggleColor(player.id)}
                            >
                                {player.number}
                            </div>
                            
                            {/* Input Numéro */}
                            <input 
                                type="text" 
                                className="w-8 bg-gray-900 border border-gray-700 rounded p-1 text-center text-white font-bold focus:border-green-500 outline-none text-xs"
                                value={player.number}
                                onChange={(e) => updatePlayer(player.id, 'number', e.target.value)}
                            />
                            
                            {/* Input Nom */}
                            <input 
                                type="text" 
                                className="flex-1 bg-gray-900 border border-gray-700 rounded p-1 text-white focus:border-green-500 outline-none text-xs px-2"
                                value={player.name}
                                onChange={(e) => updatePlayer(player.id, 'name', e.target.value)}
                            />
                        </div>
                    ))}
                </div>
            </div>

        </div>

      </div>
    </main>
  )
}