import { useState } from 'react'
import { CalendarDays, Clock3, Plus, X } from 'lucide-react'
import { useResource } from '../hooks/useResource'
import { useToast } from '../providers/toast'
import { api } from '../lib/api'
import { pageOf } from '../lib/utils'
import {
  Badge,
  Button,
  CardSkeleton,
  ErrorState,
  Field,
  FormErrors,
  Modal,
  PageHeader,
  Pagination,
} from '../components/ui'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import type { ApiPage, Hours, Policy, Rule } from '../types'
import { priorities } from '../types'

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const defaultHours: Hours = Object.fromEntries(
  days.map((_, i) => [String(i), i < 5 ? [['09:00', '18:00']] : []]),
)

export default function SlaPolicies() {
  useDocumentTitle('SLA Policies')
  const [page, setPage] = useState(1)
  const r = useResource<ApiPage<Policy>>('/admin/sla-policies?page=' + page)
  const [template, setTemplate] = useState<Policy | 'new' | null>(null)
  return (
    <>
      <PageHeader
        eyebrow="SERVICE COMMITMENTS"
        title="SLA & business hours"
        description="Thoughtful timelines, built around the way your team works."
        action={
          <Button onClick={() => setTemplate('new')}>
            <Plus size={17} />
            New policy version
          </Button>
        }
      />
      <div className="info-banner">
        <Clock3 size={19} />
        <span>
          Policies are versioned. Activating a new version affects new tickets; existing tickets
          keep their SLA snapshot.
        </span>
      </div>
      {r.loading ? (
        <CardSkeleton count={2} />
      ) : r.error ? (
        <ErrorState error={r.error} retry={r.refresh} />
      ) : (
        r.data && (
          <>
            <div className="policy-list">
              {pageOf(r.data).items.map((p) => (
                <section className="panel policy-card" key={p.id}>
                  <div className="panel-heading">
                    <div>
                      <h2>
                        {p.name} <small>v{p.version}</small>
                      </h2>
                      <p>
                        <CalendarDays size={14} />
                        {p.calendar.timezone}
                      </p>
                    </div>
                    <div className="actions">
                      <Badge value={p.is_active ? 'active' : 'inactive'} />
                      <Button variant="secondary" onClick={() => setTemplate(p)}>
                        Use as template
                      </Button>
                    </div>
                  </div>
                  <div className="policy-rules">
                    {p.rules.map((rule) => (
                      <div key={rule.priority}>
                        <Badge type="priority" value={rule.priority} />
                        <strong>
                          {rule.resolution_minutes.toLocaleString()}
                          <small>business minutes</small>
                        </strong>
                        <span>Warning at {rule.warning_percent}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="calendar-summary">
                    {days.map((day, i) => (
                      <div key={day}>
                        <strong>{day.slice(0, 3)}</strong>
                        <span>
                          {p.calendar.hours[String(i)]?.length
                            ? p.calendar.hours[String(i)].map((s) => s.join('–')).join(', ')
                            : 'Closed'}
                        </span>
                      </div>
                    ))}
                  </div>
                  {Object.entries(p.calendar.exceptions).length > 0 && (
                    <div className="exception-summary">
                      <strong>Calendar exceptions</strong>
                      {Object.entries(p.calendar.exceptions).map(([day, intervals]) => (
                        <span key={day}>
                          {day}:{' '}
                          {intervals.length
                            ? intervals.map((s: [string, string]) => s.join('–')).join(', ')
                            : 'Closed'}
                        </span>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
            <Pagination page={pageOf(r.data)} change={setPage} />
          </>
        )
      )}
      {template && (
        <PolicyEditor
          key={template === 'new' ? 'new' : template.id}
          template={template === 'new' ? undefined : template}
          close={() => setTemplate(null)}
          saved={() => {
            setTemplate(null)
            r.refresh()
          }}
        />
      )}
    </>
  )
}
function Intervals({
  title,
  intervals,
  change,
}: {
  title: string
  intervals: [string, string][]
  change: (value: [string, string][]) => void
}) {
  return (
    <div className="hours-row">
      <div>
        <strong>{title}</strong>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={intervals.length > 0}
            onChange={(e) => change(e.target.checked ? [['09:00', '18:00']] : [])}
          />
          {intervals.length ? 'Open' : 'Closed'}
        </label>
      </div>
      <div className="intervals">
        {intervals.map((slot, i) => (
          <div key={i}>
            <input
              aria-label={title + ' start ' + (i + 1)}
              type="time"
              required
              value={slot[0]}
              onChange={(e) =>
                change(intervals.map((s, index) => (index === i ? [e.target.value, s[1]] : s)))
              }
            />
            <span>to</span>
            <input
              aria-label={title + ' end ' + (i + 1)}
              type="time"
              required
              value={slot[1]}
              onChange={(e) =>
                change(intervals.map((s, index) => (index === i ? [s[0], e.target.value] : s)))
              }
            />
            <Button
              type="button"
              variant="ghost"
              aria-label={'Remove interval ' + (i + 1)}
              onClick={() => change(intervals.filter((_, index) => index !== i))}
            >
              <X size={15} />
            </Button>
          </div>
        ))}
        {intervals.length > 0 && (
          <button
            type="button"
            className="text-link"
            onClick={() => change([...intervals, ['13:00', '18:00']])}
          >
            <Plus size={13} />
            Add interval
          </button>
        )}
      </div>
    </div>
  )
}
function PolicyEditor({
  template,
  close,
  saved,
}: {
  template?: Policy
  close: () => void
  saved: () => void
}) {
  const [name, setName] = useState(template?.name || 'Standard resolution SLA')
  const [timezone, setTimezone] = useState(template?.calendar.timezone || 'Asia/Dhaka')
  const [hours, setHours] = useState<Hours>(
    template ? structuredClone(template.calendar.hours) : structuredClone(defaultHours),
  )
  const [exceptions, setExceptions] = useState<Hours>(
    template && !Array.isArray(template.calendar.exceptions)
      ? structuredClone(template.calendar.exceptions)
      : {},
  )
  const [rules, setRules] = useState<Rule[]>(
    template
      ? template.rules.map((r) => ({
          priority: r.priority,
          resolution_minutes: r.resolution_minutes,
          warning_percent: r.warning_percent,
        }))
      : priorities.map((p) => ({
          priority: p,
          resolution_minutes: { low: 2880, medium: 1440, high: 480, critical: 120 }[p],
          warning_percent: 80,
        })),
  )
  const [exceptionDate, setExceptionDate] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const toast = useToast()
  function validate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      new Intl.DateTimeFormat('en', { timeZone: timezone })
      if (!Object.values(hours).some((s) => s.length))
        throw new Error('At least one business interval is required.')
      for (const [day, slots] of Object.entries({ ...hours, ...exceptions })) {
        let end = ''
        for (const s of slots) {
          if (s[0] >= s[1] || s[0] < end)
            throw new Error(
              day + ': intervals must be sorted, non-overlapping and end after they start.',
            )
          end = s[1]
        }
      }
      setConfirm(true)
    } catch (err) {
      setError(err)
    }
  }
  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await api('/admin/sla-policies', {
        method: 'POST',
        body: { name, timezone, hours, exceptions, rules },
      })
      toast('New SLA version activated.')
      saved()
    } catch (err) {
      setError(err)
      setConfirm(false)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <Modal
        open
        title="Create a new SLA policy version"
        onClose={() => {
          if (!busy) close()
        }}
      >
        <form onSubmit={validate}>
          <FormErrors error={error} />
          <div className="form-grid">
            <Field label="Policy name">
              <input
                required
                maxLength={255}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Timezone">
              <input
                required
                list="timezones"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              />
              <datalist id="timezones">
                {['Asia/Dhaka', 'UTC', 'Europe/London', 'America/New_York', 'Asia/Singapore'].map(
                  (t) => (
                    <option key={t}>{t}</option>
                  ),
                )}
              </datalist>
            </Field>
          </div>
          <h3>Resolution targets</h3>
          <div className="rule-editor">
            {rules.map((r, i) => (
              <div key={r.priority}>
                <Badge type="priority" value={r.priority} />
                <Field label="Business minutes">
                  <input
                    required
                    type="number"
                    min="1"
                    max="525600"
                    value={r.resolution_minutes}
                    onChange={(e) =>
                      setRules((v) =>
                        v.map((rule, n) =>
                          n === i ? { ...rule, resolution_minutes: Number(e.target.value) } : rule,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="Warning %">
                  <input
                    required
                    type="number"
                    min="1"
                    max="99"
                    value={r.warning_percent}
                    onChange={(e) =>
                      setRules((v) =>
                        v.map((rule, n) =>
                          n === i ? { ...rule, warning_percent: Number(e.target.value) } : rule,
                        ),
                      )
                    }
                  />
                </Field>
              </div>
            ))}
          </div>
          <h3>Weekly business hours</h3>
          <p className="page-note">
            Sorted intervals, within one day. Split overnight shifts across two days.
          </p>
          {days.map((day, i) => (
            <Intervals
              title={day}
              key={day}
              intervals={hours[String(i)] || []}
              change={(value) => setHours((v) => ({ ...v, [String(i)]: value }))}
            />
          ))}
          <h3>Holidays & special hours</h3>
          <p className="page-note">An exception replaces that date's normal schedule.</p>
          <div className="exception-add">
            <input
              aria-label="Exception date"
              type="date"
              value={exceptionDate}
              onChange={(e) => setExceptionDate(e.target.value)}
            />
            <Button
              variant="secondary"
              type="button"
              disabled={!exceptionDate}
              onClick={() => {
                setExceptions((v) => ({ ...v, [exceptionDate]: [] }))
                setExceptionDate('')
              }}
            >
              Add date
            </Button>
          </div>
          {Object.entries(exceptions).map(([day, slots]) => (
            <div key={day}>
              <Intervals
                title={day}
                intervals={slots}
                change={(value) => setExceptions((v) => ({ ...v, [day]: value }))}
              />
              <button
                className="text-link danger"
                type="button"
                onClick={() =>
                  setExceptions((v) => {
                    const next = { ...v }
                    delete next[day]
                    return next
                  })
                }
              >
                Remove exception
              </button>
            </div>
          ))}
          <div className="form-actions">
            <Button variant="secondary" type="button" onClick={close}>
              Cancel
            </Button>
            <Button type="submit">Review & activate</Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={confirm}
        title="Activate the new version?"
        onClose={() => {
          if (!busy) setConfirm(false)
        }}
      >
        <p>
          New tickets will use these targets and business hours. Existing tickets keep their
          original commitments.
        </p>
        <div className="form-actions">
          <Button variant="secondary" disabled={busy} onClick={() => setConfirm(false)}>
            Back to editor
          </Button>
          <Button busy={busy} onClick={submit}>
            Activate version
          </Button>
        </div>
      </Modal>
    </>
  )
}
