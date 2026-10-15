import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, Download, Edit3, LockKeyhole, Paperclip, Send, UserRound } from 'lucide-react'
import { useAuth } from '../providers/auth'
import { useToast } from '../providers/toast'
import { useResource } from '../hooks/useResource'
import { api, ApiError, download, upload } from '../lib/api'
import { date, errorText, initials, label, pageOf, permissions, validateFiles } from '../lib/utils'
import {
  Badge,
  Button,
  Empty,
  ErrorState,
  FormErrors,
  Loading,
  Modal,
  PageHeader,
  PageSkeleton,
  Pagination,
  TicketFormLink,
} from '../components/ui'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import type { Activity, ApiPage, Attachment, Message, Ticket, User } from '../types'

export default function TicketDetail() {
  const { id } = useParams()
  const r = useResource<{ data: Ticket }>('/tickets/' + id, 60000)
  const ticket = r.data?.data
  useDocumentTitle(ticket ? `#${ticket.ticket_number} · ${ticket.subject}` : 'Ticket Details')

  if (r.loading && !r.data) return <PageSkeleton title="Loading ticket details..." />
  if (r.error) return <ErrorState error={r.error} retry={r.refresh} />
  return r.data ? <Detail key={id} ticket={r.data.data} refresh={r.refresh} /> : null
}
function Detail({ ticket: t, refresh }: { ticket: Ticket; refresh: () => void }) {
  const { user } = useAuth()
  const notify = useToast()
  const navigate = useNavigate()
  const p = permissions(user!, t)
  const [tab, setTab] = useState('conversation')
  const [mp, setMp] = useState(1)
  const [fp, setFp] = useState(1)
  const [ap, setAp] = useState(1)
  const messages = useResource<ApiPage<Message>>('/tickets/' + t.id + '/messages?page=' + mp)
  const files = useResource<ApiPage<Attachment>>('/tickets/' + t.id + '/attachments?page=' + fp)
  const history = useResource<ApiPage<Activity>>('/tickets/' + t.id + '/activities?page=' + ap)
  const [confirm, setConfirm] = useState<string | null>(null)
  const agents = useResource<ApiPage<User>>(
    p.assign ? `/admin/agents?category_id=${t.category_id}&available_only=1&per_page=100` : null,
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  function refreshAll() {
    refresh()
    messages.refresh()
    files.refresh()
    history.refresh()
  }
  async function action(name: string, body?: unknown) {
    setBusy(true)
    setError(null)
    try {
      await api('/tickets/' + t.id + '/' + name, { method: 'POST', ...(body ? { body } : {}) })
      notify('Ticket updated.')
      setConfirm(null)
      refreshAll()
    } catch (err) {
      setError(err)
      if (err instanceof ApiError && err.status === 409) {
        notify('Ticket state changed. Refreshing your workspace.', 'error')
        if (name === 'claim') navigate('/tickets?unassigned=1')
        else refreshAll()
      }
    } finally {
      setBusy(false)
    }
  }
  async function getFile(f: Attachment) {
    try {
      await download('/attachments/' + f.id + '/download', f.original_name)
    } catch (err) {
      notify(errorText(err), 'error')
    }
  }
  return (
    <>
      <PageHeader
        back="/tickets"
        eyebrow={t.ticket_number}
        title={t.subject}
        description={'Created ' + date(t.created_at) + ' · Asia/Dhaka'}
        action={
          <>
            {p.edit && (
              <TicketFormLink className="button secondary" to={'/tickets/' + t.id + '/edit'}>
                <Edit3 size={16} />
                Edit
              </TicketFormLink>
            )}
            {p.claim && (
              <Button busy={busy} onClick={() => action('claim')}>
                Claim ticket
              </Button>
            )}
            {p.resolve && (
              <Button
                onClick={() => {
                  setError(null)
                  setConfirm('resolve')
                }}
              >
                <Check size={17} />
                Resolve
              </Button>
            )}
            {p.close && (
              <Button
                onClick={() => {
                  setError(null)
                  setConfirm('close')
                }}
              >
                Close ticket
              </Button>
            )}
          </>
        }
      />
      <FormErrors error={confirm ? null : error} />
      <div className="detail-layout">
        <div>
          <section className="panel ticket-description">
            <div className="detail-badges">
              <Badge value={t.status} />
              <Badge type="priority" value={t.priority} />
              <span className="subtle-chip">
                {t.category?.name || 'Category #' + t.category_id}
              </span>
            </div>
            <h3>About this request</h3>
            <p className="preserve-text">{t.description}</p>
          </section>
          <section className="panel">
            <div className="list-tabs">
              {['conversation', 'attachments', 'activity'].map((name) => (
                <button
                  key={name}
                  className={tab === name ? 'selected' : ''}
                  onClick={() => setTab(name)}
                >
                  {label(name)}
                </button>
              ))}
            </div>
            {tab === 'conversation' && (
              <>
                {messages.loading && !messages.data ? (
                  <Loading />
                ) : messages.error ? (
                  <ErrorState error={messages.error} retry={messages.refresh} />
                ) : (
                  messages.data && (
                    <>
                      <div className="conversation">
                        {pageOf(messages.data).items.length === 0 ? (
                          <Empty
                            title="Start the conversation"
                            text="Replies and updates will appear here."
                          />
                        ) : (
                          pageOf(messages.data).items.map((m) => (
                            <article className={'message ' + m.visibility} key={m.id}>
                              <div className="message-heading">
                                <span className="avatar small">
                                  {initials(m.author?.name || 'User')}
                                </span>
                                <strong>
                                  {m.author?.name ||
                                    (m.author_id === user?.id ? user.name : 'User #' + m.author_id)}
                                </strong>
                                {m.visibility === 'internal' && (
                                  <span className="internal-label">
                                    <LockKeyhole size={12} />
                                    Internal note
                                  </span>
                                )}
                                <time>{date(m.created_at)}</time>
                              </div>
                              <p className="preserve-text">{m.body}</p>
                              {files.data &&
                                pageOf(files.data)
                                  .items.filter((f) => f.ticket_message_id === m.id)
                                  .map((f) => (
                                    <button
                                      className="message-file"
                                      key={f.id}
                                      onClick={() => getFile(f)}
                                    >
                                      <Paperclip size={14} />
                                      {f.original_name}
                                      <Download size={13} />
                                    </button>
                                  ))}
                            </article>
                          ))
                        )}
                      </div>
                      <Pagination page={pageOf(messages.data)} change={setMp} />
                      {pageOf(messages.data).current < pageOf(messages.data).last && (
                        <button
                          className="text-link latest-link"
                          onClick={() => setMp(pageOf(messages.data!).last)}
                        >
                          Jump to latest messages
                        </button>
                      )}
                    </>
                  )
                )}
                {p.reply ? (
                  <Composer
                    ticketId={t.id}
                    note={p.note}
                    onSent={() => {
                      messages.refresh()
                      files.refresh()
                      history.refresh()
                      if (messages.data) setMp(Math.ceil((pageOf(messages.data).total + 1) / 25))
                    }}
                  />
                ) : (
                  <div className="read-only">
                    <LockKeyhole size={16} />
                    {['resolved', 'closed'].includes(t.status)
                      ? 'This ticket is finished. Replies and uploads are closed.'
                      : 'Claim this ticket to join the conversation.'}
                  </div>
                )}
              </>
            )}
            {tab === 'attachments' && (
              <>
                {files.loading ? (
                  <Loading />
                ) : files.error ? (
                  <ErrorState error={files.error} retry={files.refresh} />
                ) : (
                  files.data && (
                    <>
                      <div className="attachment-list">
                        {pageOf(files.data).items.length === 0 ? (
                          <Empty
                            title="No attachments yet"
                            text="Supporting files will appear here."
                          />
                        ) : (
                          pageOf(files.data).items.map((f) => (
                            <div className="attachment-row" key={f.id}>
                              <span className="file-icon">
                                <Paperclip size={21} />
                              </span>
                              <div>
                                <strong>{f.original_name}</strong>
                                <small>
                                  {(f.size_bytes / 1024).toFixed(1)} KB ·{' '}
                                  {f.ticket_message_id ? 'Reply attachment' : 'Ticket attachment'}
                                </small>
                              </div>
                              <Button
                                variant="ghost"
                                disabled={f.scan_status !== 'available'}
                                onClick={() => getFile(f)}
                                aria-label={'Download ' + f.original_name}
                              >
                                <Download size={18} />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                      <Pagination page={pageOf(files.data)} change={setFp} />
                    </>
                  )
                )}
                {p.reply && (
                  <Uploader
                    ticketId={t.id}
                    onUploaded={() => {
                      files.refresh()
                      history.refresh()
                    }}
                  />
                )}
              </>
            )}
            {tab === 'activity' && (
              <>
                {history.loading ? (
                  <Loading />
                ) : history.error ? (
                  <ErrorState error={history.error} retry={history.refresh} />
                ) : (
                  history.data && (
                    <>
                      <div className="timeline">
                        {pageOf(history.data).items.map((a) => (
                          <article key={a.id}>
                            <span className="timeline-dot" />
                            <div>
                              <strong>
                                {label(a.action.replace('ticket.', '').replace('sla.', 'SLA '))}
                              </strong>
                              <p>
                                {a.actor_id === null
                                  ? 'System'
                                  : a.actor_id === user?.id
                                    ? user.name
                                    : a.actor?.name || 'User #' + a.actor_id}{' '}
                                · {date(a.created_at)}
                              </p>
                              {(() => {
                                const oldMap = (
                                  a.old_values &&
                                  typeof a.old_values === 'object' &&
                                  !Array.isArray(a.old_values)
                                    ? a.old_values
                                    : {}
                                ) as Record<string, unknown>
                                const newMap = (
                                  a.new_values &&
                                  typeof a.new_values === 'object' &&
                                  !Array.isArray(a.new_values)
                                    ? a.new_values
                                    : {}
                                ) as Record<string, unknown>
                                return Object.entries(newMap).map(([key, value]) => (
                                  <small key={key}>
                                    {label(key)}:{' '}
                                    {key in oldMap
                                      ? (typeof oldMap[key] === 'object' && oldMap[key] !== null
                                          ? JSON.stringify(oldMap[key])
                                          : String(oldMap[key])) + ' → '
                                      : ''}
                                    {typeof value === 'object' && value !== null
                                      ? JSON.stringify(value)
                                      : String(value)}
                                  </small>
                                ))
                              })()}
                            </div>
                          </article>
                        ))}
                      </div>
                      <Pagination page={pageOf(history.data)} change={setAp} />
                    </>
                  )
                )}
              </>
            )}
          </section>
        </div>
        <aside className="detail-sidebar">
          <section className={'sla-card ' + t.sla_state}>
            <strong>Service commitment</strong>
            <Badge value={t.sla_state} />
            <small>RESOLUTION DUE</small>
            <h3>{date(t.sla_due_at)}</h3>
            <p>Business hours apply · {t.sla_timezone || 'UTC'}</p>
            {t.sla_breached_at && (
              <div className="historic-breach">
                Previously breached at {date(t.sla_breached_at)}
              </div>
            )}
            {t.resolved_at && <p>Resolved {date(t.resolved_at)}</p>}
          </section>
          <section className="panel metadata">
            <h3>Ticket details</h3>
            <div>
              <span>Customer</span>
              <strong>{t.customer?.name || 'User #' + t.customer_id}</strong>
            </div>
            <div>
              <span>Assigned to</span>
              {p.assign ? (
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}
                >
                  <select
                    aria-label="Assign support agent"
                    disabled={busy || agents.loading}
                    value={t.assigned_agent_id ? String(t.assigned_agent_id) : ''}
                    onChange={(e) => {
                      const val = e.target.value
                      if (!val) return
                      action('assign', { assigned_agent_id: Number(val) })
                    }}
                    style={{ fontSize: '12px', padding: '8px 10px' }}
                  >
                    <option value="" disabled>
                      {agents.loading ? 'Loading agents…' : 'Select an agent…'}
                    </option>
                    {agents.data &&
                      pageOf(agents.data).items.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.email})
                        </option>
                      ))}
                  </select>
                  {agents.data && pageOf(agents.data).items.length === 0 && (
                    <small style={{ color: '#b27a38' }}>
                      No agents currently mapped to this category.
                    </small>
                  )}
                  {t.assigned_agent && (
                    <small style={{ color: '#526e45' }}>Currently: {t.assigned_agent.name}</small>
                  )}
                </div>
              ) : (
                <strong>
                  <UserRound size={15} />
                  {t.assigned_agent?.name ||
                    (t.assigned_agent_id ? 'Agent #' + t.assigned_agent_id : 'Unassigned')}
                </strong>
              )}
            </div>
            <div>
              <span>Priority</span>
              <Badge type="priority" value={t.priority} />
            </div>
            <div>
              <span>Created by</span>
              <strong>{t.creator?.name || 'User #' + t.created_by}</strong>
            </div>
            <div>
              <span>Created</span>
              <strong>{date(t.created_at)}</strong>
            </div>
            <div>
              <span>Updated</span>
              <strong>{date(t.updated_at)}</strong>
            </div>
            {p.note && t.status === 'in_progress' && (
              <Button
                variant="secondary"
                busy={busy}
                onClick={() => action('status', { status: 'waiting_for_customer' })}
              >
                Wait for customer
              </Button>
            )}
            {p.note && ['open', 'waiting_for_customer'].includes(t.status) && (
              <Button
                variant="secondary"
                busy={busy}
                onClick={() => action('status', { status: 'in_progress' })}
              >
                Move to in progress
              </Button>
            )}
          </section>
        </aside>
      </div>
      <Modal
        open={!!confirm}
        onClose={() => {
          if (!busy) setConfirm(null)
        }}
        title={confirm === 'close' ? 'Close this ticket?' : 'Mark as resolved?'}
      >
        <p>
          {confirm === 'close'
            ? 'Closed tickets are final and cannot be reopened.'
            : 'Resolution stops SLA monitoring and closes replies and uploads.'}
        </p>
        <FormErrors error={error} />
        <div className="form-actions">
          <Button variant="secondary" disabled={busy} onClick={() => setConfirm(null)}>
            Cancel
          </Button>
          <Button busy={busy} onClick={() => action(confirm!)}>
            Confirm {confirm}
          </Button>
        </div>
      </Modal>
    </>
  )
}
function Composer({
  ticketId,
  note,
  onSent,
}: {
  ticketId: number
  note: boolean
  onSent: () => void
}) {
  const [body, setBody] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [files, setFiles] = useState<File[]>([])
  const [messageId, setMessageId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const toast = useToast()
  async function send(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const invalid = validateFiles(files)
    if (invalid) {
      setError(new Error(invalid))
      return
    }
    setBusy(true)
    try {
      const id =
        messageId ||
        (
          await api<{ data: Message }>('/tickets/' + ticketId + '/messages', {
            method: 'POST',
            body: { body, visibility },
          })
        ).data.id
      setMessageId(id)
      const failed: File[] = []
      const reasons: string[] = []
      for (const file of files) {
        try {
          await upload(ticketId, file, id)
        } catch (err) {
          failed.push(file)
          reasons.push(file.name + ': ' + errorText(err))
        }
      }
      if (failed.length) {
        setFiles(failed)
        setError(new Error('Reply saved. Retry files only: ' + reasons.join('; ')))
        onSent()
        return
      }
      setBody('')
      setFiles([])
      setMessageId(null)
      toast(visibility === 'internal' ? 'Internal note added.' : 'Reply sent.')
      onSent()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form className={'reply-composer ' + visibility} onSubmit={send}>
      <div className="composer-heading">
        <strong>{messageId ? 'Reply saved · retry attachments' : 'Add to the conversation'}</strong>
        {note && (
          <select
            aria-label="Reply visibility"
            disabled={!!messageId || busy}
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
          >
            <option value="public">Public reply</option>
            <option value="internal">Internal note</option>
          </select>
        )}
      </div>
      {visibility === 'internal' && (
        <p className="internal-help">
          <LockKeyhole size={14} />
          Staff only. Never shown to customers.
        </p>
      )}
      <FormErrors error={error} />
      <textarea
        aria-label="Reply message"
        required={!messageId}
        disabled={!!messageId}
        rows={4}
        maxLength={50000}
        placeholder="Write a helpful update…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="composer-bottom">
        <FilePicker disabled={busy} setFiles={setFiles} />
        <Button busy={busy} type="submit">
          <Send size={16} />
          {messageId ? 'Retry files' : visibility === 'internal' ? 'Add note' : 'Send reply'}
        </Button>
      </div>
      {files.map((f) => (
        <small className="selected-file" key={f.name}>
          {f.name}
        </small>
      ))}
      {messageId && (
        <button
          type="button"
          className="text-link"
          onClick={() => {
            setMessageId(null)
            setBody('')
            setFiles([])
            setError(null)
          }}
        >
          Discard pending attachments
        </button>
      )}
    </form>
  )
}
function FilePicker({
  setFiles,
  disabled,
}: {
  setFiles: (files: File[]) => void
  disabled?: boolean
}) {
  return (
    <label className="attach-button">
      <Paperclip size={16} />
      Choose files
      <input
        type="file"
        multiple
        disabled={disabled}
        accept=".pdf,.png,.jpg,.jpeg,.txt,.docx"
        onChange={(e) => setFiles(Array.from(e.target.files || []))}
      />
    </label>
  )
}
function Uploader({ ticketId, onUploaded }: { ticketId: number; onUploaded: () => void }) {
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const toast = useToast()
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const invalid = validateFiles(files)
    if (invalid) {
      setError(new Error(invalid))
      return
    }
    setBusy(true)
    setError(null)
    const failed: File[] = []
    const reasons: string[] = []
    for (const file of files) {
      try {
        await upload(ticketId, file)
      } catch (err) {
        failed.push(file)
        reasons.push(errorText(err))
      }
    }
    setFiles(failed)
    if (failed.length) setError(new Error(reasons.join('; ')))
    else toast('Attachments uploaded.')
    setBusy(false)
    onUploaded()
  }
  return (
    <form className="ticket-upload" onSubmit={submit}>
      <FormErrors error={error} />
      <FilePicker setFiles={setFiles} disabled={busy} />
      {files.map((f) => (
        <small key={f.name}>{f.name}</small>
      ))}
      <Button busy={busy} disabled={!files.length} type="submit">
        Upload files
      </Button>
      <small>Maximum 10 MB per file</small>
    </form>
  )
}
