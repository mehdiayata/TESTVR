# Test VR local

Environnement WebXR local pour Meta Quest 3S, basé sur Three.js et Vite. Aucun tunnel ni service tiers n’est utilisé.

## Démarrer le serveur HTTPS local

Vérifiez que `.env` contient l’adresse IPv4 actuelle de Windows sur le réseau local. Pour l’obtenir, exécutez `ipconfig` dans PowerShell.

```sh
docker compose up --build
```

Le PC est accessible via `https://localhost:5173` et le Quest via `https://ADRESSE-IP-DE-WINDOWS:5173`.

La scène présente un demi-terrain de basket de rue avec un seul panier, des lignes peintes, un sol asphalté, une clôture et des bâtiments. Une balle se trouve au sol près du joueur. Le joystick gauche déplace le joueur dans la direction du regard, dans les limites du terrain. Maintenez la gâchette pour attirer et tenir la balle, puis relâchez-la pour démarrer un dribble : la balle descend, rebondit au sol et suit la manette pendant les déplacements. La hauteur des yeux est ajustée une fois au début de la session VR à 1,78 m, tout en gardant les mouvements de tête. Le suivi des mains est désactivé. La balle rebondit aussi sur le panneau et l’arceau ; elle peut traverser le panier.

Pour tirer, gardez la gâchette enfoncée et poussez la manette vers l’avant et vers le haut en direction du panier, puis relâchez-la pendant le geste. La trajectoire et la puissance dépendent du mouvement ; une légère aide corrige les tirs déjà proches de la direction du panier. Un relâchement calme conserve le dribble.

Un ballon qui traverse l’arceau de haut en bas ajoute un point. Le score apparaît sur le panneau au-dessus du panier et sur la page ; un même tir ne peut marquer qu’une fois.

Une boucle musicale discrète joue pendant la session VR. Chaque choc du ballon avec le sol, le panneau ou l’arceau produit un son dont le volume dépend de l’impact. Les deux fichiers WAV sont des sons originaux du projet, générés sans dépendance supplémentaire avec `docker compose run --rm --no-deps app node scripts/generateAudio.mjs`.

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
