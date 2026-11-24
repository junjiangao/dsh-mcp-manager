/** The Host controller: file scopes, registration, tools, and the OAuth RPC. */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { McpManagerController } from '../src/host/controller.ts'
import { Config } from '../src/settings.ts'
import type { ManagerSettings } from '../src/settings.ts'
import type { Snapshot } from '../src/types.ts'

const roots: string[] = []
const originalHome = process.env.DSH_HOME
afterEach(async () => {
  if (originalHome === undefined) delete process.env.DSH_HOME
  else process.env.DSH_HOME = originalHome
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

async function profileDir(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'dsh-mcp-'))
  roots.push(root)
  const profile = join(root, 'profiles', 'desktop')
  await rm(profile, { recursive: true, force: true })
  return profile
}

interface Harness {
  readonly controller: McpManagerController
  readonly settings: Snapshot
  readonly registered: Map<string, () => void>
  readonly calls: string[]
  readonly guard: (execution: { readonly name: string }) => string | undefined
}

async function harness(options: { readonly disabledTools?: Record<string, string[]>; readonly projectRoot?: string } = {}): Promise<Harness> {
  const profile = await profileDir()
  process.env.DSH_HOME = join(profile, '..', '..', 'home')
  const registered = new Map<string, () => void>()
  const calls: string[] = []
  let guard: (execution: { readonly name: string }) => string | undefined = () => undefined
  const manager = {
    list: () => [...registered.keys()].map(name => ({ name, configured: false })),
    register: (name: string) => {
      calls.push(name)
      const dispose = (): void => { registered.delete(name) }
      registered.set(name, dispose)
      return dispose
    },
    startAuthorization: async () => ({ id: 'attempt-1', phase: 'waiting-browser' as const, authorizationUrl: 'https://auth.test' }),
    cancelAuthorization: async () => {},
    signOut: async () => {},
  }
  const settings = {
    documentPath: join(profile, 'settings.yml'),
    writable: true,
    configure: () => () => {},
  }
  const tools = {
    schemas: () => [
      { name: 'mcp__demo__read', description: 'read', parameters: {} },
      { name: 'mcp__other__x', description: 'other', parameters: {} },
      { name: 'read_file', description: 'builtin', parameters: {} },
    ],
    guard: (fn: typeof guard) => { guard = fn; return () => {} },
    get: () => ({}),
    restrict: () => () => {},
  }
  const workspace = options.projectRoot === undefined ? undefined : { id: 1, path: options.projectRoot, title: 'Project' }
  const ctx = {
    settings,
    tools,
    mcpManager: manager,
    logger: { warn: () => {}, info: () => {}, error: () => {} },
    get: (name: string) => name === 'workspaceRegistry' && workspace !== undefined ? { list: () => [workspace] } : undefined,
    on: () => () => {},
    effect: (factory: () => unknown) => {
      const dispose = factory()
      return async (): Promise<void> => {
        if (typeof dispose === 'function') await (dispose as () => unknown)()
      }
    },
    connection: { fetch: { register: () => async () => {} } },
  } as unknown as Context
  const config = Config({ disabledTools: options.disabledTools ?? {} }) as unknown as ManagerSettings
  const controller = new McpManagerController(ctx, config, () => ({}))
  await controller.start()
  return {
    controller,
    settings: await controller.handle('snapshot', {}, new AbortController().signal).then(result => {
      if (!result.ok) throw new Error(result.error.message)
      return result.value as Snapshot
    }),
    registered,
    calls,
    guard: execution => guard(execution),
  }
}

async function snapshot(h: Harness, payload: Record<string, unknown> = {}): Promise<Snapshot> {
  const result = await h.controller.handle('snapshot', payload, new AbortController().signal)
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
  return result.value as Snapshot
}

