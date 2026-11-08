# Développement WebXR local avec Meta Quest

Guide réutilisable pour développer dans VS Code et tester dans un Meta Quest sur le réseau local, sans tunnel, compte externe ni publication.

## Architecture

```text
Quest ── Wi-Fi local ── Windows :5173 ── redirection Windows ── Docker / Vite
```

Le projet tourne dans Docker sous Debian WSL. Le serveur Vite sert le site en HTTPS sur le port 5173. Le code reste exclusivement sur le PC.

## Prérequis

- Windows 11, WSL 2 et Debian ;
- Docker Desktop configuré pour WSL ;
- VS Code avec l’extension WSL ;
- PC et Quest connectés au même réseau local ;
- Node.js et npm utilisés uniquement dans Docker.

Ouvrir le projet dans VS Code depuis Debian WSL :

```sh
cd /home/UTILISATEUR/projects/mon-projet-vr
code .
```

## Fichiers à reprendre

- `Dockerfile` : image Node et OpenSSL ;
- `compose.yaml` : serveur Vite, volume `node_modules` et port 5173 ;
- `vite.config.js` : écoute sur `0.0.0.0`, port fixe et HTTPS ;
- `.env` : adresse IPv4 actuelle de Windows ;
- `.gitignore` : exclut `.certs/`, `.env`, `node_modules/` et `dist/`.

Le serveur crée dans `.certs/` les certificats de développement local. Ces fichiers ne doivent jamais être ajoutés à Git.

## Définir l’adresse IP locale

Dans PowerShell :

```powershell
ipconfig
```

Repérer l’adresse IPv4 de l’interface Wi-Fi ou Ethernet. Dans `.env`, définir par exemple :

```dotenv
LOCAL_IP=192.168.1.75
```

Si l’adresse attribuée par la box change, mettre à jour `.env` et redémarrer Docker. Une réservation DHCP dans la box évite ce changement.

## Autoriser le Quest sur Windows

Docker Desktop publie parfois le port seulement sur `localhost`. Ouvrir **PowerShell en tant qu’administrateur**, puis exécuter :

```powershell
netsh interface portproxy add v4tov4 listenaddress=192.168.1.75 listenport=5173 connectaddress=127.0.0.1 connectport=5173
New-NetFirewallRule -DisplayName "Mon projet VR HTTPS local" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173 -Profile Private
```

Adapter l’adresse IP si elle change. Vérifier l’ouverture du port :

```powershell
Test-NetConnection -ComputerName 192.168.1.75 -Port 5173
```

Le résultat attendu est `TcpTestSucceeded : True`.

Pour supprimer ces réglages :

```powershell
netsh interface portproxy delete v4tov4 listenaddress=192.168.1.75 listenport=5173
Remove-NetFirewallRule -DisplayName "Mon projet VR HTTPS local"
```

## Démarrer et arrêter

Depuis Debian WSL :

```sh
cd /home/UTILISATEUR/projects/mon-projet-vr
docker compose up --build
```

Arrêter avec :

```sh
docker compose down
```

## Adresses à ouvrir

- Sur le PC : `https://localhost:5173`
- Sur le Quest : `https://192.168.1.75:5173`

Le certificat est local et auto-signé. Si Meta Quest Browser propose une option pour poursuivre, indiquer que le site local est sûr. Si le navigateur refuse toute exception, importer une fois `.certs/test-vr-local-ca.crt` comme autorité de certification sur le Quest.

## Rechargement et VR

Vite recharge automatiquement la page après chaque enregistrement dans VS Code. Pendant une session immersive, le navigateur peut demander de quitter puis de relancer la session VR.

## Diagnostic

| Symptôme | Action |
| --- | --- |
| Le PC fonctionne, pas le Quest | Vérifier le même Wi-Fi, l’IP dans `.env`, la redirection Windows et le pare-feu. |
| `http://…:5173` ne répond pas | Normal : le serveur est HTTPS uniquement. |
| L’IP a changé | Mettre à jour `.env`, puis recréer la redirection Windows et redémarrer Docker. |
| Le bouton VR n’apparaît pas sur PC | Tester depuis le Quest : le navigateur PC peut ne pas fournir `immersive-vr`. |

## Publication

Cette configuration est réservée au développement local. Pour créer le site statique à publier :

```sh
docker compose exec app npm run build
```

Ne publier ni `.certs/`, ni `.env`, ni `node_modules/`.
