# Mini EC — Enterprise Task Management Platform

A full-stack, multi-tenant enterprise task management platform with role-based access control, real-time collaboration, AI-powered analytics, subscription billing, and SLA tracking.

---

## Tech Stack

**Backend**
- **Framework:** Python 3.13+ / FastAPI
- **ORM:** SQLAlchemy 2.0+ / Alembic
- **Database:** MySQL 8+
- **Auth:** JWT (access + refresh tokens), bcrypt, Google OAuth
- **Payments:** Razorpay
- **AI:** Custom analytics engine with analyzers, rules engine, and insight generation
- **Real-time:** WebSocket with pub/sub for horizontal scaling
- **Task Queue:** In-process background task queue
- **Caching:** Redis / in-memory dual backend
- **Rate Limiting:** Sliding window with per-endpoint granularity

**Frontend**
- **Framework:** React 19 + Vite 8
- **State:** TanStack React Query 5 (server state) + Context API (auth, notifications, WebSocket)
- **Routing:** React Router 7 (lazy-loaded, role-guarded)
- **Styling:** Tailwind CSS 3.4 (custom design system)
- **Charts:** Recharts 3.8
- **Forms:** react-hook-form
- **Drag & Drop:** @hello-pangea/dnd (Kanban)
- **HTTP:** Axios with token refresh interceptor

---

## Features

### Core
- **Multi-Tenant Architecture** — Header, slug, subdomain, or JWT-based tenant isolation
- **RBAC** — 4 roles (super_admin, admin, manager, employee) with 94 granular permissions
- **Task Management** — Full CRUD, Kanban drag-and-drop, workflow state machine (todo → in_progress → review → done)
- **Real-Time Collaboration** — WebSocket-powered live updates for Kanban, tasks, approvals, and notifications
- **Approval Workflows** — Multi-level approvals with escalation, delegation, and SLA monitoring
- **SLA Management** — Configurable SLA rules with breach detection and tracking

### AI Intelligence
- **Workload Analysis** — Balanced task distribution across team members
- **Delay Risk Prediction** — Proactive identification of at-risk tasks
- **Assignment Recommendations** — Smart task assignment based on capacity and expertise
- **Performance Analytics** — Team and individual productivity metrics
- **Team Intelligence** — Cross-team collaboration insights
- **Trend Analysis** — Historical patterns and forecasting

### Business
- **Subscription Plans** — Tiered plans (Basic, Silver, Gold) with feature gating
- **Credit System** — Usage-based credit tracking and purchases
- **Payment Processing** — Razorpay integration with webhook handling
- **Invoice Generation** — PDF invoices via WeasyPrint
- **Billing Analytics** — MRR, churn analysis, revenue metrics

### Enterprise
- **Immutable Audit Logs** — Full audit trail with IP tracking, user agent, before/after values
- **System Monitoring** — Health checks, queue monitoring, webhook retry management
- **Super Admin Dashboard** — Cross-tenant platform overview (organizations, revenue, signups, AI usage)
- **Notification System** — Multi-channel in-app notifications with user preferences
- **Document Management** — File upload/download with task linking

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (React + Vite)                     │
│  ┌──────────┐  ┌──────────────┐  ┌───────────┐  ┌──────────────┐  │
│  │  Axios   │  │ TanStack     │  │ React     │  │ Tailwind     │  │
│  │  (API)   │─▶│ React Query  │──│ Router    │  │ Custom CSS   │  │
│  └──────────┘  └──────────────┘  └───────────┘  └──────────────┘  │
│       │                                                             │
│       ▼                                                             │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────────────┐  │
│  │ Auth     │  │ Notification │  │ WebSocket (auto-reconnect)   │  │
│  │ Context  │  │ Context      │  │ pub/sub + heartbeat          │  │
│  └──────────┘  └──────────────┘  └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
         │ HTTP/REST                           │ WebSocket
         ▼                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Backend (FastAPI + Python)                      │
