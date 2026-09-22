# Keeper — Community & Choir Operations Platform

> **Keeper** is a fullstack multi-tenant platform designed for church choirs, cultural troupes, and grassroots community associations. It bridges fund accounting with disciplinary attendance tracking, debt servicing, high-density exportable PDF reports, a Super Admin portal, and universal plain-language audit logging.

---

## 🌟 Key Features

1. **Umusanzu (Recurring Communal Contributions) Matrix**:
   - High-density matrix view spanning all 12 months / cycles.
   - Clear visual surplus indicator (`+2,000 RWF`) when members pay over their target assessment.
   - 1-click **Pay All Year (12 Months in Advance)** auto-allocation.
   - Real-time monthly collection rates % and grand totals.
   - Pixel-perfect **A4 Landscape Vector PDF Export** (`@react-pdf/renderer`).
   - One-click **WhatsApp Group Summary** generator.

2. **Debts & Liabilities Management (Ideni)**:
   - Record emergency borrowed funds from patrons, parish councils, or financial lenders.
   - Automatic treasury balance increment when borrowed funds are deposited into cash/bank accounts.
   - Installment repayment tracking with live progress bars and auto-decrementing debt balance.
   - Automatic treasury deduction from selected accounts on repayment.
   - Automated status progression: `ACTIVE` ➔ `PARTIALLY_PAID` ➔ `FULLY_PAID`.

3. **Events, Projects & Uniforms ("No Neutrals")**:
   - Multi-tier projects with sub-events (e.g. *Easter Concert 2026* → *Uniforms Men 25k*, *Uniforms Women 30k*, *Sound Contribution 10k*).
   - Target audience assignments: `ALL`, `MEN_ONLY`, `WOMEN_ONLY`.
   - Tailored custom cuts per member situation.
   - Comprehensive settlement audit report with deficits, surpluses, and net project margins.

4. **Treasury Fund Accounting & Multi-Account Splits**:
   - Segregated fund accounts (General Umusanzu Fund, Concert Project Fund, Treasurer MoMo Cashbox, Bank Account).
   - Pre-budgeted planned expenses vs. spontaneous purchases.
   - **Multi-Account Expense Split**: Deduct a single expense across multiple accounts atomically with database transaction integrity.

5. **Attendance & Disciplinary Module**:
   - Scheduled regular practices, Sunday call times, and special sessions.
   - **Whole-Choir Session Cancellation**: Cancel sessions with documented reasons (e.g., severe storm, national holiday) without breaking historical continuity.
   - Rapid 1-tap roster checklist with excuse notes for approved absences.

6. **Super Admin Platform Oversight (`/admin`)**:
   - Centralized platform metrics: total communities, users, choir members, and pooled treasury capital.
   - Communities directory with real-time financial balances and member counts.
   - Cross-platform user manager with community and role filtering.
   - Universal plain-language audit stream across all communities.

7. **Universal & Community Plain-Language Audit Logging**:
   - Every operation (borrowings, repayments, expenses, dues, session cancellations) is recorded in clear, human-readable English words.
   - Community-scoped for local leadership (`/audit`), global stream for Super Admin (`/admin`).

8. **Omnipresent Quick Actions & Command Palette (`Cmd+K`)**:
   - Global `Cmd+K` / `Ctrl+K` palette to search members and jump to actions.
   - Sub-5-second quick entry modal to record payments, expenses, debts, members, and attendance from any page.

---

## 🏗️ Architecture & Monorepo Structure

```
├── .github/
│   └── workflows/ci-cd.yml      # CI/CD: Lint, Typecheck, Build + Docker GHCR push
├── apps/
│   ├── web/                     # Vite + React 18 + Tailwind CSS + Lucide + @react-pdf/renderer
│   └── api/                     # Node.js + Express + TypeScript + Prisma ORM
├── packages/
│   ├── database/                # Prisma schema, client singleton, migrations, seed data
│   ├── shared/                  # Shared types, Zod schemas, domain enums, DTOs
│   └── tsconfig/                # Base TypeScript configurations
├── docker-compose.yml           # PostgreSQL 18 service
├── pnpm-workspace.yaml
└── turbo.json
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment & Database
Make sure PostgreSQL is running (or run `docker compose up -d postgres`).
Configure `.env` in `apps/api/.env` and `packages/database/.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/keeper_db"
JWT_SECRET="keeper_jwt_secret_dev_key_2026_xyz"
PORT=4000
NODE_ENV=development
```

Push schema and seed mock data:
```bash
pnpm db:push
pnpm db:seed
```

### 3. Start Development Servers
```bash
pnpm dev
```
- **Web App**: http://localhost:5173
- **API Server**: http://localhost:4000
- **API Health**: http://localhost:4000/health

---

## 🔑 Demo Login Credentials

| Role | Email | Password | Scope |
|---|---|---|---|
| **Super Admin** | `ishimwejustin67@gmail.com` | `Keeper@Admin!@` | **Global Platform Root** |
| **Admin (President)** | `admin@keeper.rw` | `password123` | Chorale de Kigali |
| **Treasurer (Manager)** | `accountant@keeper.rw` | `password123` | Chorale de Kigali |
| **Discipline Officer** | `discipline@keeper.rw` | `password123` | Chorale de Kigali |
| **Member (Viewer)** | `member@keeper.rw` | `password123` | Chorale de Kigali |

*(Quick 1-click login buttons are provided directly on the Login screen).*

---

## 🐳 Docker Deployment & CI/CD

### Local Docker Build
```bash
# Build API image
docker build -f apps/api/Dockerfile -t ghcr.io/jusish/keeper-api:latest .

# Build Web image
docker build -f apps/web/Dockerfile -t ghcr.io/jusish/keeper-web:latest .
```

### GitHub Actions Pipeline
The pipeline runs on every push and pull request to `main`:
1. **CI Job**: Runs linting, TypeScript typechecking, Prisma generation, and monorepo compilation (`pnpm build`).
2. **Docker Job**: Builds and pushes Docker images to GitHub Container Registry (`ghcr.io/jusish/keeper-api` & `ghcr.io/jusish/keeper-web`) on merge to `main`.
