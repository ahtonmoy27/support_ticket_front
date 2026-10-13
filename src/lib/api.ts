export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors: Record<string, string[]> = {},
    public retryAfter: string | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
let token: string | null = null
let pending: Promise<string> | null = null
let epoch = 0
export function clearCsrf() {
  token = null
  pending = null
  epoch++
}
async function failed(response: Response) {
  const data = await response.json().catch(() => null)
  if (response.status === 401) window.dispatchEvent(new Event('desk:unauthorized'))
  return new ApiError(
    response.status,
    response.status === 502 || response.status === 504
      ? 'Cannot reach Laravel. Start the backend server or check the API proxy target.'
      : data?.message || 'Request failed. Please try again.',
    data?.errors || {},
    response.headers.get('Retry-After'),
  )
}
export async function csrf(): Promise<string> {
  if (token) return token
  if (pending) return pending
  const generation = epoch
  const request = (async () => {
    const response = await fetch('/api/v1/csrf-token', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!response.ok) throw await failed(response)
    const data = await response.json()
    if (!data.csrf_token) throw new Error('Invalid CSRF response. Check the backend proxy.')
    if (generation === epoch) token = data.csrf_token
    return data.csrf_token as string
  })()
  pending = request
  try {
    return await request
  } finally {
    if (pending === request) pending = null
  }
}
export async function refreshCsrf() {
  clearCsrf()
  await csrf()
}
export async function api<T>(
  path: string,
  options: Omit<RequestInit, 'body'> & { body?: unknown } = {},
): Promise<T> {
  if (!path.startsWith('/') || path.startsWith('//')) throw new Error('API-relative path required.')
  const { body, ...init } = options
  const method = (init.method || 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) headers.set('X-CSRF-TOKEN', await csrf())
  const multipart = body instanceof FormData
  if (body !== undefined && !multipart) headers.set('Content-Type', 'application/json')
  if (multipart) headers.delete('Content-Type')
  const response = await fetch('/api/v1' + path, {
    ...init,
    method,
    headers,
    credentials: 'same-origin',
    cache: 'no-store',
    body: body === undefined ? undefined : multipart ? body : JSON.stringify(body),
  })
  if (!response.ok) {
    if (response.status === 419) {
      clearCsrf()
      void csrf().catch(() => {})
    }
    throw await failed(response)
  }
  if (!response.headers.get('content-type')?.includes('application/json'))
    throw new Error('Expected JSON. Check backend routes or session state.')
  return response.json() as Promise<T>
}
export async function download(path: string, filename: string) {
  const response = await fetch('/api/v1' + path, {
    credentials: 'same-origin',
    headers: { Accept: 'application/octet-stream, application/json, text/csv, */*' },
    cache: 'no-store',
  })
  if (!response.ok) throw await failed(response)
  if (
    response.headers.get('content-type')?.includes('application/json') ||
    !response.headers.get('content-disposition')?.includes('attachment')
  )
    throw new Error('The server did not return a file.')
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export async function upload(ticketId: number, file: File, messageId?: number) {
  const form = new FormData()
  form.append('file', file)
  if (messageId) form.append('ticket_message_id', String(messageId))
  return api('/tickets/' + ticketId + '/attachments', { method: 'POST', body: form })
}
