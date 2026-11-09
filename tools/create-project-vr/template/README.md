# Projet WebXR vierge

La scène initiale sert uniquement à vérifier que WebXR démarre et que les manettes sont suivies. Sur PC, cliquez dans la vue pour activer la caméra libre : souris pour regarder, ZQSD/WASD pour se déplacer, Espace/Maj pour monter ou descendre, Échap pour libérer la souris. Décrivez l'expérience dans `docs-agent/PROJECT.md` et ajoutez vos autres documents de besoin dans `docs-agent/` avant de développer le jeu.

## Démarrer

```sh
docker compose up -d app
```

Les adresses sont dans `.env` : `https://localhost:VR_PORT` sur PC et `https://VR_QUEST_IP:VR_PORT` dans le Quest. Le certificat local est généré au démarrage. Le navigateur peut demander d'accepter l'avertissement de certificat au premier accès.

```sh
sh scripts/check-env.sh
docker compose down
```

## Assets

- `public/assets/models/` : modèles `.glb` et autres assets 3D.
- `public/assets/audio/` : sons fournis pour cette expérience. Aucun son n'est généré par le projet.
- `scripts/blender/` : scripts Python Blender propres à cette expérience.

Pour exécuter un script Blender :

```sh
docker compose run --rm blender --python scripts/blender/mon_modele.py
```

Le service Blender est déjà construit lors de la création du projet. Il ne tourne pas en permanence.
