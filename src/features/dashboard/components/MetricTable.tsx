import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type VisibilityState,
} from "@tanstack/react-table";
import { ChevronDown, ChevronRight, GripHorizontal, SlidersHorizontal } from "lucide-react";
import { formatCompactNumber, formatMoney, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MetricDefinition, MetricPeriodGroup, MetricTreeNode } from "@/types/dashboard";

type FlatRow = {
  id: string;
  label: string;
  depth: number;
  value: number;
  previousValue: number;
  shareOfTotal: number;
  deltaPct: number | null;
  expandable: boolean;
  expanded: boolean;
  kind: "period" | "node";
};

function flattenPeriods(periods: MetricPeriodGroup[], expandedPaths: string[]): FlatRow[] {
  const flatRows: FlatRow[] = [];

  const walk = (nodes: MetricTreeNode[]) => {
    for (const node of nodes) {
      const expanded = expandedPaths.includes(node.id);
      flatRows.push({
        id: node.id,
        label: node.label,
        depth: node.depth,
        value: node.value,
        previousValue: node.previousValue,
        shareOfTotal: node.shareOfTotal,
        deltaPct: node.deltaPct,
        expandable: node.children.length > 0,
        expanded,
        kind: "node",
      });

      if (expanded) {
        walk(node.children);
      }
    }
  };

  for (const period of periods) {
    const periodId = `period:${period.periodKey}`;
    const expanded = expandedPaths.includes(periodId);
    flatRows.push({
      id: periodId,
      label: period.periodLabel,
      depth: 0,
      value: period.totalValue,
      previousValue: period.previousValue,
      shareOfTotal: 100,
      deltaPct: period.deltaPct,
      expandable: period.rows.length > 0,
      expanded,
      kind: "period",
    });

    if (expanded) {
      walk(period.rows);
    }
  }

  return flatRows;
}

function renderValue(format: MetricDefinition["format"], value: number) {
  if (format === "money") {
    return formatMoney(value);
  }

  if (format === "ratio") {
    return formatPercent(value);
  }

  return formatCompactNumber(value);
}

