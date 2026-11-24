#!/usr/bin/env node
/**
 * Build the standalone panel preview.
 *
 * The plugin ships as a `__ModuleLoader__` bundle that only the DSH Web shell
 * can execute, and this checkout deliberately does not install it into a
 * profile. This script bundles the same React components over fixed fixture
 * data with Vite, then inlines the JS and CSS into one HTML file so the page
 * opens from disk without a server.
 *
 * Usage: node scripts/build-preview.mjs [--out <path>]
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const preview = join(root, 'preview')
const dist = join(preview, 'dist')
const cache = join(root, '.vite-preview-cache')
const outIndex = process.argv.indexOf('--out')
const out = outIndex === -1 ? join(preview, 'mcp-panel-preview.html') : resolve(process.argv[outIndex + 1])

function inline() {
  let document = readFileSync(join(dist, 'index.html'), 'utf8')
  const assets = join(dist, 'assets')
  const files = readdirSync(assets)
  const script = files.find(name => /\.m?js$/u.test(name))
  const style = files.find(name => name.endsWith('.css'))
  if (script === undefined) throw new Error('the preview build produced no script')
  document = document
    .replace(/<script[^>]+src="[^"]*assets\/[^"]*"[^>]*><\/script>/gu, '')
    .replace(/<link[^>]+href="[^"]*assets\/[^"]*"[^>]*>/gu, '')
  const styleTag = style === undefined ? '' : `<style>\n${readFileSync(join(assets, style), 'utf8')}\n</style>\n`
  const scriptTag = `<script type="module">\n${readFileSync(join(assets, script), 'utf8')}\n</script>\n`
  document = document.replace('</head>', `${styleTag}</head>`).replace('</body>', `${scriptTag}</body>`)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, document)
}
const mode = process.argv.includes('--check') ? 'check' : 'build'
if (mode === 'build') {
  execFileSync(join(root, 'node_modules', '.bin', 'vite'), ['build', '--config', join(preview, 'vite.config.ts')], {
    cwd: root,
    stdio: 'inherit',
  })
  inline()
  rmSync(dist, { recursive: true, force: true })
  rmSync(cache, { recursive: true, force: true })
  console.log(`preview written to ${out}`)
} else {
  const document = readFileSync(out, 'utf8')
  if (!document.includes('<script type="module">') || document.includes('assets/')) {
    console.error(`${out} is not a self-contained preview; run node scripts/build-preview.mjs`)
    process.exit(1)
  }
  console.log(`preview check ok — ${out} (${String(document.length)} bytes)`)
}
