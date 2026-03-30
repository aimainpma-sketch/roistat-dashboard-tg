import { X } from "lucide-react";
import type { DashboardView, DimensionLevel } from "@/types/dashboard";

export function HierarchySettingsDrawer({
  open,
  levels,
  views,
  onClose,
  onLevelChange,
  onViewDepthChange,
}: {
  open: boolean;
  levels: DimensionLevel[];
  views: DashboardView[];
  onClose: () => void;
  onLevelChange: (next: DimensionLevel) => void;
  onViewDepthChange: (viewKey: string, depth: number) => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-sm">
      <div className="glass h-full w-full max-w-xl border-l border-white/10 p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="text-sm uppercase tracking-[0.24em] text-slate-500">Настройки</div>
            <h2 className="mt-2 text-2xl font-semibold text-white">Уровни и глубина раскрытия</h2>
          </div>
          <button
            className="rounded-2xl border border-white/10 p-2 text-slate-300 transition hover:border-brand-400/40 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-medium text-white">Подписи и видимость уровней</h3>
            <div className="mt-4 space-y-3">
              {levels.map((level) => (
                <div
                  key={level.levelIndex}
                  className="rounded-3xl border border-white/8 bg-white/4 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm text-slate-400">Уровень {level.levelIndex}</div>
                    <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                      <input
                        checked={level.enabled}
                        onChange={(event) => onLevelChange({ ...level, enabled: event.target.checked })}
                        type="checkbox"
                      />
                      Активен
                    </label>
                  </div>
                  <input
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none"
                    value={level.label}
                    onChange={(event) => onLevelChange({ ...level, label: event.target.value })}
                  />
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-medium text-white">Глубина раскрытия по метрикам</h3>
            <div className="mt-4 space-y-3">
              {views.map((view) => (
                <label
                  key={view.viewKey}
                  className="grid grid-cols-[minmax(0,1fr)_120px] items-center gap-4 rounded-3xl border border-white/8 bg-white/4 p-4"
                >
                  <div>
                    <div className="text-sm font-medium text-white">{view.title}</div>
                    <div className="mt-1 text-sm text-slate-400">Глубина раскрытия по умолчанию</div>
                  </div>
                  <input
                    className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none"
                    min={1}
                    max={7}
                    type="number"
                    value={view.defaultMaxDepth}
                    onChange={(event) => onViewDepthChange(view.viewKey, Number(event.target.value))}
                  />
                </label>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
