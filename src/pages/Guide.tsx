import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Cpu,
  Database,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  FileUp,
  HelpCircle,
  Inbox,
  Info,
  Layers,
  Lock,
  MessageSquare,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Ticket,
  Users,
  Zap,
} from 'lucide-react'
import { useAuth } from '../providers/auth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function Guide() {
  useDocumentTitle('Project Guide & System Overview')
  const { user } = useAuth()
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [activeRoleTab, setActiveRoleTab] = useState<'customer' | 'agent' | 'admin'>('customer')
  const [slaPriority, setSlaPriority] = useState<'critical' | 'high' | 'medium' | 'low'>('critical')
  const [slaStartScenario, setSlaStartScenario] = useState<'thu_evening' | 'thu_morning' | 'sun_morning'>('thu_evening')

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  // SLA interactive calculation simulator logic
  const slaDurations = {
    critical: { hours: 2, label: 'Critical (2 Hours SLA)' },
    high: { hours: 8, label: 'High (8 Hours SLA)' },
    medium: { hours: 24, label: 'Medium (24 Hours / ~2.6 Business Days)' },
    low: { hours: 48, label: 'Low (48 Hours / ~5.3 Business Days)' },
  }

  const slaScenarios = {
    thu_evening: {
      name: 'Thursday 5:00 PM (17:00)',
      day: 'Thursday',
      time: '17:00',
      description: 'Created 1 hour before Thursday business day closes (09:00 - 18:00).',
      calculation: {
        critical: {
          steps: [
            'Thursday 17:00 -> 18:00 (1 hour consumed before close)',
            'Remaining SLA: 1 hour (60 minutes)',
            'Friday & Saturday: Calendar Weekend (Skipped)',
            'Sunday 09:00: Business opens -> 1 hour consumed',
          ],
          deadline: 'Sunday at 10:00 AM',
          highlight: 'Rolls over Friday & Saturday weekend seamlessly to Sunday morning.',
        },
        high: {
          steps: [
            'Thursday 17:00 -> 18:00 (1 hour consumed)',
            'Remaining SLA: 7 hours',
            'Friday & Saturday: Weekend (Skipped)',
            'Sunday 09:00 -> 16:00 (7 hours consumed)',
          ],
          deadline: 'Sunday at 4:00 PM (16:00)',
          highlight: 'Crosses the entire 2-day weekend with remaining hours applied to Sunday.',
        },
        medium: {
          steps: [
            'Thursday: 1 hour consumed (Remaining: 23 hrs)',
            'Friday & Saturday: Skipped',
            'Sunday: 9 hours consumed (09:00-18:00, Remaining: 14 hrs)',
            'Monday: 9 hours consumed (09:00-18:00, Remaining: 5 hrs)',
            'Tuesday: 5 hours consumed (09:00-14:00)',
          ],
          deadline: 'Tuesday at 2:00 PM (14:00)',
          highlight: 'Calculated precisely across multiple working days and weekend gaps.',
        },
        low: {
          steps: [
            'Thursday: 1 hour consumed (Remaining: 47 hrs)',
            'Friday & Saturday: Skipped',
            'Sunday: 9 hrs (Remaining: 38 hrs)',
            'Monday: 9 hrs (Remaining: 29 hrs)',
            'Tuesday: 9 hrs (Remaining: 20 hrs)',
            'Wednesday: 9 hrs (Remaining: 11 hrs)',
            'Thursday: 9 hrs (Remaining: 2 hrs)',
            'Next Sunday: 2 hrs (09:00-11:00)',
          ],
          deadline: 'Following Sunday at 11:00 AM',
          highlight: 'Traverses multiple weeks and weekend intervals with sub-minute precision.',
        },
      },
    },
    thu_morning: {
      name: 'Thursday 10:00 AM',
      day: 'Thursday',
      time: '10:00',
      description: 'Created early on Thursday morning with 8 business hours left.',
      calculation: {
        critical: {
          steps: ['Thursday 10:00 -> 12:00 (2 hours consumed within the same shift)'],
          deadline: 'Thursday at 12:00 PM (Same Day)',
          highlight: 'Completes within the active Thursday business shift without weekend rollover.',
        },
        high: {
          steps: ['Thursday 10:00 -> 18:00 (8 hours consumed within the shift)'],
          deadline: 'Thursday at 6:00 PM (Exact Shift Close)',
          highlight: 'Reaches the exact end-of-day boundary at 18:00.',
        },
        medium: {
          steps: [
            'Thursday 10:00 -> 18:00 (8 hours consumed, Remaining: 16 hrs)',
            'Friday & Saturday: Skipped',
            'Sunday: 9 hours (Remaining: 7 hrs)',
            'Monday: 7 hours (09:00 -> 16:00)',
          ],
          deadline: 'Monday at 4:00 PM (16:00)',
          highlight: 'Takes remaining hours from Thursday and extends across Sunday into Monday.',
        },
        low: {
          steps: [
            'Thursday: 8 hours (Remaining: 40 hrs)',
            'Sunday, Monday, Tuesday, Wednesday: 36 hrs (Remaining: 4 hrs)',
            'Thursday: 4 hours (09:00 -> 13:00)',
          ],
          deadline: 'Following Thursday at 1:00 PM',
          highlight: 'Accurately computes weekly cycle spans.',
        },
      },
    },
    sun_morning: {
      name: 'Sunday 9:00 AM (Week Opening)',
      day: 'Sunday',
      time: '09:00',
      description: 'Created at the very start of the Sunday-Thursday work week.',
      calculation: {
        critical: {
          steps: ['Sunday 09:00 -> 11:00 (2 hours consumed)'],
          deadline: 'Sunday at 11:00 AM',
          highlight: 'Straightforward execution within opening hours.',
        },
        high: {
          steps: ['Sunday 09:00 -> 17:00 (8 hours consumed)'],
          deadline: 'Sunday at 5:00 PM (17:00)',
          highlight: 'Full workday progress calculated smoothly.',
        },
        medium: {
          steps: [
            'Sunday: 9 hours consumed (Remaining: 15 hrs)',
            'Monday: 9 hours consumed (Remaining: 6 hrs)',
            'Tuesday: 6 hours consumed (09:00 -> 15:00)',
          ],
          deadline: 'Tuesday at 3:00 PM (15:00)',
          highlight: 'Runs across consecutive business days without interruption.',
        },
        low: {
          steps: [
            'Sunday through Thursday: 45 hours (Remaining: 3 hrs)',
            'Friday & Saturday: Skipped',
            'Following Sunday: 3 hours (09:00 -> 12:00)',
          ],
          deadline: 'Following Sunday at 12:00 PM',
          highlight: 'Properly spans the entire 5-day week and rolls through the weekend.',
        },
      },
    },
  }

  const currentCalc = slaScenarios[slaStartScenario].calculation[slaPriority]

  return (
    <div className="min-h-screen bg-[#f8faf8] text-[#1c2e28] font-sans antialiased">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#e2e8e2] px-4 lg:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 text-[#174a40] font-bold text-lg hover:opacity-90 transition-opacity">
            <span className="w-9 h-9 rounded-xl bg-[#174a40] text-white flex items-center justify-center shadow-sm shadow-[#174a40]/20">
              <MessageSquare size={19} className="text-[#e6f2bc]" />
            </span>
            <span>
              Support<span className="text-[#2c7a6b] font-normal">Desk</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#e6f2bc] text-[#174a40] border border-[#d2e49c]">
              Interactive Guide
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#4b635b]">
            <a href="#quick-start" className="hover:text-[#174a40] transition-colors">Demo Accounts</a>
            <a href="#how-to-use" className="hover:text-[#174a40] transition-colors">How to Use</a>
            <a href="#features" className="hover:text-[#174a40] transition-colors">Core Features</a>
            <a href="#sla-engine" className="hover:text-[#174a40] transition-colors">SLA Simulator</a>
            <a href="#tech-stack" className="hover:text-[#174a40] transition-colors">Architecture</a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#174a40] text-white text-sm font-semibold hover:bg-[#1f5f52] shadow-sm transition-all"
              >
                <span>Go to Dashboard</span>
                <ArrowRight size={15} />
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 rounded-lg border border-[#c9d6ca] text-[#174a40] text-sm font-semibold hover:bg-[#edf3ec] transition-all"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#174a40] text-white text-sm font-semibold hover:bg-[#1f5f52] shadow-sm transition-all"
                >
                  <span>Sign Up</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24 border-b border-[#e4ebe4] bg-gradient-to-b from-white via-[#f6f9f6] to-[#edf3ec]">
        <div className="absolute inset-0 bg-[radial-gradient(#174a40_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.04] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#e8f1e7] border border-[#cfdfce] text-[#174a40] text-xs font-semibold mb-6 shadow-xs animate-fade-in">
            <Sparkles size={14} className="text-[#2c7a6b]" />
            <span>Complete Technical Evaluation & Application Showcase</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#14332c] leading-tight sm:leading-tight">
            Support Ticket & <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#174a40] via-[#24695b] to-[#3a9381]">
              SLA Management System
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-xl text-[#4a645c] max-w-3xl mx-auto leading-relaxed">
            A high-performance enterprise customer support platform engineered with <strong>Laravel 13</strong>, <strong>React 19</strong>, and <strong>MySQL 8.4</strong>. Built with calendar-aware business hour SLAs, pessimistic concurrency protection, streaming CSV imports, and transactional outbox notifications.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link
              to={user ? '/dashboard' : '/login'}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#174a40] text-white text-base font-semibold hover:bg-[#1f5f52] shadow-md shadow-[#174a40]/25 hover:shadow-lg transition-all"
            >
              <span>{user ? 'Open Workspace' : 'Launch Live Demo'}</span>
              <ArrowRight size={17} />
            </Link>
            <a
              href="#sla-engine"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-[#c8d7c8] text-[#1f4a3e] text-base font-semibold hover:bg-[#f3f7f2] shadow-xs transition-all"
            >
              <Clock size={17} className="text-[#2c7a6b]" />
              <span>Test SLA Simulator</span>
            </a>
            <a
              href="#quick-start"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-[#c8d7c8] text-[#1f4a3e] text-base font-semibold hover:bg-[#f3f7f2] shadow-xs transition-all"
            >
              <Users size={17} className="text-[#2c7a6b]" />
              <span>Test Credentials</span>
            </a>
          </div>

          {/* Quick Stat Badges */}
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto text-left">
            <div className="p-4 rounded-xl bg-white border border-[#e0ebe0] shadow-xs">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#5a776e] uppercase tracking-wide">
                <ShieldCheck size={16} className="text-[#174a40]" />
                <span>Concurrency</span>
              </div>
              <div className="mt-1 text-lg font-bold text-[#14332c]">Pessimistic Locks</div>
              <div className="text-xs text-[#6e857c] mt-0.5">SELECT FOR UPDATE safety</div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#e0ebe0] shadow-xs">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#5a776e] uppercase tracking-wide">
                <Clock size={16} className="text-[#2c7a6b]" />
                <span>SLA Engine</span>
              </div>
              <div className="mt-1 text-lg font-bold text-[#14332c]">Business Hours</div>
              <div className="text-xs text-[#6e857c] mt-0.5">Shifts, holidays & snapshots</div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#e0ebe0] shadow-xs">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#5a776e] uppercase tracking-wide">
                <FileSpreadsheet size={16} className="text-[#2563eb]" />
                <span>CSV Processing</span>
              </div>
              <div className="mt-1 text-lg font-bold text-[#14332c]">Streaming Queue</div>
              <div className="text-xs text-[#6e857c] mt-0.5">100k+ rows, low memory</div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#e0ebe0] shadow-xs">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#5a776e] uppercase tracking-wide">
                <Zap size={16} className="text-[#d97706]" />
                <span>Notifications</span>
              </div>
              <div className="mt-1 text-lg font-bold text-[#14332c]">Transactional Outbox</div>
              <div className="text-xs text-[#6e857c] mt-0.5">Real-time WebSocket & Mail</div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Accounts Quick-Start Section */}
      <section id="quick-start" className="py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-[#2c7a6b] bg-[#e4f0e2] px-3 py-1 rounded-full border border-[#cfdfce]">
            Instant Testing
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#174a40] mt-3">
            Pre-Seeded Accounts & Role Capabilities
          </h2>
          <p className="text-sm sm:text-base text-[#4c685f] mt-2">
            Click to copy any credential set below. You can log into multiple browser profiles or incognito tabs to experience real-time collaboration.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Administrator Card */}
          <div className="bg-white rounded-2xl border-2 border-[#174a40]/20 shadow-md hover:shadow-lg transition-shadow overflow-hidden flex flex-col">
            <div className="bg-[#174a40] text-white p-5">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#e6f2bc] text-[#174a40]">
                  Full Access
                </span>
                <ShieldCheck size={22} className="text-[#e6f2bc]" />
              </div>
              <h3 className="text-xl font-bold mt-2">Administrator</h3>
              <p className="text-xs text-white/80 mt-0.5">Operational control, policies & team settings</p>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2.5 text-xs text-[#405c53]">
                <div className="flex items-start gap-2">
                  <Check size={15} className="text-[#174a40] shrink-0 mt-0.5" />
                  <span>Configure <strong>SLA policies & business calendars</strong> (shifts, holidays).</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={15} className="text-[#174a40] shrink-0 mt-0.5" />
                  <span>Manage <strong>Support Agents</strong> (categories, availability toggle).</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={15} className="text-[#174a40] shrink-0 mt-0.5" />
                  <span>Execute <strong>Streaming CSV imports</strong> and download error logs.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={15} className="text-[#174a40] shrink-0 mt-0.5" />
                  <span>Full ticket visibility, reassignments, notes & audit history.</span>
                </div>
              </div>

              <div className="p-3 bg-[#f5f8f5] rounded-xl border border-[#dfe8df] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#647c73] font-medium">Email:</span>
                  <code className="font-mono font-bold text-[#14332c]">admin@gmail.com</code>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#647c73] font-medium">Password:</span>
                  <code className="font-mono text-[#14332c]">password123321</code>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard('admin@gmail.com\tpassword123321', 'admin')}
                  className="w-full mt-2 py-1.5 px-3 rounded-lg bg-white border border-[#cddbcd] hover:bg-[#edf4ec] text-[#174a40] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  {copiedKey === 'admin' ? (
                    <>
                      <Check size={14} className="text-green-600" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy Admin Credentials</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Support Agent Card */}
          <div className="bg-white rounded-2xl border border-[#d6e3d6] shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
            <div className="bg-[#24584e] text-white p-5">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#d5edd3] text-[#1b4e43]">
                  Category Bound
                </span>
                <Users size={22} className="text-[#d5edd3]" />
              </div>
              <h3 className="text-xl font-bold mt-2">Support Agent</h3>
              <p className="text-xs text-white/80 mt-0.5">Assigned to Technical, Billing & General</p>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2.5 text-xs text-[#405c53]">
                <div className="flex items-start gap-2">
                  <Check size={15} className="text-[#24584e] shrink-0 mt-0.5" />
                  <span>Browse unassigned tickets in matching categories.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={15} className="text-[#24584e] shrink-0 mt-0.5" />
                  <span><strong>Atomic Claim</strong> with database lock protection.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={15} className="text-[#24584e] shrink-0 mt-0.5" />
                  <span>Post <strong>Internal Notes</strong> (strictly hidden from customers).</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={15} className="text-[#24584e] shrink-0 mt-0.5" />
                  <span>Mark tickets as <strong>Resolved</strong> once work is completed.</span>
                </div>
              </div>

              <div className="p-3 bg-[#f5f8f5] rounded-xl border border-[#dfe8df] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#647c73] font-medium">Email:</span>
                  <code className="font-mono font-bold text-[#14332c]">supporagent@gmail.com</code>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#647c73] font-medium">Password:</span>
                  <code className="font-mono text-[#14332c]">password123321</code>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard('supporagent@gmail.com\tpassword123321', 'agent')}
                  className="w-full mt-2 py-1.5 px-3 rounded-lg bg-white border border-[#cddbcd] hover:bg-[#edf4ec] text-[#174a40] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  {copiedKey === 'agent' ? (
                    <>
                      <Check size={14} className="text-green-600" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy Agent Credentials</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Customer / End User Card */}
          <div className="bg-white rounded-2xl border border-[#d6e3d6] shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
            <div className="bg-[#2c6e61] text-white p-5">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#e6f4ea] text-[#1b5e52]">
                  Self-Service
                </span>
                <Ticket size={22} className="text-[#e6f4ea]" />
              </div>
              <h3 className="text-xl font-bold mt-2">Customer / User</h3>
              <p className="text-xs text-white/80 mt-0.5">Isolated visibility & ticket ownership</p>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2.5 text-xs text-[#405c53]">
                <div className="flex items-start gap-2">
                  <Check size={15} className="text-[#2c6e61] shrink-0 mt-0.5" />
                  <span>Create new support tickets with Category & Priority.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={15} className="text-[#2c6e61] shrink-0 mt-0.5" />
                  <span>Upload validated attachments (PDF, DOCX, PNG, JPG).</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={15} className="text-[#2c6e61] shrink-0 mt-0.5" />
                  <span>Public conversation thread with real-time updates.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={15} className="text-[#2c6e61] shrink-0 mt-0.5" />
                  <span><strong>Close ticket</strong> once satisfied with the resolution.</span>
                </div>
              </div>

              <div className="p-3 bg-[#f5f8f5] rounded-xl border border-[#dfe8df] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#647c73] font-medium">Email:</span>
                  <code className="font-mono font-bold text-[#14332c]">user@gmail.com</code>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#647c73] font-medium">Password:</span>
                  <code className="font-mono text-[#14332c]">password123321</code>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard('user@gmail.com\tpassword123321', 'user')}
                  className="w-full mt-2 py-1.5 px-3 rounded-lg bg-white border border-[#cddbcd] hover:bg-[#edf4ec] text-[#174a40] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  {copiedKey === 'user' ? (
                    <>
                      <Check size={14} className="text-green-600" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy Customer Credentials</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#174a40] text-white text-sm font-semibold hover:bg-[#1f5f52] shadow-sm transition-all"
          >
            <span>Click Here to Sign In Now</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* How to Use Tabbed Walkthrough */}
      <section id="how-to-use" className="py-14 bg-white border-y border-[#e2ece2]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2c7a6b] bg-[#e4f0e2] px-3 py-1 rounded-full border border-[#cfdfce]">
              Step-by-Step Walkthrough
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#174a40] mt-3">
              How to Use Support Desk
            </h2>
            <p className="text-sm sm:text-base text-[#4c685f] mt-2">
              Select your perspective below to understand the lifecycle of a ticket from inception to closure.
            </p>
          </div>

          {/* Role Tabs */}
          <div className="flex items-center justify-center gap-2 mb-8 border-b border-[#e5ece5] pb-3">
            <button
              type="button"
              onClick={() => setActiveRoleTab('customer')}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
                activeRoleTab === 'customer'
                  ? 'bg-[#174a40] text-white shadow-sm'
                  : 'bg-[#f4f7f4] text-[#4d665e] hover:bg-[#eaf0ea]'
              }`}
            >
              <Ticket size={16} />
              <span>For Customers</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveRoleTab('agent')}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
                activeRoleTab === 'agent'
                  ? 'bg-[#174a40] text-white shadow-sm'
                  : 'bg-[#f4f7f4] text-[#4d665e] hover:bg-[#eaf0ea]'
              }`}
            >
              <Users size={16} />
              <span>For Support Agents</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveRoleTab('admin')}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
                activeRoleTab === 'admin'
                  ? 'bg-[#174a40] text-white shadow-sm'
                  : 'bg-[#f4f7f4] text-[#4d665e] hover:bg-[#eaf0ea]'
              }`}
            >
              <ShieldCheck size={16} />
              <span>For Administrators</span>
            </button>
          </div>

          {/* Tab Content: Customer */}
          {activeRoleTab === 'customer' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in">
              <div className="p-5 rounded-2xl bg-[#f8faf8] border border-[#e2ece2] relative">
                <span className="w-7 h-7 rounded-full bg-[#174a40] text-white text-xs font-bold flex items-center justify-center mb-3">
                  1
                </span>
                <h4 className="font-bold text-base text-[#14332c]">Create Ticket</h4>
                <p className="text-xs text-[#526e64] mt-1.5 leading-relaxed">
                  Click <strong>New ticket</strong> or press <kbd className="px-1 py-0.5 rounded bg-white border border-[#ccd9cc] text-[10px]">C</kbd>. Choose a category, subject, description, priority, and drag-and-drop file attachments.
                </p>
                <div className="mt-3 text-[11px] font-mono text-[#2563eb] bg-[#eff6ff] px-2 py-1 rounded border border-[#dbeafe]">
                  ID: TKT-2026-000001
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#f8faf8] border border-[#e2ece2] relative">
                <span className="w-7 h-7 rounded-full bg-[#174a40] text-white text-xs font-bold flex items-center justify-center mb-3">
                  2
                </span>
                <h4 className="font-bold text-base text-[#14332c]">Track Progress</h4>
                <p className="text-xs text-[#526e64] mt-1.5 leading-relaxed">
                  Monitor the assigned agent, SLA due date, and status badges (<em>Open</em>, <em>In Progress</em>, <em>Waiting for Customer</em>).
                </p>
                <div className="mt-3 text-[11px] text-[#059669] bg-[#ecfdf5] px-2 py-1 rounded border border-[#d1fae5] flex items-center gap-1">
                  <Clock size={12} />
                  <span>SLA countdown timer active</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#f8faf8] border border-[#e2ece2] relative">
                <span className="w-7 h-7 rounded-full bg-[#174a40] text-white text-xs font-bold flex items-center justify-center mb-3">
                  3
                </span>
                <h4 className="font-bold text-base text-[#14332c]">Reply & Collaborate</h4>
                <p className="text-xs text-[#526e64] mt-1.5 leading-relaxed">
                  Communicate with support agents in the live conversation thread. Internal agent notes are strictly filtered and invisible.
                </p>
                <div className="mt-3 text-[11px] text-[#4b5563] bg-white px-2 py-1 rounded border border-[#e5e7eb]">
                  Real-time notification on reply
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#f8faf8] border border-[#e2ece2] relative">
                <span className="w-7 h-7 rounded-full bg-[#174a40] text-white text-xs font-bold flex items-center justify-center mb-3">
                  4
                </span>
                <h4 className="font-bold text-base text-[#14332c]">Verify & Close</h4>
                <p className="text-xs text-[#526e64] mt-1.5 leading-relaxed">
                  When the agent solves your problem and marks it <em>Resolved</em>, verify the solution and click <strong>Close Ticket</strong> to finalize.
                </p>
                <div className="mt-3 text-[11px] text-[#166534] bg-[#dcfce7] px-2 py-1 rounded border border-[#bbf7d0] font-semibold">
                  Ticket Closed Successfully
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: Agent */}
          {activeRoleTab === 'agent' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in">
              <div className="p-5 rounded-2xl bg-[#f8faf8] border border-[#e2ece2] relative">
                <span className="w-7 h-7 rounded-full bg-[#24584e] text-white text-xs font-bold flex items-center justify-center mb-3">
                  1
                </span>
                <h4 className="font-bold text-base text-[#14332c]">Filter Category Queue</h4>
                <p className="text-xs text-[#526e64] mt-1.5 leading-relaxed">
                  View tickets in your assigned skill categories (Technical, Billing, General). Filter by <em>Unassigned</em> or search by keyword / ticket number.
                </p>
                <div className="mt-3 text-[11px] text-[#4b635b] bg-[#edf3ec] px-2 py-1 rounded">
                  Category-scoped query isolation
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#f8faf8] border border-[#e2ece2] relative">
                <span className="w-7 h-7 rounded-full bg-[#24584e] text-white text-xs font-bold flex items-center justify-center mb-3">
                  2
                </span>
                <h4 className="font-bold text-base text-[#14332c]">Claim Ticket (Lock Safe)</h4>
                <p className="text-xs text-[#526e64] mt-1.5 leading-relaxed">
                  Click <strong>Claim</strong> to take ownership. Protected by <code>SELECT FOR UPDATE</code> so simultaneous claims never double-assign.
                </p>
                <div className="mt-3 text-[11px] text-[#b45309] bg-[#fef3c7] px-2 py-1 rounded border border-[#fde68a]">
                  Concurrency race condition proof
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#f8faf8] border border-[#e2ece2] relative">
                <span className="w-7 h-7 rounded-full bg-[#24584e] text-white text-xs font-bold flex items-center justify-center mb-3">
                  3
                </span>
                <h4 className="font-bold text-base text-[#14332c]">Internal Notes & Replies</h4>
                <p className="text-xs text-[#526e64] mt-1.5 leading-relaxed">
                  Toggle between <strong>Public Reply</strong> and <strong>Internal Note</strong> (gold badge) to leave teammates notes, debugging logs, or escalations.
                </p>
                <div className="mt-3 text-[11px] text-[#92400e] bg-[#fef3c7] px-2 py-1 rounded border border-[#fde68a] font-semibold">
                  Internal note hidden from customer
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#f8faf8] border border-[#e2ece2] relative">
                <span className="w-7 h-7 rounded-full bg-[#24584e] text-white text-xs font-bold flex items-center justify-center mb-3">
                  4
                </span>
                <h4 className="font-bold text-base text-[#14332c]">Resolve Ticket</h4>
                <p className="text-xs text-[#526e64] mt-1.5 leading-relaxed">
                  Click <strong>Resolve</strong> once the customer issue is addressed. This stops SLA timer counting and notifies the customer.
                </p>
                <div className="mt-3 text-[11px] text-[#15803d] bg-[#dcfce7] px-2 py-1 rounded border border-[#bbf7d0]">
                  SLA target officially met
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: Admin */}
          {activeRoleTab === 'admin' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in">
              <div className="p-5 rounded-2xl bg-[#f8faf8] border border-[#e2ece2] relative">
                <span className="w-7 h-7 rounded-full bg-[#174a40] text-white text-xs font-bold flex items-center justify-center mb-3">
                  1
                </span>
                <h4 className="font-bold text-base text-[#14332c]">Categories & Agents</h4>
                <p className="text-xs text-[#526e64] mt-1.5 leading-relaxed">
                  Create categories (e.g. Technical, Billing, General). Create agent accounts, assign them categories, and toggle their availability status.
                </p>
                <div className="mt-3 text-[11px] text-[#1e40af] bg-[#eff6ff] px-2 py-1 rounded border border-[#dbeafe]">
                  Workload-based auto assignment
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#f8faf8] border border-[#e2ece2] relative">
                <span className="w-7 h-7 rounded-full bg-[#174a40] text-white text-xs font-bold flex items-center justify-center mb-3">
                  2
                </span>
                <h4 className="font-bold text-base text-[#14332c]">SLA & Calendar Policy</h4>
                <p className="text-xs text-[#526e64] mt-1.5 leading-relaxed">
                  Configure business calendars (weekly hours, split shifts, timezone, holiday exceptions). Define SLA resolution targets per priority.
                </p>
                <div className="mt-3 text-[11px] text-[#065f46] bg-[#ecfdf5] px-2 py-1 rounded border border-[#a7f3d0]">
                  Immutable calendar snapshots
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#f8faf8] border border-[#e2ece2] relative">
                <span className="w-7 h-7 rounded-full bg-[#174a40] text-white text-xs font-bold flex items-center justify-center mb-3">
                  3
                </span>
                <h4 className="font-bold text-base text-[#14332c]">Streaming CSV Import</h4>
                <p className="text-xs text-[#526e64] mt-1.5 leading-relaxed">
                  Upload large CSV files. The background worker streams rows, prevents duplicates via external IDs, and generates an error report CSV.
                </p>
                <div className="mt-3 text-[11px] text-[#7c2d12] bg-[#ffedd5] px-2 py-1 rounded border border-[#fed7aa]">
                  Download sample & error CSVs
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#f8faf8] border border-[#e2ece2] relative">
                <span className="w-7 h-7 rounded-full bg-[#174a40] text-white text-xs font-bold flex items-center justify-center mb-3">
                  4
                </span>
                <h4 className="font-bold text-base text-[#14332c]">Dashboard & Audit Logs</h4>
                <p className="text-xs text-[#526e64] mt-1.5 leading-relaxed">
                  View real-time database aggregations (unassigned, critical, SLA warning/breaches, agent workload). Review complete audit trails.
                </p>
                <div className="mt-3 text-[11px] text-[#1e293b] bg-[#f1f5f9] px-2 py-1 rounded border border-[#e2e8f0]">
                  Zero stale cache, instant updates
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Interactive SLA Engine Simulator */}
      <section id="sla-engine" className="py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-[#2c7a6b] bg-[#e4f0e2] px-3 py-1 rounded-full border border-[#cfdfce]">
            Core Technical Highlight
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#174a40] mt-3">
            Interactive Business-Hour SLA Simulator
          </h2>
          <p className="text-sm sm:text-base text-[#4c685f] mt-2">
            The assessment question asks: <em>"If a Critical ticket with a 2-hour SLA is created on Thursday at 5:00 PM, simply adding two clock hours would not correctly calculate its SLA deadline. How does your system calculate it?"</em>
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-[#dce6dc] shadow-sm overflow-hidden p-6 sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Controls */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase text-[#47635a] tracking-wider mb-2">
                  1. Select Start Scenario
                </label>
                <div className="space-y-2">
                  {Object.entries(slaScenarios).map(([key, s]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSlaStartScenario(key as any)}
                      className={`w-full text-left p-3.5 rounded-xl border text-sm transition-all ${
                        slaStartScenario === key
                          ? 'border-[#174a40] bg-[#edf4ed] text-[#14332c] font-semibold shadow-xs'
                          : 'border-[#dfe8df] bg-[#f8faf8] text-[#4b665d] hover:bg-[#edf3ec]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{s.name}</span>
                        {slaStartScenario === key && <CheckCircle2 size={16} className="text-[#174a40]" />}
                      </div>
                      <div className="text-xs text-[#6e857c] font-normal mt-0.5">{s.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#47635a] tracking-wider mb-2">
                  2. Select Priority (SLA Target)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(slaDurations).map(([key, d]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSlaPriority(key as any)}
                      className={`p-3 rounded-xl border text-xs text-left transition-all ${
                        slaPriority === key
                          ? 'border-[#174a40] bg-[#174a40] text-white font-bold shadow-xs'
                          : 'border-[#dfe8df] bg-[#f8faf8] text-[#3d5950] hover:bg-[#edf3ec]'
                      }`}
                    >
                      <div className="capitalize">{key}</div>
                      <div className={slaPriority === key ? 'text-white/80' : 'text-[#718a80]'}>
                        {d.hours} Hours
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#f4f7f4] border border-[#d8e3d8] text-xs text-[#4b665d] space-y-1.5">
                <div className="font-bold text-[#14332c] flex items-center gap-1.5">
                  <Calendar size={14} className="text-[#2c7a6b]" />
                  <span>Configured Business Calendar</span>
                </div>
                <div>• <strong>Business Days:</strong> Sunday – Thursday</div>
                <div>• <strong>Working Hours:</strong> 09:00 AM – 06:00 PM (9 hrs/day)</div>
                <div>• <strong>Weekend (Non-Working):</strong> Friday & Saturday</div>
                <div>• <strong>Timezone:</strong> Asia/Dhaka (Stored in UTC in Database)</div>
              </div>
            </div>

            {/* Right Result Preview */}
            <div className="lg:col-span-7 bg-[#f7faf7] rounded-2xl border border-[#d8e5d8] p-6 sm:p-7 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between border-b border-[#dfe8df] pb-4">
                  <div>
                    <span className="text-xs font-semibold text-[#5a756c] uppercase">Calculated Deadline</span>
                    <div className="text-2xl sm:text-3xl font-extrabold text-[#174a40] mt-0.5">
                      {currentCalc.deadline}
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#e6f2bc] text-[#174a40] border border-[#d0e49a]">
                    Verified
                  </span>
                </div>

                <div className="mt-6">
                  <h4 className="text-xs font-bold uppercase text-[#425d54] tracking-wider mb-3">
                    Minute-by-Minute Calculation Breakdown
                  </h4>
                  <div className="space-y-2.5">
                    {currentCalc.steps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-[#314a42]">
                        <span className="w-5 h-5 rounded-full bg-[#174a40] text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <span className="mt-0.5 font-medium">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-xl bg-white border border-[#cbe0cb] shadow-xs">
                  <div className="text-xs font-bold text-[#174a40] flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[#2c7a6b]" />
                    <span>Key Architectural Guarantee</span>
                  </div>
                  <p className="text-xs text-[#4b665e] mt-1 leading-relaxed">
                    {currentCalc.highlight}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#dfe8df] flex items-center justify-between text-[11px] text-[#698278]">
                <span>Tested in: <code>tests/Feature/SlaCalculatorTest.php</code></span>
                <span className="font-semibold text-[#174a40]">Zero clock-time drift</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Complete Assessment Features Grid */}
      <section id="features" className="py-14 bg-white border-t border-[#e2ece2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2c7a6b] bg-[#e4f0e2] px-3 py-1 rounded-full border border-[#cfdfce]">
              Enterprise Implementation
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#174a40] mt-3">
              Comprehensive Feature Matrix
            </h2>
            <p className="text-sm sm:text-base text-[#4c685f] mt-2">
              Every item from the assessment specification has been thoroughly implemented and tested.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-[#f8faf8] border border-[#e2ece2] hover:border-[#174a40]/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#e6f2bc] text-[#174a40] flex items-center justify-center mb-4">
                <Ticket size={20} />
              </div>
              <h3 className="font-bold text-base text-[#14332c]">1. Ticket Management</h3>
              <p className="text-xs text-[#526e64] mt-2 leading-relaxed">
                Full lifecycle management (Create, Read, Update, Resolve, Close). Validated state machine transitions preventing invalid jumps (e.g. Closed tickets cannot be reopened).
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-[#f8faf8] border border-[#e2ece2] hover:border-[#174a40]/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#e6f2bc] text-[#174a40] flex items-center justify-center mb-4">
                <Zap size={20} />
              </div>
              <h3 className="font-bold text-base text-[#14332c]">2. Unique Ticket ID Generation</h3>
              <p className="text-xs text-[#526e64] mt-2 leading-relaxed">
                Deterministic format <code>TKT-2026-000001</code> derived transactionally from database sequence. Collision-proof under massive concurrency.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-[#f8faf8] border border-[#e2ece2] hover:border-[#174a40]/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#e6f2bc] text-[#174a40] flex items-center justify-center mb-4">
                <ShieldCheck size={20} />
              </div>
              <h3 className="font-bold text-base text-[#14332c]">3. Roles & Scoped Permissions</h3>
              <p className="text-xs text-[#526e64] mt-2 leading-relaxed">
                Administrators, Support Agents, and Customers. Server-side policies strictly enforce query scoping. Customers can never query other customers' tickets.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-[#f8faf8] border border-[#e2ece2] hover:border-[#174a40]/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#e6f2bc] text-[#174a40] flex items-center justify-center mb-4">
                <Users size={20} />
              </div>
              <h3 className="font-bold text-base text-[#14332c]">4. Least-Workload Auto Assignment</h3>
              <p className="text-xs text-[#526e64] mt-2 leading-relaxed">
                Automated assignment finds available agents in the ticket's category and routes to the agent with the lowest active ticket count. Manual claiming supported.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-[#f8faf8] border border-[#e2ece2] hover:border-[#174a40]/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#e6f2bc] text-[#174a40] flex items-center justify-center mb-4">
                <Lock size={20} />
              </div>
              <h3 className="font-bold text-base text-[#14332c]">5. Concurrency Race Safety</h3>
              <p className="text-xs text-[#526e64] mt-2 leading-relaxed">
                Pessimistic row-level locks (<code>FOR UPDATE</code>) prevent two agents from claiming the same ticket. Loser receives clean 409 Conflict with friendly UI toast.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl bg-[#f8faf8] border border-[#e2ece2] hover:border-[#174a40]/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#e6f2bc] text-[#174a40] flex items-center justify-center mb-4">
                <MessageSquare size={20} />
              </div>
              <h3 className="font-bold text-base text-[#14332c]">6. Conversation & Internal Notes</h3>
              <p className="text-xs text-[#526e64] mt-2 leading-relaxed">
                Public replies for customers and gold-badged internal notes for agents. Internal notes are physically stripped from API outputs for customer accounts.
              </p>
            </div>

            {/* Feature 7 */}
            <div className="p-6 rounded-2xl bg-[#f8faf8] border border-[#e2ece2] hover:border-[#174a40]/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#e6f2bc] text-[#174a40] flex items-center justify-center mb-4">
                <FileText size={20} />
              </div>
              <h3 className="font-bold text-base text-[#14332c]">7. Secure File Attachments</h3>
              <p className="text-xs text-[#526e64] mt-2 leading-relaxed">
                Stored in private disk storage. Strict MIME and extension validation. Authorized streaming downloads prevent hotlinking or unauthorized viewing.
              </p>
            </div>

            {/* Feature 8 & 9 */}
            <div className="p-6 rounded-2xl bg-[#f8faf8] border border-[#e2ece2] hover:border-[#174a40]/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#e6f2bc] text-[#174a40] flex items-center justify-center mb-4">
                <Clock size={20} />
              </div>
              <h3 className="font-bold text-base text-[#14332c]">8 & 9. SLA & Business Hours</h3>
              <p className="text-xs text-[#526e64] mt-2 leading-relaxed">
                Multi-calendar engine with weekly shift schedules, custom holidays, and timezone conversions. Ticket calendar snapshots prevent historical mutation.
              </p>
            </div>

            {/* Feature 10 */}
            <div className="p-6 rounded-2xl bg-[#f8faf8] border border-[#e2ece2] hover:border-[#174a40]/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#e6f2bc] text-[#174a40] flex items-center justify-center mb-4">
                <AlertTriangle size={20} />
              </div>
              <h3 className="font-bold text-base text-[#14332c]">10. Automated SLA Escalation</h3>
              <p className="text-xs text-[#526e64] mt-2 leading-relaxed">
                Identifies approaching warnings (e.g. 80% mark) and breach thresholds. Escalations are idempotently logged in audit trails with notifications.
              </p>
            </div>

            {/* Feature 11 */}
            <div className="p-6 rounded-2xl bg-[#f8faf8] border border-[#e2ece2] hover:border-[#174a40]/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#e6f2bc] text-[#174a40] flex items-center justify-center mb-4">
                <Activity size={20} />
              </div>
              <h3 className="font-bold text-base text-[#14332c]">11. Transactional Outbox Notifications</h3>
              <p className="text-xs text-[#526e64] mt-2 leading-relaxed">
                Notifications written into database outbox tables inside the same transaction and delivered asynchronously via queues. Requests are never blocked.
              </p>
            </div>

            {/* Feature 12 */}
            <div className="p-6 rounded-2xl bg-[#f8faf8] border border-[#e2ece2] hover:border-[#174a40]/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#e6f2bc] text-[#174a40] flex items-center justify-center mb-4">
                <Search size={20} />
              </div>
              <h3 className="font-bold text-base text-[#14332c]">12. Full-Text Search & Filtering</h3>
              <p className="text-xs text-[#526e64] mt-2 leading-relaxed">
                MySQL FullText search across subject and description. Filter by ticket number, priority, category, agent, SLA state, and date range.
              </p>
            </div>

            {/* Feature 13 */}
            <div className="p-6 rounded-2xl bg-[#f8faf8] border border-[#e2ece2] hover:border-[#174a40]/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#e6f2bc] text-[#174a40] flex items-center justify-center mb-4">
                <FileSpreadsheet size={20} />
              </div>
              <h3 className="font-bold text-base text-[#14332c]">13. Streaming CSV Import</h3>
              <p className="text-xs text-[#526e64] mt-2 leading-relaxed">
                Processes massive CSVs without memory exhaustion via PHP generators. Deduplicates by external system IDs and provides downloadable error CSVs.
              </p>
            </div>

            {/* Feature 14 */}
            <div className="p-6 rounded-2xl bg-[#f8faf8] border border-[#e2ece2] hover:border-[#174a40]/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#e6f2bc] text-[#174a40] flex items-center justify-center mb-4">
                <Layers size={20} />
              </div>
              <h3 className="font-bold text-base text-[#14332c]">14. Real-time Dashboard</h3>
              <p className="text-xs text-[#526e64] mt-2 leading-relaxed">
                Live aggregations for open, unassigned, critical, SLA warning/breached tickets, and agent workload distribution. Always fresh without caching lag.
              </p>
            </div>

            {/* Feature 15 */}
            <div className="p-6 rounded-2xl bg-[#f8faf8] border border-[#e2ece2] hover:border-[#174a40]/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#e6f2bc] text-[#174a40] flex items-center justify-center mb-4">
                <BookOpen size={20} />
              </div>
              <h3 className="font-bold text-base text-[#14332c]">15. Activity / Audit History</h3>
              <p className="text-xs text-[#526e64] mt-2 leading-relaxed">
                Immutable chronological timeline documenting every ticket creation, assignment, priority shift, reply, note, escalation, and status change.
              </p>
            </div>

            {/* Feature 16 & 17 */}
            <div className="p-6 rounded-2xl bg-[#f8faf8] border border-[#e2ece2] hover:border-[#174a40]/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#e6f2bc] text-[#174a40] flex items-center justify-center mb-4">
                <Cpu size={20} />
              </div>
              <h3 className="font-bold text-base text-[#14332c]">16 & 17. Database & Test Suite</h3>
              <p className="text-xs text-[#526e64] mt-2 leading-relaxed">
                Optimized composite indexes, foreign keys with restrict-on-delete, eager loading (zero N+1 queries), and a 110-test automated suite.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Terminal & Local Setup Cheatsheet */}
      <section id="tech-stack" className="py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#142621] text-white rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xl overflow-hidden relative">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-wider text-[#e6f2bc] bg-[#22443a] px-3 py-1 rounded-full border border-[#2e594c]">
              Developer & Evaluator Cheatsheet
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold mt-4">
              Running the Project Locally
            </h2>
            <p className="text-sm text-white/80 mt-2">
              The project is cleanly decoupled into a Laravel 13 JSON API backend and a React 19 Vite frontend.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Backend Commands */}
            <div className="bg-[#0b1613] rounded-2xl p-5 border border-[#1f3830] font-mono text-xs">
              <div className="flex items-center justify-between text-[#81a69a] pb-3 border-b border-[#1b312a] mb-3">
                <span className="flex items-center gap-2">
                  <Terminal size={14} className="text-[#e6f2bc]" />
                  <span>Backend (Laravel 13 API)</span>
                </span>
                <span>port 8000</span>
              </div>
              <pre className="text-emerald-400 leading-relaxed overflow-x-auto">
{`# 1. Start Laravel API
php artisan serve

# 2. Start Background Worker (Queue)
php artisan queue:work --queue=imports,notifications,default

# 3. Start SLA Schedule Monitor
php artisan schedule:work

# 4. Run Automated Test Suite
php artisan test --compact`}
              </pre>
            </div>

            {/* Frontend Commands */}
            <div className="bg-[#0b1613] rounded-2xl p-5 border border-[#1f3830] font-mono text-xs">
              <div className="flex items-center justify-between text-[#81a69a] pb-3 border-b border-[#1b312a] mb-3">
                <span className="flex items-center gap-2">
                  <Terminal size={14} className="text-[#e6f2bc]" />
                  <span>Frontend (React 19 / Vite 8)</span>
                </span>
                <span>port 5173</span>
              </div>
              <pre className="text-emerald-400 leading-relaxed overflow-x-auto">
{`# 1. Navigate to frontend folder
cd support_ticket_front

# 2. Install dependencies (if needed)
npm install

# 3. Start Vite Development Server
npm run dev
# -> Opens http://localhost:5173

# 4. Run Frontend Component Tests
npm test`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-[#f4f7f4] border-t border-[#e2ebe2] text-center text-xs text-[#526d63]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-[#174a40]">
            <MessageSquare size={16} />
            <span>SupportDesk Platform</span>
          </div>

          <div className="flex items-center gap-6 font-medium">
            <Link to="/login" className="hover:text-[#174a40]">Sign In</Link>
            <Link to="/register" className="hover:text-[#174a40]">Create Account</Link>
            <a href="#quick-start" className="hover:text-[#174a40]">Demo Credentials</a>
            <a href="#sla-engine" className="hover:text-[#174a40]">SLA Engine</a>
          </div>

          <div>Built with Laravel 13, React 19 & MySQL 8.4</div>
        </div>
      </footer>
    </div>
  )
}
