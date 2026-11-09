#!/bin/sh
set -eu

certificate_dir=/app/.certs
mkdir -p "$certificate_dir"

if [ ! -f "$certificate_dir/server-cert.pem" ] ||
   [ ! -f "$certificate_dir/server-key.pem" ] ||
   [ "$(cat "$certificate_dir/server-ip" 2>/dev/null || true)" != "$VR_QUEST_IP" ]; then
  openssl req -x509 -newkey rsa:2048 -sha256 -nodes -days 365 \
    -keyout "$certificate_dir/server-key.pem" \
    -out "$certificate_dir/server-cert.pem" \
    -subj "/CN=$VR_QUEST_IP" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:$VR_QUEST_IP" \
    >/dev/null 2>&1
  printf '%s' "$VR_QUEST_IP" > "$certificate_dir/server-ip"
fi

exec npm run dev -- --host 0.0.0.0 --port "$VR_PORT"
