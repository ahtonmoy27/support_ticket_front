import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Paperclip, ShieldCheck } from 'lucide-react'
import { useAuth } from '../providers/auth'
import { useToast } from '../providers/toast'
import { useResource } from '../hooks/useResource'
import { api, upload } from '../lib/api'
import { errorText, label, permissions, validateFiles } from '../lib/utils'
import { Button, ErrorState, Field, FormErrors, Loading, PageHeader } from '../components/ui'
import type { Category, Ticket } from '../types'
import { priorities } from '../types'
export default function TicketFormPage() {
  const { id } = useParams()
  const ticket = useResource<{ data: Ticket }>(id ? '/tickets/' + id : null)
  if (id && ticket.loading) return <Loading />
  if (id && ticket.error) return <ErrorState error={ticket.error} retry={ticket.refresh} />
  return <TicketEditor key={id || 'create'} ticket={ticket.data?.data} />
}
function TicketEditor({ ticket }: { ticket?: Ticket }) {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const categories = useResource<{ data: Category[] }>('/categories')
  const [form, setForm] = useState({
    subject: ticket?.subject || '',
    description: ticket?.description || '',
    priority: ticket?.priority || 'medium',
    category_id: String(ticket?.category_id || ''),
    customer_id: '',
  })
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const allowed = ticket ? permissions(user!, ticket) : null
  if (ticket && !allowed?.edit)
    return <ErrorState error={new Error('This ticket cannot be edited by your account.')} />
  function change(key: keyof typeof form, value: string) {
    setForm((v) => ({ ...v, [key]: value }))
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const fileError = validateFiles(files)
    if (fileError) {
      setError(new Error(fileError))
      return
    }
    setBusy(true)
    try {
      const body: Record<string, unknown> = { subject: form.subject, description: form.description }
      if (!ticket || allowed?.priority) body.priority = form.priority
      if (!ticket) {
        body.category_id = Number(form.category_id)
        if (user?.role === 'admin' && form.customer_id) body.customer_id = Number(form.customer_id)
      }
      const result = await api<{ data: Ticket }>(ticket ? '/tickets/' + ticket.id : '/tickets', {
        method: ticket ? 'PATCH' : 'POST',
        body,
      })
      const failures: string[] = []
      for (const file of files) {
        try {
          await upload(result.data.id, file)
        } catch (err) {
          failures.push(file.name + ': ' + errorText(err))
        }
      }
      toast(ticket ? 'Ticket updated.' : 'Ticket ' + result.data.ticket_number + ' created.')
      if (failures.length)
        toast(
          'Ticket saved. Upload failed: ' +
            failures.join('; ') +
            '. Retry files on the ticket page.',
          'error',
        )
      navigate('/tickets/' + result.data.id)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <PageHeader
        back={ticket ? '/tickets/' + ticket.id : '/tickets'}
        eyebrow={ticket ? ticket.ticket_number : 'START A CONVERSATION'}
        title={ticket ? 'Edit ticket' : 'How can we help?'}
        description="A few details help us get your request to the right person."
      />
      <div className="form-layout">
        <section className="panel form-panel">
          <form onSubmit={submit}>
            <FormErrors error={error} />
            <Field label="Subject">
              <input
                placeholder="A short summary of your request"
                required
                maxLength={255}
                value={form.subject}
                onChange={(e) => change('subject', e.target.value)}
              />
            </Field>
            <Field
              label="Description"
              hint="Include what happened, what you expected, and any steps already tried."
            >
              <textarea
                required
                maxLength={50000}
                rows={8}
                placeholder="Tell us a little more…"
                value={form.description}
                onChange={(e) => change('description', e.target.value)}
              />
            </Field>
            <div className="form-grid">
              {!ticket && (
                <Field label="Category">
                  {categories.loading ? (
                    <span>Loading categories…</span>
                  ) : categories.error ? (
                    <span className="field-error">
                      {errorText(categories.error)}{' '}
                      <button type="button" onClick={categories.refresh}>
                        Retry
                      </button>
                    </span>
                  ) : (
                    <select
                      required
                      value={form.category_id}
                      onChange={(e) => change('category_id', e.target.value)}
                    >
                      <option value="">Choose a category</option>
                      {categories.data?.data
                        .filter((c) => c.is_active)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  )}
                </Field>
              )}
              {(!ticket || allowed?.priority) && (
                <Field label="Priority">
                  <select
                    value={form.priority}
                    onChange={(e) => change('priority', e.target.value)}
                  >
                    {priorities.map((p) => (
                      <option key={p} value={p}>
                        {label(p)}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
            {!ticket && user?.role === 'admin' && (
              <Field
                label="Create for customer ID (optional)"
                hint="Leave blank to create for yourself. Requires an existing active customer."
              >
                <input
                  type="number"
                  min="1"
                  value={form.customer_id}
                  onChange={(e) => change('customer_id', e.target.value)}
                />
              </Field>
            )}
            {!ticket && (
              <Field
                label="Attachments (optional)"
                hint="PDF, PNG, JPEG, TXT, DOCX · up to 10 MB each. Uploaded after the ticket is saved."
              >
                <span className="upload-zone">
                  <Paperclip size={20} />
                  <span>Choose supporting files</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.txt,.docx"
                    onChange={(e) => setFiles(Array.from(e.target.files || []))}
                  />
                </span>
                {files.map((f) => (
                  <small key={f.name}>{f.name}</small>
                ))}
              </Field>
            )}
            <div className="form-actions">
              <Link className="button secondary" to={ticket ? '/tickets/' + ticket.id : '/tickets'}>
                Cancel
              </Link>
              <Button busy={busy} type="submit">
                {ticket ? 'Save changes' : 'Create ticket'}
                <ArrowRight size={16} />
              </Button>
            </div>
          </form>
        </section>
        <aside className="form-aside">
          <div className="help-card">
            <ShieldCheck size={25} />
            <h3>You're in the right place.</h3>
            <p>Your request is private and visible only to permitted support staff.</p>
            <hr />
            <h4>Choose the right priority</h4>
            <p>
              <strong>Critical</strong> — urgent, service-blocking issue.
              <br />
              <strong>High</strong> — important work is affected.
              <br />
              <strong>Medium</strong> — normal support request.
              <br />
              <strong>Low</strong> — a question or minor issue.
            </p>
            <small>
              SLA deadlines follow configured business hours. Your due time appears after creation.
            </small>
          </div>
        </aside>
      </div>
    </>
  )
}
