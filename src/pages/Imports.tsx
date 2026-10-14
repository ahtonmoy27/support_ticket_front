import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Download, FileUp, RefreshCw, Upload } from 'lucide-react'
import { useResource } from '../hooks/useResource'
import { useToast } from '../providers/toast'
import { api, download } from '../lib/api'
import { date, errorText, pageOf } from '../lib/utils'
import {
  Badge,
  Button,
  Empty,
  ErrorState,
  FormErrors,
  PageHeader,
  PageSkeleton,
  Pagination,
  TableSkeleton,
} from '../components/ui'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import type { ApiPage, ImportRecord } from '../types'

export function Imports() {
  useDocumentTitle('Ticket Imports')
  const [page, setPage] = useState(1)
  const r = useResource<ApiPage<ImportRecord>>('/admin/imports?page=' + page)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const navigate = useNavigate()
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!file) return
    if (!/\.csv$/i.test(file.name) || file.size > 50 * 1024 * 1024) {
      setError(new Error('Choose a CSV file, maximum 50 MB.'))
      return
    }
    setBusy(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const result = await api<{ data: ImportRecord }>('/admin/imports', { method: 'POST', body })
      navigate('/admin/imports/' + result.data.id)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }
  function template() {
    const url = URL.createObjectURL(
      new Blob(
        ['customer_email,category,subject,description,priority,source_system,external_ticket_id\n'],
        { type: 'text/csv' },
      ),
    )
    const a = document.createElement('a')
    a.href = url
    a.download = 'ticket-import-template.csv'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <>
      <PageHeader
        eyebrow="ADMINISTRATION"
        title="Bring your tickets together"
        description="Import CSV records with validation, duplicate checks, and a clear results report."
        action={
          <Button variant="secondary" onClick={template}>
            <Download size={16} />
            CSV template
          </Button>
        }
      />
      <section className="panel import-upload-panel">
        <div>
          <span className="empty-icon">
            <FileUp size={28} />
          </span>
          <h2>Import ticket data</h2>
          <p>CSV · up to 50 MB · 100,000 rows by default</p>
        </div>
        <form onSubmit={submit}>
          <FormErrors error={error} />
          <label className="upload-zone">
            <Upload size={23} />
            <strong>{file?.name || 'Choose a CSV file'}</strong>
            <small>
              Required columns: customer_email, category, subject, description, priority.
            </small>
            <input
              aria-label="CSV file"
              type="file"
              required
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <p className="page-note">
            Customers and categories must already exist. Optional source_system and
            external_ticket_id values must be paired.
          </p>
          <Button busy={busy} disabled={!file} type="submit">
            Start import
            <ArrowRight size={16} />
          </Button>
        </form>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Import history</h2>
            <p>Track outcomes and download invalid-row reports</p>
          </div>
          <Button variant="ghost" onClick={r.refresh} aria-label="Refresh imports">
            <RefreshCw size={17} />
          </Button>
        </div>
        {r.loading ? (
          <TableSkeleton rows={5} cols={6} />
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
                        <th>File</th>
                        <th>Status</th>
                        <th>Processed</th>
                        <th>Failed</th>
                        <th>Created</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {pageOf(r.data).items.map((i) => (
                        <tr key={i.id}>
                          <td>
                            <Link className="text-link" to={'/admin/imports/' + i.id}>
                              {i.filename}
                            </Link>
                          </td>
                          <td>
                            <Badge value={i.status} />
                          </td>
                          <td>{i.processed_rows}</td>
                          <td>{i.failed_rows}</td>
                          <td>{date(i.created_at)}</td>
                          <td>
                            <Link to={'/admin/imports/' + i.id} aria-label={'View import ' + i.id}>
                              <ArrowRight size={16} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty
                  title="No imports yet"
                  text="Upload your first CSV to start bringing records into your workspace."
                />
              )}
              <Pagination page={pageOf(r.data)} change={setPage} />
            </>
          )
        )}
      </section>
    </>
  )
}
export function ImportDetail() {
  const { id } = useParams()
  const r = useResource<{ data: ImportRecord }>('/admin/imports/' + id, 5000, (value) =>
    ['completed', 'failed'].includes(value.data.status),
  )
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const importRecord = r.data?.data
  useDocumentTitle(
    importRecord ? `Import #${importRecord.id} · ${importRecord.filename}` : 'Import Details',
  )

  async function errors() {
    setBusy(true)
    try {
      await download('/admin/imports/' + id + '/errors', 'import-' + id + '-errors.csv')
    } catch (err) {
      toast(errorText(err), 'error')
    } finally {
      setBusy(false)
    }
  }
  if (r.loading && !r.data) return <PageSkeleton title="Loading import details..." />
  if (r.error) return <ErrorState error={r.error} retry={r.refresh} />
  if (!r.data) return null
  const i = r.data.data
  const processing = ['pending', 'processing'].includes(i.status)
  return (
    <>
      <PageHeader
        back="/admin/imports"
        eyebrow={'IMPORT #' + i.id}
        title={i.filename}
        description={'Uploaded ' + date(i.created_at)}
        action={
          <Button variant="secondary" onClick={r.refresh}>
            <RefreshCw size={16} />
            Refresh
          </Button>
        }
      />
      <section className="panel import-progress">
        <Badge value={i.status} />
        <h2>
          {i.status === 'pending'
            ? 'Waiting for a worker'
            : i.status === 'processing'
              ? 'Your tickets are coming together.'
              : i.status === 'completed'
                ? 'Import complete.'
                : 'Import stopped.'}
        </h2>
        <p>
          {processing
            ? 'Processing in the background. You can leave this page and return later.'
            : 'Review the summary below. Successful rows remain saved.'}
        </p>
        {processing && (
          <div className="indeterminate-progress" role="progressbar" aria-label="Import processing">
            <span />
          </div>
        )}
        {i.error && <FormErrors error={new Error(i.error)} />}
        <div className="import-counts">
          {[
            { title: 'Processed', value: i.processed_rows },
            { title: 'Successful', value: i.processed_rows - i.failed_rows - i.skipped_rows },
            { title: 'Failed rows', value: i.failed_rows },
            { title: 'Duplicates skipped', value: i.skipped_rows },
          ].map((c) => (
            <div key={c.title}>
              <strong>{c.value}</strong>
              <span>{c.title}</span>
            </div>
          ))}
        </div>
        {i.failed_rows > 0 && (
          <Button variant="secondary" busy={busy} onClick={errors}>
            <Download size={16} />
            Download error report
          </Button>
        )}
        <p className="page-note">
          {processing
            ? 'Total rows are discovered as the file is read. A completion percentage is not available yet.'
            : 'Discovered rows: ' +
              i.total_rows +
              '. Completed imports can include invalid or skipped rows.'}
        </p>
      </section>
      <div className="info-banner">
        <FileUp size={19} />
        <span>
          Re-uploading creates a new import. Rows without external source identifiers may be
          duplicated; an upload is not an idempotent retry.
        </span>
      </div>
    </>
  )
}
