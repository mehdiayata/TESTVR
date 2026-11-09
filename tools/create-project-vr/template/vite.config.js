import fs from 'node:fs';
import { defineConfig } from 'vite';

const certificate = '/app/.certs/server-cert.pem';
const key = '/app/.certs/server-key.pem';

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  server: {
    host: '0.0.0.0',
    port: Number(process.env.VR_PORT || 5173),
    strictPort: true,
    https: fs.existsSync(certificate) && fs.existsSync(key)
      ? { cert: fs.readFileSync(certificate), key: fs.readFileSync(key) }
      : undefined,
  },
});
