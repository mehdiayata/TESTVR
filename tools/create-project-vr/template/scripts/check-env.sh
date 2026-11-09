#!/bin/sh
set -eu

docker compose run --rm --no-deps app npm run build
docker compose run --rm --no-deps blender --version

echo 'Compilation et Blender : OK.'
echo 'Entrée en VR, suivi des contrôleurs et confort : à valider dans le casque.'
