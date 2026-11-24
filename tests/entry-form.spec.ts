/** The two shared settings-form writers. */

import { describe, expect, it } from 'vitest'
import type { ConfigForm, ConfigFormSnapshot } from '@deepseek-ai/dsh-client-ui-settings/client'
import { createOwnForm, createUpstreamForm } from '../src/client/entry-form.ts'
import type { UpstreamConfig } from '../src/client/summary.ts'

interface Recorded {
  readonly ops: readonly unknown[]
}

function fakeForm<T>(initial: T): ConfigForm<T> & { readonly recorded: Recorded[] } {
  let snapshot: ConfigFormSnapshot<T> = { status: 'ready', writable: true, revision: 1, value: initial }
  const recorded: Recorded[] = []
  return {
    recorded,
    getSnapshot: () => snapshot,
    subscribe: () => () => {},
    mutate: async (ops) => { recorded.push({ ops: structuredClone(ops) }); return true },
    set: async () => true,
    unset: async () => true,
  } as unknown as ConfigForm<T> & { readonly recorded: Recorded[] }
}

describe('upstream form face', () => {
  it('maps the snapshot and writes whole server entries', async () => {
    const form = fakeForm<UpstreamConfig>({ servers: { a: { command: 'node', env: { A: '1' } } } })
    const face = createUpstreamForm(form)
    expect(face.snapshot()).toMatchObject({ status: 'ready', writable: true, revision: 1 })
    await face.setServer('a', { command: 'deno', enabled: false })
    expect(form.recorded[0]).toEqual({ ops: [{ op: 'set', path: ['servers', 'a'], value: { command: 'deno', enabled: false } }] })
  })

  it('removes one entry without touching the others', async () => {
    const form = fakeForm<UpstreamConfig>({ servers: { a: { command: 'node' }, b: { command: 'node' } } })
    await createUpstreamForm(form).removeServer('a')
    expect(form.recorded[0]).toEqual({ ops: [{ op: 'unset', path: ['servers', 'a'] }] })
  })

  it('toggles enabled while preserving every other stored field', async () => {
    const form = fakeForm<UpstreamConfig>({ servers: { a: { command: 'node', env: { A: '1' }, toolLoading: 'on-demand' } } })
    expect(await createUpstreamForm(form).setEnabled('a', false)).toBe(true)
    expect(form.recorded[0]).toEqual({
      ops: [{ op: 'set', path: ['servers', 'a'], value: { command: 'node', env: { A: '1' }, toolLoading: 'on-demand', enabled: false } }],
    })
    expect(await createUpstreamForm(form).setEnabled('missing', true)).toBe(false)
  })

  it('reports an unavailable form instead of throwing', () => {
    const form = fakeForm<UpstreamConfig>({ servers: {} })
    form.getSnapshot = () => ({ status: 'unavailable', writable: false, value: { servers: {} } }) as ConfigFormSnapshot<UpstreamConfig>
    expect(createUpstreamForm(form).snapshot()).toEqual({ status: 'unavailable', writable: false, value: { servers: {} } })
  })
})

describe('own form face', () => {
  it('sets a non-empty list and unsets an empty one', async () => {
    const form = fakeForm<{ disabledTools?: Record<string, string[]> }>({ disabledTools: { a: ['x'] } })
    const face = createOwnForm(form)
    await face.setDisabledTools('a', ['x', 'y'])
    await face.setDisabledTools('a', [])
    expect(form.recorded).toEqual([
      { ops: [{ op: 'set', path: ['disabledTools', 'a'], value: ['x', 'y'] }] },
      { ops: [{ op: 'unset', path: ['disabledTools', 'a'] }] },
    ])
  })
})
