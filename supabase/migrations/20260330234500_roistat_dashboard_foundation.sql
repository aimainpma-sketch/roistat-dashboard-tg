create schema if not exists reporting;
create schema if not exists app;

create type app.user_role as enum ('admin', 'editor', 'viewer');

create table if not exists app.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role app.user_role not null default 'viewer',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists app.dimension_levels (
  level_index integer primary key check (level_index between 1 and 7),
  label text not null,
  enabled boolean not null default true,
  sort_order integer not null default 1
);

create table if not exists app.dashboard_views (
  view_key text primary key,
  metric_id text not null,
  title text not null,
  enabled boolean not null default true,
  position integer not null default 1,
  visible_columns text[] not null default array['label', 'value', 'shareOfTotal', 'previousValue', 'deltaPct'],
  column_order text[] not null default array['label', 'value', 'shareOfTotal', 'previousValue', 'deltaPct'],
  default_max_depth integer not null default 3
);

create table if not exists app.user_dashboard_prefs (
  user_id uuid not null references auth.users(id) on delete cascade,
  view_key text not null references app.dashboard_views(view_key) on delete cascade,
  grain text not null default 'day' check (grain in ('day', 'week')),
  expanded_paths text[] not null default array[]::text[],
  channel_filter text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, view_key)
);