describe('file scope writes', () => {
  it('creates, disables, and removes a profile server through the RPC', async () => {
    const h = await harness()
    const created = await h.controller.handle('upsertServer', {
      scope: 'profile',
      server: { id: 'demo', transport: 'stdio', command: 'node', env: { A: '1' } },
    }, new AbortController().signal)
    expect(created.ok).toBe(true)
    expect(h.registered.has('demo')).toBe(true)
    expect((await snapshot(h)).servers[0]?.registration).toEqual({ state: 'registered' })

    await h.controller.handle('setServerEnabled', { id: 'demo', enabled: false }, new AbortController().signal)
    expect(h.registered.has('demo')).toBe(false)
    expect((await snapshot(h)).servers[0]?.enabled).toBe(false)

    await h.controller.handle('removeServer', { id: 'demo' }, new AbortController().signal)
    expect((await snapshot(h)).servers).toEqual([])
  })

  it('rejects a project path the workspace registry does not own', async () => {
    const h = await harness({ projectRoot: '/tmp/workspace' })
    const result = await h.controller.handle('upsertServer', {
      scope: 'project',
      projectPath: '/tmp/other',
      server: { id: 'demo', transport: 'stdio', command: 'node' },
    }, new AbortController().signal)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('validation')
  })

  it('writes inside the selected workspace and echoes the project path', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-ws-'))
    roots.push(root)
    const h = await harness({ projectRoot: root })
    const result = await h.controller.handle('upsertServer', {
      scope: 'project',
      projectPath: root,
      server: { id: 'demo', transport: 'stdio', command: 'node' },
    }, new AbortController().signal)
    expect(result.ok).toBe(true)
    const document = JSON.parse(await readFile(join(root, '.dsh', 'mcp.json'), 'utf8')) as { mcpServers: Record<string, unknown> }
    expect(Object.keys(document.mcpServers)).toEqual(['demo'])
    expect((await snapshot(h, { projectPath: root })).projectPath).toBe(root)
  })

  it('refuses to edit a server defined by the read-only compatibility file', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-ws-'))
    roots.push(root)
    await writeFile(join(root, '.mcp.json'), JSON.stringify({ mcpServers: { compat: { command: 'node' } } }))
    const h = await harness({ projectRoot: root })
    const view = (await snapshot(h, { projectPath: root })).servers[0]
    expect(view?.writable).toBe(false)
    const result = await h.controller.handle('removeServer', { id: 'compat', projectPath: root }, new AbortController().signal)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('not-writable')
  })
})

describe('tools', () => {
  it('projects MCP tools with their server and disable state', async () => {
    const h = await harness({ disabledTools: { demo: ['mcp__demo__read'] } })
    const view = await snapshot(h)
    expect(view.tools.map(tool => tool.name)).toEqual(['mcp__demo__read', 'mcp__other__x'])
    expect(view.tools[0]).toMatchObject({ serverId: 'demo', enabled: false })
    expect(h.guard({ name: 'mcp__demo__read' })).toMatch(/disabled/u)
    expect(h.guard({ name: 'read_file' })).toBeUndefined()
  })

  it('reports the workspace directory as the panel sees it', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-ws-'))
    roots.push(root)
    const h = await harness({ projectRoot: root })
    expect((await snapshot(h)).workspaces).toEqual([{ id: '1', path: root, title: 'Project' }])
  })
})

describe('OAuth operations', () => {
  it('starts, cancels, and signs out only for a managed server', async () => {
    const h = await harness()
    const unknown = await h.controller.handle('authorize', { name: 'ghost' }, new AbortController().signal)
    expect(unknown.ok).toBe(false)
    if (!unknown.ok) expect(unknown.error.code).toBe('not-found')

    await h.controller.handle('upsertServer', {
      scope: 'profile',
      server: {
        id: 'remote', transport: 'streamable-http', url: 'https://x.test/mcp',
        oauth: { credentialKey: 'mcp-client/remote', requestTimeoutMs: 1_000, authorizationTimeoutMs: 2_000 },
      },
    }, new AbortController().signal)
    const started = await h.controller.handle('authorize', { name: 'remote' }, new AbortController().signal)
    expect(started.ok).toBe(true)
    if (started.ok) expect(started.value).toMatchObject({ phase: 'waiting-browser', authorizationUrl: 'https://auth.test' })
    expect((await h.controller.handle('cancelAuthorization', { name: 'remote', id: 'attempt-1' }, new AbortController().signal)).ok).toBe(true)
    expect((await h.controller.handle('signOut', { name: 'remote' }, new AbortController().signal)).ok).toBe(true)
  })
})

describe('disposal', () => {
  it('withdraws every registration and refuses later calls', async () => {
    const h = await harness()
    await h.controller.handle('upsertServer', { scope: 'profile', server: { id: 'demo', transport: 'stdio', command: 'node' } }, new AbortController().signal)
    expect(h.registered.has('demo')).toBe(true)
    await h.controller.dispose()
    expect(h.registered.size).toBe(0)
    const late = await h.controller.handle('snapshot', {}, new AbortController().signal)
    expect(late.ok).toBe(false)
  })
})
