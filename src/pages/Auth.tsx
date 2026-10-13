import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Eye, EyeOff, MessageSquare, ShieldCheck } from 'lucide-react'
import { useAuth } from '../providers/auth'
import { Button, Field, FormErrors } from '../components/ui'
export default function AuthPage({ register = false }: { register?: boolean }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' })
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  if (auth.user) return <Navigate to="/dashboard" replace />
  function change(key: keyof typeof form, value: string) {
    setForm((v) => ({ ...v, [key]: value }))
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await auth.authenticate(
        register ? '/register' : '/login',
        register ? form : { email: form.email, password: form.password },
      )
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from.startsWith('/') && !from.startsWith('//') ? from : '/dashboard', {
        replace: true,
      })
    } catch (err) {
      setError(err)
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
          <span className="auth-pill">
            <span />A better way to support
          </span>
          <h1>
            Good support.
            <br />
            <em>Great relationships.</em>
          </h1>
          <p>
            Turn every question into a conversation.
            <br />
            One calm workspace for your team and customers.
          </p>
          <div className="story-illustration">
            <div className="story-ticket">
              <div>
                <span className="story-avatar">SD</span>
                <span>
                  <strong>Every request has a home</strong>
                  <small>Organized. Accountable. Human.</small>
                </span>
                <span className="story-check">
                  <Check size={18} />
                </span>
              </div>
              <div className="story-line" />
              <div className="story-line short" />
              <div className="story-tags">
                <span>Clear ownership</span>
                <span>Timely replies</span>
              </div>
            </div>
            <div className="story-note">
              <MessageSquare size={18} />
              Keep the conversation moving.
            </div>
          </div>
          <div className="auth-benefits">
            <span>
              <Check size={16} />
              Private conversations
            </span>
            <span>
              <Check size={16} />
              Clear service commitments
            </span>
          </div>
        </div>
        <footer>Built around people. Powered by clarity.</footer>
      </section>
      <section className="auth-form-section">
        <div className="auth-form-wrap">
          <span className="eyebrow">WELCOME TO SUPPORT DESK</span>
          <h2>{register ? 'A little support starts here.' : 'Welcome back.'}</h2>
          <p>
            {register
              ? 'Create your account and get the help you need.'
              : 'Sign in to pick up where you left off.'}
          </p>
          <form onSubmit={submit}>
            <FormErrors error={error} />
            {register && (
              <Field label="Full name">
                <input
                  autoComplete="name"
                  required
                  maxLength={255}
                  value={form.name}
                  onChange={(e) => change('name', e.target.value)}
                />
              </Field>
            )}
            <Field label="Email address">
              <input
                type="email"
                autoComplete="email"
                required
                maxLength={255}
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => change('email', e.target.value)}
              />
            </Field>
            <Field label="Password" hint={register ? 'At least 12 characters.' : undefined}>
              <span className="password-input">
                <input
                  type={visible ? 'text' : 'password'}
                  autoComplete={register ? 'new-password' : 'current-password'}
                  required
                  minLength={register ? 12 : undefined}
                  value={form.password}
                  onChange={(e) => change('password', e.target.value)}
                />
                <button
                  type="button"
                  aria-label={visible ? 'Hide password' : 'Show password'}
                  onClick={() => setVisible((v) => !v)}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </Field>
            {register && (
              <Field label="Confirm password">
                <input
                  type={visible ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={12}
                  value={form.password_confirmation}
                  onChange={(e) => change('password_confirmation', e.target.value)}
                />
              </Field>
            )}
            <Button className="full-width" busy={busy} type="submit">
              {register ? 'Create account' : 'Sign in'}
              <ArrowRight size={17} />
            </Button>
          </form>
          <p className="auth-switch">
            {register ? 'Already have an account?' : 'New to Support Desk?'}{' '}
            <Link to={register ? '/login' : '/register'}>
              {register ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
          <div className="auth-security">
            <ShieldCheck size={17} />
            Your conversations stay private.
          </div>
        </div>
        <small className="auth-copyright">Support Desk · A calmer support experience</small>
      </section>
    </div>
  )
}
