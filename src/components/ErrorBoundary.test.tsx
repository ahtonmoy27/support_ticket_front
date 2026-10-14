import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ErrorBoundary } from './ErrorBoundary'

function ProblemChild({ shouldThrow = false }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Something broke intentionally')
  }
  return <div>Safe child content</div>
}

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <ProblemChild shouldThrow={false} />
        </ErrorBoundary>
      </MemoryRouter>,
    )
    expect(screen.getByText('Safe child content')).toBeDefined()
  })

  it('catches render error, calls onError, and renders default error state', () => {
    const onError = vi.fn()
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <MemoryRouter>
        <ErrorBoundary onError={onError}>
          <ProblemChild shouldThrow />
        </ErrorBoundary>
      </MemoryRouter>,
    )

    expect(screen.getByText('Something broke intentionally')).toBeDefined()
    expect(onError).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })

  it('supports custom fallback and resetErrorBoundary', () => {
    let errorTrigger = true

    function DynamicChild() {
      if (errorTrigger) {
        throw new Error('Explosion')
      }
      return <div>Recovered child content</div>
    }

    const { rerender } = render(
      <MemoryRouter>
        <ErrorBoundary
          fallback={(err, reset) => (
            <div>
              <span>Error: {err.message}</span>
              <button
                onClick={() => {
                  errorTrigger = false
                  reset()
                }}
              >
                Reset now
              </button>
            </div>
          )}
        >
          <DynamicChild />
        </ErrorBoundary>
      </MemoryRouter>,
    )

    expect(screen.getByText('Error: Explosion')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Reset now' }))
    rerender(
      <MemoryRouter>
        <ErrorBoundary>
          <DynamicChild />
        </ErrorBoundary>
      </MemoryRouter>,
    )
    expect(screen.getByText('Recovered child content')).toBeDefined()
  })
})
