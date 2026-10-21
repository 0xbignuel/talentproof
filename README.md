# TalentProof · Votre talent a une voix

PWA Next.js / React / TypeScript, conçue pour une artisane peu familière avec le numérique. Une question à la fois, des réponses vocales ou écrites, quelques photos, une relecture et trois supports réellement produits.

## Essayer sur ce poste Windows

### Sur téléphone : micro et hors connexion

```powershell
npm.cmd run demo:mobile
```

Ce lanceur prépare une version de production, ses workers et un lien HTTPS temporaire Cloudflare. Attendre « Ready », puis ouvrir l’adresse `https://…trycloudflare.com` affichée dans le terminal. Autoriser le micro sur **cette nouvelle adresse**. Le tunnel doit rester ouvert ; Ctrl+C l’arrête. Cloudflare transporte les données entre le téléphone et le PC. Ce mode a été explicitement choisi pour le test mobile.

L’adresse HTTP `http://192.168…` ne permet pas l’accès au micro ni l’installation d’un service worker, même si une autorisation a été accordée. Ce n’est pas une restriction que l’application peut contourner.

Un tunnel temporaire change d’adresse à chaque lancement. Le stockage du navigateur est propre à chaque adresse : depuis l’ancien lien, utiliser **Mes informations → Sauvegarder mes informations**, puis sur le nouveau lien **Mes informations → Importer une sauvegarde**. L’ancien brouillon n’est pas supprimé. Une adresse HTTPS stable sera nécessaire pour une PWA durable.

### Sur le PC : développement

Les dépendances, Whisper et le petit modèle Qwen3 sont installés dans le projet. Depuis sa racine :

```powershell
npm.cmd run demo
```

Ouvrir l’adresse indiquée, normalement **http://localhost:3000**. Le lanceur réutilise les services déjà actifs, démarre ceux qui manquent et choisit un port libre. Garder le terminal ouvert. Si un serveur de développement du projet tourne déjà, il est réutilisé.

Premier démarrage sur un nouveau poste : Node.js 20.9+ et Python 3.12 à 3.14, puis :

```powershell
npm.cmd ci
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r services/voice/requirements.txt
npm.cmd run demo
```

Internet est nécessaire pour télécharger les modèles la première fois. Le lanceur Windows télécharge le moteur CPU officiel llama.cpp et le modèle officiel Qwen3-0.6B quantifié Q8 (environ 610 Mo). Ils restent dans `.models/`, sans installation système. Whisper base est téléchargé à son premier lancement. Les services tournent ensuite sur le PC, sans API payante. Leur utilisation consomme les ressources de la machine.

## Le parcours

1. **Accueil** : bref splashscreen, un bouton « On commence ensemble ». Un appui initial est nécessaire pour autoriser la lecture vocale sur mobile.
2. **Conversation guidée** : prénom facultatif, métier, nom de l’atelier, prestations, ville/quartier, téléphone facultatif et complément facultatif. Appuyer sur le micro, répondre puis arrêter. Relire la transcription et continuer. Le clavier reste disponible.
3. **Réalisations** : choisir ou prendre jusqu’à six photos ; ajouter une légende si souhaité. Compression sur l’appareil, sans service externe.
4. **Récapitulatif** : réécouter, corriger les informations et le texte. Choisir explicitement si le téléphone apparaît. Une correction des informations métier actualise la présentation et invalide la validation précédente. Un panneau facultatif permet de choisir une couverture, une phrase d’accueil, des disponibilités et un parcours réel. Un aperçu montre la vitrine avant validation. Chaque réalisation peut recevoir une description facultative.
5. **Supports** : valider les informations et les droits des photos, puis télécharger le PDF ou le MP4. Pour la page web, une autorisation de publication distincte est nécessaire. Son lien peut être partagé, actualisé ou retiré depuis l’appareil d’origine.

## Les trois sorties

- **PDF** : vrai fichier, généré par pdf-lib : couverture choisie, présentation de l’atelier, prestations, informations pratiques et galerie paginée. Les photos sont conservées entières.
- **Page web** : route `/p/<uuid>`, enregistrée côté serveur, consultable sans compte. Un cookie HttpOnly distinct donne accès à la gestion ; le lien public ne permet pas de modifier la page. Le téléphone masqué est retiré des données enregistrées pour publication. Les pages sont exclues de l’indexation et du cache hors connexion.
- **MP4** : vraie vidéo H.264 verticale 720 × 960, 24 images/s, silencieuse : introduction de 2,5 secondes, trois secondes par réalisation et carte de fin de trois secondes. Les scènes sont composées avec Sharp et encodées avec FFmpeg, avec une entrée et une sortie en fondu. Les photos sont conservées entières. Les fichiers temporaires sont supprimés après le rendu. Un seul rendu est admis à la fois sur l’instance pour limiter la mémoire.

