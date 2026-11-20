# Database Governance Rules

1. **Schema Modifications**:
   - Every schema change must be reflected in `packages/database/prisma/schema.prisma`.
   - Never run destructive migrations (dropping tables/columns) without creating non-destructive migration scripts.
2. **Indexing & Query Performance**:
   - All foreign keys (`institutionId`, `reportedByUserId`, `categoryId`, `locationId`) must have database indexes.
   - Compound indexes must match query patterns (e.g. `[type, status]`, `[city, state]`).
3. **Soft Deletion**:
   - Entities containing user history or critical dispute trails (`User`, `Institution`, `Item`, `Claim`) utilize `deletedAt` for audit compliance.
