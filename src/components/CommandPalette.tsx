import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Bell,
  Clock3,
  CornerDownLeft,
  FileUp,
  Folder,
  LayoutDashboard,
  LoaderCircle,
  Plus,
  Search,
  Ticket as TicketIcon,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../providers/auth'
import { api } from '../lib/api'
import { Badge } from './ui'
import type { ApiPage, Ticket } from '../types'

interface CommandItem {
  id: string
  label: string
  category: string
  icon: typeof LayoutDashboard
  action: () => void
  badge?: string
}

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const paletteId = useId()

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setTickets([])
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Navigation commands based on role
  const baseCommands: CommandItem[] = [
    {
      id: 'nav-dashboard',
      label: 'Overview Dashboard',
      category: 'Navigation',
      icon: LayoutDashboard,
      action: () => {
        navigate('/dashboard')
        onClose()
      },
    },
    {
      id: 'nav-tickets',
      label: user?.role === 'customer' ? 'My Tickets' : 'All Tickets',
      category: 'Navigation',
      icon: TicketIcon,
      action: () => {
        navigate('/tickets')
        onClose()
      },
    },
    {
      id: 'nav-new-ticket',
      label: 'Create New Ticket',
      category: 'Actions',
      icon: Plus,
      action: () => {
        navigate('/tickets/create')
        onClose()
      },
    },
    {
      id: 'nav-notifications',
      label: 'Notifications',
      category: 'Navigation',
      icon: Bell,
      action: () => {
        navigate('/notifications')
        onClose()
      },
    },
  ]

  if (user?.role === 'agent') {
    baseCommands.push(
      {
        id: 'nav-assigned-me',
        label: 'Tickets Assigned to Me',
        category: 'Queue',
        icon: Users,
        action: () => {
          navigate(`/tickets?assigned_agent_id=${user.id}`)
          onClose()
        },
      },
      {
        id: 'nav-unassigned',
        label: 'Available Unassigned Queue',
        category: 'Queue',
        icon: Folder,
        action: () => {
          navigate('/tickets?unassigned=1')
          onClose()
        },
      },
    )
  }

  if (user?.role === 'admin') {
    baseCommands.push(
      {
        id: 'nav-admin-agents',
        label: 'Support Agents Team',
        category: 'Administration',
        icon: Users,
        action: () => {
          navigate('/admin/agents')
          onClose()
        },
      },
      {
        id: 'nav-admin-categories',
        label: 'Ticket Categories',
        category: 'Administration',
        icon: Folder,
        action: () => {
          navigate('/admin/categories')
          onClose()
        },
      },
      {
        id: 'nav-admin-sla',
        label: 'SLA Policies & Business Hours',
        category: 'Administration',
        icon: Clock3,
        action: () => {
          navigate('/admin/sla-policies')
          onClose()
        },
      },
      {
        id: 'nav-admin-imports',
        label: 'CSV Ticket Imports',
        category: 'Administration',
        icon: FileUp,
        action: () => {
          navigate('/admin/imports')
          onClose()
        },
      },
    )
  }

  // Filter commands by query
  const filteredCommands = query.trim()
    ? baseCommands.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.category.toLowerCase().includes(query.toLowerCase()),
      )
    : baseCommands

  // Debounced search for tickets when query has 2+ characters
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setTickets([])
      setLoading(false)
      return
    }

    setLoading(true)
    const timer = setTimeout(() => {
      api<ApiPage<Ticket>>(`/tickets?q=${encodeURIComponent(q)}&per_page=5`)
        .then((res) => {
          const items = 'data' in res && Array.isArray(res.data) ? res.data : []
          setTickets(items)
        })
        .catch(() => {
          setTickets([])
        })
        .finally(() => {
          setLoading(false)
        })
    }, 250)

    return () => clearTimeout(timer)
  }, [query])

  // Total selectable items (filtered commands + tickets)
  const totalItems = filteredCommands.length + tickets.length

  // Arrow key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (totalItems > 0 ? (prev + 1) % totalItems : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (totalItems > 0 ? (prev - 1 + totalItems) % totalItems : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex < filteredCommands.length) {
        filteredCommands[selectedIndex]?.action()
      } else {
        const ticket = tickets[selectedIndex - filteredCommands.length]
        if (ticket) {
          navigate(`/tickets/${ticket.id}`)
          onClose()
        }
      }
    }
  }

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`)
    if (el) {
      el.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  if (!open) return null

  return createPortal(
    <div className="command-palette-backdrop" onClick={onClose}>
      <div
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="command-palette-search">
          <Search size={18} className="command-search-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            id={paletteId}
            value={query}
            placeholder="Type a command or search tickets by subject, ID…"
            aria-label="Command search query"
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
          />
          {loading && <LoaderCircle size={17} className="spin" aria-hidden="true" />}
          {query && (
            <button
              type="button"
              className="command-clear-btn"
              aria-label="Clear query"
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
            >
              <X size={15} />
            </button>
          )}
          <kbd className="command-kbd">ESC</kbd>
        </div>

        <div className="command-palette-results" ref={listRef} role="listbox">
          {filteredCommands.length > 0 && (
            <div className="command-section">
              <div className="command-section-title">Navigation & Quick Actions</div>
              {filteredCommands.map((cmd, i) => {
                const isSelected = selectedIndex === i
                const Icon = cmd.icon
                return (
                  <div
                    key={cmd.id}
                    role="option"
                    aria-selected={isSelected}
                    data-index={i}
                    className={`command-item ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => cmd.action()}
                    onMouseEnter={() => setSelectedIndex(i)}
                  >
                    <Icon size={17} className="command-item-icon" aria-hidden="true" />
                    <span className="command-item-label">{cmd.label}</span>
                    <span className="command-item-category">{cmd.category}</span>
                    {isSelected && (
                      <span className="command-item-hint">
                        <CornerDownLeft size={13} />
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {tickets.length > 0 && (
            <div className="command-section">
              <div className="command-section-title">Matching Tickets</div>
              {tickets.map((t, idx) => {
                const itemIndex = filteredCommands.length + idx
                const isSelected = selectedIndex === itemIndex
                return (
                  <div
                    key={t.id}
                    role="option"
                    aria-selected={isSelected}
                    data-index={itemIndex}
                    className={`command-item ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => {
                      navigate(`/tickets/${t.id}`)
                      onClose()
                    }}
                    onMouseEnter={() => setSelectedIndex(itemIndex)}
                  >
                    <TicketIcon size={17} className="command-item-icon" aria-hidden="true" />
                    <div className="command-ticket-info">
                      <strong>#{t.ticket_number}</strong>
                      <span>{t.subject}</span>
                    </div>
                    <Badge value={t.status} />
                    {isSelected && (
                      <span className="command-item-hint">
                        <ArrowRight size={14} />
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {totalItems === 0 && !loading && (
            <div className="command-empty">
              <p>No matching commands or tickets found for &ldquo;{query}&rdquo;</p>
              <small>Try searching for a ticket number or navigate using the tabs above.</small>
            </div>
          )}
        </div>

        <div className="command-palette-footer">
          <div className="command-palette-shortcuts">
            <span>
              <kbd>↑</kbd> <kbd>↓</kbd> navigate
            </span>
            <span>
              <kbd>↵</kbd> select
            </span>
            <span>
              <kbd>esc</kbd> close
            </span>
          </div>
          <span>Support Desk Command Center</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}