create table if not exists reporting.roistat_fact_source (
  id bigserial primary key,
  report_date date not null,
  week_start date generated always as (date_trunc('week', report_date)::date) stored,
  channel text not null,
  level_1_key text,
  level_1_label text,
  level_2_key text,
  level_2_label text,
  level_3_key text,
  level_3_label text,
  level_4_key text,
  level_4_label text,
  level_5_key text,
  level_5_label text,
  level_6_key text,
  level_6_label text,
  level_7_key text,
  level_7_label text,
  spend numeric(14,2) not null default 0,
  leads numeric(14,2) not null default 0,
  cpl numeric(14,2) not null default 0,
  mqlt numeric(14,2) not null default 0,
  meetings_scheduled numeric(14,2) not null default 0,
  sales numeric(14,2) not null default 0,
  revenue numeric(14,2) not null default 0,
  gross_margin numeric(14,2) not null default 0,
  source_snapshot_key text,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace view reporting.roistat_fact_v1 as
select
  report_date,
  week_start,
  channel,
  coalesce(level_1_key, level_1_label, channel) as level_1_key,
  coalesce(level_1_label, channel) as level_1_label,
  coalesce(level_2_key, level_2_label) as level_2_key,
  level_2_label,
  coalesce(level_3_key, level_3_label) as level_3_key,
  level_3_label,
  coalesce(level_4_key, level_4_label) as level_4_key,
  level_4_label,
  coalesce(level_5_key, level_5_label) as level_5_key,
  level_5_label,
  coalesce(level_6_key, level_6_label) as level_6_key,
  level_6_label,
  coalesce(level_7_key, level_7_label) as level_7_key,
  level_7_label,
  spend,
  leads,
  case when cpl = 0 and leads <> 0 then round(spend / nullif(leads, 0), 2) else cpl end as cpl,
  mqlt,
  meetings_scheduled,
  sales,
  revenue,
  case when gross_margin = 0 and revenue <> 0 then revenue - spend else gross_margin end as gross_margin
from reporting.roistat_fact_source;

insert into app.dimension_levels (level_index, label, enabled, sort_order)
values
  (1, 'Канал', true, 1),
  (2, 'Источник', true, 2),
  (3, 'Менеджер', true, 3),
  (4, 'Объект', true, 4),
  (5, 'Креатив', false, 5),
  (6, 'Сегмент', false, 6),
  (7, 'Подсегмент', false, 7)
on conflict (level_index) do nothing;

insert into app.dashboard_views (view_key, metric_id, title, enabled, position, default_max_depth)
values
  ('spend-table', 'spend', 'Расходы', true, 1, 3),
  ('leads-table', 'leads', 'Лиды', true, 2, 3),
  ('cpl-table', 'cpl', 'CPL', true, 3, 2),
  ('mqlt-table', 'mqlt', 'MQLt', true, 4, 3),
  ('meetings-table', 'meetings_scheduled', 'Назначенные встречи', true, 5, 3),
  ('sales-table', 'sales', 'Продажи', true, 6, 3),
  ('revenue-table', 'revenue', 'Выручка', true, 7, 3),
  ('gross-margin-table', 'gross_margin', 'Валовая маржа', true, 8, 2)
on conflict (view_key) do nothing;

create or replace function app.set_updated_at_v1()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_user_roles_updated_at on app.user_roles;
create trigger trg_user_roles_updated_at
before update on app.user_roles
for each row execute procedure app.set_updated_at_v1();

drop trigger if exists trg_user_dashboard_prefs_updated_at on app.user_dashboard_prefs;
create trigger trg_user_dashboard_prefs_updated_at
before update on app.user_dashboard_prefs
for each row execute procedure app.set_updated_at_v1();

create or replace function reporting.metric_value_v1(
  metric_id text,
  spend numeric,
  leads numeric,
  cpl numeric,
  mqlt numeric,
  meetings_scheduled numeric,
  sales numeric,
  revenue numeric,
  gross_margin numeric
)
returns numeric
language sql
immutable
as $$
  select case metric_id
    when 'spend' then spend
    when 'leads' then leads
    when 'cpl' then cpl
    when 'mqlt' then mqlt
    when 'meetings_scheduled' then meetings_scheduled
    when 'sales' then sales
    when 'revenue' then revenue
    when 'gross_margin' then gross_margin
    else 0
  end;
$$;

create or replace function reporting.get_metric_tree_v1(
  metric_id text,
  date_from date,
  date_to date,
  grain text default 'day',
  channel_filter text default null,
  max_depth integer default 3
)
returns jsonb
language plpgsql
security definer
set search_path = reporting, public
as $$
declare
  period_record record;
  periods jsonb := '[]'::jsonb;
  period_rows jsonb;
  total_value numeric;
  previous_total numeric;
  previous_key date;
begin
  for period_record in
    select distinct
      case when grain = 'week' then week_start else report_date end as period_key
    from reporting.roistat_fact_v1
    where report_date between date_from and date_to
      and (channel_filter is null or channel = channel_filter)
    order by 1
  loop
    previous_key := case when grain = 'week' then (period_record.period_key - interval '7 day')::date else (period_record.period_key - interval '1 day')::date end;

    select coalesce(sum(reporting.metric_value_v1(metric_id, spend, leads, cpl, mqlt, meetings_scheduled, sales, revenue, gross_margin)), 0)
      into total_value
    from reporting.roistat_fact_v1
    where (case when grain = 'week' then week_start else report_date end) = period_record.period_key
      and (channel_filter is null or channel = channel_filter);

    select coalesce(sum(reporting.metric_value_v1(metric_id, spend, leads, cpl, mqlt, meetings_scheduled, sales, revenue, gross_margin)), 0)
      into previous_total
    from reporting.roistat_fact_v1
    where (case when grain = 'week' then week_start else report_date end) = previous_key
      and (channel_filter is null or channel = channel_filter);

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', concat('level1:', coalesce(level_1_key, level_1_label, channel)),
          'label', coalesce(level_1_label, channel),
          'path', jsonb_build_array(coalesce(level_1_label, channel)),
          'depth', 1,
          'value', level_value,
          'previousValue', 0,
          'shareOfTotal', case when total_value = 0 then 0 else round((level_value / total_value) * 100, 2) end,
          'deltaPct', null,
          'children', '[]'::jsonb
        )
        order by level_value desc
      ),
      '[]'::jsonb
    )
    into period_rows
    from (
      select
        coalesce(level_1_key, level_1_label, channel) as level_1_key,
        coalesce(level_1_label, channel) as level_1_label,
        sum(reporting.metric_value_v1(metric_id, spend, leads, cpl, mqlt, meetings_scheduled, sales, revenue, gross_margin)) as level_value
      from reporting.roistat_fact_v1
      where (case when grain = 'week' then week_start else report_date end) = period_record.period_key
        and (channel_filter is null or channel = channel_filter)
      group by 1, 2
    ) grouped;

    periods := periods || jsonb_build_array(
      jsonb_build_object(
        'periodKey', period_record.period_key,
        'periodLabel', case when grain = 'week' then concat('Неделя ', to_char(period_record.period_key, 'DD Mon')) else to_char(period_record.period_key, 'DD Mon') end,
        'totalValue', total_value,
        'previousValue', previous_total,
        'deltaPct', case when previous_total = 0 then null else round(((total_value - previous_total) / previous_total) * 100, 2) end,
        'rows', period_rows
      )
    );
  end loop;

  return jsonb_build_object(
    'metricId', metric_id,
    'periods', periods
  );
