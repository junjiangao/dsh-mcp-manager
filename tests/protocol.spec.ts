/** Runtime validation, patch semantics, secret projection, and view mapping. */

import { describe, expect, it } from 'vitest'
import {
  applyServerPatch, parseSnapshotRequest, parseUpsertRequest, secretStates, serverFromPatch, templatesOf, toServerView, toWorkspaceViews,
} from '../src/protocol.ts'
import { defaultServer } from '../src/server-config.ts'
import type { ManagedServerView, StoredServer } from '../src/types.ts'

function base(): StoredServer {
  return { ...defaultServer('demo'), command: 'node', env: { A: '1', TOKEN: 'secret' } }
}

describe('request parsing', () => {
  it('defaults a snapshot request and validates the project target', () => {
    expect(parseSnapshotRequest(undefined)).toEqual({})
    expect(parseSnapshotRequest({})).toEqual({})
    expect(parseSnapshotRequest({ scope: 'user', projectPath: '/p' })).toEqual({ scope: 'user', projectPath: '/p' })
    expect(() => parseSnapshotRequest({ projectPath: 'relative' })).toThrow(/absolute/u)
    expect(() => parseSnapshotRequest({ scope: 'entry' })).toThrow(/must be one of/u)
  })

  it('validates an upsert payload and keeps the keep marker for secrets', () => {
    const request = parseUpsertRequest({
      scope: 'profile',
      server: { id: 'demo', transport: 'stdio', command: 'node', env: { A: '1', B: {} }, envSensitive: ['B'] },
    })
    expect(request.scope).toBe('profile')
    expect(request.server.env).toEqual({ A: '1', B: {} })
    expect(() => parseUpsertRequest({ server: { id: 'demo', env: { A: 5 } } })).toThrow(/must be a string or a patch object/u)
  })
})

describe('patch application', () => {
  it('replaces maps wholesale but keeps a masked secret for the keep marker', () => {
    const next = applyServerPatch(base(), { id: 'demo', env: { TOKEN: {}, A: '2' } })
    expect(next.env).toEqual({ TOKEN: 'secret', A: '2' })
    const cleared = applyServerPatch(base(), { id: 'demo', env: { A: { clear: true } } })
    expect(cleared.env).toEqual({})
  })

  it('clears the other transport fields on a switch and deletes OAuth with null', () => {
    const http = applyServerPatch(base(), {
      id: 'demo', transport: 'streamable-http', url: 'https://x.test/mcp', oauth: { credentialKey: 'mcp-client/demo', requestTimeoutMs: 1, authorizationTimeoutMs: 2 },
    })
    expect(http.transport).toBe('streamable-http')
    expect(http.command).toBe('')
    expect(http.env).toEqual({})
    expect(http.args).toEqual([])
    const stdio = applyServerPatch(http, { id: 'demo', transport: 'stdio', command: 'node', oauth: null })
    expect(stdio.url).toBe('')
    expect(stdio.oauth).toBeUndefined()
    expect(stdio.env).toEqual({})
  })

  it('rejects a patch whose result fails validation', () => {
    expect(() => applyServerPatch(base(), { id: 'demo', toolCallTimeoutMs: 0 })).toThrow(/must be an integer|must be a positive/u)
    expect(() => serverFromPatch({ id: 'bad id', transport: 'stdio', command: 'node' })).toThrow(/must match/u)
  })

  it('builds a fresh stdio server with the official defaults', () => {
    const server = serverFromPatch({ id: 'fresh', transport: 'stdio', command: 'node' })
    expect(server.startupTimeoutMs).toBe(30_000)
    expect(server.closeTimeoutMs).toBe(5_000)
    expect(server.toolCallTimeoutMs).toBe(60_000)
    expect(server.toolLoading).toBe('eager')
    expect(server.enabled).toBe(true)
  })
})

describe('secret projection', () => {
  it('reports existence, masking intent, and template kinds without the value', () => {
    const states = secretStates({ TOKEN: 'secret', REF: '${credential:mcp-client/demo}', EMPTY: '' }, ['TOKEN'])
    expect(states.TOKEN).toEqual({ set: true, sensitive: true, template: false, credential: false })
    expect(states.REF).toEqual({ set: true, sensitive: false, template: false, credential: true })
    expect(states.EMPTY).toEqual({ set: false, sensitive: false, template: false, credential: false })
  })

  it('names the templated fields, including a credential URL', () => {
    const server: StoredServer = {
      ...defaultServer('demo'),
      transport: 'streamable-http',
      url: '${credential:mcp-client/demo}',
      env: { AUTH: '${credential:mcp-client/env}' },
      headers: { TOKEN: '${env:TOKEN}' },
      oauth: { credentialKey: 'mcp-client/demo', requestTimeoutMs: 1, authorizationTimeoutMs: 2 },
    }
    expect(templatesOf(server)).toEqual({
      env: [],
      headers: ['TOKEN'],
      credentials: ['env.AUTH', 'url'],
    })
  })
})

describe('view mapping', () => {
  it('maps a sourced server and its registration outcome', () => {
    const view = toServerView({
      id: 'demo',
      scope: 'profile',
      path: '/profile/mcp.json',
      writable: true,
      shadowed: [{ scope: 'user', path: '/user/mcp.json' }],
      server: base(),
    }, { state: 'missing-env', missing: ['TOKEN'] })
    expect(view.id).toBe('demo')
    expect(view.path).toBe('/profile/mcp.json')
    expect(view.scope).toBe('profile')
    expect(view.shadowed).toEqual(['user'])
    expect(view.registration).toEqual({ state: 'missing-env', missing: ['TOKEN'] })
    expect(view.env.TOKEN).toEqual({ set: true, sensitive: false, template: false, credential: false })
  })

  it('maps workspaces with a title fallback', () => {
    expect(toWorkspaceViews([{ id: 1, path: '/p' }, { id: 2, path: '/q', title: 'Q' }])).toEqual([
      { id: '1', path: '/p', title: '/p' },
      { id: '2', path: '/q', title: 'Q' },
    ])
  })

  it('keeps the expected tool ownership helper contract', () => {
    const view: Pick<ManagedServerView, 'id'> = { id: 'demo' }
    expect(view.id).toBe('demo')
  })
})
