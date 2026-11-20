# Phase Progression Workflow

1. **Phase Boundary Check**:
   - Verify that the current phase's objectives are 100% complete, tested, and approved before commencing the next phase.
2. **Quality Gates**:
   - `pnpm --filter @lost-found/shared typecheck`
   - `pnpm --filter @lost-found/database typecheck`
   - `pnpm --filter @lost-found/web typecheck`
   - `pnpm test`
3. **Completion Report**:
   - Produce a structured task completion report covering files created, files modified, dependencies, tests, security considerations, known issues, and recommended next steps.
