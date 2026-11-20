# Lost & Found India 🇮🇳

A centralized, scalable, multi-tenant digital platform built to connect lost belongings with their rightful owners across educational campuses, transit hubs, airports, and public organizations across India.

---

## 🚀 Technology Stack

- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS, Lucide React icons
- **Backend:** Next.js Route Handlers (REST), TypeScript, Zod validation
- **Database:** MongoDB with Prisma ORM (ObjectId primary keys, compound indexing)
- **Infrastructure:** Docker Compose, Redis, MinIO (S3-compatible storage)
- **Testing:** Vitest

---

## 📁 Repository Structure

```
lost-found-india/
├── apps/
│   └── web/                     # Next.js frontend application & API route handlers
├── packages/
│   ├── database/                # Prisma schema & database client
│   └── shared/                  # Common types, Zod schemas, Indian constants
├── infrastructure/
│   └── docker/                  # Docker Compose & container configurations
├── docs/                        # Architecture, Database, Security & Roadmap
└── .agents/                     # Rules & workflows for AI agents
```

---

## 🛠️ Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Docker & Docker Compose (optional for local database container)

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Generate Prisma Client
pnpm --filter @lost-found/database db:generate

# Run development server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.
The API health check is available at [http://localhost:3000/api/health](http://localhost:3000/api/health).

---

## 🧪 Running Tests & Checks

```bash
# Run unit tests across all packages
pnpm test

# Run TypeScript typechecks
pnpm typecheck
```
