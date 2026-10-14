import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import TicketForm from './TicketForm'
const mocks = vi.hoisted(() => ({ api: vi.fn(), upload: vi.fn(), toast: vi.fn() }))
vi.mock('../lib/api', async (original) => ({
  ...(await original<typeof import('../lib/api')>()),
  api: mocks.api,
  upload: mocks.upload,
}))
vi.mock('../providers/auth', () => ({
  useAuth: () => ({ user: { id: 1, role: 'customer', is_active: true } }),
}))
vi.mock('../providers/toast', () => ({ useToast: () => mocks.toast }))
vi.mock('../hooks/useResource', () => ({
  useResource: (path: string | null) => ({
    data: path === '/categories' ? { data: [{ id: 1, name: 'General', is_active: true }] } : null,
    loading: false,
    error: null,
  }),
}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
describe('ticket creation and attachment recovery', () => {
  it('retries only failed attachments without creating another ticket', async () => {
    mocks.api.mockResolvedValue({ data: { id: 42, ticket_number: 'TKT-42' } })
    mocks.upload
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('Storage unavailable'))
      .mockResolvedValueOnce({})
    const { container } = render(
      <MemoryRouter initialEntries={['/tickets/create']}>
        <Routes>
          <Route path="/tickets/create" element={<TicketForm />} />
          <Route path="/tickets/42" element={<p>Saved ticket detail</p>} />
        </Routes>
      </MemoryRouter>,
    )
    fireEvent.change(screen.getByPlaceholderText('A short summary of your request'), {
      target: { value: 'Cannot log in' },
    })
    fireEvent.change(screen.getByPlaceholderText(/Tell us a little more/), {
      target: { value: 'Login error' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: 'Category' }), { target: { value: '1' } })
    const one = new File(['first'], 'one.txt'),
      two = new File(['second'], 'two.txt')
    fireEvent.change(container.querySelector('input[type=file]')!, {
      target: { files: [one, two] },
    })
    fireEvent.submit(container.querySelector('form')!)
    await screen.findByText(/Retry failed files/)
    expect(mocks.api).toHaveBeenCalledTimes(1)
    expect(mocks.upload).toHaveBeenCalledTimes(2)
    fireEvent.submit(container.querySelector('form')!)
    await waitFor(() => expect(screen.getByText('Saved ticket detail')).toBeDefined())
    expect(mocks.api).toHaveBeenCalledTimes(1)
    expect(mocks.upload).toHaveBeenLastCalledWith(42, two)
    expect(mocks.upload).toHaveBeenCalledTimes(3)
  })
})
