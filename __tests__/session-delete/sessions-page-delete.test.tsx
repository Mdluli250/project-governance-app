import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

/**
 * Unit tests for sessions page delete button integration
 * Validates: Requirements 1.1, 1.2, 1.4, 2.1
 *
 * Tests the delete button visibility based on permissions and
 * that accessible aria-labels are present.
 */

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockSessions = [
  {
    id: 'ses-1',
    date: '2024-03-15',
    committeeType: 'DIVISIONAL' as const,
    projectIds: ['proj-1'],
    status: 'DRAFT' as const,
    attendees: [],
  },
  {
    id: 'ses-2',
    date: '2024-04-20',
    committeeType: 'CLUSTER' as const,
    projectIds: ['proj-2'],
    status: 'COMPLETED' as const,
    attendees: ['user-1'],
  },
]

const mockProjects = [
  {
    id: 'proj-1',
    shortTitle: 'Alpha Project',
    longTitle: 'Alpha Project Full',
    classification: 'A' as const,
    cluster: 'Cluster1',
    impactArea: 'Area1',
    pmId: 'user-1',
    sponsorName: 'Sponsor',
    strategicObjectives: [],
    contractValue: 100,
    contractTerm: 12,
    startDate: '2024-01-01',
    endDate: '2025-01-01',
    thisYearAmount: 50,
    riskComplexity: 'HIGH' as const,
    reputationalRisk: 'HIGH' as const,
    rag: { overall: 'GREEN' as const, scope: 'GREEN' as const, schedule: 'GREEN' as const, cost: 'GREEN' as const, quality: 'GREEN' as const, risk: 'GREEN' as const, sheq: 'GREEN' as const, data: 'GREEN' as const, compliance: 'GREEN' as const },
    healthNarrative: '',
    lastUpdated: '2024-01-01',
  },
  {
    id: 'proj-2',
    shortTitle: 'Beta Project',
    longTitle: 'Beta Project Full',
    classification: 'B' as const,
    cluster: 'Cluster2',
    impactArea: 'Area2',
    pmId: 'user-2',
    sponsorName: 'Sponsor 2',
    strategicObjectives: [],
    contractValue: 50,
    contractTerm: 6,
    startDate: '2024-02-01',
    endDate: '2024-08-01',
    thisYearAmount: 25,
    riskComplexity: 'MEDIUM' as const,
    reputationalRisk: 'MEDIUM' as const,
    rag: { overall: 'AMBER' as const, scope: 'AMBER' as const, schedule: 'AMBER' as const, cost: 'AMBER' as const, quality: 'AMBER' as const, risk: 'AMBER' as const, sheq: 'AMBER' as const, data: 'AMBER' as const, compliance: 'AMBER' as const },
    healthNarrative: '',
    lastUpdated: '2024-02-01',
  },
]

let mockCurrentUser = { id: 'user-1', name: 'Admin', email: 'admin@test.com', role: 'ADMIN' as const }

const mockAddSession = vi.fn()
const mockDeleteSession = vi.fn()

vi.mock('@/lib/store', () => ({
  useData: () => ({
    sessions: mockSessions,
    projects: mockProjects,
    addSession: mockAddSession,
    deleteSession: mockDeleteSession,
    loadSessions: vi.fn(),
    sessionsData: null,
    loadingStates: {},
  }),
  useAuth: () => ({
    currentUser: mockCurrentUser,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}))

// ─── Import after mocks ─────────────────────────────────────────────────────

import SessionsPage from '@/app/(dashboard)/sessions/page'
import { canPerformAction } from '@/lib/rules'

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Sessions page delete button integration', () => {
  beforeEach(() => {
    mockCurrentUser = { id: 'user-1', name: 'Admin', email: 'admin@test.com', role: 'ADMIN' }
  })

  it('shows delete buttons when user has DELETE_SESSION permission (ADMIN)', () => {
    // Validates: Requirement 1.1
    render(<SessionsPage />)

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    // One delete button per session
    expect(deleteButtons.length).toBe(mockSessions.length)
  })

  it('shows delete buttons when user has DELETE_SESSION permission (POC_CHAIR)', () => {
    // Validates: Requirement 1.1
    mockCurrentUser = { id: 'user-2', name: 'Chair', email: 'chair@test.com', role: 'POC_CHAIR' }

    render(<SessionsPage />)

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    expect(deleteButtons.length).toBe(mockSessions.length)
  })

  it('hides delete buttons when user does not have DELETE_SESSION permission (PM)', () => {
    // Validates: Requirement 1.2
    mockCurrentUser = { id: 'user-3', name: 'Manager', email: 'pm@test.com', role: 'PM' }

    render(<SessionsPage />)

    const deleteButtons = screen.queryAllByRole('button', { name: /delete/i })
    expect(deleteButtons.length).toBe(0)
  })

  it('hides delete buttons when user does not have DELETE_SESSION permission (POC_MEMBER)', () => {
    // Validates: Requirement 1.2
    mockCurrentUser = { id: 'user-4', name: 'Member', email: 'member@test.com', role: 'POC_MEMBER' }

    render(<SessionsPage />)

    const deleteButtons = screen.queryAllByRole('button', { name: /delete/i })
    expect(deleteButtons.length).toBe(0)
  })

  it('delete button has accessible aria-label with committee type and date', () => {
    // Validates: Requirement 1.4
    render(<SessionsPage />)

    // Check aria-label for the DIVISIONAL session (15 March 2024)
    const divisionalButton = screen.getByLabelText(
      /Delete Divisional session on 15 March 2024/
    )
    expect(divisionalButton).toBeInTheDocument()

    // Check aria-label for the CLUSTER session (20 April 2024)
    const clusterButton = screen.getByLabelText(
      /Delete Cluster session on 20 April 2024/
    )
    expect(clusterButton).toBeInTheDocument()
  })
})
