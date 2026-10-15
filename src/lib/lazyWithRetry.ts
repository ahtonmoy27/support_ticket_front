import { lazy } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'

/**
 * Wraps React.lazy with automatic reload resilience against Vite/Vercel chunk invalidation.
 *
 * When a new deployment occurs on Vercel while a user has the app open in a tab,
 * older chunk files (e.g. `Tickets-CzeDroy-.js`) are replaced by newly hashed assets.
 * Browsers attempting to dynamically import the old chunk fail with:
 * `TypeError: Failed to fetch dynamically imported module`.
 *
 * This wrapper intercepts that error, ensures an automated reload to pick up the fresh
 * index.html and modern chunks, preventing the user from ever seeing an uncaught error screen.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    const pageHasBeenForceRefreshed = window.sessionStorage.getItem('chunk_load_failed_refreshed')
    try {
      const component = await factory()
      window.sessionStorage.removeItem('chunk_load_failed_refreshed')
      return component
    } catch (error) {
      if (!pageHasBeenForceRefreshed) {
        window.sessionStorage.setItem('chunk_load_failed_refreshed', 'true')
        window.location.reload()
        return new Promise<{ default: T }>(() => {})
      }
      throw error
    }
  })
}

