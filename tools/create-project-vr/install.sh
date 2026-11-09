#!/usr/bin/env bash
set -euo pipefail

source_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
install_dir="$HOME/.local/share/create-project-vr"
bin_dir="$HOME/.local/bin"

mkdir -p "$install_dir" "$bin_dir"
rm -rf "$install_dir/template"
cp -a "$source_dir/create-project-vr" "$source_dir/template" "$install_dir/"
ln -sfn "$install_dir/create-project-vr" "$bin_dir/create-project-vr"

if [[ ":$PATH:" != *":$bin_dir:"* ]] && ! grep -Fq 'export PATH="$HOME/.local/bin:$PATH"' "$HOME/.bashrc" 2>/dev/null; then
  printf '\nexport PATH="$HOME/.local/bin:$PATH"\n' >> "$HOME/.bashrc"
fi

echo "Commande installée : $bin_dir/create-project-vr"
echo 'Ouvrez un nouveau terminal WSL avant de l’utiliser.'
