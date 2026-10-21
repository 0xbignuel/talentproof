# Musique des vidéos

Sur l’écran final, la vidéo propose **Avec une musique douce**, activé par
défaut. Décocher produit un MP4 sans piste audio. **Écouter la musique**
ouvre un lecteur ; aucun son ne démarre automatiquement.

Morceau : **Carefree**, Kevin MacLeod (incompetech.com). Instrumental :
ukulélé, guitare, marimba, glockenspiel et percussions, 96 BPM.
Licence : [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
[Source officielle](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400037).
Les crédits et la provenance sont conservés dans `public/audio/CREDITS.md`.

Le serveur utilise le fichier local `public/audio/carefree.mp3`, sans
appeler un fournisseur de musique lors de l’export. Il adapte la durée,
réduit l’amplitude à 22 %, ajoute des fondus audio de 0,8 et 1,2 seconde,
et encode en AAC. Les crédits sont visibles dans la scène finale et
enregistrés dans les métadonnées du MP4. Aucune nouvelle dépendance.

L’écoute du morceau nécessite une connexion si le navigateur ne l’a pas
déjà mis en cache. La génération du MP4, musical ou silencieux, nécessite
toujours le serveur. Le PDF et la page portfolio restent inchangés.

## Vérification

Après la construction et le démarrage de l’application sur le port 3001 :

```sh
npm run test:video
```

Configurer `TEST_BASE_URL` pour une autre adresse. Le test vérifie les
deux exports réels, leur décodage, la piste AAC et son niveau moyen, les
crédits en métadonnées, la durée et le rejet d’un choix de musique
invalide. Il extrait l’image des crédits dans `test-results/` pour
inspection visuelle. Il ne remplace pas une écoute sur téléphone.
