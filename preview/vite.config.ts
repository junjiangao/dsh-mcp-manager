import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

/**
 * Preview-only Vite build.
 *
 * The panel ships as a `__ModuleLoader__` bundle; this build is a throwaway
 * page for reviewing the UI without installing the plugin into a profile. It
 * reuses the test double for the Web shell's primitive bundle (the real one is
 * tree-shaken by the shell and cannot be imported directly) and bundles React
 * from this repo's dev dependencies.
 */
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  cacheDir: fileURLToPath(new URL('../.vite-preview-cache', import.meta.url)),
  resolve: {
    alias: {
      '@deepseek-ai/dsh-client-ui-primitives': fileURLToPath(new URL('../tests/stubs/ui-primitives.tsx', import.meta.url)),
    },
  },
  esbuild: { jsx: 'automatic' },
  build: {
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
})
