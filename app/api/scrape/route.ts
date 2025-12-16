import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    // 1. On récupère le code source
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    })
    
    // Vérification basique
    if (response.url.includes('login') || response.status === 403) {
        return NextResponse.json({ error: "Match privé ou accès refusé par Le Five." }, { status: 403 })
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // --- STRATÉGIE 1 : MÉTADONNÉES VIDÉO ---
    // Souvent la vidéo est dans une balise meta og:video ou twitter:player
    let videoUrl = $('meta[property="og:video"]').attr('content') || 
                   $('meta[property="og:video:secure_url"]').attr('content') || 
                   "";

    // Si pas trouvé, on cherche un lien .mp4 brut dans tout le code (même dans les scripts)
    if (!videoUrl) {
        const mp4Match = html.match(/https?:\/\/[^"']+\.mp4/);
        if (mp4Match) videoUrl = mp4Match[0];
    }

    // --- STRATÉGIE 2 : JOUEURS (JSON SEARCH) ---
    // Le Five utilise souvent Nuxt.js ou React. Les données sont dans window.__NUXT__ ou window.INITIAL_STATE
    const players: string[] = []
    
    // On récupère tous les scripts pour chercher des objets JSON qui ressemblent à des joueurs
    $('script').each((i, el) => {
        const scriptContent = $(el).html() || ""
        
        // On cherche des motifs comme "firstName":"Mehdi" ou "name":"Mehdi"
        // C'est une regex un peu "bourrine" mais efficace pour scanner du JSON en vrac
        const names = scriptContent.match(/"(firstName|lastName|name|nickname)"\s*:\s*"([^"]+)"/g)
        
        if (names) {
            names.forEach(match => {
                // Nettoyage : on garde juste le prénom/nom
                const cleanName = match.split(':')[1].replace(/"/g, '').trim()
                // On exclut les mots clés techniques
                if (cleanName.length > 2 && !['admin', 'user', 'guest', 'player'].includes(cleanName.toLowerCase())) {
                    if (!players.includes(cleanName)) {
                        players.push(cleanName)
                    }
                }
            })
        }
    })

    // Fallback : Si la méthode JSON échoue, on retente le visuel classique
    if (players.length === 0) {
        $('h5, .name, .player-name, td strong').each((i, el) => {
            const txt = $(el).text().trim()
            if (txt && txt.length > 2 && !players.includes(txt)) players.push(txt)
        })
    }

    // --- LIEU ---
    let location = "Le Five"
    if (url.includes('marville')) location = "Le Five Marville"
    else if (url.includes('bezons')) location = "Le Five Bezons"
    else if (url.includes('villette')) location = "Le Five Villette"
    else if (url.includes('bobigny')) location = "Le Five Bobigny"
    else if (url.includes('creteil')) location = "Le Five Créteil"

    return NextResponse.json({
      success: true,
      data: {
        location,
        video_url: videoUrl,
        players: players.slice(0, 15) // On limite à 15 pour éviter les déchets
      }
    })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erreur serveur interne" }, { status: 500 })
  }
}