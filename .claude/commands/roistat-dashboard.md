# Roistat Dashboard — контекст проекта

React/Vite SPA на GitHub Pages с данными из Supabase. Дашборд маркетинговой аналитики для команды.

## Ключевые факты

- **URL Pages**: https://aimainpma-sketch.github.io/roistat-dashboard-tg/
- **Пароль**: из переменной `VITE_ACCESS_PASSWORD` (в `.env` — `emilyinparis`, в GitHub Secrets — секрет `VITE_ACCESS_PASSWORD`)
- **Supabase**: `https://nohpohynhcjyirqaxjax.supabase.co`
- **Деплой**: автоматически при пуше в `main` через `.github/workflows/deploy.yml`

## Схема данных Supabase

### Единственная таблица с данными: `public.roistat_analytics`
```
id, report_date (date), source (text), source_level_2 (text), source_level_3 (text),
visits, leads, sales, revenue, marketing_cost, profit, roi, conversion_rate,
raw_data (jsonb), synced_at
```
- `marketing_cost` → расходы (spend)
- `profit` → валовая маржа (grossMargin)
- `source` / `source_level_2` / `source_level_3` → иерархия каналов (3 уровня)

### Конфигурационные таблицы (схема `app`)
- `dimension_levels` — настройки 7 уровней иерархии
- `dashboard_views` — какие метрики включены, порядок колонок
- `user_roles` — роли пользователей (admin/editor/viewer)

### Таблицы аналитики (схема `reporting`) — пустые, не используются в текущей версии
- `roistat_fact_source` — таблица фактов (ETL не настроен)
- `roistat_fact_v1` — view поверх факт-таблицы

## Поток данных

```
roistat_analytics (Supabase REST API)
  → fetchPublicRows() [dashboardRepository.ts]
  → profileFromAnalytics() — маппинг source → channel + levelLabels
  → getPublicAnalyticsFacts() → SourceFact[]
  → buildMetricTreeFromFacts() → MetricTreeResult
  → MetricSection → MetricTable (компонент таблицы с drill-down)
```

## Ключевые файлы

| Файл | Назначение |
|------|-----------|
| `src/services/dashboardRepository.ts` | Вся логика получения данных |
| `src/features/dashboard/DashboardPage.tsx` | Главная страница дашборда |
| `src/features/dashboard/components/MetricTable.tsx` | Таблица с иерархией и drag-n-drop колонок |
| `src/features/dashboard/components/GrossMarginDonut.tsx` | Пирог валовой маржи (Recharts) |
| `src/data/metrics.ts` | Определения метрик и DEFAULT_VIEWS |
| `src/data/demo.ts` | Демо-данные (используются если Supabase недоступен) |
| `src/lib/database.types.ts` | Авто-генерированные типы Supabase |
| `.github/workflows/deploy.yml` | CI/CD → GitHub Pages |

## Типичные проблемы и диагностика

### Пустые таблицы / демо-данные
1. Проверить `.env` — есть ли `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`
2. Открыть DevTools → Network → найти запрос к `/rest/v1/roistat_analytics`
3. Если 401 — проверить RLS в Supabase (таблица должна быть публично читаемой)
4. Если данные есть в ответе, но не отображаются — проверить диапазон дат (последние 30 дней)

### Не работает пароль
- Пароль хранится в `localStorage` под ключом `roistat-dashboard.password-session`
- Проверить `VITE_ACCESS_PASSWORD` в `.env`

### Авто-деплой не работает
- Проверить что пуш идёт в ветку `main`
- Проверить GitHub Pages включён в настройках репозитория (source: GitHub Actions)
- Secrets в репозитории: `VITE_SUPABASE_ANON_KEY`, `VITE_ACCESS_PASSWORD` (опционально — сейчас прописаны хардкодом в yml)

## Архитектурные решения

- Данные читаются напрямую через REST API Supabase (без RPC) — таблица публичная, RLS разрешает SELECT
- Иерархия строится на клиенте из `source`/`source_level_2`/`source_level_3`
- По умолчанию включена только метрика `gross_margin` (остальные 7 включаются вручную)
- Настройки сохраняются в `localStorage` (не требует авторизации)
