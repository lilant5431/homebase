import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import EditorModal from './EditorModal'
import { emptyData } from './domain'

const getRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('creation without crypto.randomUUID', () => {
  it.each(['class', 'assignment', 'assessment', 'commitment'] as const)(
    'creates a %s with a secure fallback ID',
    (entity) => {
      vi.stubGlobal('crypto', { getRandomValues })
      const onSave = vi.fn<(item: { id: string }) => void>()
      render(
        <EditorModal
          modal={{ entity }}
          data={{
            ...emptyData(),
            classes: [{ id: 'existing-class', name: 'Biology', color: '#6b8b74', createdAt: '2026-10-04' }],
          }}
          onClose={() => {}}
          onSave={onSave}
        />,
      )
      fireEvent.change(
        screen.getByLabelText(
          entity === 'class' ? 'Class name' : entity === 'commitment' ? 'Commitment name' : 'Title',
        ),
        {
          target: { value: 'New entry' },
        },
      )
      if (entity !== 'class') {
        fireEvent.change(screen.getByLabelText(entity === 'assignment' ? 'Due date' : 'Date'), {
          target: { value: '2026-10-04' },
        })
      }
      if (entity === 'assignment' || entity === 'assessment') {
        fireEvent.change(screen.getByLabelText('Class'), { target: { value: 'existing-class' } })
      }
      if (entity === 'commitment') {
        fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '16:00' } })
        fireEvent.change(screen.getByLabelText('End time'), { target: { value: '17:00' } })
      }
      fireEvent.click(screen.getByRole('button', { name: `Add ${entity}` }))
      expect(onSave).toHaveBeenCalledOnce()
      expect(onSave.mock.calls[0][0].id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      )
    },
  )
})
