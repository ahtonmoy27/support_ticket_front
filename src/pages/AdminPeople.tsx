import { useState } from 'react'
import { Edit3, Plus, Users } from 'lucide-react'
import { useResource } from '../hooks/useResource'
import { useToast } from '../providers/toast'
import { api } from '../lib/api'
import { initials, pageOf } from '../lib/utils'
import {
  Badge,
  Button,
  CardSkeleton,
  Empty,
  ErrorState,
  Field,
  FormErrors,
  Modal,
  PageHeader,
  Pagination,
  TableSkeleton,
} from '../components/ui'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import type { ApiPage, Category, User } from '../types'

export function Categories() {
  useDocumentTitle('Categories')
  const r = useResource<{ data: Category[] }>('/categories')
  const [selected, setSelected] = useState<Category | 'new' | null>(null)
  return (
    <>
      <PageHeader
        eyebrow="ADMINISTRATION"
        title="Ticket categories"
        description="A clear starting point for every support request."
        action={
          <Button onClick={() => setSelected('new')}>
            <Plus size={17} />
            Add category
          </Button>
        }
      />
      <section className="panel">
        {r.loading && !r.data ? (
          <CardSkeleton count={4} />
        ) : r.error ? (
          <ErrorState error={r.error} retry={r.refresh} />
        ) : (
          r.data && (
            <div className="category-grid">
              {r.data.data.map((c) => (
                <article className="category-card" key={c.id}>
                  <div className="category-letter">{c.name[0]}</div>
                  <div>
                    <h3>{c.name}</h3>
                    <small>Category #{c.id}</small>
                  </div>
                  <Badge value={c.is_active ? 'active' : 'inactive'} />
                  <Button
                    variant="ghost"
                    aria-label={'Edit ' + c.name}
                    onClick={() => setSelected(c)}
                  >
                    <Edit3 size={16} />
                  </Button>
                </article>
              ))}
            </div>
          )
        )}
      </section>
      {selected && (
        <CategoryEditor
          key={selected === 'new' ? 'new' : selected.id}
          category={selected === 'new' ? undefined : selected}
          close={() => setSelected(null)}
          saved={() => {
            setSelected(null)
            r.refresh()
          }}
        />
      )}
    </>
  )
}
function CategoryEditor({
  category,
  close,
  saved,
}: {
  category?: Category
  close: () => void
  saved: () => void
}) {
  const [name, setName] = useState(category?.name || '')
  const [active, setActive] = useState(category?.is_active ?? true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const notify = useToast()
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api(category ? '/admin/categories/' + category.id : '/admin/categories', {
        method: category ? 'PATCH' : 'POST',
        body: { name, is_active: active },
      })
      notify('Category saved.')
      saved()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      open
      title={category ? 'Edit category' : 'New category'}
      onClose={() => {
        if (!busy) close()
      }}
    >
      <form onSubmit={submit}>
        <FormErrors error={error} />
        <Field label="Category name">
          <input required maxLength={255} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <label className="checkbox">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active — available for new tickets
        </label>
        <div className="form-actions">
          <Button variant="secondary" type="button" disabled={busy} onClick={close}>
            Cancel
          </Button>
          <Button busy={busy} type="submit">
            Save category
          </Button>
        </div>
      </form>
    </Modal>
  )
}
export function Agents() {
  useDocumentTitle('Support Agents')
  const [page, setPage] = useState(1)
  const r = useResource<ApiPage<User>>('/admin/agents?page=' + page)
  const categories = useResource<{ data: Category[] }>('/categories')
  const [selected, setSelected] = useState<User | 'new' | null>(null)
  return (
    <>
      <PageHeader
        eyebrow="ADMINISTRATION"
        title="Your support team"
        description="The people behind every helpful reply."
        action={
          <Button onClick={() => setSelected('new')}>
            <Plus size={17} />
            Add support agent
          </Button>
        }
      />
      <section className="panel">
        {r.loading && !r.data ? (
          <TableSkeleton rows={5} cols={5} />
        ) : r.error ? (
          <ErrorState error={r.error} retry={r.refresh} />
        ) : (
          r.data && (
            <>
              {pageOf(r.data).items.length ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Agent</th>
                        <th>Categories</th>
                        <th>Account</th>
                        <th>Availability</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageOf(r.data).items.map((a) => (
                        <tr key={a.id}>
                          <td>
                            <div className="person-cell">
                              <span className="avatar">{initials(a.name)}</span>
                              <div>
                                <strong>{a.name}</strong>
                                <small>{a.email}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="tag-list">
                              {a.categories?.length ? (
                                a.categories.map((c) => (
                                  <span className="subtle-chip" key={c.id}>
                                    {c.name}
                                  </span>
                                ))
                              ) : (
                                <small>No mapped categories</small>
                              )}
                            </div>
                          </td>
                          <td>
                            <Badge value={a.is_active ? 'active' : 'inactive'} />
                          </td>
                          <td>
                            <Badge value={a.is_available ? 'available' : 'unavailable'} />
                          </td>
                          <td>
                            <Button variant="secondary" onClick={() => setSelected(a)}>
                              <Edit3 size={14} />
                              Edit
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty
                  title="Build your support team"
                  text="Create agents and connect them to categories."
                  action={
                    <Button onClick={() => setSelected('new')}>
                      <Users size={16} />
                      Add an agent
                    </Button>
                  }
                />
              )}
              <Pagination page={pageOf(r.data)} change={setPage} />
            </>
          )
        )}
      </section>
      {selected && (
        <AgentEditor
          key={selected === 'new' ? 'new' : selected.id}
          agent={selected === 'new' ? undefined : selected}
          categories={categories.data?.data || []}
          categoryError={categories.error}
          retryCategories={categories.refresh}
          close={() => setSelected(null)}
          saved={() => {
            setSelected(null)
            r.refresh()
          }}
        />
      )}
    </>
  )
}
function AgentEditor({
  agent,
  categories,
  categoryError,
  retryCategories,
  close,
  saved,
}: {
  agent?: User
  categories: Category[]
  categoryError: unknown
  retryCategories: () => void
  close: () => void
  saved: () => void
}) {
  const [form, setForm] = useState({
    name: agent?.name || '',
    email: agent?.email || '',
    password: '',
    is_active: agent?.is_active ?? true,
    is_available: agent?.is_available ?? true,
    category_ids: agent?.categories?.map((c) => c.id) || [],
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [confirm, setConfirm] = useState(false)
  const notify = useToast()
  async function save() {
    setBusy(true)
    setError(null)
    try {
      const body = agent
        ? {
            name: form.name,
            is_active: form.is_active,
            is_available: form.is_available,
            category_ids: form.category_ids,
          }
        : {
            name: form.name,
            email: form.email,
            password: form.password,
            category_ids: form.category_ids,
          }
      await api(agent ? '/admin/agents/' + agent.id : '/admin/agents', {
        method: agent ? 'PATCH' : 'POST',
        body,
      })
      notify('Agent saved.')
      saved()
    } catch (err) {
      setError(err)
      setConfirm(false)
    } finally {
      setBusy(false)
    }
  }
  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (agent?.is_active && !form.is_active) setConfirm(true)
    else void save()
  }
  return (
    <>
      <Modal
        open
        title={agent ? 'Edit support agent' : 'New support agent'}
        onClose={() => {
          if (!busy) close()
        }}
      >
        <form onSubmit={submit}>
          <FormErrors error={error} />
          <Field label="Full name">
            <input
              required
              maxLength={255}
              value={form.name}
              onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
            />
          </Field>
          {!agent && (
            <>
              <Field label="Email">
                <input
                  required
                  type="email"
                  maxLength={255}
                  value={form.email}
                  onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))}
                />
              </Field>
              <Field label="Initial password" hint="At least 12 characters.">
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  value={form.password}
                  onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))}
                />
              </Field>
            </>
          )}
          <fieldset>
            <legend>Category access</legend>
            {categoryError ? (
              <ErrorState error={categoryError} retry={retryCategories} />
            ) : (
              categories.map((c) => (
                <label className="checkbox" key={c.id}>
                  <input
                    type="checkbox"
                    checked={form.category_ids.includes(c.id)}
                    onChange={(e) =>
                      setForm((v) => ({
                        ...v,
                        category_ids: e.target.checked
                          ? [...v.category_ids, c.id]
                          : v.category_ids.filter((id) => id !== c.id),
                      }))
                    }
                  />
                  {c.name}
                  {!c.is_active && <small>Inactive category</small>}
                </label>
              ))
            )}
            <small>Agents without category mappings do not receive queue work.</small>
          </fieldset>
          {agent && (
            <div className="form-grid">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((v) => ({ ...v, is_active: e.target.checked }))}
                />
                Active account
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={form.is_available}
                  onChange={(e) => setForm((v) => ({ ...v, is_available: e.target.checked }))}
                />
                Available for assignment
              </label>
            </div>
          )}
          <div className="form-actions">
            <Button variant="secondary" type="button" disabled={busy} onClick={close}>
              Cancel
            </Button>
            <Button busy={busy} type="submit">
              Save agent
            </Button>
          </div>
        </form>
      </Modal>
      <Modal open={confirm} title="Deactivate this agent?" onClose={() => setConfirm(false)}>
        <p>
          They will lose application access. Existing assignments are not automatically
          redistributed.
        </p>
        <div className="form-actions">
          <Button variant="secondary" onClick={() => setConfirm(false)}>
            Keep active
          </Button>
          <Button busy={busy} onClick={save}>
            Deactivate
          </Button>
        </div>
      </Modal>
    </>
  )
}
