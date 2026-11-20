# AGENTS.md — Development Guidelines for AI Agents

Welcome to the **Lost & Found India** project codebase. All autonomous agents, subagents, and human contributors working on this repository MUST strictly abide by the rules outlined in this document.

---

## 1. Project Overview & Boundaries

- **Project Name:** Lost & Found India
- **Mission:** Build a centralized, secure, multi-tenant digital platform where people across India can report lost and found belongings, match items accurately, verify ownership safely, and recover belongings across transit hubs, universities, airports, and public institutions.
- **Critical Guardrail:** Do NOT claim government affiliation or official authorization without formal verified accreditation.

---

## 2. Core Architecture Principles

1. **Modular Monolith**:
   - `apps/web`: Next.js App Router (TypeScript, Tailwind CSS, shadcn/ui principles).
   - `packages/database`: PostgreSQL schema managed via Prisma ORM (`prisma/schema.prisma`).
   - `packages/shared`: Shared domain models, constants (Indian states/UTs, categories), and Zod validation schemas.
   - `infrastructure/`: Docker & deployment infrastructure definitions.
2. **Tenant Isolation**:
   - Institutional items, members, claims, and audit logs MUST be scoped by `institutionId`.
   - Never query or update institution-scoped records without validating tenant boundaries on the server.
3. **Privacy First**:
   - Private identifying characteristics (e.g., hidden marks, wallpaper, engravings, serial number fragments) and claim evidence MUST NEVER be exposed in public endpoints or item listings.
   - Only authorized institutional staff or verified administrators can view verification evidence.
4. **Strict TypeScript & Zod Validation**:
   - All server inputs must be parsed with Zod before processing.
   - Never use `any` unless strictly justified.

---

## 3. Strict Development Rules

1. **Inspect Before Changing**: Always inspect the existing code before proposing or making changes.
2. **Read Only Relevant Files**: Avoid loading unrelated directories to preserve token efficiency.
3. **Respect Module Boundaries**: Do not place business logic inside route presentation layers or duplicate shared constants.
4. **No Destructive Operations**: Never delete database migrations, drop tables, or alter schemas silently without review.
5. **Phase-by-Phase Progression**: Only work on the assigned development phase. Never begin future phases prematurely.
6. **No Mock Data in Production Workflows**: All production paths must interact with real validated database models.
7. **Complete Error Handling**: Wrap external I/O and database operations in defensive error-handling blocks that do not leak sensitive server or environment credentials.
8. **Automated Testing**: Write unit and integration tests (Vitest) for all business logic, endpoints, and schemas. Run checks (`pnpm typecheck`, `pnpm test`, `pnpm lint`) before closing a task.

---

## 4. Agent Workflows

- Before modifying schemas: Consult `docs/DATABASE.md` and check `packages/database/prisma/schema.prisma`.
- Before adding API routes: Follow REST conventions in `apps/web/src/app/api/` and validate inputs using `@lost-found/shared`.
- Before adding UI pages: Follow mobile-first, accessible, clean design principles adhering to Tailwind CSS configurations.
