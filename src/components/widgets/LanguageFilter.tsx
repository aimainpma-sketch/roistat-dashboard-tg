import type { LanguageSegment } from "@/types/dashboard";

type Props = {
  value: LanguageSegment | null;
  onChange: (v: LanguageSegment | null) => void;
};

const OPTIONS: { label: string; value: LanguageSegment | null }[] = [
  { label: "Все", value: null },
  { label: "RU", value: "RU" },
  { label: "EN", value: "EN" },
];

export function LanguageFilter({ value, onChange }: Props) {
  return (
    <div className="inline-flex rounded-2xl border border-white/10 p-1">
      {OPTIONS.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.label}
            type="button"
            className={`rounded-xl px-4 py-1.5 text-sm font-medium transition ${
              isActive
                ? "bg-white/12 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