│                                                                     │
│  ┌────────────┐  ┌──────────┐  ┌────────────┐  ┌───────────────┐  │
│  │ Middleware  │  │  Routes  │──│  Services  │──│  Repository   │  │
│  │ Stack:     │  │          │  │ (Business  │  │  (Data        │  │
│  │ • Audit    │  │  24 REST │  │  Logic)    │  │   Access)     │  │
│  │ • Logging  │  │  routers │  │  37 files  │  │  14 files     │  │
│  │ • Tenant   │  │   + WS   │  │            │  │               │  │
│  │ • Rate     │  │  router  │  │            │  │               │  │
│  │   Limiter  │  │          │  │            │  │               │  │
│  │ • CORS     │  └──────────┘  └────────────┘  └───────┬───────┘  │
│  └────────────┘                                         │          │
│                                                         ▼          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Models (SQLAlchemy 2.0)                   │   │
│  │  24 model files — User, Task, Organization, Approval, ...   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────────┐  │
│  │  AI Engine  │  │  Background  │  │  Enterprise Scheduler    │  │
│  │  (Analyzers │  │  Task Queue  │  │  (SLA, billing, usage,   │  │
│  │   + Rules)  │  │              │  │   webhook retry, ...)    │  │
│  └─────────────┘  └──────────────┘  └───────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────┐  ┌──────────────────┐  ┌─────────────────────┐
│     MySQL 8+       │  │     Redis        │  │    Razorpay         │
│  (Primary Store)   │  │  (Cache/PubSub)  │  │  (Payments)         │
└────────────────────┘  └──────────────────┘  └─────────────────────┘
```

---

## Getting Started

### Prerequisites

- Python 3.13+
- Node.js 22+
- MySQL 8+
- Redis (optional — falls back to in-memory)

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/karthikkuchana09-creator/karthik-mini-EC.git
cd karthik-mini-EC
```

**2. Backend setup**

```bash
# Create virtual environment
python -m venv env

# Activate it (Windows)
env\Scripts\activate

# Activate it (macOS/Linux)
# source env/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
# Edit backend/.env with your database and app settings

# Run database migrations
cd backend
alembic upgrade head
```

**3. Frontend setup**

```bash
cd frontend
npm install

# Copy and configure environment variables
cp .env .env.local
# Edit .env.local if needed (Vite proxy works out of the box)
```

### Running

**Start the backend:**

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000` with interactive docs at `http://localhost:8000/docs`.

**Start the frontend:**

```bash
cd frontend
npm run dev
```

The app will be available at `http://localhost:5173`.

### Database

An SQL schema and seed data are provided:

```bash
cd backend
# Execute the SQL scripts against your MySQL database:
# mysql -u root -p mini_ec_db < sql/multi_tenant_schema.sql
# mysql -u root -p mini_ec_db < sql/seed_mini_ec_db.sql

# Or use Alembic (recommended):
alembic upgrade head
```

---

## Project Structure

```
karthik-mini-EC/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI entry point
│   │   ├── ai/                      # AI analytics engine
│   │   │   ├── analyzers.py         # Task, approval, workload analyzers
│   │   │   ├── services.py          # AI service layer
│   │   │   ├── insights.py          # Insight generation
│   │   │   ├── rules.py             # Rules engine with thresholds
│   │   │   ├── cache.py             # AI cache warming
│   │   │   └── scheduler.py         # Periodic AI refresh
│   │   ├── core/                    # Core infrastructure
│   │   │   ├── config.py            # Pydantic settings
│   │   │   ├── security.py          # JWT, bcrypt, OAuth
│   │   │   ├── tenant.py            # Multi-tenant resolver
│   │   │   ├── rbac.py              # Role-based access control
│   │   │   ├── rate_limiter.py      # Sliding window rate limiter
│   │   │   ├── cache.py             # Dual backend caching
│   │   │   ├── exceptions.py        # Structured exception hierarchy
│   │   │   ├── audit_middleware.py  # Immutable audit logging
│   │   │   ├── redis_client.py      # Async Redis wrapper
│   │   │   └── background_tasks.py  # Task queue
│   │   ├── db/                      # Database session & base
│   │   ├── models/                  # 24 SQLAlchemy ORM models
│   │   ├── repository/              # 14 data access layer files
│   │   ├── routes/                  # 28 route files + deps.py
│   │   ├── schemas/                 # 20 Pydantic schemas
│   │   ├── services/                # 37 business logic files
│   │   ├── templates/               # Email/invoice templates
│   │   ├── utils/                   # Helpers
│   │   └── websocket/               # WS manager, pub/sub, auth
│   ├── alembic/                     # Database migrations (19 files)
│   ├── sql/                         # Raw SQL schema & seeds
│   └── tests/                       # Pytest test suite
├── frontend/
│   ├── src/
│   │   ├── main.jsx                 # App entry point
│   │   ├── App.jsx                  # Root component
│   │   ├── api/                     # 22 Axios API modules
│   │   ├── app/                     # Global store
│   │   ├── components/              # UI primitives, layout, guards, etc.
│   │   ├── config/                  # Roles, permissions, UI constants
│   │   ├── context/                 # Auth, Notification, WebSocket
│   │   ├── hooks/                   # 17 custom hooks
│   │   ├── pages/                   # 35 page components
│   │   ├── routes/                  # Lazy-loaded route definitions
│   │   ├── services/                # TanStack Query hooks + service objects
│   │   └── utils/                   # Formatting, error handling, JWT utils
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
└── requirements.txt
```

