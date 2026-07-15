import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import React from 'react'
import { DeleteSessionDialog } from '@/components/sessions/delete-session-dialog'
import type { POCSession } from '@/lib/types'

/**
 * Unit tests for DeleteSessionDialog component
 * Validates: Requirements 2.1, 2.3, 2.4, 4.2, 4.3, 4.4
 */

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockDeleteSession = vi.fn()

vi.mock('@/lib/store', () => ({
  useData: () => ({
    deleteSession: mockDeleteSession,
  }),
}))

const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockSession: POCSession = {
  id: 'ses-101',
  date: '2024-06-15',
  committeeType: 'DIVISIONAL',
  projectIds: ['proj-1', 'proj-2'],
  status: 'DRAFT',
  attendees: ['user-1'],
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DeleteSessionDialog', () => {
  let onOpenChange: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onOpenChange = vi.fn()
    mockDeleteSession.mockReset()
    mockToastSuccess.mockReset()
    mockToastError.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders with correct session identification (committee type + date)', () => {
    // Validates: Requirement 2.1, 2.4
    render(
      <DeleteSessionDialog
        session={mockSession}
        open={true}
        onOpenChange={onOpenChange}
      />
    )

    // Should display the committee type label
    expect(screen.getByText('Divisional')).toBeInTheDocument()
    // Should display the formatted date
    expect(screen.getByText('15 June 2024')).toBeInTheDocument()
  })

  it('displays a permanent deletion warning', () => {
    // Validates: Requirement 2.1
    render(
      <DeleteSessionDialog
        session={mockSession}
        open={true}
        onOpenChange={onOpenChange}
      />
    )

    expect(
      screen.getByText(/permanent and cannot be undone/i)
    ).toBeInTheDocument()
  })

  it('disables both buttons while delete is in-flight', async () => {
    // Validates: Requirement 4.4
    // Make deleteSession hang (never resolve) to simulate in-flight state
    let resolveDelete: (value: boolean) => void
    mockDeleteSession.mockImplementation(
      () => new Promise<boolean>((resolve) => { resolveDelete = resolve })
    )

    render(
      <DeleteSessionDialog
        session={mockSession}
        open={true}
        onOpenChange={onOpenChange}
      />
    )

    const deleteButton = screen.getByRole('button', { name: /delete/i })
    const cancelButton = screen.getByRole('button', { name: /cancel/i })

    // Buttons should be enabled initially
    expect(deleteButton).not.toBeDisabled()
    expect(cancelButton).not.toBeDisabled()

    // Click delete to start the in-flight request
    await act(async () => {
      fireEvent.click(deleteButton)
    })

    // Both buttons should now be disabled
    expect(deleteButton).toBeDisabled()
    expect(cancelButton).toBeDisabled()

    // Resolve to clean up
    await act(async () => {
      resolveDelete!(true)
    })
  })

  it('closes on cancel without triggering deletion', () => {
    // Validates: Requirement 2.3
    render(
      <DeleteSessionDialog
        session={mockSession}
        open={true}
        onOpenChange={onOpenChange}
      />
    )

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)

    // deleteSession should NOT have been called
    expect(mockDeleteSession).not.toHaveBeenCalled()
  })

  it('displays success toast after successful deletion', async () => {
    // Validates: Requirement 4.2
    mockDeleteSession.mockResolvedValue(true)

    render(
      <DeleteSessionDialog
        session={mockSession}
        open={true}
        onOpenChange={onOpenChange}
      />
    )

    const deleteButton = screen.getByRole('button', { name: /delete/i })

    await act(async () => {
      fireEvent.click(deleteButton)
    })

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('Session deleted successfully.')
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('displays error toast after failed deletion', async () => {
    // Validates: Requirement 4.3
    mockDeleteSession.mockResolvedValue(false)

    render(
      <DeleteSessionDialog
        session={mockSession}
        open={true}
        onOpenChange={onOpenChange}
      />
    )

    const deleteButton = screen.getByRole('button', { name: /delete/i })

    await act(async () => {
      fireEvent.click(deleteButton)
    })

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Failed to delete session. Please try again.')
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('displays error toast when deleteSession throws', async () => {
    // Validates: Requirement 4.3
    mockDeleteSession.mockRejectedValue(new Error('Network error'))

    render(
      <DeleteSessionDialog
        session={mockSession}
        open={true}
        onOpenChange={onOpenChange}
      />
    )

    const deleteButton = screen.getByRole('button', { name: /delete/i })

    await act(async () => {
      fireEvent.click(deleteButton)
    })

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Failed to delete session. Please try again.')
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('renders correctly for different committee types', () => {
    // Validates: Requirement 2.4
    const clusterSession: POCSession = {
      ...mockSession,
      committeeType: 'CLUSTER',
      date: '2024-12-01',
    }

    render(
      <DeleteSessionDialog
        session={clusterSession}
        open={true}
        onOpenChange={onOpenChange}
      />
    )

    expect(screen.getByText('Cluster')).toBeInTheDocument()
    expect(screen.getByText('1 December 2024')).toBeInTheDocument()
  })
})
