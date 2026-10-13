import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge, Button, Empty, Field, FormErrors, Pagination } from './ui'
import { ApiError } from '../lib/api'

describe('UI Components', () => {
  it('renders Button with variants and loading indicator', () => {
    const { rerender } = render(<Button>Save ticket</Button>)
    expect(screen.getByRole('button', { name: 'Save ticket' })).toBeDefined()

    rerender(<Button busy>Save ticket</Button>)
    const button = screen.getByRole('button', { name: 'Save ticket' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('renders Badge with custom labels and SLA translations', () => {
    const { rerender } = render(<Badge value="within" />)
    expect(screen.getByText('Within Sla')).toBeDefined()

    rerender(<Badge value="warning" />)
    expect(screen.getByText('Approaching Breach')).toBeDefined()

    rerender(<Badge value="met" />)
    expect(screen.getByText('Sla Met')).toBeDefined()
  })

  it('renders Field with label, children and hint', () => {
    render(
      <Field label="Subject" hint="A short summary">
        <input placeholder="Enter title" />
      </Field>,
    )
    expect(screen.getByText('Subject')).toBeDefined()
    expect(screen.getByText('A short summary')).toBeDefined()
    expect(screen.getByPlaceholderText('Enter title')).toBeDefined()
  })

  it('renders FormErrors with validation messages', () => {
    const error = new ApiError(422, 'The given data was invalid.', {
      subject: ['The subject field is required.'],
    })
    render(<FormErrors error={error} />)
    expect(screen.getByRole('alert')).toBeDefined()
    expect(screen.getByText('The given data was invalid.')).toBeDefined()
    expect(screen.getByText('The subject field is required.')).toBeDefined()
  })

  it('renders Empty state component', () => {
    render(<Empty title="No tickets" text="Create your first ticket" />)
    expect(screen.getByText('No tickets')).toBeDefined()
    expect(screen.getByText('Create your first ticket')).toBeDefined()
  })

  it('renders Pagination information accurately', () => {
    const page = {
      items: [1, 2, 3],
      current: 2,
      last: 4,
      total: 10,
      perPage: 3,
    }
    render(<Pagination page={page} change={() => {}} />)
    expect(screen.getByText('4–6 of 10')).toBeDefined()
    expect(screen.getByText('Page 2 of 4')).toBeDefined()
  })
})
