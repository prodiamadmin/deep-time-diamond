import { defineConfig } from 'vite';

// base:'./' keeps all asset URLs relative so the build is iframe-portable
// and deployable to any path (Vercel static or embedded on diamondguide).
export default defineConfig({
  base: './',
  // Force a single three.js instance — addons (postprocessing, etc.) must share it,
  // otherwise EffectComposer/passes silently fail ("Multiple instances of Three.js").
  resolve: { dedupe: ['three'] },
  optimizeDeps: { include: ['three'] },
  server: { port: 5180, open: false, host: true },
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 0,
    sourcemap: false,
  },
  assetsInclude: ['**/*.glb', '**/*.ktx2', '**/*.hdr', '**/*.webm'],
});
