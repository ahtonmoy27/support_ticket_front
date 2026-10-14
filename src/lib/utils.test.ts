import { describe, expect, it } from 'vitest'
import { date, errorText, initials, label, pageOf, permissions, validateFiles } from './utils'
import type { ApiPage, Ticket, User } from '../types'
import { ApiError } from './api'

describe('utils', () => {
  it('normalizes paginated API responses with meta or flat fields', () => {
    const resourcePage: ApiPage<string> = {
      data: ['a', 'b'],
      meta: {
        current_page: 2,
        last_page: 5,
        per_page: 25,
        total: 120,
      },
    }

    const flatPage: ApiPage<string> = {
      data: ['x', 'y'],
      current_page: 1,
      last_page: 3,
      per_page: 10,
      total: 30,
    }

    expect(pageOf(resourcePage)).toEqual({
      items: ['a', 'b'],
      current: 2,
      last: 5,
      perPage: 25,
      total: 120,
    })

    expect(pageOf(flatPage)).toEqual({
      items: ['x', 'y'],
      current: 1,
      last: 3,
      perPage: 10,
      total: 30,
    })
  })

  it('formats labels and initials correctly', () => {
    expect(label('waiting_for_customer')).toBe('Waiting For Customer')
    expect(label('open')).toBe('Open')
    expect(initials('John Doe')).toBe('JD')
    expect(initials('Single')).toBe('S')
  })

  it('formats date in Asia/Dhaka timezone', () => {
    const iso = '2026-10-13T12:00:00Z'
    const formatted = date(iso)
    expect(formatted).toContain('13 Oct 2026')
    expect(date(null)).toBe('—')
    expect(date('invalid-date')).toBe('—')
  })

  it('validates file sizes and file extensions', () => {
    const validFile = new File(['hello'], 'document.pdf', { type: 'application/pdf' })
    expect(validateFiles([validFile])).toBeNull()

    const invalidExtension = new File(['code'], 'script.exe', { type: 'application/octet-stream' })
    expect(validateFiles([invalidExtension])).toBe('script.exe has an unsupported file type.')

    const oversizedFile = new File(['x'], 'big.png', { type: 'image/png' })
    Object.defineProperty(oversizedFile, 'size', { value: 11 * 1024 * 1024 })
    expect(validateFiles([oversizedFile])).toBe('big.png exceeds 10 MB.')
  })

  it('evaluates role and ticket permissions accurately', () => {
    const customerUser: User = {
      id: 10,
      name: 'Alice Customer',
      email: 'alice@example.com',
      role: 'customer',
      is_active: true,
      is_available: true,
    }

    const agentUser: User = {
      id: 20,
      name: 'Bob Agent',
      email: 'bob@example.com',
      role: 'agent',
      is_active: true,
      is_available: true,
    }

    const adminUser: User = {
      id: 30,
      name: 'Admin Boss',
      email: 'admin@example.com',
      role: 'admin',
      is_active: true,
      is_available: true,
    }

    const openTicket: Ticket = {
      id: 100,
      ticket_number: 'TCK-100',
      subject: 'Help needed',
      description: 'System down',
      priority: 'high',
      status: 'open',
      customer_id: 10,
      assigned_agent_id: null,
      category_id: 1,
      sla_started_at: '2026-10-13T10:00:00Z',
      sla_warning_at: '2026-10-13T16:00:00Z',
      sla_due_at: '2026-10-13T18:00:00Z',
      sla_breached_at: null,
      resolved_at: null,
      closed_at: null,
      sla_state: 'within',
      created_at: '2026-10-13T10:00:00Z',
      updated_at: '2026-10-13T10:00:00Z',
    }

    // Customer permissions
    const custPerm = permissions(customerUser, openTicket)
    expect(custPerm.edit).toBe(true)
    expect(custPerm.reply).toBe(true)
    expect(custPerm.claim).toBe(false)
    expect(custPerm.note).toBe(false)
    expect(custPerm.resolve).toBe(false)
    expect(custPerm.assign).toBe(false)

    // Agent can claim unassigned open ticket
    const agentPerm = permissions(agentUser, openTicket)
    expect(agentPerm.claim).toBe(true)
    expect(agentPerm.assign).toBe(false)

    // Once assigned to agent, agent can resolve, note, priority
    const assignedTicket: Ticket = {
      ...openTicket,
      status: 'in_progress',
      assigned_agent_id: 20,
    }
    const agentAssignedPerm = permissions(agentUser, assignedTicket)
    expect(agentAssignedPerm.reply).toBe(true)
    expect(agentAssignedPerm.note).toBe(true)
    expect(agentAssignedPerm.resolve).toBe(true)
    expect(agentAssignedPerm.priority).toBe(true)
    expect(agentAssignedPerm.claim).toBe(false)

    // Admin permissions
    const adminPerm = permissions(adminUser, openTicket)
    expect(adminPerm.assign).toBe(true)
    expect(adminPerm.claim).toBe(true)
    for (const actor of [customerUser, agentUser, adminUser]) {
      const inactive = { ...actor, is_active: false }
      for (const status of ['open', 'resolved'] as const) {
        expect(
          Object.values(
            permissions(inactive, { ...openTicket, status, assigned_agent_id: actor.id }),
          ).every((allowed) => !allowed),
        ).toBe(true)
      }
    }

    // Resolved ticket permissions
    const resolvedTicket: Ticket = {
      ...openTicket,
      status: 'resolved',
      resolved_at: '2026-10-13T12:00:00Z',
    }
    expect(permissions(customerUser, resolvedTicket).close).toBe(true)
    expect(permissions(customerUser, resolvedTicket).edit).toBe(false)
    expect(permissions(customerUser, resolvedTicket).reply).toBe(false)
  })

  it('formats errors including 419 token expiration', () => {
    const error419 = new ApiError(419, 'CSRF token mismatch.')
    expect(errorText(error419)).toContain('Session token expired')

    const genericError = new Error('Custom failure message')
    expect(errorText(genericError)).toBe('Custom failure message')
  })
})
