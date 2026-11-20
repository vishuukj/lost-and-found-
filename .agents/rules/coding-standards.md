# Coding Standards Rule

1. **TypeScript Strictness**:
   - `noImplicitAny: true`, `strictNullChecks: true`.
   - Never use `any`; use typed generics or `unknown` with type narrowing.
2. **Next.js App Router**:
   - Prefer Server Components by default. Use `'use client'` only when state, event handlers, or browser APIs are required.
   - Colocate page-specific components within their feature folders where appropriate.
3. **Styling & Design**:
   - Use Tailwind CSS utility classes.
   - Adhere to the established color tokens, consistent spacing (4px scale), and accessible contrast ratios (WCAG AA).
4. **Validation**:
   - Parse all request payloads (body, query params, path params) with Zod schemas defined in `@lost-found/shared`.
