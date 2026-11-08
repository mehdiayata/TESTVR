# AGENTS.md — Développement WebXR / Meta Quest 3S

## 1. Présentation du projet

Ce projet est consacré au développement d'expériences immersives en réalité virtuelle (VR), principalement destinées au **Meta Quest 3S**.

Les expériences doivent fonctionner directement dans le navigateur du casque grâce à WebXR, sans nécessiter la création d'une application Android native.

Le développement est réalisé avec VS Code et Codex, sous Debian WSL sur Windows 11.

## 2. Stack technique

- **JavaScript** : langage principal, avec modules ES.
- **Three.js** : rendu et gestion des scènes 3D.
- **WebXR** : immersion VR, suivi du casque et interaction avec les contrôleurs.
- **Vite** : serveur de développement et compilation de production.
- **Node.js** : exécuté exclusivement dans Docker.
- **Docker Compose** : lancement de l'environnement local.
- **Cloudflare Quick Tunnel** : accès HTTPS temporaire au serveur local depuis le Quest 3S.
- **GitHub Pages** : hébergement des versions publiées.

Éviter d'introduire des frameworks ou dépendances supplémentaires sans nécessité.

## 3. Architecture du projet

Structure cible indicative :

```text
test-vr/
├── AGENTS.md
├── compose.yaml
├── Dockerfile
├── .dockerignore
├── .gitignore
├── package.json
├── package-lock.json
├── vite.config.js
├── index.html
├── public/
│   └── assets/
├── src/
│   ├── main.js
│   ├── scene/
│   ├── vr/
│   └── utils/
└── .github/
    └── workflows/
```

Responsabilités :

- `src/main.js` : initialisation de l'application.
- `src/scene/` : scènes, objets 3D, éclairages et animations.
- `src/vr/` : configuration WebXR, contrôleurs et interactions VR.
- `src/utils/` : fonctions techniques réutilisables.
- `public/assets/` : modèles 3D, textures, sons et autres ressources statiques.

La structure peut évoluer en fonction des besoins réels du projet.

## 4. Règles de développement

- Privilégier un code simple, lisible, modulaire et maintenable.
- Utiliser JavaScript moderne avec `import` / `export`.
- Éviter les fichiers volumineux et les responsabilités mélangées.
- Séparer la logique de la scène 3D, les interactions VR et l'initialisation.
- Ne pas ajouter de complexité architecturale inutile.
- Éviter les dépendances non indispensables.
- Prévoir la gestion des erreurs et le nettoyage des ressources Three.js.
- Ne jamais intégrer de secrets ou de tokens dans le dépôt Git.

## 5. Contraintes VR

Le Meta Quest 3S est la plateforme cible principale.

Toute fonctionnalité doit tenir compte des contraintes suivantes :

- Compatibilité avec le navigateur Meta Quest et WebXR.
- Utilisation des contrôleurs VR pour les interactions immersives.
- Prise en charge des six degrés de liberté (6DoF).
- Performances adaptées à un casque VR autonome.
- Limitation des appels de rendu, des allocations répétées et des objets inutiles.
- Optimisation raisonnable des textures, matériaux, lumières et géométries.
- Gestion correcte de l'entrée et de la sortie du mode VR.

L'expérience doit également rester consultable sur un navigateur PC classique lorsque cela est possible.

Les fonctionnalités nécessitant un casque doivent être testées sur le Quest 3S.

## 6. Environnement de développement

Le projet est développé dans le système de fichiers Debian WSL.

**Node.js et npm ne doivent pas être installés sur Windows pour ce projet.**

Toutes les commandes Node.js et npm doivent être exécutées via Docker.

Docker Compose doit permettre :

- De démarrer le serveur Vite.
- D'accéder au projet depuis le navigateur Windows.
- De bénéficier du rechargement automatique lors des modifications.
- De conserver les dépendances dans un environnement Docker isolé.

Le code source reste accessible directement depuis VS Code.

Ne pas modifier la configuration Docker globale, WSL ou les autres projets présents sur la machine.

## 7. Tests sur le Meta Quest 3S

Le développement doit pouvoir être testé en VR sans publication sur GitHub Pages.

Prévoir :

1. Un serveur Vite local accessible depuis Windows.
2. Un accès HTTPS temporaire via Cloudflare Quick Tunnel.
3. Une URL HTTPS ouvrable dans le navigateur du Quest 3S.
4. Un bouton permettant d'entrer en mode VR.
5. Le rechargement de la scène pendant le développement, dans la mesure permise par le navigateur et la session WebXR.

L'accès HTTPS doit être compatible avec les WebSockets de Vite pour le rechargement automatique.

Ne pas désactiver les protections de sécurité du navigateur pour faire fonctionner WebXR.

Les tunnels de développement ne doivent pas exposer de données sensibles.

## 8. Publication

Les versions publiques doivent pouvoir être déployées sur GitHub Pages.

- Produire un site statique avec `vite build`.
- Configurer correctement le chemin de base Vite pour GitHub Pages.
- Ne pas nécessiter de serveur Node.js en production.
- Prévoir une publication automatisée via GitHub Actions.
- Ne jamais inclure les dépendances `node_modules` dans Git.

La publication GitHub Pages est distincte des tests VR locaux.

## 9. Consignes pour Codex

Avant toute modification importante :

1. Examiner la structure et le code existants.
2. Respecter les conventions du projet.
3. Expliquer brièvement les changements architecturaux nécessaires.
4. Privilégier la solution la plus simple répondant au besoin.

Après une modification :

- Vérifier la compilation lorsque cela est possible.
- Signaler les erreurs et les limites de validation.
- Ne pas prétendre avoir testé le rendu dans le casque sans test réel.
- Fournir les commandes Docker nécessaires.

**Priorité : développer rapidement des expériences VR fonctionnelles, sans sacrifier la maintenabilité ni compliquer inutilement l'environnement.**