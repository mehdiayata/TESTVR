# AGENTS.md — Développement de l'expérience WebXR

Ce dépôt est une expérience VR pour le navigateur du Meta Quest 3S. Ce fichier décrit les règles techniques communes. Les objectifs et contraintes propres à cette expérience se trouvent dans les Markdown de `docs-agent/`.

## Lire le besoin avant de coder

- Au début d'une tâche, lire les documents pertinents de `docs-agent/`, en commençant par `docs-agent/PROJECT.md`. Le propriétaire peut ajouter d'autres Markdown dans ce dossier ; les consulter selon le sujet traité.
- Examiner le code existant avant de modifier l'architecture. Conserver les décisions déjà prises pour cette expérience tant qu'elles répondent au besoin.
- Si un point du besoin manque, avancer sur ce qui est clair et demander une précision seulement si elle conditionne la suite.
- Ne pas ajouter de décor, de mécanique ou de dépendance sur la seule base du modèle de projet vierge.

## Ressources disponibles

| Ressource | Rôle |
| --- | --- |
| JavaScript ES modules et Three.js | Scène 3D, rendu, WebXR, contrôleurs et audio spatial. |
| Vite et Node.js dans Docker | Développement avec rechargement et compilation du site statique. Ne pas installer Node/npm sur Windows ou dans Debian pour ce projet. |
| Docker Compose | Lance le serveur HTTPS local et isole les dépendances. `.env` contient le port et l'adresse locale du PC. |
| Blender et Python dans un service Docker séparé | Création ou modification de modèles 3D exportés en `.glb` quand le besoin le demande. |
| `public/assets/` | Modèles, textures et sons propres à l'expérience. Les sons sont fournis par le propriétaire ; Codex ne crée pas de sons. |

L'accès local au Quest utilise HTTPS avec un certificat généré par le projet. Le navigateur peut afficher un avertissement au premier accès. Aucune publication ni aucun tunnel n'est configuré par défaut.

## Organisation du code

```text
AGENTS.md                 règles techniques pour Codex
docs-agent/               besoin et contexte de l'expérience, rédigés par le propriétaire
src/main.js               démarrage, rendu, cycle de vie de l'application
src/scene/                scène, objets 3D, éclairage et animations propres au jeu
src/vr/                   configuration WebXR, contrôleurs, interactions et caméra libre PC
src/utils/                fonctions réellement partagées, si nécessaire
public/assets/models/     modèles 3D chargés par le navigateur
public/assets/audio/      sons fournis pour l'expérience
public/assets/textures/   textures, si l'expérience en utilise
scripts/blender/           scripts de génération de modèles 3D, si nécessaires
compose.yaml              services Docker du projet
vite.config.js            configuration Vite et HTTPS
```

Les dossiers `src/scene/`, `src/utils/` et `public/assets/textures/` peuvent être créés au fur et à mesure. Garder `src/main.js` centré sur l'assemblage : extraire une fonctionnalité quand elle devient suffisamment distincte, sans multiplier les fichiers artificiellement.

## Code lisible et maintenable

- Utiliser des noms explicites, des fonctions courtes et des modules à responsabilité claire. Séparer les règles du jeu, les objets de scène et les entrées VR.
- Commenter les intentions, les choix de coordonnées, les contraintes WebXR et les calculs difficiles à déduire du code. Éviter les commentaires qui répètent simplement l'instruction suivante.
- Regrouper les constantes réglables, notamment échelles, vitesses et seuils. Garder les unités cohérentes ; dans la scène VR, une unité Three.js représente généralement un mètre.
- Gérer les erreurs de chargement des assets et les absences de capacités du navigateur sans laisser une scène cassée silencieusement.
- Prévoir le nettoyage des listeners, boucles, géométries, matériaux, textures et sons lorsque les objets ou la scène sont détruits. Ne pas allouer inutilement d'objets à chaque image.
- Ajouter des dépendances seulement si leur utilité est concrète pour l'expérience. Ne jamais commettre `node_modules`, les certificats, les secrets ou les tokens.
- Quand l'architecture ou une commande change, mettre à jour la documentation concernée.

## VR et performances

- Chaque jeu doit être jouable en VR sur le Meta Quest 3S et testable sans casque sur PC. Conserver une caméra libre de développement : souris pour regarder, ZQSD/WASD pour se déplacer, Espace/Maj pour monter ou descendre. Elle ne doit pas déplacer la vue pendant une session WebXR.
- Rendre les interactions importantes vérifiables sur PC avec des commandes de test adaptées quand c'est possible. Ces commandes servent au développement et ne remplacent pas la validation des gestes et du confort dans le Quest.
- Viser le navigateur du Meta Quest 3S avec suivi 6DoF ; garder un affichage PC utilisable tout au long du développement.
- Prévoir correctement l'entrée et la sortie de session VR, la reprise du son après une action du joueur et la perte éventuelle d'un contrôleur.
- Choisir les interactions et le déplacement à partir de `docs-agent/`, sans imposer un mode de contrôle commun à tous les jeux. Tenir compte du confort et de l'échelle humaine.
- Surveiller la charge du casque : géométries et matériaux réutilisés, textures raisonnables, peu de lumières coûteuses et aucune opération lourde répétée dans la boucle de rendu.
- Signaler ce qui exige un test dans le Quest. Une compilation réussie ne valide ni le confort, ni les commandes, ni les performances dans le casque.

## Méthode de travail

1. Lire le besoin dans `docs-agent/`, puis inspecter les fichiers concernés.
2. Expliquer brièvement tout changement d'architecture important et implémenter la solution la plus simple qui couvre le besoin.
3. Vérifier la compilation avec `sh scripts/check-env.sh` lorsque c'est pertinent. Les commandes Node/npm passent uniquement par Docker.
4. Résumer les changements, les vérifications effectuées et les points à tester réellement dans le Quest, sans prétendre avoir effectué ce test.

Commandes utiles : `docker compose up -d app` pour démarrer, `docker compose down` pour arrêter, `docker compose run --rm blender --python scripts/blender/mon_modele.py` pour un script Blender existant.
