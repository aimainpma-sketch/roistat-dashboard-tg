import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  children: ReactNode;
  className?: string;
};

export function WidgetCard({ title, subtitle, actionLabel, children, className = "" }: Props) {
  return (
    <section className={`glass rounded-[28px] border border-white/10 p-5 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>

      {actionLabel && (
        <div className="mb-4 rounded-xl bg-yellow-500/15 border border-yellow-500/25 px-4 py-2.5 text-sm font-medium text-yellow-300">
          {actionLabel}
        </div>
      )}

      {children}
    </section>
  );
}
