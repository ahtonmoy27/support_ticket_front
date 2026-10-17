import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './providers/auth'
import { ToastProvider } from './providers/toast'
import App from './App'
import './index.css'

// Guard against browser extensions (like Google Translate) mutating DOM nodes
// which causes React's internal insertBefore / removeChild calls to fail with:
// "NotFoundError: Failed to execute 'insertBefore' on 'Node'"
if (typeof Node !== 'undefined' && Node.prototype) {
  const originalInsertBefore = Node.prototype.insertBefore
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (console) console.warn('[DOM Guard] insertBefore reference node was not a child of target parent. Appending instead.', this, referenceNode)
      return this.appendChild(newNode)
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T
  }

  const originalRemoveChild = Node.prototype.removeChild
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child && child.parentNode !== this) {
      if (console) console.warn('[DOM Guard] removeChild target was not a child of target parent.', this, child)
      if (child.parentNode) {
        return child.parentNode.removeChild(child) as T
      }
      return child
    }
    return originalRemoveChild.call(this, child) as T
  }
}

// Automatically reload the page when a new deployment invalidates previously cached Vite chunks
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
