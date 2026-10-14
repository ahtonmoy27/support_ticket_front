export type Role = 'admin' | 'agent' | 'customer'
export type Priority = 'low' | 'medium' | 'high' | 'critical'
export type Status = 'open' | 'in_progress' | 'waiting_for_customer' | 'resolved' | 'closed'
export interface Named {
  id: number
  name: string
}
export interface Category extends Named {
  is_active: boolean
}
export interface User extends Named {
  email: string
  role: Role
  is_active: boolean
  is_available: boolean
  categories?: Category[]
}
export interface Ticket {
  id: number
  ticket_number: string
  subject: string
  description: string
  priority: Priority
  status: Status
  created_by: number
  creator?: Named
  customer_id: number
  assigned_agent_id: number | null
  category_id: number
  customer?: Named
  assigned_agent?: Named | null
  category?: Named
  sla_started_at: string
  sla_warning_at: string
  sla_due_at: string
  sla_breached_at: string | null
  resolved_at: string | null
  closed_at: string | null
  sla_state: 'within' | 'warning' | 'breached' | 'met'
  created_at: string
  updated_at: string
}
export interface Message {
  id: number
  author_id: number
  author?: Named
  body: string
  visibility: 'public' | 'internal'
  created_at: string
}
export interface Attachment {
  id: number
  ticket_message_id: number | null
  original_name: string
  mime_type: string
  size_bytes: number
  scan_status: string
}
export interface Activity {
  id: number
  actor_id: number | null
  action: string
  old_values: Record<string, unknown> | unknown[]
  new_values: Record<string, unknown> | unknown[]
  created_at: string
}
export interface DeskNotification {
  id: string
  data: { ticket_id: number; event: string; event_id: number }
  read_at: string | null
  created_at: string
}
export interface ImportRecord {
  id: number
  filename: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  total_rows: number
  processed_rows: number
  failed_rows: number
  skipped_rows: number
  error: string | null
  created_at: string
}
export type Hours = Record<string, [string, string][]>
export interface Rule {
  priority: Priority
  resolution_minutes: number
  warning_percent: number
}
export interface Policy {
  id: number
  name: string
  version: number
  is_active: boolean
  rules: Rule[]
  calendar: { timezone: string; hours: Hours; exceptions: Hours | [] }
}
export interface Metrics {
  by_status: Partial<Record<Status, number | string>>
  by_priority: Partial<Record<Priority, number | string>>
  unassigned: number
  sla_breached: number
  sla_warning: number
}
export interface PageMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}
export type ApiPage<T> = { data: T[]; meta: PageMeta } | ({ data: T[] } & PageMeta)
export interface Page<T> {
  items: T[]
  current: number
  last: number
  total: number
  perPage: number
}
export const priorities: Priority[] = ['low', 'medium', 'high', 'critical']
export const statuses: Status[] = [
  'open',
  'in_progress',
  'waiting_for_customer',
  'resolved',
  'closed',
]
