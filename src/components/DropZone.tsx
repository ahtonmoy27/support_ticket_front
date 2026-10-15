import { useRef, useState } from 'react'
import { FileText, Paperclip, UploadCloud, X } from 'lucide-react'
import { validateFiles } from '../lib/utils'

interface DropZoneProps {
  files: File[]
  onChange: (files: File[]) => void
  accept?: string
  maxSizeMB?: number
  disabled?: boolean
  hint?: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export function DropZone({
  files,
  onChange,
  accept = '.pdf,.png,.jpg,.jpeg,.txt,.docx,.csv,.zip',
  disabled = false,
  hint = 'PDF, PNG, JPEG, TXT, DOCX · up to 10 MB each',
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dropError, setDropError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragging(true)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled && !isDragging) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (disabled) return

    const droppedFiles = Array.from(e.dataTransfer.files || [])
    if (!droppedFiles.length) return

    const validationError = validateFiles(droppedFiles)
    if (validationError) {
      setDropError(validationError)
      return
    }

    setDropError(null)
    // Merge new files avoiding exact duplicate file names
    const merged = [...files]
    for (const f of droppedFiles) {
      if (!merged.some((existing) => existing.name === f.name && existing.size === f.size)) {
        merged.push(f)
      }
    }
    onChange(merged)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (!selectedFiles.length) return

    const validationError = validateFiles(selectedFiles)
    if (validationError) {
      setDropError(validationError)
      return
    }

    setDropError(null)
    const merged = [...files]
    for (const f of selectedFiles) {
      if (!merged.some((existing) => existing.name === f.name && existing.size === f.size)) {
        merged.push(f)
      }
    }
    onChange(merged)
    // Reset file input so user can choose the same file again if desired
    if (inputRef.current) inputRef.current.value = ''
  }

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className="dropzone-container">
      <div
        className={`dropzone-box ${isDragging ? 'is-dragging' : ''} ${disabled ? 'is-disabled' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled) inputRef.current?.click()
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload files drop zone"
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          disabled={disabled}
          style={{ display: 'none' }}
          onChange={handleFileInput}
        />

        <div className="dropzone-icon-wrapper">
          {isDragging ? (
            <UploadCloud size={28} className="dropzone-icon drop-pulse" />
          ) : (
            <Paperclip size={24} className="dropzone-icon" />
          )}
        </div>

        <div className="dropzone-text">
          <strong>{isDragging ? 'Drop your files here!' : 'Click or drag files here to upload'}</strong>
          <small>{hint}</small>
        </div>
      </div>

      {dropError && <small className="field-error dropzone-error">{dropError}</small>}

      {files.length > 0 && (
        <div className="dropzone-file-list" aria-label="Attached files list">
          {files.map((file, idx) => (
            <div className="dropzone-file-chip" key={`${file.name}-${idx}`}>
              <FileText size={15} className="dropzone-file-icon" aria-hidden="true" />
              <div className="dropzone-file-meta">
                <span className="dropzone-file-name" title={file.name}>
                  {file.name}
                </span>
                <span className="dropzone-file-size">{formatFileSize(file.size)}</span>
              </div>
              <button
                type="button"
                className="dropzone-remove-btn"
                aria-label={`Remove file ${file.name}`}
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation()
                  removeFile(idx)
                }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

