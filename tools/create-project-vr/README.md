# Générateur de projets WebXR

Ce dossier contient un modèle vierge indépendant du prototype de basket.

## Installation unique dans Debian WSL

```sh
bash /home/mehdi/projects/test-vr/tools/create-project-vr/install.sh
```

Ouvrez ensuite un nouveau terminal WSL. WSL et Docker doivent déjà être installés et le moteur Docker accessible à l'utilisateur.

## Nouveau projet

```sh
mkdir -p ~/projects/mon-experience
cd ~/projects/mon-experience
create-project-vr --port=5132
```

Si l'adresse IPv4 Windows n'est pas détectée automatiquement :

```sh
create-project-vr --port=5132 --quest-ip=192.168.1.75
```

La commande refuse d'écraser un dossier non vide ou d'utiliser un port occupé. Elle construit les images Docker, démarre Vite en HTTPS et affiche les URL PC et Quest. La première construction de Blender peut prendre plusieurs minutes ; son image est partagée entre projets.

La scène vierge comprend une caméra libre sur PC pour tester sans casque : clic dans la vue, souris, ZQSD/WASD, Espace/Maj et Échap pour libérer la souris. Les futurs jeux doivent garder ce mode de test en plus de leur mode VR.

Complétez `docs-agent/PROJECT.md` à la main et ajoutez, si nécessaire, d'autres Markdown dans `docs-agent/`. Premier prompt conseillé à Codex :

> Lis AGENTS.md et les documents utiles de docs-agent/. Lance `sh scripts/check-env.sh`, vérifie la configuration WebXR et indique ce qui doit être testé dans le Quest. Ensuite, développe le besoin étape par étape.

Dans chaque projet, `docker compose up -d app` redémarre le serveur, `docker compose down` l'arrête et `sh scripts/check-env.sh` vérifie la compilation et Blender. Les sons sont des fichiers fournis par le propriétaire dans `public/assets/audio/` ; aucun son n'est créé automatiquement.
