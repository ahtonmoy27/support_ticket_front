import { afterEach, beforeAll, afterAll, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import App from './App'
import { TicketFormLink } from './components/ui'

vi.mock('./providers/auth', () => ({
  useAuth: () => ({ user: { id: 1, name: 'Customer', role: 'customer' }, loading: false }),
}))
vi.mock('./layouts/Workspace', () => ({ default: () => <Outlet /> }))
vi.mock('./pages/Tickets', () => ({
  default: function TicketList() {
    const location = useLocation()
    return (
      <>
        <p>Queue {location.search}</p>
        <TicketFormLink to="/tickets/create">New ticket</TicketFormLink>
      </>
    )
  },
}))
vi.mock('./pages/TicketDetail', () => ({
  default: function Detail() {
    const { id } = useParams()
    return (
      <>
        <p>Ticket detail {id}</p>
        <TicketFormLink to={`/tickets/${id}/edit`}>Edit ticket</TicketFormLink>
      </>
    )
  },
}))
vi.mock('./pages/TicketForm', () => ({
  default: function Form({ onClose }: { onClose?: () => void }) {
    const navigate = useNavigate()
    const { id } = useParams()
    return (
      <>
        <p>Editor {id || 'new'}</p>
        <button onClick={onClose}>Cancel</button>
        <button onClick={() => navigate('/tickets/' + (id || '42'))}>Save</button>
      </>
    )
  },
}))

const showModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
const close = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open')
    },
  })
})
afterEach(cleanup)
afterAll(() => {
  if (showModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showModal)
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  if (close) Object.defineProperty(HTMLDialogElement.prototype, 'close', close)
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
})

it('opens creation above the filtered queue and restores filters on cancel', async () => {
  render(
    <MemoryRouter initialEntries={['/tickets?priority=high&page=2']}>
      <App />
    </MemoryRouter>,
  )
  fireEvent.click(await screen.findByRole('link', { name: 'New ticket' }))
  expect(await screen.findByRole('dialog', { name: 'Create ticket' })).toBeDefined()
  expect(screen.getByText('Queue ?priority=high&page=2')).toBeDefined()
  fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(screen.getByText('Queue ?priority=high&page=2')).toBeDefined()
})

it('supports direct edit URLs, closes to details, and saves back to details', async () => {
  render(
    <MemoryRouter initialEntries={['/tickets/7/edit']}>
      <App />
    </MemoryRouter>,
  )
  expect(await screen.findByRole('dialog', { name: 'Edit ticket' })).toBeDefined()
  expect(await screen.findByText('Editor 7')).toBeDefined()
  fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(screen.getByText('Ticket detail 7')).toBeDefined()
  fireEvent.click(screen.getByRole('link', { name: 'Edit ticket' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Save' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(screen.getByText('Ticket detail 7')).toBeDefined()
})