La page utilise la même couverture et les mêmes informations que les exports, propose une galerie agrandissable et des liens d’appel/WhatsApp lorsque le contact est affiché. Les numéros locaux à huit chiffres utilisent l’indicatif togolais +228 pour le lien WhatsApp. Son titre, sa description et une image Open Graph de 1200 × 630 sont générés pour l’aperçu de partage. Un clic sur le PDF ou la vidéo crée aussi un lien d’enregistrement persistant à l’écran : si le téléchargement automatique est bloqué, l’utilisatrice peut enregistrer ou ouvrir le fichier elle-même.

Une page servie sur localhost n’est accessible que depuis ce poste. Pour envoyer son lien à une cliente hors du réseau local, déployer l’application sur une adresse HTTPS accessible.

## Voix et IA : ce qui est réellement branché

- **Whisper base**, via faster-whisper sur CPU int8 : transcription du français. Audio envoyé au service local, traité en mémoire et non conservé. Le petit service utilise la bibliothèque HTTP standard de Python. Le récapitulatif est indispensable : une transcription peut se tromper, notamment sur les noms, métiers, quartiers et chiffres.
- **Qwen3-0.6B** : reformulation locale des informations fournies, via llama.cpp. Il s’agit du petit modèle de test, pas d’une garantie de qualité rédactionnelle. **Qwen3:4b** via Ollama est une option plus exigeante en mémoire pour comparer la qualité.
- **Synthèse vocale** : voix française du téléphone/navigateur via SpeechSynthesis. La qualité et le caractère local dépendent des voix installées. On peut couper la voix ou réécouter chaque question.
- Si Whisper est indisponible, la reconnaissance vocale du navigateur est utilisée lorsqu’elle existe, avec un message explicite. Elle peut transmettre l’audio au service du navigateur. Sinon, le clavier est proposé.
- Si Qwen est indisponible ou ne renvoie pas une réponse exploitable, un paragraphe est assemblé à partir des réponses. Le récapitulatif le signale : ce mode de secours ne se présente pas comme de l’IA.

Les questions sont volontairement déterministes : pas de conversation qui dérive, pas de question inventée par le modèle. L’IA ne certifie aucune compétence et sa proposition reste modifiable avant validation. Le MVP couvre le français ; les langues locales n’ont pas été évaluées.

