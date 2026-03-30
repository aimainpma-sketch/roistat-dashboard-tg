---
name: roistat-supabase-dashboard
description: Use when working on this repository’s Roistat dashboard stack: GitHub Pages frontend, Supabase auth, reporting RPCs, invite-only admin flows, and the local demo fallback. Trigger for UI changes, reporting SQL, edge functions, deployment, or Supabase integration in this project.
---

# Roistat Supabase Dashboard

Use this skill for any work inside this repository.

## Workflow

1. Check the current stack with `scripts/check-stack.sh`.
2. Keep production analysis on hosted MCP in `read-only`.
3. Make schema changes through `supabase/migrations`.
4. Keep the frontend runnable even without live Supabase by preserving demo fallback behavior.
5. If a change affects filters, metrics, or hierarchy, update both:
   - frontend types and demo data
   - SQL contract in `reporting`
6. If a change affects auth or invite flow, update both:
   - route or UI behavior
   - Edge Functions and RLS assumptions

## Local Conventions

- Frontend stack: `Vite + React + TypeScript + Tailwind + TanStack Table + Recharts`.
- Backend contract lives in `supabase/migrations`.
- Edge Functions live in `supabase/functions`.
- Project docs for setup and data contract are in `references/`.
- Keep `label` pinned as the first table column.
- Donut chart for gross margin is mandatory and should continue to filter KPI tables.

## When to read references

- For MCP, CLI, auth redirects, and deployment details: read `references/supabase-setup.md`.
- For metrics, schemas, views, RPCs, and UI assumptions: read `references/dashboard-contract.md`.
