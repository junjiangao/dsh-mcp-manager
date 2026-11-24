/** Reconciliation between the effective file servers and the official manager. */

import { describe, expect, it } from 'vitest'
import { RegistrationFleet, type RegistrationManager } from '../src/host/registration.ts'
import { defaultServer } from '../src/server-config.ts'
import type { McpServerRegistration } from '@deepseek-ai/dsh-mcp-manager'
import type { StoredServer } from '../src/types.ts'

function manager(options: { readonly failWith?: string } = {}): RegistrationManager & { readonly calls: string[]; readonly disposed: string[] } {
  const calls: string[] = []
  const disposed: string[] = []
  return {
    calls,
    disposed,
    list: () => [],
    register(name) {
      calls.push(name)
      if (options.failWith !== undefined) throw new Error(options.failWith)
      return () => { disposed.push(name) }
    },
  }
}

function stdio(id: string, overrides: Partial<StoredServer> = {}): StoredServer {
  return { ...defaultServer(id), command: 'node', ...overrides }
}

describe('RegistrationFleet', () => {
  it('registers enabled servers once and reuses an unchanged registration', () => {
    const fake = manager()
    const fleet = new RegistrationFleet(fake, () => ({}))
    expect(fleet.reconcile([stdio('a'), stdio('b')]).map(result => result.outcome)).toEqual([
      { state: 'registered' }, { state: 'registered' },
    ])
    fleet.reconcile([stdio('a'), stdio('b')])
    expect(fake.calls).toEqual(['a', 'b'])
    expect(fleet.outcome('a')).toEqual({ state: 'registered' })
  })

  it('replaces a changed entry and disposes a removed one', () => {
    const fake = manager()
    const fleet = new RegistrationFleet(fake, () => ({}))
    fleet.reconcile([stdio('a', { command: 'node' }), stdio('b')])
    fleet.reconcile([stdio('a', { command: 'deno' })])
    expect(fake.calls).toEqual(['a', 'b', 'a'])
    expect(fake.disposed).toEqual(['b', 'a'])
    expect(fleet.outcome('b')).toEqual({ state: 'error', error: 'server has not been reconciled yet' })
  })

  it('skips and unregisters disabled servers, reporting why', () => {
    const fake = manager()
    const fleet = new RegistrationFleet(fake, () => ({}))
    fleet.reconcile([stdio('a')])
    const results = fleet.reconcile([stdio('a', { enabled: false })])
    expect(results[0]?.outcome).toEqual({ state: 'disabled' })
    expect(fake.disposed).toEqual(['a'])
  })

  it('reports unresolved environment variables and never registers the server', () => {
    const fake = manager()
    const fleet = new RegistrationFleet(fake, () => ({}))
    const server = stdio('a', { env: { TOKEN: '${MISSING}' } })
    expect(fleet.reconcile([server])[0]?.outcome).toEqual({ state: 'missing-env', missing: ['MISSING'] })
    expect(fake.calls).toEqual([])
  })

  it('rejects two servers that claim the same OAuth credential', () => {
    const fake = manager()
    const fleet = new RegistrationFleet(fake, () => ({}))
    const one = stdio('a', {
      transport: 'streamable-http', command: '', url: 'https://a.test',
      oauth: { credentialKey: 'mcp-client/shared', requestTimeoutMs: 1, authorizationTimeoutMs: 2 },
    })
    const two = stdio('b', {
      transport: 'streamable-http', command: '', url: 'https://b.test',
      oauth: { credentialKey: 'mcp-client/shared', requestTimeoutMs: 1, authorizationTimeoutMs: 2 },
    })
    const results = fleet.reconcile([one, two])
    expect(results.map(result => result.outcome.state)).toEqual(['invalid', 'invalid'])
    expect(fake.calls).toEqual([])
  })

  it('classifies duplicate-name and other registration failures', () => {
    expect(new RegistrationFleet(manager({ failWith: 'mcp-manager: server "a" is already configured or registered' }), () => ({}))
      .reconcile([stdio('a')])[0]?.outcome.state).toBe('conflict')
    expect(new RegistrationFleet(manager({ failWith: 'mcp-manager is disposed' }), () => ({}))
      .reconcile([stdio('a')])[0]?.outcome.state).toBe('error')
  })

  it('disposes every live registration on unload', () => {
    const fake = manager()
    const fleet = new RegistrationFleet(fake, () => ({}))
    fleet.reconcile([stdio('a'), stdio('b')])
    fleet.dispose()
    expect(fake.disposed).toEqual(['a', 'b'])
    expect(fleet.reconcile([stdio('a')])[0]?.outcome.state).toBe('error')
  })

  it('accepts a registration entry the official client schema accepts', () => {
    const entries: McpServerRegistration[] = []
    const fake: RegistrationManager = {
      list: () => [],
      register: (_name, entry) => { entries.push(entry); return () => {} },
    }
    new RegistrationFleet(fake, () => ({})).reconcile([stdio('a', { args: ['x'], env: { A: '1' } })])
    expect(entries[0]).toMatchObject({ transport: 'stdio', command: 'node', args: ['x'], env: { A: '1' } })
  })
})
