# MOOD — site immersif piloté au scroll

Site Next.js (App Router) pour la marque de donuts **MOOD** : un film publicitaire 3D que le visiteur fait avancer, reculer ou s'arrêter avec le scroll, suivi des sections Flavors, Our Story et Order.

## Démarrage

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # build de production
npm start          # sert le build
```

Node 18.18+ (testé avec Node 22).

## Configuration

Copier `.env.example` en `.env.local` :

| Variable | Rôle |
| --- | --- |
| `NEXT_PUBLIC_ORDER_URL` | Destination du bouton « GET YOUR MOOD » (lien WhatsApp, boutique…). Vide = le bouton reste sur la page. |
| `NEXT_PUBLIC_INSTAGRAM_URL` | Lien Instagram du footer. Vide = « coming soon ». |
| `NEXT_PUBLIC_CONTACT_EMAIL` | E-mail de contact du footer. Vide = « coming soon ». |

Aucun numéro, URL de commande ou compte social n'a été inventé.

## Déploiement

**Vercel** (recommandé) : importer le dépôt, aucun réglage à changer ; ajouter les variables ci-dessus dans *Settings → Environment Variables*.

Autre hébergeur Node : `npm run build && npm start`. Les séquences d'images sont servies depuis `/public/frames` avec un cache d'un an (`next.config.ts`). Leurs adresses portent un numéro de version (`lib/framesVersion.ts`), mis à jour automatiquement par `npm run frames` : après une régénération, les navigateurs téléchargent les nouvelles images au lieu de réafficher les anciennes.

## Assets fournis → scènes

| Fichier dans `media-src/videos/` | Définition | Scène |
| --- | --- | --- |
| `scene-01-02-mood-flying-donut-1080p.mp4` (« Donut commercial storyboard ») | 1920×1080 | 1 + 2 — les mains prennent les donuts, les lettres s'écartent, le donut blanc arrive et flotte (le raccord entre les deux est déjà dans la vidéo) |
| `scene-03-cinematic-zoom-720p.mp4` (image 112 → fin) | 1280×720 | 3 — le donut fonce vers la caméra jusqu'au glaçage |
| `scene-04-donut-duo-720p.mp4` | 1280×720 | 4 — duo chocolat / vanille, éclaboussures |
| `scene-05-packaging-1080p.mp4` (« Donuts falling into paper bag ») | 1920×1080 | 5 — les donuts tombent dans le sac MOOD |

À savoir :

- **Les scènes 3 et 4 sont encore en 720p.** Elles sont agrandies à l'écran et paraissent plus douces que les scènes 1, 2 et 5. Dès que vous avez leurs versions 1080p, voir « Changer une vidéo ».
- **Pas d'images produit reçues.** `chocolate-donut.webp` et `vanilla-donut.webp` sont des détourages tirés de la vidéo du duo. Pour les remplacer, déposer de vraies photos détourées sous les mêmes noms dans `public/images/`.

## Comment fonctionne le film

- **Séquences d'images sur canvas, pas de `<video>`.** Le *seek* d'une vidéo HTML5 est lent et imprécis (surtout sur iOS). Chaque vidéo est donc convertie en images WebP (`public/frames/<scène>/d` pour ordinateur — 1920 px pour les sources 1080p, 1280 px pour les 720p —, `/m` pour mobile — 1280 / 960 px) et dessinée dans un seul `<canvas>`. Poids total : environ 60 Mo (ordinateur) ou 31 Mo (mobile), chargés progressivement.
- **Scroll → image.** `ScrollTrigger` donne la progression de la section, lissée à chaque frame, puis `lib/timeline.ts` la traduit en « scène + numéro d'image ». Scroll vers le bas = lecture avant, vers le haut = lecture arrière, arrêt = image figée.
- **Épinglage.** Une section haute contient une scène `position: sticky` plein écran (plus stable sur mobile qu'un pin JavaScript) ; `ScrollTrigger` en mesure la progression.
- **Chargement.** Seules la scène en cours et la suivante sont téléchargées, du plus grossier au plus fin (1 image sur 16, puis 8, 4…) : la scène est manipulable presque tout de suite. Les images restent compressées en mémoire ; seules ~40 (mobile) à ~100 (ordinateur) autour de la tête de lecture sont décodées.
- **Transitions** (`lib/renderer.ts`), toutes réversibles :
  - 2 → 3 : le donut flottant grossit jusqu'à rejoindre la taille du même donut au début du plan suivant ;
  - 3 → 4 : traversée du gros plan de glaçage pendant que le plan du duo se pose ;
  - 4 → 5 : le duo s'envole par le haut ; dans le plan suivant les donuts retombent dans le sac.
- **Écrans verticaux.** Le cadre 16:9 n'est jamais simplement rogné : chaque scène indique quelle largeur doit rester visible (`portraitVisible`), le cadre est dessiné en bandeau aux bords fondus et le reste de l'écran prend la couleur de fond de l'image. Le cadrage se resserre tout seul quand le sujet le permet (du mot MOOD entier vers le donut, puis plein écran dans le gros plan).
- **Accessibilité / secours.** `prefers-reduced-motion` désactive Lenis, le lissage et les animations décoratives. Si les images ne chargent pas, l'affiche de la première scène reste visible et le reste de la page fonctionne.

## Régler le rythme

Tout est dans `lib/timeline.ts` :

- `SCENES[].scroll` — distance de scroll de chaque scène (en vh) : 420 / 200 / 250 / 230 ;
- `TRANSITIONS[]` — durée et mouvement de chaque raccord ;
- `OUTRO_SCROLL` — durée de la carte de fin ;
- les textes et leurs moments d'apparition sont dans `components/SceneCaptions.tsx`.

## Changer une vidéo

Déposer le fichier dans `media-src/videos/`, mettre à jour sa ligne dans `scripts/build-frames.sh` (nom, première image, nombre d'images, largeurs) et le nombre d'images dans `lib/timeline.ts`, puis :

```bash
npm run frames     # nécessite ffmpeg
```

## Structure

```
app/                    layout, page, styles globaux (Tailwind v4)
components/
  SmoothScrollProvider  Lenis + synchronisation ScrollTrigger + ancres
  Header                navigation fixe, menu mobile (Motion)
  ScrollProgressIndicator
  HeroExperience        section du film, scène sticky, écran de chargement
  ScrollVideoScene      moteur scroll → canvas
  SceneCaptions         typographie synchronisée au scroll
  PackagingReveal       carte de fin (logo, slogan, CTA)
  FlavorSection         deux donuts interactifs
  BrandStory            section rose + SprinkleField (React Three Fiber, chargé à la demande)
  FinalCta, Footer
lib/
  timeline.ts           scènes, transitions, progression → image
  frameStore.ts         téléchargement, décodage, mémoire bornée
  renderer.ts           dessin canvas, cadrage, transitions
  bus.ts, hooks.ts, site.ts
media-src/videos/       vidéos sources (non servies au public)
public/frames/          séquences d'images générées
public/images/          logo et visuels produits
scripts/build-frames.sh
```
