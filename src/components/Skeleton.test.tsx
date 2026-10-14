import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CardSkeleton, PageSkeleton, Skeleton, TableSkeleton } from './Skeleton'

describe('Skeleton components', () => {
  it('renders base Skeleton with text and rect variants', () => {
    const { container, rerender } = render(<Skeleton variant="text" width={100} height={20} />)
    const el = container.querySelector('.skeleton') as HTMLElement
    expect(el).toBeDefined()
    expect(el.classList.contains('skeleton-text')).toBe(true)
    expect(el.style.width).toBe('100px')
    expect(el.style.height).toBe('20px')

    rerender(<Skeleton variant="rect" count={3} />)
    expect(container.querySelectorAll('.skeleton-rect').length).toBe(3)
  })

  it('renders TableSkeleton with specified rows and cols', () => {
    render(<TableSkeleton rows={4} cols={3} />)
    const table = screen.getByLabelText('Loading table data')
    expect(table).toBeDefined()
    const rows = table.querySelectorAll('tbody tr')
    expect(rows.length).toBe(4)
    const headerCols = table.querySelectorAll('thead th')
    expect(headerCols.length).toBe(3)
  })

  it('renders CardSkeleton with specified card count', () => {
    const { container } = render(<CardSkeleton count={5} />)
    expect(container.querySelectorAll('.skeleton-card').length).toBe(5)
  })

  it('renders PageSkeleton with accessible aria-busy attribute', () => {
    render(<PageSkeleton title="Loading workspace" />)
    const page = screen.getByLabelText('Loading workspace')
    expect(page).toBeDefined()
    expect(page.getAttribute('aria-busy')).toBe('true')
  })
})
