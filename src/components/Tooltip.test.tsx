import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Tooltip } from './Tooltip'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

it('reveals details on keyboard focus and dismisses with Escape and blur', () => {
  render(<Tooltip content="Deadline follows configured business hours.">SLA details</Tooltip>)
  const trigger = screen.getByText('SLA details')
  expect(screen.queryByRole('tooltip')).toBeNull()
  fireEvent.focus(trigger)
  const popup = screen.getByRole('tooltip')
  expect(trigger.getAttribute('aria-describedby')).toBe(popup.id)
  expect(popup.textContent).toBe('Deadline follows configured business hours.')
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('tooltip')).toBeNull()
  fireEvent.focus(trigger)
  fireEvent.blur(trigger)
  expect(screen.queryByRole('tooltip')).toBeNull()
})

it('delays pointer details, allows hovering the tooltip, and cancels pending reveals', () => {
  vi.useFakeTimers()
  render(<Tooltip content="Request details">Ticket</Tooltip>)
  const trigger = screen.getByText('Ticket')
  fireEvent.pointerEnter(trigger, { pointerType: 'mouse' })
  expect(screen.queryByRole('tooltip')).toBeNull()
  act(() => vi.advanceTimersByTime(180))
  const popup = screen.getByRole('tooltip')
  fireEvent.pointerLeave(trigger)
  fireEvent.pointerEnter(popup)
  act(() => vi.advanceTimersByTime(150))
  expect(screen.getByRole('tooltip')).toBeDefined()
  fireEvent.pointerLeave(popup)
  expect(screen.queryByRole('tooltip')).toBeNull()
  fireEvent.pointerEnter(trigger)
  fireEvent.pointerLeave(trigger)
  act(() => vi.advanceTimersByTime(200))
  expect(screen.queryByRole('tooltip')).toBeNull()
})

it('describes a focusable child without adding another tab stop and dismisses on scroll', () => {
  render(
    <Tooltip focusable={false} content="Ticket requester and deadline">
      <a href="/tickets/42">Ticket 42</a>
    </Tooltip>,
  )
  const link = screen.getByRole('link', { name: 'Ticket 42' })
  expect(link.parentElement?.hasAttribute('tabindex')).toBe(false)
  fireEvent.focus(link)
  expect(link.getAttribute('aria-describedby')).toBe(screen.getByRole('tooltip').id)
  expect(link.getAttribute('href')).toBe('/tickets/42')
  fireEvent.scroll(window)
  expect(screen.queryByRole('tooltip')).toBeNull()
})
