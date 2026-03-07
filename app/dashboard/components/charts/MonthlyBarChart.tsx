import { formatIDR } from "../../lib/helpers";
import type { MonthlyTrendItem } from "../../lib/types";

interface MonthlyBarChartProps {
  data: MonthlyTrendItem[];
  selectedMonth: string;
  onMonthClick: (ym: string) => void;
}

export function MonthlyBarChart({ data, selectedMonth, onMonthClick }: MonthlyBarChartProps) {
  const max = Math.max(...data.map((d) => d.debit), 1);

  return (
    <div className="w-full">
      <div className="flex items-end gap-1 h-[130px]">
        {data.map((d) => {
          const h = d.debit > 0 ? Math.max(6, (d.debit / max) * 130) : 3;
          const isSel = d.ym === selectedMonth;
          return (
            <div
              key={d.ym}
              className="flex-1 flex flex-col justify-end group relative cursor-pointer"
              onClick={() => onMonthClick(d.ym)}
            >
              <div
                className={`rounded-t-sm transition-all ${
                  isSel
                    ? "bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.6)]"
                    : d.debit > 0
                    ? "bg-blue-500/50 group-hover:bg-blue-400/80"
                    : "bg-zinc-800/40"
                }`}
                style={{ height: `${h}px` }}
              />
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold text-white bg-[#18181B] border border-white/10 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {d.label}: {formatIDR(d.debit)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex mt-2">
        {data.map((d) => (
          <span
            key={d.ym}
            className={`flex-1 text-center text-[8px] truncate ${
              d.ym === selectedMonth ? "text-blue-400 font-bold" : "text-zinc-600"
            }`}
          >
            {d.label.split(" ")[0].substring(0, 3)}
          </span>
        ))}
      </div>
    </div>
  );
}