end;
$$;

create or replace function reporting.get_gross_margin_mix_v1(
  date_from date,
  date_to date,
  grain text default 'day',
  channel_filter text default null
)
returns jsonb
language sql
security definer
set search_path = reporting, public
as $$
  with scoped as (
    select
      channel,
      sum(gross_margin) as value
    from reporting.roistat_fact_v1
    where report_date between date_from and date_to
      and (channel_filter is null or channel = channel_filter)
    group by 1
  ),
  totals as (
    select sum(value) as total_value from scoped
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', lower(replace(channel, ' ', '_')),
        'label', channel,
        'value', value,
        'shareOfTotal', case when totals.total_value = 0 then 0 else round((value / totals.total_value) * 100, 2) end,
        'color',
          case channel
            when 'Avito' then '#4f8fe8'
            when 'CallDog' then '#7ad2ff'
            when 'Prian' then '#4da5aa'
            when 'Лид брокера' then '#89cc4a'
            when 'Директ' then '#ff8e43'
            when 'Facebook' then '#5a7ad9'
            when 'SMM' then '#6fe0d1'
            else '#55c1ff'
          end
      )
      order by value desc
    ),
    '[]'::jsonb
  )
  from scoped, totals;
$$;

create or replace function app.get_current_role_v1()
returns text
language sql
stable
security definer
set search_path = app, public
as $$
  select coalesce(
    (select role::text from app.user_roles where user_id = auth.uid()),
    'viewer'
  );
$$;

alter table app.user_roles enable row level security;
alter table app.dimension_levels enable row level security;
alter table app.dashboard_views enable row level security;
alter table app.user_dashboard_prefs enable row level security;

drop policy if exists "authenticated can read dimension levels" on app.dimension_levels;
create policy "authenticated can read dimension levels"
on app.dimension_levels
for select
to authenticated
using (true);

drop policy if exists "admins and editors can mutate dimension levels" on app.dimension_levels;
create policy "admins and editors can mutate dimension levels"
on app.dimension_levels
for all
to authenticated
using (app.get_current_role_v1() in ('admin', 'editor'))
with check (app.get_current_role_v1() in ('admin', 'editor'));

drop policy if exists "authenticated can read dashboard views" on app.dashboard_views;
create policy "authenticated can read dashboard views"
on app.dashboard_views
for select
to authenticated
using (true);

drop policy if exists "admins and editors can mutate dashboard views" on app.dashboard_views;
create policy "admins and editors can mutate dashboard views"
on app.dashboard_views
for all
to authenticated
using (app.get_current_role_v1() in ('admin', 'editor'))
with check (app.get_current_role_v1() in ('admin', 'editor'));

drop policy if exists "users can read own prefs" on app.user_dashboard_prefs;
create policy "users can read own prefs"
on app.user_dashboard_prefs
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "users can mutate own prefs" on app.user_dashboard_prefs;
create policy "users can mutate own prefs"
on app.user_dashboard_prefs
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "admins can read roles" on app.user_roles;
create policy "admins can read roles"
on app.user_roles
for select
to authenticated
using (app.get_current_role_v1() = 'admin');

drop policy if exists "admins can mutate roles" on app.user_roles;
create policy "admins can mutate roles"
on app.user_roles
for all
to authenticated
using (app.get_current_role_v1() = 'admin')
with check (app.get_current_role_v1() = 'admin');

grant usage on schema reporting to authenticated;
grant select on reporting.roistat_fact_source to authenticated;
grant select on reporting.roistat_fact_v1 to authenticated;
grant execute on function reporting.get_metric_tree_v1(text, date, date, text, text, integer) to authenticated;
grant execute on function reporting.get_gross_margin_mix_v1(date, date, text, text) to authenticated;
grant usage on schema app to authenticated;
grant select, insert, update on app.dimension_levels to authenticated;
grant select, insert, update on app.dashboard_views to authenticated;
grant select, insert, update on app.user_dashboard_prefs to authenticated;
grant select, insert, update on app.user_roles to authenticated;
grant execute on function app.get_current_role_v1() to authenticated;
