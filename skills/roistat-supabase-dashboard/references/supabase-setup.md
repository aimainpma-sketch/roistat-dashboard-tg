# Supabase Setup

## Hosted MCP

Read-only MCP is the default production connection:

```bash
codex mcp add supabase-ro --url "https://mcp.supabase.com/mcp?project_ref=nohpohynhcjyirqaxjax&read_only=true&features=database,docs,development,debugging"
codex mcp login supabase-ro
```

If a future task truly requires write-enabled MCP, add a second server instead of replacing the read-only one.

## CLI

```bash
npx supabase login
npx supabase link --project-ref nohpohynhcjyirqaxjax
npx supabase db push
npx supabase gen types typescript --linked > src/lib/database.types.ts
```

## Auth

- `invite-only + magic link`
- no anonymous reads
- GitHub Pages callback:
  - `https://aimainpma-sketch.github.io/roistat-dashboard-tg/auth/callback`

## Secrets

Frontend:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Functions:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_AUTH_CALLBACK_URL`