function DragHeader({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  return (
    <th
      ref={setNodeRef}
      className="px-4 py-3 text-left text-xs uppercase tracking-[0.22em] text-slate-500"
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
    >
      <div className="flex items-center gap-2">
        <button
          className="text-slate-600 transition hover:text-slate-300"
          {...attributes}
          {...listeners}
          type="button"
        >
          <GripHorizontal className="size-4" />
        </button>
        {children}
      </div>
    </th>
  );
}

export function MetricTable({
  metric,
  periods,
  expandedPaths,
  columnOrder,
  visibleColumns,
  onExpandedPathsChange,
  onColumnOrderChange,
  onVisibleColumnsChange,
}: {
  metric: MetricDefinition;
  periods: MetricPeriodGroup[];
  expandedPaths: string[];
  columnOrder: string[];
  visibleColumns: string[];
  onExpandedPathsChange: (next: string[]) => void;
  onColumnOrderChange: (next: string[]) => void;
  onVisibleColumnsChange: (next: string[]) => void;
}) {
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const data = flattenPeriods(periods, expandedPaths);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const columns: ColumnDef<FlatRow>[] = [
    {
      id: "label",
      accessorKey: "label",
      header: () => "Период / канал",
      cell: ({ row }) => {
        const item = row.original;
        const paddingLeft = `${item.depth * 16}px`;
        return (
          <button
            className={cn(
              "flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition hover:bg-white/5",
              item.kind === "period" ? "font-medium text-white" : "text-slate-200",
            )}
            onClick={() => {
              if (!item.expandable) {
                return;
              }

              const next = item.expanded
                ? expandedPaths.filter((path) => path !== item.id)
                : [...expandedPaths, item.id];
              onExpandedPathsChange(next);
            }}
            style={{ paddingLeft }}
            type="button"
          >
            {item.expandable ? (
              item.expanded ? <ChevronDown className="size-4 shrink-0 text-slate-400" /> : <ChevronRight className="size-4 shrink-0 text-slate-400" />
            ) : (
              <span className="size-4" />
            )}
            <span>{item.label}</span>
          </button>
        );
      },
    },
    {
      id: "value",
      accessorKey: "value",
      header: () => "Значение",
      cell: ({ row }) => renderValue(metric.format, row.original.value),
    },
    {
      id: "shareOfTotal",
      accessorKey: "shareOfTotal",
      header: () => "Доля",
      cell: ({ row }) => formatPercent(row.original.shareOfTotal),
    },
    {
      id: "previousValue",
      accessorKey: "previousValue",
      header: () => "Прошлый период",
      cell: ({ row }) => renderValue(metric.format, row.original.previousValue),
    },
    {
      id: "deltaPct",
      accessorKey: "deltaPct",
      header: () => "Delta %",
      cell: ({ row }) => {
        const delta = row.original.deltaPct;
        const tone = delta === null ? "text-slate-500" : delta >= 0 ? "text-emerald-300" : "text-coral-300";
        return <span className={tone}>{formatPercent(delta)}</span>;
      },
    },
  ];

  const visibilityState = columns.reduce<VisibilityState>((accumulator, column) => {
    accumulator[column.id ?? ""] = visibleColumns.includes(column.id ?? "");
    return accumulator;
  }, {});

  const stableOrder = ["label", ...columnOrder.filter((columnId) => columnId !== "label")];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: {
      columnVisibility: visibilityState,
      columnOrder: stableOrder,
    },
  });

  const draggableColumns = stableOrder.filter((columnId) => columnId !== "label");

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = draggableColumns.indexOf(String(active.id));
    const newIndex = draggableColumns.indexOf(String(over.id));
    const next = arrayMove(draggableColumns, oldIndex, newIndex);
    onColumnOrderChange(["label", ...next]);
  };

  const toggleColumn = (columnId: string) => {
    const next = visibleColumns.includes(columnId)
      ? visibleColumns.filter((item) => item !== columnId)
      : [...visibleColumns, columnId];
    onVisibleColumnsChange(["label", ...next.filter((item) => item !== "label")]);
  };

  return (
    <div className="rounded-[28px] border border-white/8 bg-white/4">
      <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
        <div>
          <div className="text-lg font-semibold text-white">{metric.label}</div>
          <div className="mt-1 text-sm text-slate-400">{metric.description}</div>
        </div>
        <div className="relative">
          <button
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:border-brand-400/40 hover:text-white"
            onClick={() => setShowColumnMenu((current) => !current)}
            type="button"
          >
            <SlidersHorizontal className="size-4" />
            Колонки
          </button>
          {showColumnMenu ? (
            <div className="absolute right-0 top-[calc(100%+12px)] z-20 w-64 rounded-3xl border border-white/10 bg-ink-900 p-4 shadow-2xl">
              <div className="mb-3 text-sm font-medium text-white">Видимые столбцы</div>
              <div className="space-y-2">
                {columns
                  .filter((column) => column.id !== "label")
                  .map((column) => (
                    <label
                      key={column.id}
                      className="flex items-center gap-3 text-sm text-slate-300"
                    >
                      <input
                        checked={visibleColumns.includes(column.id ?? "")}
                        onChange={() => toggleColumn(column.id ?? "")}
                        type="checkbox"
                      />
                      {column.id}
                    </label>
                  ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.22em] text-slate-500">
                  {flexRender(headerGroup.headers[0]?.column.columnDef.header, headerGroup.headers[0]?.getContext())}
                </th>
                <DndContext
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                  sensors={sensors}
                >
                  <SortableContext
                    items={draggableColumns}
                    strategy={horizontalListSortingStrategy}
                  >
                    {headerGroup.headers
                      .slice(1)
                      .filter((header) => header.column.getIsVisible())
                      .map((header) => (
                        <DragHeader
                          key={header.id}
                          id={header.column.id}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </DragHeader>
                      ))}
                  </SortableContext>
                </DndContext>
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-t border-white/6"
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={cn(
                      "px-4 py-1.5 text-sm",
                      cell.column.id === "label" ? "w-[45%]" : "w-[13%] text-slate-300",
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
