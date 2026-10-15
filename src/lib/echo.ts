import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { csrf } from './api'

declare global {
  interface Window {
    Pusher: typeof Pusher
    Echo?: Echo<any>
  }
}

window.Pusher = Pusher

let echoInstance: Echo<any> | null = null

export function getEcho(): Echo<any> | null {
  const key = import.meta.env.VITE_PUSHER_APP_KEY
  if (!key) {
    return null
  }

  if (echoInstance) {
    return echoInstance
  }

  const cluster = import.meta.env.VITE_PUSHER_APP_CLUSTER || 'mt1'
  const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

  echoInstance = new Echo({
    broadcaster: 'pusher',
    key,
    cluster,
    forceTLS: true,
    authEndpoint: `${apiBase}/broadcasting/auth`,
    authorizer: (channel: { name: string }) => {
      return {
        authorize: (socketId: string, callback: (error: Error | null, authData?: any) => void) => {
          csrf()
            .then((token) => {
              return fetch(`${apiBase}/broadcasting/auth`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Accept: 'application/json',
                  'X-CSRF-TOKEN': token,
                },
                credentials: 'include',
                body: JSON.stringify({
                  socket_id: socketId,
                  channel_name: channel.name,
                }),
              })
            })
            .then(async (response) => {
              if (!response.ok) {
                callback(new Error(`Broadcasting auth failed with HTTP ${response.status}`))
                return
              }
              const data = await response.json()
              callback(null, data)
            })
            .catch((err) => {
              callback(err instanceof Error ? err : new Error('Broadcasting authorization error'))
            })
        },
      }
    },
  })

  return echoInstance
}
