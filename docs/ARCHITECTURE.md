# Architecture Design Document — Lost & Found India

## 1. Executive Summary

**Lost & Found India** is engineered as a secure, scalable, multi-tenant digital platform enabling citizens, educational campuses, airports, railway transit networks, and public institutions across India to report, search, verify, and safely recover lost belongings.

---

## 2. Monorepo & Modular Monolith Structure

To balance developer velocity, strong type-safety, and operational simplicity, the repository is organized as a pnpm workspace:

```
lost-found-india/
├── apps/
│   └── web/                     # Next.js 15 App Router (Frontend UI & REST API Route Handlers)
├── packages/
│   ├── database/                # Prisma ORM, PostgreSQL Schema, and Typed Database Client
│   └── shared/                  # Common TypeScript interfaces, Zod validation schemas, constants
├── infrastructure/
│   └── docker/                  # Docker Compose, Dockerfiles, and container configs
├── docs/                        # Architecture, Database, Security, and Implementation plans
└── .agents/                     # Rules and automation workflows for AI agent contributors
```

### Advantages of This Architecture
- **Unified Domain Models**: Data validation schemas (Zod) in `packages/shared` are shared seamlessly across frontend form controls and backend route handlers.
- **Strict Decoupling**: Frontend components never write raw SQL or bypass business logic. All database persistence is encapsulated in `packages/database`.
- **Tenant Isolation**: Every institutional asset has strict `institutionId` boundaries enforced at the query level.

---

## 3. High-Level System Architecture

```
[ Citizens & Users ]        [ Institutional Staff / Admins ]
        │                                  │
        └───────────────┬──────────────────┘
                        ▼
            [ Next.js Web Application ]
         (App Router, React 19, Tailwind)
                        │
                        ▼
          [ Next.js Route Handlers / REST ]
          (Zod Input Validation, Auth RBAC)
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
 [ Prisma ORM Client ]         [ Redis / BullMQ ]
         │                     (Job Queues & Cache)
         ▼                             │
[ PostgreSQL 16/18 DB ]                ▼
(UUIDs, Indexes, JSONB)      [ S3 / MinIO Storage ]
```

---

## 4. Key Architectural Decisions (ADRs)

### ADR-01: Modular Monolith vs. Microservices
- **Decision**: Start with a modular monolith.
- **Rationale**: Avoids premature distributed-system complexity (network latency, distributed transactions, orchestration overhead) while preserving clear code boundaries for eventual microservice extraction if scale demands.

### ADR-02: Next.js App Router for Unified Web & API
- **Decision**: Use Next.js App Router with Server Components and Route Handlers.
- **Rationale**: Unifies the deployment footprint, enables streaming and server-rendered SEO for public recovery listings, while providing performant REST API endpoints with shared TypeScript types.

### ADR-03: Multi-Tenancy via Row-Level Scoping (`institutionId`)
- **Decision**: Logical tenant isolation via foreign keys and server-side query filters.
- **Rationale**: Eliminates multi-database connection management overhead while providing strict institutional segregation through Prisma middleware and repository query constraints.

### ADR-04: Separation of Public vs. Private Item Clues
- **Decision**: Partition public metadata (`title`, `publicDescription`, `category`, `location`) from private ownership verification markers (`privateDetails`, serial numbers, claim evidence).
- **Rationale**: Essential for fraud prevention. Only genuine owners and verified staff should know and view private characteristics during claim adjudication.
