# Roistat Dashboard TG

Статический React/Vite дашборд для Roistat-данных с GitHub Pages на фронте и Supabase как backend-слоем для auth, аналитических RPC, настроек представления и внутренней админки пользователей.

## Что уже включено

- SPA с маршрутами `/login`, `/auth/callback`, `/dashboard`, `/admin/users`
- invite-only auth shell с magic link
- KPI-таблицы `1 таблица = 1 показатель`
- donut по валовой марже по каналам
- глобальные фильтры по датам и `дни|недели`
- drag reorder и visibility для колонок таблиц
- редактор уровней и глубины раскрытия
- Supabase migrations и Edge Function scaffolding
- GitHub Pages workflow
- локальный project skill

## Быстрый старт

```bash
npm install
npm run dev
```

Заполните `.env` из `.env.example`. Пока production Supabase не подключён, можно открыть демо-режим на экране логина.

## Supabase

1. Подключите MCP read-only:

```bash
codex mcp add supabase-ro --url "https://mcp.supabase.com/mcp?project_ref=nohpohynhcjyirqaxjax&read_only=true&features=database,docs,development,debugging"
codex mcp login supabase-ro
```

2. Подключите CLI:

```bash
npx supabase login
npx supabase link --project-ref nohpohynhcjyirqaxjax
npx supabase db push
npx supabase functions deploy admin-list-users
npx supabase functions deploy admin-invite-user
npx supabase functions deploy admin-set-role
npx supabase functions deploy admin-deactivate-user
```

3. В Supabase Auth:

- отключите open signup
- включите magic link
- добавьте redirect URL:
  - `http://localhost:5173/auth/callback`
  - `https://aimainpma-sketch.github.io/roistat-dashboard-tg/auth/callback`

4. В GitHub Secrets добавьте:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Важное ограничение

Миграция создаёт рабочий аналитический контракт `reporting.roistat_fact_source -> reporting.roistat_fact_v1`, но не знает, как именно у вас называется текущая raw-таблица Roistat в production. Если нужно подключение прямо к существующему raw-источнику, после `db pull` замените источник в `reporting.roistat_fact_v1` или добавьте ETL в `reporting.roistat_fact_source`.
