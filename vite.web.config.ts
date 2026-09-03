import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';

const local = (path: string) => fileURLToPath(new URL(path, import.meta.url));
// Static deployment shares all map/AR components with the local Vinext app.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: {
    'next/link': local('./web/navigation.tsx'),
    'next/navigation': local('./web/navigation.tsx'),
    '@': local('./'),
  } },
  css: { postcss: { plugins: [tailwindcss()] } },
  build: { outDir: 'dist/web', emptyOutDir: true },
});
