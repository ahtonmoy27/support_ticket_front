# Support Ticket & SLA Management - Frontend

React 19 / TypeScript / React Router 7 interface for [the Laravel backend](https://github.com/ahtonmoy27/support_ticket). Clone both repositories for the complete application. This is a separate Vite SPA, not an Inertia application.

## Requirements

Use Node.js 22.12+ (or a compatible newer version supported by Vite 8), npm, and a configured Laravel backend. Backend PHP/MySQL, migrations, administrator bootstrap, queues and scheduler are documented in its README. No default account/password is provided.

## Run locally

1. Start the backend and its workers/scheduler following its README.
2. In this directory run npm ci.
3. Copy .env.example to .env. Set API_PROXY_TARGET to your local backend (default http://127.0.0.1:8000). Use HTTPS for remote backends. Leave VITE_API_BASE_URL unset to use the proxy.
4. Run npm run dev and open the Vite address printed in the terminal (port 5173).
5. Register a customer through the UI. Create an administrator using the backend seeder/bootstrap environment variables, then manage agents/categories through the admin screens. Remove the bootstrap password from the backend environment after use.

The Vite proxy forwards /api requests and session cookies to Laravel. Do not point development tests at real customer data.

## Included workflows

- Login, customer registration, logout, scoped dashboard.
- Ticket creation/editing, searchable/filterable paginated queues, manual assignment and atomic claim.
- Ticket status transitions, SLA state/deadlines, distinct creator/requester display.
- Public replies, staff-only notes, secure attachments/downloads and audit timeline.
- Failed upload retry retains the saved ticket/message ID; it does not recreate the record.
- Notification list/read actions and immediately refreshed unread badges.
- Admin agent/category management, versioned SLA/calendar configuration, CSV import/progress/error reports.

Role controls are presentation hints; Laravel enforces authorization. Import retry/recovery and operational health commands are documented in the backend repository.

## Checks

```sh
npm test
npm run lint
npm run typecheck
npm run build
```

Tests cover API/CSRF contracts, permission hints, queue filters/navigation, polling, upload recovery, accessibility helpers and UI components. Automated tests use mocked API responses and do not verify production SMTP or live deployed accounts.

## Production

npm run build writes static assets to dist. npm run preview serves them locally on port 4173 for inspection.

Host dist with an index.html fallback for UI routes, but proxy /api to Laravel before the SPA fallback. Preserve Set-Cookie/session cookies and disable caching for authenticated API responses. The Vite development proxy is not part of the production build. Before deploying, replace the reserved support-api.example.com placeholder in vercel.json with your verified HTTPS backend domain. The placeholder intentionally does not identify a working API. Never forward credentials to a public HTTP upstream.

VITE_API_BASE_URL optionally enables direct backend requests with credentials. Use it only with deliberately configured credentialed CORS, compatible session-cookie domain/SameSite/Secure settings and HTTPS. Same-origin API forwarding is the default approach. VITE_* variables are public: never put passwords, database credentials, API keys or application secrets in them.

Keep .env and build artifacts out of version control. Backend deployment remains responsible for private/shared storage, queue/scheduler supervision, SMTP, monitoring and backups.
