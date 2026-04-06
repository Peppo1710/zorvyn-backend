# Zorvyn Finance Backend

> **A production-ready REST API for a finance dashboard system — built with Node.js, Express, PostgreSQL (Supabase), JWT authentication, role-based + policy-based access control, AI-powered insights, scheduled jobs, Swagger documentation, and a full Jest + Supertest test suite.**

**Live API:** `https://zorvyn-backend.pradyumn.co.in`  
**Swagger Docs:** `https://zorvyn-backend.pradyumn.co.in/api-docs`  
**Health Check:** `https://zorvyn-backend.pradyumn.co.in/health`

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Assignment Coverage](#assignment-coverage)
3. [Tech Stack](#tech-stack)
4. [Architecture & Project Structure](#architecture--project-structure)
5. [Database Design](#database-design)
6. [Authentication & Authorization](#authentication--authorization)
7. [API Reference](#api-reference)
8. [Validation & Error Handling](#validation--error-handling)
9. [Security](#security)
10. [Bonus Features](#bonus-features)
11. [Cron Jobs & Scheduled Tasks](#cron-jobs--scheduled-tasks)
12. [AI-Powered Smart Insights](#ai-powered-smart-insights)
13. [Testing](#testing)
14. [Local Setup & Running](#local-setup--running)
15. [Environment Variables](#environment-variables)
16. [Deployment](#deployment)
17. [Assumptions & Design Decisions](#assumptions--design-decisions)

---

## Project Overview

Zorvyn Finance Backend is the server-side engine behind a multi-role finance dashboard system. The backend enables different types of users (Viewer, Analyst, Admin) to interact with financial records according to clearly enforced access rules.

The system is designed to be:

- **Secure** — JWT authentication, Helmet headers, rate limiting, input validation, parameterized queries
- **Maintainable** — Modular folder structure, thin controllers, logic in services and policies
- **Production-ready** — Deployed on a DigitalOcean VM, mapped to a custom domain via Nginx, with a PostgreSQL database on Supabase and a keep-alive cron job to prevent DB pausing

---

## Assignment Coverage

The table below maps every assignment requirement to its implementation.

### Core Requirements

| # | Requirement | Status | Implementation |
|---|-------------|--------|----------------|
| 1 | User & Role Management | ✅ Done | `POST /api/auth/register`, `PATCH /api/users/:id`, `GET /api/users` |
| 1 | Assign roles to users | ✅ Done | roles: `viewer`, `analyst`, `admin` stored in `users.role` |
| 1 | Manage user status (active/inactive) | ✅ Done | `users.status` column; login blocked for inactive users |
| 1 | Restrict actions based on roles | ✅ Done | `roleMiddleware.js` + fine-grained `policies/` |
| 2 | Financial records — amount, type, category, date, notes | ✅ Done | `records` table fully implements all fields |
| 2 | Create records | ✅ Done | `POST /api/records` |
| 2 | View records | ✅ Done | `GET /api/records`, `GET /api/records/:id` |
| 2 | Update records | ✅ Done | `PUT /api/records/:id` (partial update via `COALESCE`) |
| 2 | Delete records | ✅ Done | `DELETE /api/records/:id` (soft delete — `is_deleted = true`) |
| 2 | Filter by date, category, type | ✅ Done | Query params: `startDate`, `endDate`, `category`, `type` |
| 3 | Total income | ✅ Done | `GET /api/analytics/dashboard` — `summary.totalIncome` |
| 3 | Total expenses | ✅ Done | `GET /api/analytics/dashboard` — `summary.totalExpenses` |
| 3 | Net balance | ✅ Done | `GET /api/analytics/dashboard` — `summary.netBalance` |
| 3 | Category-wise totals | ✅ Done | `categoryBreakdown` array in dashboard response |
| 3 | Monthly / weekly trends | ✅ Done | `monthlyTrends` grouped by `YYYY-MM` in dashboard response |
| 4 | Viewer cannot create/modify records | ✅ Done | `allowRoles('analyst','admin')` guard on mutations |
| 4 | Analyst — read + insights | ✅ Done | Analyst can read all records + call `/insights/generate` |
| 4 | Admin — full management | ✅ Done | Admin has full access including user list and audit logs |
| 5 | Input validation | ✅ Done | Zod schemas (`registerSchema`, `loginSchema`, `recordSchema`) |
| 5 | Useful error responses | ✅ Done | Centralized error handler; consistent `{ error, message }` format |
| 5 | Correct HTTP status codes | ✅ Done | 200/201/400/401/403/404/409/500 used contextually |
| 6 | Data persistence | ✅ Done | PostgreSQL via Supabase (managed cloud Postgres) |

### Optional Enhancements (All Implemented ✅)

| Enhancement | Status | Implementation |
|-------------|--------|----------------|
| Authentication using tokens | ✅ Done | JWT (1-day expiry), `Authorization: Bearer <token>` |
| Pagination for record listing | ✅ Done | `?page=&limit=` on `/api/records` and `/api/users` |
| Search support | ✅ Done | `?search=` with `ILIKE` on `category` and `notes` |
| Soft delete | ✅ Done | `is_deleted`, `deleted_at` — never hard-deletes from API |
| Rate limiting | ✅ Done | Auth: 50 req/hr; API: 300 req/15min (express-rate-limit) |
| Unit / integration tests | ✅ Done | 8 test files, Jest + Supertest |
| API documentation | ✅ Done | Swagger UI at `/api-docs` |

### Additional Features (Beyond Assignment)

| Feature | Description |
|---------|-------------|
| Audit Logs | Every create / update / delete is logged in `audit_logs` table; accessible only by admin |
| AI Smart Insights | On-demand LLM-powered financial insights via Groq (Llama 3) at `POST /api/analytics/insights/generate` |
| Cron Jobs | Automated daily cleanup of permanently deleted records + daily analytics snapshots |
| DB Keep-Alive | Bi-hourly ping to prevent Supabase free-tier DB from sleeping |
| Policy Layer | Fine-grained ownership checks (`recordPolicy.js`, `userPolicy.js`) beyond RBAC middleware |
| Database Transactions | All write operations use `BEGIN/COMMIT/ROLLBACK` for data consistency |
| Pre-aggregated Snapshots | `analytics_snapshots` table populated by cron — enables fast historical queries |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express v5 |
| Database | PostgreSQL (Supabase) |
| ORM/Driver | `pg` (node-postgres) with parameterized queries |
| Authentication | JWT (`jsonwebtoken`), `bcrypt` for password hashing |
| Validation | Zod |
| AI / LLM | Groq SDK (Llama 3 — `llama3-8b-8192`) |
| Scheduling | `node-cron` |
| API Docs | `swagger-ui-express` |
| Security | `helmet`, `express-rate-limit`, `cors` |
| Testing | Jest + Supertest |
| Logging | Custom structured logger (`utils/logger.js`) |
| Deployment | DigitalOcean VM + Nginx reverse proxy + custom domain |

---

## Architecture & Project Structure

The project follows a **modular, feature-based architecture** where each domain (auth, users, records, analytics, audit) is self-contained with its own routes and controller. Cross-cutting concerns go in shared directories (middlewares, policies, services, utils).

```
zorvyn-backend/
├── src/
│   ├── app.js                   # Express app — middleware, routes, error handler
│   ├── server.js                # HTTP server entry point + cron job bootstrap
│   │
│   ├── config/
│   │   ├── db.js                # PostgreSQL pool configuration
│   │   └── env.js               # Centralized environment variable access
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── authController.js   # register, login
│   │   │   └── authRoutes.js
│   │   ├── users/
│   │   │   ├── usersController.js  # getMe, getUserById, listUsers, updateUser
│   │   │   └── usersRoutes.js
│   │   ├── records/
│   │   │   ├── recordController.js # CRUD + soft delete + search/filter/pagination
│   │   │   └── recordRoutes.js
│   │   ├── analytics/
│   │   │   ├── analyticsController.js # dashboard stats + AI insights trigger
│   │   │   └── analyticsRoutes.js
│   │   └── audit/
│   │       ├── auditController.js  # list audit logs (admin only)
│   │       ├── auditRoutes.js
│   │       └── auditService.js     # logAction() helper
│   │
│   ├── middlewares/
│   │   ├── authMiddleware.js       # JWT verification, attaches req.user
│   │   └── roleMiddleware.js       # allowRoles(...) RBAC guard
│   │
│   ├── policies/
│   │   ├── recordPolicy.js         # canReadRecord, canUpdateRecord, canDeleteRecord
│   │   └── userPolicy.js           # canListUsers, canViewUserById, canUpdateUser
│   │
│   ├── services/
│   │   └── insightService.js       # Groq LLM integration
│   │
│   ├── jobs/
│   │   └── cronJobs.js             # Cleanup, analytics snapshot, DB keep-alive
│   │
│   ├── utils/
│   │   ├── logger.js               # Structured timestamped console logger
│   │   └── validator.js            # Zod schemas + validate() middleware factory
│   │
│   └── docs/
│       └── swagger.js              # Inline OpenAPI 3.0 spec + swagger-ui setup
│
├── db/
│   ├── schema.sql                  # PostgreSQL DDL (tables, constraints, indexes)
│   └── run-schema.js               # Helper to apply schema against Supabase
│
├── tests/
│   ├── app.test.js                 # Integration: health, auth, 401 guards
│   ├── authController.test.js      # Unit: register & login logic
│   ├── recordController.transaction.test.js  # Unit: CRUD + soft delete
│   ├── usersController.transaction.test.js   # Unit: user management
│   ├── analyticsController.test.js # Unit: dashboard + insights
│   ├── auditController.test.js     # Unit: audit log listing
│   ├── insightService.test.js      # Unit: Groq LLM service
│   └── cronJobs.test.js            # Unit: cron job functions
│
├── docs/
│   ├── assignment.md               # Original assignment brief
│   ├── API_AND_TESTING.md          # Detailed curl examples + test guide
│   └── TESTING_GUIDE.md            # Jest usage and test organization
│
├── jest.config.js
├── package.json
└── imple.md                        # Engineering implementation plan
```

### Design Principles

- **Thin controllers** — controllers only handle HTTP adapter concerns (parsing request, calling logic, sending response)
- **Logic in services** — business logic and LLM calls live in `services/`
- **Pure policies** — access control predicates in `policies/` are pure functions with no side effects
- **Always validate input** — every mutation route runs a Zod schema via the `validate()` middleware factory before reaching the controller
- **Consistent responses** — all errors follow `{ error: string, message: string }` and all lists follow `{ data: [], meta: { total, page, limit } }`

---

## Database Design

Database: **PostgreSQL** hosted on **Supabase**.  
Schema file: [`db/schema.sql`](db/schema.sql)

### `users`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key, `gen_random_uuid()` |
| `email` | VARCHAR(255) | Unique, not null |
| `password` | VARCHAR(255) | bcrypt hash |
| `role` | VARCHAR(50) | `viewer` \| `analyst` \| `admin` (CHECK constraint) |
| `status` | VARCHAR(50) | `active` \| `inactive` |
| `created_at` | TIMESTAMPTZ | Default `CURRENT_TIMESTAMP` |

### `records`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → `users(id)` ON DELETE CASCADE |
| `amount` | DECIMAL(12,2) | Not null |
| `type` | VARCHAR(50) | `income` \| `expense` (CHECK constraint) |
| `category` | VARCHAR(100) | Not null |
| `date` | DATE | Not null |
| `notes` | TEXT | Optional |
| `is_deleted` | BOOLEAN | Soft delete flag, default `false` |
| `deleted_at` | TIMESTAMPTZ | Set on soft delete |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Updated on every `PUT` |

### `audit_logs`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → `users(id)` ON DELETE SET NULL |
| `action` | VARCHAR(100) | `CREATE`, `UPDATE`, `DELETE` |
| `resource_type` | VARCHAR(100) | `record`, `user` |
| `resource_id` | UUID | ID of the affected resource |
| `timestamp` | TIMESTAMPTZ | Auto |

### `analytics_snapshots`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `snapshot_date` | DATE | Unique (upserted daily by cron) |
| `total_income` | DECIMAL(14,2) | Aggregated from records |
| `total_expenses` | DECIMAL(14,2) | |
| `net_balance` | DECIMAL(14,2) | `total_income - total_expenses` |
| `record_count` | INTEGER | Count of active records |
| `payload` | JSONB | Category breakdown and other rich data |
| `created_at` | TIMESTAMPTZ | Auto |

---

## Authentication & Authorization

### Authentication

JWT-based, stateless.

- **Register:** `POST /api/auth/register` — hashes password with `bcrypt` (10 rounds), stores user, returns user payload (no password)
- **Login:** `POST /api/auth/login` — verifies password, checks `status = 'active'`, issues JWT (1-day expiry)
- **Protected routes:** Pass the token as `Authorization: Bearer <token>`. The `authMiddleware` verifies and decodes it, attaching `req.user = { id, email, role }`.

### Role-Based Access Control (RBAC)

Implemented as `allowRoles(...roles)` middleware in `middlewares/roleMiddleware.js`. Routes declare which roles are permitted directly on the route definition.

```
viewer   → Read-only: can read records (own only) and dashboard
analyst  → Read + create/update/delete records + generate AI insights
admin    → Full access: all the above + list users + view audit logs + update user roles/status
```

### Policy-Based Access Control

Beyond RBAC, fine-grained ownership is enforced in `policies/`. These are pure functions called inside controllers after the resource is fetched from the database.

```js
// recordPolicy.js
canReadRecord(user, record)    // admin/analyst: all | viewer: own records only
canUpdateRecord(user, record)  // admin: all | others: own records only
canDeleteRecord(user, record)  // admin: all | others: own records only

// userPolicy.js
canListUsers(user)             // admin only
canViewUserById(actor, id)     // admin or self
canUpdateUser(actor)           // admin only
```

This **dual-layer approach** (middleware for broad role gatekeeping + policies for ownership/resource-level checks) is the pattern recommended for production systems.

---

## API Reference

> Full interactive documentation is available at: **`/api-docs`** (Swagger UI)

Base URL (local): `http://localhost:5000`  
Base URL (production): `https://zorvyn-backend.pradyumn.co.in`

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | ❌ Public | Register a new user |
| `POST` | `/api/auth/login` | ❌ Public | Login and receive a JWT |

#### Register — `POST /api/auth/register`

```json
// Request body
{
  "email": "alice@example.com",
  "password": "secret123",
  "role": "analyst"         // optional — defaults to "viewer"
}

// Response 201
{
  "message": "User registered successfully",
  "user": { "id": "...", "email": "alice@example.com", "role": "analyst", "status": "active", "created_at": "..." }
}
```

#### Login — `POST /api/auth/login`

```json
// Request body
{ "email": "alice@example.com", "password": "secret123" }

// Response 200
{
  "message": "Login successful",
  "token": "<JWT>",
  "user": { "id": "...", "email": "alice@example.com", "role": "analyst" }
}
```

---

### Users

All user routes require `Authorization: Bearer <token>`.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/users/me` | Any role | Get own profile |
| `GET` | `/api/users` | Admin only | List all users (paginated) |
| `GET` | `/api/users/:id` | Self or Admin | Get user by ID |
| `PATCH` | `/api/users/:id` | Admin only | Update user role and/or status |

#### List Users — `GET /api/users?page=1&limit=20`

```json
// Response 200
{
  "data": [{ "id": "...", "email": "...", "role": "analyst", "status": "active", "created_at": "..." }],
  "meta": { "total": 42, "page": 1, "limit": 20 }
}
```

#### Update User — `PATCH /api/users/:id`

```json
// Request body (at least one field required)
{ "role": "analyst", "status": "inactive" }
```

---

### Financial Records

Mutations require `analyst` or `admin` role. All routes require a valid JWT.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/records` | Any role | List records with search, filters, pagination |
| `GET` | `/api/records/:id` | Any role | Get a single record |
| `POST` | `/api/records` | Analyst / Admin | Create a new record |
| `PUT` | `/api/records/:id` | Analyst / Admin | Update a record (partial OK) |
| `DELETE` | `/api/records/:id` | Analyst / Admin | Soft-delete a record |

#### List Records — `GET /api/records`

Supported query parameters:

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | ILIKE match on `category` or `notes` |
| `category` | string | Exact category filter |
| `type` | string | `income` or `expense` |
| `startDate` | YYYY-MM-DD | Start of date range |
| `endDate` | YYYY-MM-DD | End of date range |
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Results per page (default: 10) |

```bash
GET /api/records?search=groceries&type=expense&startDate=2026-01-01&endDate=2026-04-06&page=1&limit=10
```

```json
// Response 200
{
  "data": [{ "id": "...", "amount": "120.50", "type": "expense", "category": "Groceries", "date": "2026-03-15", "notes": "...", ... }],
  "meta": { "total": 37, "page": 1, "limit": 10 }
}
```

> **Access note:** Viewers see only their own records. Analysts and Admins see all records.

#### Create Record — `POST /api/records`

```json
// Request body (all fields required except notes)
{
  "amount": 250.00,
  "type": "expense",
  "category": "Food",
  "date": "2026-04-05",
  "notes": "Team lunch"
}
```

Every create/update/delete also writes to `audit_logs` **within the same DB transaction** for full consistency.

---

### Analytics & Dashboard

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/analytics/dashboard` | Any role | Dashboard summary stats |
| `POST` | `/api/analytics/insights/generate` | Analyst / Admin | AI-powered financial insights |

#### Dashboard Stats — `GET /api/analytics/dashboard`

```json
// Response 200
{
  "summary": {
    "totalIncome": 15000.00,
    "totalExpenses": 9200.00,
    "netBalance": 5800.00
  },
  "categoryBreakdown": [
    { "category": "Food", "total": 2400.00 },
    { "category": "Utilities", "total": 800.00 }
  ],
  "monthlyTrends": {
    "2026-01": { "income": 5000.00, "expense": 3100.00 },
    "2026-02": { "income": 5000.00, "expense": 3200.00 },
    "2026-03": { "income": 5000.00, "expense": 2900.00 }
  }
}
```

> **Access note:** Viewers see their own data only. Analysts and Admins see system-wide aggregates.

#### AI Insights — `POST /api/analytics/insights/generate`

Fetches the user's financial summary and passes it to the **Groq LLM (Llama 3)** to generate 3–5 actionable financial insights. On-demand only — never triggered automatically.

```json
// Response 200
{
  "insights": "1. Your expenses in Food category are 30% of your total income. Consider reducing dining-out costs...\n2. ..."
}
```

---

### Audit Logs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/audit/logs` | Admin only | Paginated audit trail |

```json
// Response 200
{
  "data": [{ "id": "...", "user_id": "...", "user_email": "alice@...", "action": "DELETE", "resource_type": "record", "resource_id": "...", "timestamp": "..." }],
  "meta": { "total": 156, "page": 1, "limit": 20 }
}
```

---

### Health Check

```
GET /health
```

```json
{ "status": "OK", "message": "Zorvyn Backend is running" }
```

---

## Validation & Error Handling

### Input Validation (Zod)

Every mutation is validated before reaching the controller using the `validate(schema)` middleware factory from `utils/validator.js`.

| Schema | Route | Validates |
|--------|-------|-----------|
| `registerSchema` | `POST /api/auth/register` | Valid email, password ≥ 6 chars, optional role enum |
| `loginSchema` | `POST /api/auth/login` | Valid email, password ≥ 6 chars |
| `recordSchema` | `POST /api/records` | Positive amount, type enum, non-empty category, `YYYY-MM-DD` date |
| `recordUpdateSchema` | `PUT /api/records/:id` | Same as above but all fields optional (`.partial()`) |

### Error Response Format

All errors follow a consistent structure:

```json
{
  "error": "Invalid input",
  "message": "..."
}
```

### HTTP Status Codes

| Code | When used |
|------|-----------|
| `200` | Successful read / update |
| `201` | Resource created |
| `400` | Validation failure (Zod) or missing required fields |
| `401` | Missing or invalid/expired JWT |
| `403` | Valid JWT but insufficient role or ownership |
| `404` | Resource not found or soft-deleted |
| `409` | Email already registered |
| `500` | Unexpected server error (centralized handler) |

### Centralized Error Handler

All errors bubble up with `next(error)` to the global handler in `app.js`:

```js
app.use((err, req, res, next) => {
  logger.error(err.stack || err);
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'Something went wrong',
  });
});
```

---

## Security

| Mechanism | Implementation |
|-----------|----------------|
| JWT Authentication | `jsonwebtoken` — tokens expire in 1 day |
| Password Hashing | `bcrypt` with 10 salt rounds |
| Secure HTTP Headers | `helmet` middleware (prevents clickjacking, XSS, MIME sniffing, etc.) |
| Rate Limiting | `express-rate-limit` — Auth: 50 req/hr; API: 300 req/15min |
| Input Validation | Zod schemas validate all request bodies before processing |
| SQL Injection Prevention | Parameterized queries (`pg` positional `$1, $2, ...`) throughout — no string interpolation in SQL |
| CORS | `cors` middleware enabled |
| Status check on login | Inactive accounts are rejected at login with `403` |

---

## Bonus Features

### 1. Audit Logging with DB Transactions

Every state-changing operation (create / update / delete on records and users) is wrapped in a **PostgreSQL transaction** (`BEGIN / COMMIT / ROLLBACK`). The audit log entry is written in the **same transaction** — so if the main operation fails, no orphaned audit log is left.

### 2. Soft Delete

Records are never permanently deleted via the API. A `DELETE` request flips `is_deleted = true` and stamps `deleted_at`. All queries filter with `WHERE is_deleted = false`. The daily cron job permanently removes records soft-deleted more than 30 days ago.

### 3. Search + Pagination

- **Search:** `?search=term` performs `ILIKE '%term%'` on both `category` and `notes` simultaneously.
- **Pagination:** `?page=&limit=` on all list endpoints. Response always includes `meta.total` so clients can calculate total pages.

### 4. Pre-aggregated Analytics Snapshots

Daily cron stores a full analytics snapshot in the `analytics_snapshots` table (income, expenses, net balance, category breakdown as JSONB). This enables fast historical trending queries without scanning the full `records` table each time.

### 5. AI Smart Insights (Groq / Llama 3)

`POST /api/analytics/insights/generate` (analyst or admin only) fetches the user's financial summary and sends it to **Groq's API** using the open-weight **Llama 3 8B** model. The LLM returns 3–5 concise, actionable insights tailored to the spending data.

---

## Cron Jobs & Scheduled Tasks

Cron jobs are bootstrapped at server start from `server.js` → `src/jobs/cronJobs.js`.

### Job 1: Daily Cleanup (Midnight UTC)

```
Schedule: 0 0 * * *
```

Permanently removes soft-deleted records older than 30 days:

```sql
DELETE FROM records
WHERE is_deleted = true
AND deleted_at < NOW() - INTERVAL '30 days'
```

### Job 2: Daily Analytics Snapshot (Midnight UTC)

```
Schedule: 0 0 * * *
```

Aggregates income, expenses, net balance, and category breakdown; upserts into `analytics_snapshots` for the current date.

### Job 3: Supabase DB Keep-Alive (Every 12 Hours)

```
Schedule: 0 */12 * * *
```

Pings the database with `SELECT 1` to prevent the Supabase free-tier database from pausing due to inactivity. Critical for a VM-hosted backend where the application stays running 24/7.

---

## Testing

### Test Setup

- **Framework:** Jest (`jest --runInBand` — single worker for stability)
- **HTTP Testing:** Supertest (tests against the Express `app` object without spinning up a real port)
- **Approach:** All external dependencies (`pg` pool, Groq SDK) are mocked with `jest.mock()` — tests are fully offline and do not require a live database or API key

### Test Files

| File | Coverage |
|------|----------|
| `tests/app.test.js` | Integration: `/health`, auth validation failures (`400`), unauthenticated route protection (`401`) |
| `tests/authController.test.js` | Unit: register (new user, duplicate email), login (success, wrong password, inactive user) |
| `tests/recordController.transaction.test.js` | Unit: create, list (filters, pagination), get by ID, update, soft delete; policy enforcement |
| `tests/usersController.transaction.test.js` | Unit: getMe, listUsers (admin-only), updateUser (forbidden for non-admin), getUserById |
| `tests/analyticsController.test.js` | Unit: dashboard stats aggregation, insight generation, role-based data scoping |
| `tests/auditController.test.js` | Unit: audit log listing (admin-only, paginated) |
| `tests/insightService.test.js` | Unit: Groq SDK call, prompt construction, error fallback |
| `tests/cronJobs.test.js` | Unit: cleanup query, analytics snapshot upsert, keep-alive ping |

### Running Tests

```bash
# Run all tests
npm test

# Single test file
npx jest tests/app.test.js --runInBand

# Watch mode (development)
npx jest --watch --runInBand

# With coverage report
npx jest --coverage --runInBand
```

> See [`docs/TESTING_GUIDE.md`](docs/TESTING_GUIDE.md) and [`docs/API_AND_TESTING.md`](docs/API_AND_TESTING.md) for detailed manual testing examples with `curl`.

---

## Local Setup & Running

### Prerequisites

- Node.js 18+
- A PostgreSQL database (Supabase free tier works perfectly)
- A Groq API key (free at [console.groq.com](https://console.groq.com)) — only required for the AI insights endpoint

### Steps

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd zorvyn-backend

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, GROQ_API_KEY

# 4. Apply the database schema
# Option A: Run via the helper script
node db/run-schema.js

# Option B: Paste db/schema.sql directly into the Supabase SQL editor

# 5. Start the server
node src/server.js

# Server starts on http://localhost:5000
# Swagger UI: http://localhost:5000/api-docs
# Health: http://localhost:5000/health
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Server
PORT=5000

# Database (PostgreSQL / Supabase connection string)
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# JWT
JWT_SECRET=your_very_long_random_secret_here

# Groq AI (required only for /api/analytics/insights/generate)
GROQ_API_KEY=your_groq_api_key_here
```

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | HTTP port (default: 5000) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for signing JWTs |
| `GROQ_API_KEY` | No* | Groq API key for AI insights (*endpoint fails without it) |

---

## Deployment

The backend is deployed on a **DigitalOcean Droplet (VM)** running Ubuntu, mapped to the custom subdomain `zorvyn-backend.pradyumn.co.in` via an **Nginx reverse proxy**.

### Production Setup (DigitalOcean + Nginx)

```nginx
# /etc/nginx/sites-available/zorvyn-backend
server {
    listen 80;
    server_name zorvyn-backend.pradyumn.co.in;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

HTTPS is handled via **Certbot (Let's Encrypt)** for a valid SSL certificate.

The Node.js process is kept alive using **PM2**:

```bash
pm2 start src/server.js --name zorvyn-backend
pm2 save
pm2 startup
```

### Live Endpoints

| URL | Description |
|-----|-------------|
| `https://zorvyn-backend.pradyumn.co.in/health` | Health check |
| `https://zorvyn-backend.pradyumn.co.in/api-docs` | Swagger UI |
| `https://zorvyn-backend.pradyumn.co.in/api/auth/register` | Register |
| `https://zorvyn-backend.pradyumn.co.in/api/auth/login` | Login |

---

## Assumptions & Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Viewer role can create their own records (policy layer)** | Despite RBAC blocking viewers from the mutation routes, the policy layer (`canUpdateRecord`, `canDeleteRecord`) still protects ownership — only the owner or admin can modify a record. Viewers are not blocked at the create level by default, but the route is guarded by `allowRoles('analyst','admin')` so access is explicit. |
| **Soft delete at API level; hard delete via cron** | Ensures no accidental data loss from the API. The 30-day cron cleanup acts as a retention policy. |
| **DB transactions on all writes** | Record mutations and their audit log entries must succeed or fail together. Using `pool.connect()` + `BEGIN/COMMIT/ROLLBACK` ensures this. |
| **Groq (Llama 3) instead of OpenAI** | Groq provides extremely fast inference with the Llama 3 8B model and has a generous free tier — ideal for a portfolio backend. The `insightService.js` can be swapped for any compatible LLM provider. |
| **Inline Swagger spec (not YAML file)** | Keeps the docs co-located with the JS codebase and avoids a YAML parse dependency for Render or similar zero-config deploys. |
| **`analytics_snapshots` as pre-aggregated store** | Separating the live query (ad-hoc aggregation in `analyticsController`) from the cron snapshot allows the system to serve fast historical/trend data without full table scans. |
| **No refresh tokens** | JWT 1-day expiry is sufficient for a portfolio/dashboard use case. A production system would implement refresh tokens. |

---

## Quick Reference — Role Permissions

| Action | Viewer | Analyst | Admin |
|--------|--------|---------|-------|
| Register / Login | ✅ | ✅ | ✅ |
| View own profile (`/me`) | ✅ | ✅ | ✅ |
| View own records | ✅ | ✅ | ✅ |
| View all records | ❌ | ✅ | ✅ |
| Create records | ❌ | ✅ | ✅ |
| Update own records | ❌ | ✅ | ✅ |
| Update any record | ❌ | ❌ | ✅ |
| Delete own records | ❌ | ✅ | ✅ |
| Delete any record | ❌ | ❌ | ✅ |
| Dashboard analytics | ✅ (own) | ✅ (all) | ✅ (all) |
| AI Insights | ❌ | ✅ | ✅ |
| List all users | ❌ | ❌ | ✅ |
| Update user role/status | ❌ | ❌ | ✅ |
| View audit logs | ❌ | ❌ | ✅ |

---

*Built by Pradyumn — Zorvyn Finance Backend · April 2026*
