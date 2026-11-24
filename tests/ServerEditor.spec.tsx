// @vitest-environment jsdom

/** The create/edit dialog: target choice and file-key rows must stay usable at any width. */

import * as React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ServerSummary } from '../src/client/summary.ts'
import { createDraft } from '../src/client/draft.ts'
import { ServerEditor } from '../src/client/ServerEditor.tsx'
import type { McpLocaleKey } from '../src/client/locales.ts'

const t = ((key: string, params?: Record<string, unknown>) => params === undefined ? key : `${key}:${Object.values(params).join(',')}`) as (key: McpLocaleKey, params?: Record<string, unknown>) => string

function row(overrides: Partial<ServerSummary> = {}): ServerSummary {
  return {
    name: 'demo',
    kind: 'file',
    label: 'demo',
    enabled: true,
    transport: 'stdio',
    scope: 'user',
    path: '/home/user/.dsh/mcp.json',
    writable: true,
    compat: false,
    shadowed: [],
    command: 'node',
    args: [],
    cwd: '',
    url: '',
    env: [{ key: 'CBM_SEMANTIC_ENABLED', state: { set: true, sensitive: true, template: false, credential: false } }],
    headers: [],
    toolCallTimeoutMs: 60_000,
    startupTimeoutMs: 30_000,
    closeTimeoutMs: 5_000,
    reconnect: { enabled: true, initialDelayMs: 500, maxDelayMs: 30_000, maxAttempts: 10 },
    toolLoading: 'eager',
    tools: [],
    disabledTools: [],
    conflict: false,
    ...overrides,
  }
}

const noop = (): void => {}

afterEach(cleanup)

describe('server editor', () => {
  it('shows the file scope of an edited server and keeps long keys readable', () => {
    const target = row()
    const { container } = render(
      <ServerEditor row={target} draft={createDraft(target)} busy={false} entryWritable hasWorkspace hasProjectSelection={false}
        t={t} onClose={noop} onSave={noop} />,
    )
    const select = container.querySelector<HTMLSelectElement>('select.dsh-mcp-target')
    expect(select?.value).toBe('user')
    expect(Array.from(select?.options ?? []).map(option => option.value)).toEqual(['entry', 'project', 'profile', 'user'])
    expect(screen.getByText('editor.secretHint')).toBeTruthy()
    expect(screen.getByText('editor.noProject')).toBeTruthy()
    const key = container.querySelector<HTMLInputElement>('.dsh-mcp-row-key input')
    expect(key?.value).toBe('CBM_SEMANTIC_ENABLED')
    expect(key?.title).toBe('CBM_SEMANTIC_ENABLED')
  })

  it('saves to the chosen file scope instead of the default entry', () => {
    const target = row({ env: [] })
    const onSave = vi.fn()
    const { container } = render(
      <ServerEditor row={target} draft={createDraft(target)} busy={false} entryWritable hasWorkspace hasProjectSelection={false}
        t={t} onClose={noop} onSave={onSave} />,
    )
    const select = container.querySelector<HTMLSelectElement>('select.dsh-mcp-target')
    expect(select).not.toBeNull()
    fireEvent.change(select as HTMLSelectElement, { target: { value: 'profile' } })
    fireEvent.click(screen.getByText('save'))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0]?.[0]).toMatchObject({ target: 'profile', name: 'demo', command: 'node' })
  })

  it('renders its own dialog shell and keeps the actions outside the scrolling body', () => {
    const target = row()
    const { container } = render(
      <ServerEditor row={target} draft={createDraft(target)} busy={false} entryWritable hasWorkspace hasProjectSelection={false}
        t={t} onClose={noop} onSave={noop} />,
    )
    const dialog = container.querySelector('[role="dialog"]')
    expect(dialog?.className).toContain('dsh-mcp-dialog')
    expect(screen.getByText('editor.edit:demo')).toBeTruthy()
    const body = container.querySelector('[data-modal-content]')
    expect(body?.className).toContain('dsh-mcp-dialog-body')
    expect(body?.querySelectorAll('.dsh-mcp-map-row')).toHaveLength(1)
    expect(screen.getByText('save').closest('[data-modal-footer]')).not.toBeNull()
    expect(screen.getByText('cancel').closest('[data-modal-footer]')).not.toBeNull()
  })

  it('keeps the dialog open and explains a rejected save', () => {
    const target = row({ name: '' })
    const onSave = vi.fn()
    const { container } = render(
      <ServerEditor row={target} draft={createDraft(target)} busy={false} entryWritable hasWorkspace hasProjectSelection={false}
        t={t} onClose={noop} onSave={onSave} />,
    )
    fireEvent.click(screen.getByText('save'))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(container.querySelector('.dsh-mcp-input-invalid')).not.toBeNull()
  })

  it('starts a new server on the official entry', () => {
    const { container } = render(
      <ServerEditor row={undefined} draft={createDraft(undefined, 'entry')} busy={false} entryWritable hasWorkspace hasProjectSelection={false}
        t={t} onClose={noop} onSave={noop} />,
    )
    expect(container.querySelector<HTMLSelectElement>('select.dsh-mcp-target')?.value).toBe('entry')
  })
})
