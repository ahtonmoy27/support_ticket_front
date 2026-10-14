import { useEffect } from 'react'

const DEFAULT_TITLE = 'Support Desk'

/**
 * Sets document.title on mount or when title changes, and restores the previous title on unmount.
 *
 * @param title       Page title to display before "· Support Desk"
 * @param prevail     If true, the title remains after unmount
 */
export function useDocumentTitle(title?: string, prevail = false) {
  useEffect(() => {
    const formatted = title ? `${title} · Support Desk` : DEFAULT_TITLE
    document.title = formatted
  }, [title])

  useEffect(() => {
    return () => {
      if (!prevail) {
        document.title = DEFAULT_TITLE
      }
    }
  }, [prevail])
}