Sources : [Whisper et licence MIT](https://github.com/openai/whisper), [faster-whisper](https://github.com/SYSTRAN/faster-whisper), [Qwen3-0.6B officiel](https://huggingface.co/Qwen/Qwen3-0.6B-GGUF), [llama.cpp](https://github.com/ggml-org/llama.cpp), [Qwen3:4b / Apache 2.0](https://ollama.com/library/qwen3:4b).

## PostgreSQL, Neon et stockage

Le brouillon est conservé dans IndexedDB, avec migration des anciens brouillons localStorage et un message en cas d’échec de sauvegarde. Les portfolios publiés sont conservés dans PostgreSQL lorsque `DATABASE_URL` est définie. Le pilote `pg` utilise des requêtes paramétrées, un petit pool de connexions et crée la table `portfolios` au premier usage.

Sans cette variable, le développement utilise des fichiers dans `.data/portfolios/` pour permettre de tester immédiatement. En production, ce mode est désactivé par défaut : configurer PostgreSQL/Neon, ou définir explicitement `ALLOW_LOCAL_STORAGE=true` uniquement sur un serveur disposant d’un disque persistant. Le lanceur `demo` autorise ce stockage pour le test local.

Copier `.env.example` vers `.env.local` et renseigner la chaîne PostgreSQL ou la chaîne poolée de Neon. Ne pas placer un secret dans une variable `NEXT_PUBLIC_*`. Garder la validation TLS de la chaîne fournie par Neon. Les photos sont embarquées dans le profil JSONB pour ce MVP ; un stockage objet séparé sera préférable pour un service plus volumineux.

L’accès de modification est attaché au cookie de cet appareil. Il n’y a pas encore de compte ni de récupération d’accès entre appareils. Effacer les données du navigateur peut supprimer cet accès. Le bouton « Mes informations » permet de télécharger une sauvegarde JSON du brouillon ; il ne restaure pas un accès de gestion perdu.

## Docker : les services et l’application

Docker n’est pas requis pour le test Windows. Pour PostgreSQL + Whisper + Ollama, créer un fichier `.env` avec `POSTGRES_PASSWORD` (une valeur longue, aléatoire et alphanumérique évite l’encodage des caractères dans l’URL) et, si nécessaire, `VOICE_SERVICE_TOKEN`.

```sh
docker compose up -d db voice ollama
docker compose exec ollama ollama pull qwen3:0.6b
```

Pour également construire l’application :

```sh
docker compose --profile full up -d --build
```

Les ports des services sont liés à localhost. L’application utilise les noms de services Docker pour joindre PostgreSQL, Whisper et Ollama. Placer ensuite un reverse proxy HTTPS devant l’application pour un essai sur téléphone à distance. Docker/PostgreSQL/Neon ne sont pas vérifiés sur ce poste, qui ne dispose pas de Docker ni de credentials Neon.

Pour utiliser un Ollama déjà installé plutôt que le moteur Windows fourni : définir `OLLAMA_URL=http://127.0.0.1:11434`, `OLLAMA_MODEL=qwen3:0.6b`, ne pas définir `LLAMA_URL`, puis démarrer avec `npm run dev` ou `npm start`. `npm run demo` privilégie le moteur portable llama.cpp.

## PWA et téléphone

Le service worker précache la totalité des ressources de la construction, y compris les scripts des workers photo/PDF et leurs dépendances. La liste et la version sont générées par `scripts/offline-assets.mjs` après `npm run build`, ou par `npm run demo:offline`. Une interface « Disponible hors connexion » confirme la préparation du cache sur un contexte sécurisé. Une navigation sans réseau, ou lorsque le serveur ne répond plus correctement, peut ainsi réutiliser la page en cache.

Deux Web Workers déplacent le traitement des photos et la création du PDF hors du fil de l’interface. Sur les navigateurs sans OffscreenCanvas, la photo est préparée avec un canvas classique. Le PDF dispose d’un repli serveur lorsque la connexion est disponible. Les réponses, photos et progression sont enregistrées dans IndexedDB ; les anciens brouillons localStorage sont conservés et migrés à la lecture. Une erreur de lecture n’entraîne pas l’écrasement du brouillon par un profil vide.

**Disponible sans serveur, après une première ouverture complète :** questions au clavier, reprise de la progression, ajout de photos, récapitulatif, aperçu du portfolio et PDF local. **Connexion au serveur nécessaire :** transcription Whisper, reformulation Qwen, publication/retrait d’une page et MP4. La voix de lecture dépend des voix installées sur le téléphone. Aucune publication différée automatique n’est effectuée.

Pour contrôler le cache et le PDF sans navigateur : `npm run test:offline` (version de production attendue sur le port 3001, ou `TEST_BASE_URL` configurée). Ce test n’est pas une preuve d’installation sur téléphone ni d’autorisation effective du micro.

```sh
npm run build
npm start
```

Le service worker est activé uniquement en production. L’ouverture initiale met en cache l’interface, ses scripts, ses icônes et sa police locale DM Sans (licence OFL dans `public/fonts/`). Le formulaire et les photos du brouillon restent utilisables hors connexion. Whisper, la reformulation IA, la publication et la vidéo nécessitent une connexion au serveur ; le PDF peut être créé localement. La dictée du navigateur peut également nécessiter Internet.

L’installation et le micro nécessitent HTTPS ou localhost. Sur un téléphone, une adresse LAN en HTTP n’est pas suffisante pour garantir le micro. Utiliser une adresse HTTPS valide pour le test mobile. Installer depuis le menu du navigateur ; sur iPhone, Safari → Partager → Sur l’écran d’accueil. Le support de la reconnaissance et du partage varie selon le navigateur.

## Vérifications exécutables

```sh
npm run typecheck
npm run build
npm run test:smoke
```

Le smoke test attend une application sur http://localhost:3000. Définir `TEST_BASE_URL` pour un autre port. Il utilise un profil et une image synthétiques, vérifie les vrais fichiers PDF/MP4, la validation, les images invalides, l’origine, le cookie, la confidentialité du téléphone, la publication et le retrait. Sa page de test est retirée en fin d’exécution. Si `test-results/reponse-francaise.wav` existe et Whisper est prêt, il contrôle aussi la reconnaissance de mots attendus dans cet audio.

Les requêtes de test incluent maintenant l’en-tête `Origin`, comme un navigateur. Cela couvre le défaut corrigé qui rejetait les trois actions avec 403 : Next expose son adresse d’écoute dans `request.url`, différente de l’adresse utilisée par le navigateur. La vérification utilise désormais l’en-tête `Host` ; les autres origines restent refusées. Derrière un reverse proxy qui termine HTTPS, définir `APP_ORIGIN` avec l’adresse publique exacte (voir `.env.example`). Les brouillons existants sans les nouveaux champs sont également testés.

Le test vocal synthétique ne mesure pas la qualité sur les voix et accents des utilisatrices. Une erreur a été observée sur le mot « couturière » malgré la bonne reconnaissance de la localisation et des prestations. Les essais avec de vraies artisanes, le micro d’un téléphone, l’installation PWA, le mode avion et le rendu visuel dans un navigateur restent nécessaires avant une démonstration terrain.

Les fichiers de test, modèles, dépendances et données locales sont ignorés par Git et Docker. Le document Word source reste inchangé. Opportunités, propositions commerciales, comptes et paiement restent hors périmètre.
#   t a l e n t p r o o f 
 
 
