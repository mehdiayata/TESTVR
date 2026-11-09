# Test VR local

Environnement WebXR local pour Meta Quest 3S, basé sur Three.js et Vite. Aucun tunnel ni service tiers n’est utilisé.

## Générer un modèle avec Blender

Blender est disponible dans un service Docker distinct du serveur Vite. Le panier est généré par un script Python exécuté dans ce service ; aucun Blender ni Python local n'est nécessaire.

```sh
docker compose build blender
docker compose run --rm blender --python scripts/blender/create_street_hoop.py
```

Le script exporte `public/assets/models/street-hoop.glb`, chargé automatiquement dans la scène. Le panneau et l'arceau ont des collisions ; le filet bouge et ralentit légèrement le ballon lorsqu'un panier est marqué. Si le modèle ne charge pas, un panier simple reste visible.

## Démarrer le serveur HTTPS local

Vérifiez que `.env` contient l’adresse IPv4 actuelle de Windows sur le réseau local. Pour l’obtenir, exécutez `ipconfig` dans PowerShell.

```sh
docker compose up --build
```

Le PC est accessible via `https://localhost:5173` et le Quest via `https://ADRESSE-IP-DE-WINDOWS:5173`.

La scène présente un demi-terrain de basket de rue avec un seul panier, des lignes peintes, un sol asphalté, une clôture et des bâtiments. Une balle se trouve au sol près du joueur. Le joystick gauche permet de marcher dans la direction du regard. Maintenez la gâchette de préhension de la manette droite en déplaçant le joystick pour courir à vitesse modérée ; des traits de vitesse apparaissent sur les côtés du champ de vision. Le joueur reste dans les limites du terrain. Maintenez la gâchette principale d’une manette pour attirer et tenir la balle : elle suit le déplacement du joueur pendant la saisie, même lorsqu’il court. Quand vous la relâchez calmement, la balle tombe et conserve brièvement l’élan du joueur avant de ralentir au sol ; elle ne suit plus le joueur. La hauteur des yeux est ajustée une fois au début de la session VR à 1,78 m, tout en gardant les mouvements de tête. Le suivi des mains est désactivé. La balle rebondit aussi sur le panneau et l’arceau ; elle peut traverser le panier.

Pour tirer, gardez la gâchette principale enfoncée et poussez la manette vers l’avant et vers le haut en direction du panier, puis relâchez-la pendant le geste. La trajectoire et la puissance dépendent du mouvement ; une légère aide corrige les tirs déjà proches de la direction du panier.

Pour un tir assisté en cloche, saisissez la balle avec une gâchette principale, puis maintenez aussi celle de l’autre manette. La balle se place entre les deux mains. Poussez les deux bras vers le haut et vers le panier, puis relâchez une gâchette pendant le geste : la vitesse et l'amplitude du mouvement déterminent principalement la puissance, avec une correction partielle de la visée. La trajectoire monte davantage avant de redescendre vers l'arceau. Un tir lointain demande un geste plus ample et plus rapide ; le panier n'est jamais garanti. Ouvrir les mains sans geste ne tire pas. La visée à deux mains n'a plus de limite de temps ni de jauge. L’arceau et sa zone de score ont été agrandis pour rendre les paniers plus accessibles.

La touche **Y** de la manette gauche ouvre ou ferme le menu des réglages. Pointez une jauge avec une manette et appuyez sur sa gâchette principale pour modifier le tir en cloche, la vitesse de marche, la vitesse de course ou la puissance de tir. Le jeu s'immobilise et la saisie du ballon est suspendue pendant que le menu est ouvert. Sur PC, la touche **Y** ouvre les mêmes curseurs utilisables à la souris.

La gâchette de préhension gauche, actionnée par le majeur, fait sauter le joueur. La marche et la course accélèrent progressivement avec le joystick ; les traits de vitesse deviennent plus visibles à mesure que la course prend de l'élan. Plus le joueur va vite au moment de sauter, plus il monte haut. Pour atteindre le panier, courez avec la gâchette de préhension droite et le joystick, puis pressez la préhension gauche dans la zone large devant l'arceau. Le cercle s'illumine quand l'élan suffit pour ce saut. Le joueur s'élève vers le cercle, monte d'autant plus haut qu'il court vite, s'y accroche brièvement puis redescend. Gardez le ballon en main pendant l'ascension pour le dunker au sommet : il traverse le filet et rapporte un point. Sans ballon tenu, le saut et la suspension restent possibles mais ne marquent pas.

Sur PC, déplacez la caméra libre près du panier et appuyez sur **K** pour tester l'élévation, la suspension, le dunk, le score et le son sans casque. Cette commande de développement ne reproduit pas les gestes des manettes.

Un ballon qui traverse l’arceau de haut en bas ajoute un point. Le score apparaît sur le panneau au-dessus du panier et sur la page ; un même tir ne peut marquer qu’une fois.

Une boucle musicale discrète joue pendant la session VR. Chaque choc du ballon avec le sol, le panneau ou l’arceau produit un son dont le volume dépend de l’impact. Un buzzer retentit lorsqu'un panier est marqué. Les WAV peuvent être régénérés avec `docker compose run --rm --no-deps app node scripts/generateAudio.mjs`.

## Approuver le certificat local

Au premier démarrage, Docker crée dans `.certs/` :

- `test-vr-local-ca.crt` : autorité de certification locale ;
- `server-cert.pem` : certificat du serveur, valable uniquement pour l’adresse déclarée dans `.env`.

Ces fichiers sont ignorés par Git et ne quittent jamais la machine. Pour que le navigateur du Quest reconnaisse l’adresse HTTPS sans avertissement, importez le fichier `.certs/test-vr-local-ca.crt` comme certificat d’autorité sur le casque. Cette étape dépend de la version de Horizon OS et des réglages de sécurité de l’appareil.

Si l’adresse IP locale change, mettez à jour `LOCAL_IP` dans `.env` puis redémarrez :

```sh
docker compose down
docker compose up --build
```

## Arrêter

```sh
docker compose down
```

## Publier sur GitHub Pages

Le workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) construit le jeu dans Docker et publie automatiquement le dossier `dist` à chaque envoi sur la branche par défaut du dépôt GitHub. Il calcule le chemin de base selon le nom du dépôt : `/<nom-du-dépôt>/` pour un dépôt de projet, `/` pour un dépôt nommé `<utilisateur>.github.io`. Le serveur local conserve le chemin `/`.

Une fois le dépôt relié à GitHub, choisissez **Settings → Pages → Build and deployment → Source: GitHub Actions**, puis envoyez la branche par défaut. L'URL publiée est indiquée dans le déploiement GitHub Pages. Le site est servi en HTTPS, nécessaire à WebXR sur le Quest.
