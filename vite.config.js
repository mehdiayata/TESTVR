import fs from 'node:fs';
import { defineConfig } from 'vite';

const keyPath = '/app/.certs/server-key.pem';
const certificatePath = '/app/.certs/server-cert.pem';
const https = fs.existsSync(keyPath) && fs.existsSync(certificatePath)
  ? {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certificatePath),
    }
  : undefined;

export default defineConfig({
  // GitHub Pages serves project sites below /<repository>/; local HTTPS keeps /.
  base: process.env.GITHUB_PAGES_BASE || '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    https,
  },
});
