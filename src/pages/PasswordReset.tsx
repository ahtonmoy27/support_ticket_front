import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowRight, MessageSquare } from 'lucide-react'
import { Button, Field, FormErrors } from '../components/ui'
import { useAuth } from '../providers/auth'
import { api } from '../lib/api'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function PasswordReset() {
  useDocumentTitle('Reset Password')
  const { user } = useAuth()
  const [form, setForm] = useState({ email: '', code: '', password: '', password_confirmation: '' })
  const [codeSent, setCodeSent] = useState(false)
  const [complete, setComplete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  if (user) return <Navigate to="/dashboard" replace />

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (!codeSent) {
        await api('/forgot-password', { method: 'POST', body: { email: form.email } })
        setCodeSent(true)
      } else {
        await api('/reset-password', { method: 'POST', body: form })
        setComplete(true)
      }
    } catch (caught) {
      setError(caught)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-story">
        <Link to="/login" className="brand">
          <span className="brand-symbol">
            <MessageSquare size={24} />
          </span>
          <span>
            Support<span className="brand-light">Desk</span>
          </span>
        </Link>
        <div className="auth-story-content">
          <h1>
            Account access.
            <br />
            <em>Back in your hands.</em>
          </h1>
          <p>Secure verification codes expire after 10 minutes.</p>
        </div>
      </section>
      <section className="auth-form-section">
        <div className="auth-form-wrap">
          <span className="eyebrow">ACCOUNT RECOVERY</span>
          <h2>
            {complete ? 'Password changed.' : codeSent ? 'Check your email.' : 'Forgot password?'}
          </h2>
          {complete ? (
            <p>
              Your password is ready. <Link to="/login">Sign in</Link>.
            </p>
          ) : (
            <form onSubmit={submit}>
              <FormErrors error={error} />
              <Field label="Email address">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))}
                  readOnly={codeSent}
                />
              </Field>
              {codeSent && (
                <>
                  <Field label="6-digit verification code">
                    <input
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={form.code}
                      onChange={(e) =>
                        setForm((v) => ({
                          ...v,
                          code: e.target.value.replace(/\D/g, '').slice(0, 6),
                        }))
                      }
                    />
                  </Field>
                  <Field label="New password" hint="At least 12 characters.">
                    <input
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={12}
                      value={form.password}
                      onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))}
                    />
                  </Field>
                  <Field label="Confirm password">
                    <input
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={12}
                      value={form.password_confirmation}
                      onChange={(e) =>
                        setForm((v) => ({ ...v, password_confirmation: e.target.value }))
                      }
                    />
                  </Field>
                </>
              )}
              <Button className="full-width" busy={busy} type="submit">
                {codeSent ? 'Reset password' : 'Send code'}
                <ArrowRight size={17} />
              </Button>
            </form>
          )}
          <p className="auth-switch">
            <Link to="/login">Back to sign in</Link>
          </p>
        </div>
      </section>
    </div>
  )
}
