#!/usr/bin/env node
/**
 * Reject a peer declaration the running DSH runtime would call incompatible.
 *
 * `dsh` gates every profile plugin before the Loader imports it: a plugin whose
 * `@deepseek-ai/dsh` / `@deepseek-ai/dsh-*` requirement the running runtime
 * does not satisfy is loaded **disabled**, with a `dsh plugin allow-version`
 * remedy. `evaluatePluginCompatibility` in `@deepseek-ai/dsh-app-boot`
 * (`lib/index.js:7988`) decides in two steps:
 *
 * 1. When the plugin declares `engines.dsh`, that range alone decides; every
 *    peer warning is suppressed.
 * 2. Otherwise all `@deepseek-ai/dsh*` peers must satisfy the runtime.
 *
 * `includePrerelease: true` is load-bearing — without it `^0.2.0-rc.1` would
 * reject `0.2.1-alpha.1`. This script reproduces that predicate so a bad
 * manifest fails in CI instead of on a user's next `dsh` upgrade. It does not
 * depend on `dsh-app-boot` (which pulls a native addon and its own peer tree).
 *
 * Usage:
 *   node scripts/check-dsh-compat.mjs                 # installed dsh version
 *   node scripts/check-dsh-compat.mjs 0.2.1-alpha.1   # explicit runtime
 *   node scripts/check-dsh-compat.mjs 0.3.0           # expect a failure
 */

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import semver from 'semver'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

/**
 * The running DSH version. Every `@deepseek-ai/dsh-*` package ships the same
 * version, so any installed one answers for the runtime.
 * @returns {string} a semantic version.
 */
function installedRuntimeVersion() {
  const require = createRequire(import.meta.url)
  const probe = '@deepseek-ai/dsh-mcp-client/package.json'
  try {
    return JSON.parse(readFileSync(require.resolve(probe), 'utf8')).version
  } catch (error) {
    console.error(`check:compat cannot determine the installed dsh version: ${error.message}`)
    console.error('Pass the runtime version explicitly: node scripts/check-dsh-compat.mjs <version>')
    process.exit(2)
  }
}

/** @param {string} name @returns {boolean} whether the runtime gates this peer. */
function isGatedPeer(name) {
  return name === '@deepseek-ai/dsh' || name.startsWith('@deepseek-ai/dsh-')
}

const runtimeVersion = process.argv[2] ?? installedRuntimeVersion()
if (semver.valid(runtimeVersion) === null) {
  console.error(`check:compat received an invalid runtime version: ${JSON.stringify(runtimeVersion)}`)
  process.exit(2)
}

/** @type {Record<string, string>} */
const incompatiblePeers = {}
for (const [name, range] of Object.entries(manifest.peerDependencies ?? {})) {
  if (!isGatedPeer(name) || typeof range !== 'string') continue
  if (!semver.satisfies(runtimeVersion, range, { includePrerelease: true })) incompatiblePeers[name] = range
}

const enginesDsh = manifest.engines?.dsh
if (typeof enginesDsh === 'string' && enginesDsh.trim() !== '') {
  if (semver.satisfies(runtimeVersion, enginesDsh, { includePrerelease: true })) {
    console.log(`check:compat ok — ${manifest.name}@${manifest.version} accepts dsh ${runtimeVersion} (engines.dsh ${enginesDsh})`)
    process.exit(0)
  }
  console.error(
    `Plugin ${manifest.name}@${manifest.version} is incompatible with dsh ${runtimeVersion}:`
    + ` engines.dsh ${JSON.stringify(enginesDsh)}`,
  )
  console.error(
    'Running it may cause crashes or data loss. Update the plugin, or widen engines.dsh'
    + ' deliberately — an incompatible engine leaves the Loader row disabled on the next dsh start.',
  )
  process.exit(1)
}

if (Object.keys(incompatiblePeers).length === 0) {
  console.log(`check:compat ok — ${manifest.name}@${manifest.version} accepts dsh ${runtimeVersion} (no engines.dsh, every dsh peer satisfied)`)
  process.exit(0)
}

console.error(
  `Plugin ${manifest.name}@${manifest.version} is incompatible with dsh ${runtimeVersion}:`
  + ` peerDependencies ${JSON.stringify(incompatiblePeers)}`,
)
console.error(
  'Running it may cause crashes or data loss. Update the plugin, or widen the requirement'
  + ' deliberately — an incompatible peer leaves the Loader row disabled on the next dsh start.',
)
process.exit(1)
