import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AuthPage from './Auth'
import PasswordReset from './PasswordReset'
import { ApiError } from '../lib/api'

const mocks = vi.hoisted(() => ({ authenticate: vi.fn(), api: vi.fn() }))
vi.mock('../providers/auth', () => ({
  useAuth: () => ({ user: null, authenticate: mocks.authenticate }),
}))
vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  api: mocks.api,
}))

beforeEach(() => {
  mocks.authenticate.mockReset()
  mocks.api.mockReset()
})
afterEach(cleanup)

it('recovers unverified login and submits the registration code to the verification endpoint', async () => {
  mocks.authenticate
    .mockRejectedValueOnce(
      new ApiError(422, 'Verify your email before signing in.', {}, null, 'email_unverified'),
    )
    .mockResolvedValueOnce(undefined)
  render(
    <MemoryRouter>
      <AuthPage />
    </MemoryRouter>,
  )
  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: 'customer@example.com' },
  })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'long-password-123' } })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
  fireEvent.change(await screen.findByLabelText(/^6-digit verification code/), {
    target: { value: '123456' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Verify email' }))
  await vi.waitFor(() =>
    expect(mocks.authenticate).toHaveBeenLastCalledWith('/verify-email', {
      email: 'customer@example.com',
      code: '123456',
    }),
  )
})

it('shows resend failures instead of dropping rejected promises', async () => {
  mocks.api.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('Mail request failed'))
  render(
    <MemoryRouter>
      <AuthPage register />
    </MemoryRouter>,
  )
  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Customer' } })
  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: 'customer@example.com' },
  })
  fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'long-password-123' } })
  fireEvent.change(screen.getByLabelText('Confirm password'), {
    target: { value: 'long-password-123' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Send a new code' }))
  expect(await screen.findByText('Mail request failed')).toBeTruthy()
})

it('supports reset resend and changing a mistyped email', async () => {
  mocks.api.mockResolvedValue({})
  render(
    <MemoryRouter>
      <PasswordReset />
    </MemoryRouter>,
  )
  expect(screen.getByText(/expire after 15 minutes/)).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: 'customer@example.com' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Send code' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Send a new code' }))
  await screen.findByRole('status')
  expect(mocks.api).toHaveBeenCalledTimes(2)
  fireEvent.click(screen.getByRole('button', { name: 'Use a different email' }))
  expect((screen.getByLabelText('Email address') as HTMLInputElement).readOnly).toBe(false)
  expect(screen.queryByLabelText('6-digit verification code')).toBeNull()
})