---

## API Documentation

Once running, interactive OpenAPI documentation is available at:

- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

### Key Endpoints

| Module | Endpoints | Description |
|--------|-----------|-------------|
| **Auth** | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`, `GET /auth/google/login`, `/auth/google/callback`, `/auth/me` | Authentication with JWT, refresh token rotation, Google OAuth |
| **Organizations** | `GET/POST /organizations`, `GET/PATCH /organizations/{id}`, `POST /organizations/{id}/invites` | Multi-tenant org management |
| **Users** | `GET /users`, `GET/PUT/DELETE /users/{id}`, `PATCH /users/{id}/toggle-active` | User CRUD and role management |
| **Tasks** | `GET/POST /tasks`, `GET/PUT/DELETE /tasks/{id}`, `PATCH /tasks/{id}/assign`, `PATCH /tasks/{id}/status`, `GET /tasks/kanban`, `POST /tasks/kanban/reorder` | Task CRUD, Kanban, workflow |
| **Approvals** | `POST /approvals`, `GET /approvals`, `PATCH /approvals/{id}/action`, `GET /approvals/{id}/history` | Multi-level approval workflows |
| **Dashboard** | `GET /dashboard/summary`, `/dashboard/task-distribution`, `/dashboard/approval-stats` | Aggregated stats and KPIs |
| **AI** | `POST /ai/summary`, `/ai/suggestions`, `/ai/recommendations`, `/ai/performance`, `/ai/workload`, `/ai/delay-risks`, `/ai/productivity`, `/ai/team-intelligence` | AI-powered analytics |
| **Payments** | `POST /payments/create-order`, `/payments/verify`, `GET /subscription/plans`, `/billing/*` | Razorpay payment processing |
| **WebSocket** | `ws://localhost:8000/ws?token=<jwt>` | Real-time events (Kanban, tasks, approvals, notifications) |

---

## Configuration

### Backend Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `mysql+pymysql://...` | MySQL connection string |
| `SECRET_KEY` | — | JWT signing secret |
| `FRONTEND_URL` | `http://localhost:5173` | CORS allowed origin |
| `REDIS_URL` | `""` (in-memory) | Redis connection for cache/pubsub |
| `GOOGLE_CLIENT_ID` | — | Google OAuth client ID |
| `RAZORPAY_KEY_ID` | — | Razorpay API key |
| `RAZORPAY_KEY_SECRET` | — | Razorpay API secret |
| `SMTP_*` | — | Email configuration |
| `RATE_LIMIT_ENABLED` | `True` | Enable rate limiting |
| `CACHE_ENABLED` | `True` | Enable caching |

### Frontend Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | (proxy) | Direct API URL (bypasses Vite proxy) |
| `VITE_GOOGLE_CLIENT_ID` | — | Google OAuth client ID |

---

## Testing

```bash
# Backend tests
cd backend
pytest

# With coverage
pytest --cov=app --cov-report=term-missing

# Frontend (if configured)
cd frontend
npm run lint
```

---

## Deployment

### Docker (recommended)

```dockerfile
# Backend
FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY backend/ .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# Frontend
FROM node:22-alpine
WORKDIR /app
COPY frontend/ .
RUN npm ci && npm run build
CMD ["npm", "run", "preview"]
```

### Production Considerations

- Set a strong `SECRET_KEY` and enable all security features
- Configure `REDIS_URL` for production-grade caching and pub/sub
- Set up proper SMTP credentials for email notifications
- Configure Razorpay live keys for payment processing
- Enable HTTPS behind a reverse proxy (nginx, Caddy, etc.)
- Set `FRONTEND_URL` to your production frontend domain
- Use a process manager (supervisor, systemd) for the backend

---

## License

[MIT](LICENSE)
