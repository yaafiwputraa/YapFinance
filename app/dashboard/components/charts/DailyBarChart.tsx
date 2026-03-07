import { formatIDR } from "../../lib/helpers";

interface DailyBarChartProps {
  data: { day: number; amount: number }[];
  selectedDay?: number | null;
  onDayClick?: (day: number | null) => void;
}

export function DailyBarChart({ data, selectedDay, onDayClick }: DailyBarChartProps) {
  const max = Math.max(...data.map((d) => d.amount), 1);

  return (
    <div className="w-full">
      <div className="flex items-end gap-[2px] h-[90px]">
        {data.map((d, i) => {
          const h = d.amount > 0 ? Math.max(8, (d.amount / max) * 90) : 3;
          const isSel = selectedDay === d.day;
          return (
            <div
              key={i}
              className={`flex-1 flex flex-col justify-end group relative ${d.amount > 0 ? "cursor-pointer" : ""}`}
              onClick={() => d.amount > 0 && onDayClick?.(isSel ? null : d.day)}
            >
              <div
                className={`rounded-sm transition-all ${
                  isSel
                    ? "bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.7)]"
                    : d.amount > 0
                    ? "bg-blue-500/70 group-hover:bg-blue-400"
                    : "bg-zinc-800"
                }`}
                style={{ height: `${h}px` }}
              />
              {d.amount > 0 && (
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold text-white bg-[#18181B] border border-white/10 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {d.day} — {formatIDR(d.amount)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[9px] text-zinc-600 mt-1.5">
        <span>1</span>
        <span>{Math.ceil(data.length / 2)}</span>
        <span>{data.length}</span>
      </div>
    </div>
  );
}
