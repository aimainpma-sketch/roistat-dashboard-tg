# Dashboard Contract

## Product shape

- One KPI table per metric.
- Mandatory gross-margin donut by channels.
- Global date range.
- Global `day|week` grain switch.
- Period rows at the top level.
- Expandable hierarchy levels 1..7 under each period.

## Metrics

- `spend`
- `leads`
- `cpl`
- `mqlt`
- `meetings_scheduled`
- `sales`
- `revenue`
- `gross_margin`

## Reporting schema

- `reporting.roistat_fact_source`
- `reporting.roistat_fact_v1`
- `reporting.get_metric_tree_v1(...)`
- `reporting.get_gross_margin_mix_v1(...)`

## App schema

- `app.user_roles`
- `app.dimension_levels`
- `app.dashboard_views`
- `app.user_dashboard_prefs`
- `app.get_current_role_v1()`

## UI constraints

- `label` column stays pinned and always visible.
- Column reorder applies to the remaining metric columns.
- Level editing stays in the drawer, not in a separate admin page.
- Admin page is users/roles only.
- Demo fallback must stay available until production Supabase is fully wired.
