import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDocumentTitle } from './useDocumentTitle'

describe('useDocumentTitle hook', () => {
  it('sets document.title to formatted title', () => {
    renderHook(() => useDocumentTitle('Dashboard'))
    expect(document.title).toBe('Dashboard · Support Desk')
  })

  it('restores default title on unmount', () => {
    const { unmount } = renderHook(() => useDocumentTitle('Tickets'))
    expect(document.title).toBe('Tickets · Support Desk')
    unmount()
    expect(document.title).toBe('Support Desk')
  })

  it('preserves title on unmount when prevail is true', () => {
    const { unmount } = renderHook(() => useDocumentTitle('Keep Me', true))
    expect(document.title).toBe('Keep Me · Support Desk')
    unmount()
    expect(document.title).toBe('Keep Me · Support Desk')
  })

  it('defaults to Support Desk when title is undefined', () => {
    renderHook(() => useDocumentTitle(undefined))
    expect(document.title).toBe('Support Desk')
  })
})
